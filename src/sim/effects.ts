// The modifier DSL in rounds (SPEC §14.2, §14.6): v1's stat resolution over the stats, selectors, triggers
// and actions a battle in rounds reads. Modifiers resolve in v1's order: sum every `add`, multiply every
// `mul`, then the last `set` wins (§14.1). Content on a stat rounds retire, or on a trigger or action they
// don't run, compiles to nothing and is listed by its source (plan Call 19).
import { UNIT_STATS } from '../data/schema.ts';
import type { ModifierDef, SelectorDef } from '../data/schema.ts';
import type { Terrain } from './colony.ts';
import { ROUND_TRIGGERS, SIDES, other } from './state.ts';
import type {
  BattleConfig, BattleModifier, IgnoredEffect, Library, LibraryUnit, RoundAction, RoundTrigger, RoundTriggerOn, Side, SimEvent,
} from './state.ts';

/** `battle.*` modifiers from the battle's modifier list (each counted once, whichever side it names). */
export function battleModifiers(battle: BattleModifier[] = []): ModifierDef[] {
  const out: ModifierDef[] = [];
  for (const bm of battle) for (const m of bm.effects.modifiers ?? []) if (m.stat.startsWith('battle.')) out.push(m);
  return out;
}

/**
 * Applies the modifiers for `stat` that match: (base + Σ add) × Π mul, then the last `set`. With no
 * matching modifier the base comes back untouched (bit-identical).
 */
