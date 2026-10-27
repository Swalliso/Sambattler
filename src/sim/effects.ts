// The effects DSL (SPEC §14.1–14.2): one modifier and trigger language for upgrades, relics, elite
// modifiers and event effects (later traits, blights, strains and passives). Modifiers resolve in a
// fixed order: sum every `add`, multiply every `mul`, then the last `set` wins. Selectors pick the
// units and buildings a modifier touches; positional selectors (zone, loam, adjacency) are evaluated
// when the stat is used, because they depend on where a building stands.
import type { BuildingDef, EffectAction, EffectBundle, ModifierDef, SelectorDef, TriggerDef, UnitDef } from '../data/schema.ts';
import { insertHit } from './hits.ts';
import { footprintOnLoam } from './placement.ts';
import { SIDES, other } from './state.ts';
import type { BattleModifier, BattleState, BuildingState, Library, Loadout, PositionalStat, Side } from './state.ts';

export interface SideEffects { mods: ModifierDef[]; triggers: TriggerDef[] }

/** The bundles a loadout contributes, in a fixed order: owned upgrade levels by building id, then relics in pick order. */
export function loadoutBundles(lib: Library, lo: Loadout): EffectBundle[] {
  const out: EffectBundle[] = [];
  for (const b of Object.keys(lo.upgrades).sort()) {
    const track = lib.upgrades[b];
    if (!track || !lo.kit.includes(b)) continue;
    const n = Math.min(track.levels.length, lo.upgrades[b] ?? 0);
    for (let i = 0; i < n; i++) out.push(track.levels[i]!.effects);
  }
  for (const r of lo.relics) {
    const def = lib.relics[r];
    if (def) out.push(def.effects);
  }
  return out;
}

/**
 * Every modifier and trigger in force for each side. A modifier marked `side: opponent` lands on
 * the other side; battle modifiers apply to the side they name (or both). `battle.*` stats are
 * collected separately by {@link battleModifiers}.
 */
export function collectEffects(lib: Library, loadouts: Record<Side, Loadout>, battle: BattleModifier[] = []): Record<Side, SideEffects> {
  const out: Record<Side, SideEffects> = { player: { mods: [], triggers: [] }, enemy: { mods: [], triggers: [] } };
  const add = (owner: Side, fx: EffectBundle) => {
    for (const m of fx.modifiers ?? []) {
      if (m.stat.startsWith('battle.')) continue;
      out[m.side === 'opponent' ? other(owner) : owner].mods.push(m);
    }
    for (const t of fx.triggers ?? []) out[owner].triggers.push(t);
  };
  for (const s of SIDES) for (const fx of loadoutBundles(lib, loadouts[s])) add(s, fx);
  for (const bm of battle) for (const s of SIDES) if (bm.side === s || bm.side === 'both') add(s, bm.effects);
  return out;
}

/** `battle.*` modifiers from the battle's modifier list (each counted once, whichever side it names). */
export function battleModifiers(battle: BattleModifier[] = []): ModifierDef[] {
  const out: ModifierDef[] = [];
  for (const bm of battle) for (const m of bm.effects.modifiers ?? []) if (m.stat.startsWith('battle.')) out.push(m);
  return out;
}

type Match = (w: SelectorDef | undefined) => boolean;
export const always: Match = () => true;

/**
 * Applies the modifiers for `stat` that match: (base + Σ add) × Π mul, then the last `set`. With no
 * matching modifier the base comes back untouched (bit-identical).
 */
export function resolveStat(base: number, mods: readonly ModifierDef[], stat: string, match: Match = always): number {
  let add = 0, mul = 1, set: number | undefined, any = false;
  for (const m of mods) {
    if (m.stat !== stat || !match(m.where)) continue;
    any = true;
    if (m.op === 'add') add += m.value;
    else if (m.op === 'mul') mul *= m.value;
    else set = m.value;
  }
  if (!any) return base;
  return set !== undefined ? set : (base + add) * mul;
}

export function isPositional(w: SelectorDef | undefined): boolean {
  return !!w && (w.zone !== undefined || w.onLoam !== undefined || w.adjacentOwnBuildingsGte !== undefined);
}

/** Selector match for a unit at a tier. `building` matches the units that building spawns. */
export function unitMatcher(lib: Library, u: UnitDef, tier: number): Match {
  return (w) => {
    if (!w) return true;
    if (w.unit !== undefined && w.unit !== u.id) return false;
    if (w.tag !== undefined && !u.tags.includes(w.tag)) return false;
    if (w.tier !== undefined && w.tier !== tier) return false;
    if (w.building !== undefined && lib.buildings[w.building]?.spawn?.unit !== u.id) return false;
    return true;
  };
}

/** Selector match for a building, ignoring positional parts (the caller decides how to treat those). */
export function buildingMatcher(lib: Library, b: BuildingDef): Match {
  const unit = b.spawn ? lib.units[b.spawn.unit] : undefined;
  return (w) => {
    if (!w) return true;
    if (w.building !== undefined && w.building !== b.id) return false;
    if (w.unit !== undefined && b.spawn?.unit !== w.unit) return false;
    if (w.tag !== undefined && !unit?.tags.includes(w.tag)) return false;
    return true;
  };
}