export function resolveStat(base: number, mods: readonly ModifierDef[], stat: string, match: Match = () => true): number {
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

/**
 * The stats a battle in rounds reads (§14.2): v1's unit and tower stats, and the side and battle stats v2
 * keeps. A modifier on any other compiles to nothing and is listed: v1's building HP, spawn timers, spawn
 * counts and gold a tick, the supply cap, capture, supply lines, turrets, power cooldowns and waves.
 */
export const ROUND_STATS: readonly string[] = [
  ...UNIT_STATS, 'tower.damage', 'tower.range', 'tower.splashRadius',
  'side.interestCap', 'side.stipend', 'side.startingGold', 'side.sellRefund', 'side.knitTicks', 'side.mergeRadius',
  'side.rerollCost', 'side.draftCards', 'side.heartcapMaxHp', 'side.comebackEnabled', 'side.loamBonus',
  'battle.sporestormStart',
];

export interface RoundEffects { mods: ModifierDef[]; triggers: RoundTrigger[]; ignored: IgnoredEffect[] }

/**
 * The battle's modifiers, then each side's run loadout (R2b): its relics' effects and each upgrade level it
 * holds, as `relic:<id>` and `upgrade:<building>` modifiers. Until R2b's content work gives them v2 effects,
 * those on stats rounds retire compile to nothing and are listed like any other (plan Call 19).
 */
export function roundModifiers(lib: Library, config: BattleConfig): BattleModifier[] {
  const out = [...(config.modifiers ?? [])];
  for (const s of SIDES) {
    for (const id of config[s].relics) out.push({ side: s, source: `relic:${id}`, effects: lib.relics![id]!.effects });
    for (const [id, level] of Object.entries(config[s].upgrades ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      for (const l of lib.upgrades![id]!.slice(0, level)) out.push({ side: s, source: `upgrade:${id}`, effects: l.effects });
    }
  }
  return out;
}

const isRoundTrigger = (on: string): on is RoundTriggerOn => (ROUND_TRIGGERS as readonly string[]).includes(on);

/**
 * Every modifier and trigger in force for each side, from the battle's modifiers in order. A modifier
 * marked `side: opponent` lands on the other side; `battle.*` stats are left to `battleModifiers`. A
 * trigger keeps only the actions rounds run. Each thing set aside is listed once, on the side it would
 * have reached. A run's relics and upgrade levels arrive among them (`roundModifiers`).
 */
export function collectRoundEffects(battle: readonly BattleModifier[] = []): Record<Side, RoundEffects> {
  const out: Record<Side, RoundEffects> = { player: { mods: [], triggers: [], ignored: [] }, enemy: { mods: [], triggers: [], ignored: [] } };
  const ignore = (s: Side, e: IgnoredEffect) => {
    const key = JSON.stringify(e);
    if (!out[s].ignored.some((x) => JSON.stringify(x) === key)) out[s].ignored.push(e);
  };
  for (const bm of battle) {
    for (const s of SIDES) {
      if (bm.side !== s && bm.side !== 'both') continue;
      for (const m of bm.effects.modifiers ?? []) {
        if (m.stat.startsWith('battle.')) continue;
        const to = m.side === 'opponent' ? other(s) : s;
        if (ROUND_STATS.includes(m.stat)) out[to].mods.push(m);
        else ignore(to, { source: bm.source, stat: m.stat });
      }
      for (const t of bm.effects.triggers ?? []) {
        if (!isRoundTrigger(t.on)) { ignore(s, { source: bm.source, trigger: t.on }); continue; }
        const run: RoundAction[] = [];
        for (const a of t.do) {
          if ('gainGold' in a) run.push({ gainGold: a.gainGold });
          else ignore(s, { source: bm.source, action: Object.keys(a)[0]! });
        }
        if (run.length) out[s].triggers.push({ on: t.on, ...(t.if ? { if: t.if } : {}), do: run });
      }
    }
  }
  return out;
}

export type Match = (w: SelectorDef | undefined) => boolean;

/** Where a squad's or building's plot stands, which `rank` and `onLoam` read (§4.6). */
export interface Place { rank: number; terrain: Terrain }

/** Does a selector read a squad's or building's plot, by its `rank` or `onLoam` (§4.6, T046)? */
export const onPlot = (w: SelectorDef | undefined): boolean => !!w && (w.rank !== undefined || w.onLoam !== undefined);

/**
 * Does a selector's plot part hold at `place`: `rank` the plot's rank, `onLoam` whether it's a loam plot.
 * Without a place it never does, so a side-wide compile leaves the modifier to each squad's plot (T046).
 * v1's `zone` and adjacency went with territory (§14.2): they never match in rounds.
 */
export function placeMatches(w: SelectorDef, place?: Place): boolean {
  if (w.zone !== undefined || w.adjacentOwnBuildingsGte !== undefined) return false;
  if (w.rank === undefined && w.onLoam === undefined) return true;
  if (!place) return false;
  if (w.rank !== undefined && w.rank !== place.rank) return false;
  return w.onLoam === undefined || w.onLoam === (place.terrain === 'loam');
}

/** Selector match for a unit at a tier, on its squad's plot if given. `building` matches the units that building's squad fields. */
export function unitMatcher(lib: Library, u: LibraryUnit, tier: number, place?: Place): Match {
  return (w) => {
    if (!w) return true;
    if (w.unit !== undefined && w.unit !== u.id) return false;
    if (w.tag !== undefined && !u.tags.includes(w.tag)) return false;
    if (w.tier !== undefined && w.tier !== tier) return false;
    if (w.building !== undefined && lib.buildings[w.building]?.squad?.unit !== u.id) return false;
    return placeMatches(w, place);
  };
}

/** Selector match for a building, on its plot if given: its id, its squad's unit and that unit's tags. */
export function buildingMatcher(lib: Library, id: string, place?: Place): Match {
  const unitId = lib.buildings[id]?.squad?.unit;
  const unit = unitId ? lib.units[unitId] : undefined;
  return (w) => {
    if (!w) return true;
    if (w.building !== undefined && w.building !== id) return false;
    if (w.unit !== undefined && w.unit !== unitId) return false;
    if (w.tag !== undefined && !unit?.tags.includes(w.tag)) return false;
    return placeMatches(w, place);
  };
}

// ---- triggers ----

/** What a trigger can see about its cause: where it happened, what died or merged, and its squad's plot. */
export interface TriggerContext {
  x: number;
  y: number;
  lane: number;
  unitId?: string;
  tier?: number;
  tags?: readonly string[];
  buildingId?: string;
  place?: Place;
  /** Building entity credited with what the trigger does (0 for none). */
  sourceBuildingId: number;
}

/** What firing a trigger reads and writes. A battle in rounds' state has all of it. */
export interface TriggerScope {
  /** The round's storm step, which `sporestormGte` reads (§6.4). */
  sporestorm: number;
  compiled: Record<Side, { triggers: readonly RoundTrigger[] }>;
  sides: Record<Side, { gold: number }>;
  stats: Record<Side, { goldEarned: { effects: number } }>;
  events: SimEvent[];
}

function triggerMatches(state: TriggerScope, t: RoundTrigger, ctx: TriggerContext): boolean {
  const w = t.if;
  if (!w) return true;
  if (w.sporestormGte !== undefined && state.sporestorm < w.sporestormGte) return false;
  if (w.unit !== undefined && w.unit !== ctx.unitId) return false;
  if (w.tag !== undefined && !ctx.tags?.includes(w.tag)) return false;
  if (w.tier !== undefined && w.tier !== ctx.tier) return false;
  if (w.building !== undefined && w.building !== ctx.buildingId) return false;
  return placeMatches(w, ctx.place);
}

/** Fires `side`'s triggers of one kind, each once, in source order. Cheap when the side has none. */
export function fireTriggers(state: TriggerScope, side: Side, on: RoundTriggerOn, ctx: TriggerContext): void {
  for (const t of state.compiled[side].triggers) {
    if (t.on !== on || !triggerMatches(state, t, ctx)) continue;
    for (const a of t.do) runAction(state, side, a);
  }
}

/** Runs one action for `side`: `gainGold` pays its own side at once. */
export function runAction(state: TriggerScope, side: Side, a: RoundAction): void {
  state.sides[side].gold += a.gainGold;
  state.stats[side].goldEarned.effects += a.gainGold;
  state.events.push({ t: 'effectGold', side, amount: a.gainGold });
}