/**
 * Compiles one building stat. Without positional modifiers the value is final; with them the base
 * and the matching modifiers are kept so the value can be re-resolved per building when used.
 */
export function buildingStat(lib: Library, b: BuildingDef, mods: readonly ModifierDef[], stat: string, base: number): { value: number; positional?: PositionalStat } {
  const match = buildingMatcher(lib, b);
  const fixed = (w: SelectorDef | undefined) => match(w) && !isPositional(w);
  const value = resolveStat(base, mods, stat, fixed);
  const pos = mods.filter((m) => m.stat === stat && match(m.where) && isPositional(m.where));
  if (!pos.length) return { value };
  return { value, positional: { base, mods: mods.filter((m) => m.stat === stat && match(m.where)) } };
}

/** Does a positional selector hold for a standing building? */
export function positionMatches(state: BattleState, b: BuildingState, w: SelectorDef | undefined): boolean {
  if (!w) return true;
  const def = state.compiled[b.side].buildings[b.buildingId]!;
  if (w.zone !== undefined) {
    const home = state.map.homeCols;
    const inHome = b.side === 'player' ? b.col + def.w <= home : b.col >= state.map.width - home;
    if ((w.zone === 'home') !== inHome) return false;
  }
  if (w.onLoam !== undefined && footprintOnLoam(state, b.col, b.row, def.w, def.h) !== w.onLoam) return false;
  if (w.adjacentOwnBuildingsGte !== undefined && adjacentOwn(state, b) < w.adjacentOwnBuildingsGte) return false;
  return true;
}

/** Own buildings sharing an edge with `b`'s footprint. */
function adjacentOwn(state: BattleState, b: BuildingState): number {
  const def = state.compiled[b.side].buildings[b.buildingId]!;
  let n = 0;
  for (const o of state.buildings) {
    if (o === b || o.side !== b.side || o.hp <= 0) continue;
    const od = state.compiled[o.side].buildings[o.buildingId]!;
    const overlapX = o.col < b.col + def.w && b.col < o.col + od.w;
    const overlapY = o.row < b.row + def.h && b.row < o.row + od.h;
    const touchX = o.col + od.w === b.col || b.col + def.w === o.col;
    const touchY = o.row + od.h === b.row || b.row + def.h === o.row;
    if ((touchX && overlapY) || (touchY && overlapX)) n++;
  }
  return n;
}

/** Resolves a positional building stat for a standing building. */
export function positionalValue(state: BattleState, b: BuildingState, p: PositionalStat, stat: string): number {
  return resolveStat(p.base, p.mods, stat, (w) => positionMatches(state, b, w));
}

// ---- triggers ----

export type TriggerOn = TriggerDef['on'];

/** What a trigger can see about its cause: where it happened and what died, merged or fell. */
export interface TriggerContext {
  x: number;
  y: number;
  lane: number;
  unitId?: string;
  tier?: number;
  tags?: readonly string[];
  buildingId?: string;
  /** Building entity credited with explosion damage (0 for none). */
  sourceBuildingId: number;
}

function triggerMatches(state: BattleState, t: TriggerDef, ctx: TriggerContext): boolean {
  const w = t.if;
  if (!w) return true;
  if (w.sporestormGte !== undefined && state.sporestorm < w.sporestormGte) return false;
  if (w.unit !== undefined && w.unit !== ctx.unitId) return false;
  if (w.tag !== undefined && !ctx.tags?.includes(w.tag)) return false;
  if (w.tier !== undefined && w.tier !== ctx.tier) return false;
  if (w.building !== undefined && w.building !== ctx.buildingId) return false;
  return true;
}

/** Fires `side`'s triggers of one kind. Cheap when the side has none. */
export function fireTriggers(state: BattleState, side: Side, on: TriggerOn, ctx: TriggerContext): void {
  const list = state.compiled[side].triggers;
  if (!list.length) return;
  for (const t of list) {
    if (t.on !== on || !triggerMatches(state, t, ctx)) continue;
    for (const a of t.do) runAction(state, side, a, ctx);
  }
}

/** Runs one effect action for `side` (also used by units' own `onDeath` actions). */
export function runAction(state: BattleState, side: Side, a: EffectAction, ctx: TriggerContext): void {
  if ('gainGold' in a) {
    state.sides[side].gold += a.gainGold;
    state.stats[side].goldEarned.effects += a.gainGold;
    state.events.push({ t: 'effectGold', side, amount: a.gainGold });
  } else if ('explode' in a) {
    // a ground burst: no primary target, full damage to every enemy within the radius, next tick
    insertHit(state, {
      tick: state.tick + 1, sourceId: 0, seq: state.nextHitSeq++, side, targetId: 0,
      x: ctx.x, y: ctx.y, fromX: ctx.x, fromY: ctx.y, fireTick: state.tick, lane: ctx.lane,
      damage: a.explode.damage, damageType: a.explode.damageType, splashRadius: a.explode.radius,
      siegeMult: 1, slayerMult: 1, sourceBuildingId: ctx.sourceBuildingId, sourceType: 'effect', ranged: false,
    });
  } else {
    const ss = state.sides[side];
    ss.heartcapHp = Math.min(ss.heartcapMaxHp, ss.heartcapHp + Math.round(ss.heartcapMaxHp * a.repairHeartcapPct));
  }
}
