// The modifier DSL in rounds (SPEC §14.2, §14.6): v1's stat resolution over the stats, selectors, triggers
// and actions a battle in rounds reads. Modifiers resolve in v1's order: sum every `add`, multiply every
// `mul`, then the last `set` wins (§14.1). A modifier on a stat a battle doesn't read compiles to nothing and
// is listed by its source (plan Call 19); v1's stats, triggers and actions left the schema in R2b's T129. R2b adds what §11.7's relics need:
// a squad's planting and the counter sets as selectors, conditions by round and storm, and the actions that
// burst, cloud and heal, with gold earned in a clash on one path (R2-Q20).
import { UNIT_STATS } from '../data/schema.ts';
import type { ModifierDef, SelectorDef } from '../data/schema.ts';
import type { Terrain } from './colony.ts';
import { formationBox } from './formation.ts';
import { insertHit } from './hits.ts';
import { SIDES, other } from './state.ts';
import type {
  BattleConfig, BattleModifier, BattleState, IgnoredEffect, KitCard, Library, LibraryUnit, RoundAction, RoundTrigger, RoundTriggerOn, Side,
} from './state.ts';
import { addCloud } from './systems/clouds.ts';

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
 * The stats a battle in rounds reads (§14.2): v1's unit and tower stats, the side and battle stats v2 keeps,
 * and v2's own: a squad's count, an economy building's gold a round, the colony's plots, the Heartcap's damage
 * taken, income and the power's effect. A modifier on any other compiles to nothing and is listed: R3's corner
 * combos, and the run's stats (`run.*`), which the run reads.
 */
export const ROUND_STATS: readonly string[] = [
  ...UNIT_STATS, 'tower.damage', 'tower.range', 'tower.splashRadius', 'building.squadCount', 'building.goldPerRound',
  'side.interestCap', 'side.stipend', 'side.startingGold', 'side.sellRefund', 'side.knitTicks', 'side.mergeRadius',
  'side.rerollCost', 'side.draftCards', 'side.heartcapMaxHp', 'side.comebackEnabled', 'side.loamBonus',
  'side.plots', 'side.heartcapDamageTaken', 'side.incomeMult', 'side.powerEffectMult',
  'battle.sporestormStart',
];

export interface RoundEffects { mods: ModifierDef[]; triggers: RoundTrigger[]; ignored: IgnoredEffect[] }

/**
 * The battle's modifiers, then each side's run loadout (R2b): its relics' effects and each upgrade level it
 * holds, as `relic:<id>` and `upgrade:<building>` modifiers. Until R2b's content work gives them v2 effects,
 * those on stats rounds retire compile to nothing and are listed like any other (plan Call 19).
 */
export function roundModifiers(lib: Library, config: BattleConfig, sides: Record<Side, RoundLoadout> = config): BattleModifier[] {
  const out = [...(config.modifiers ?? [])];
  for (const s of SIDES) {
    for (const id of sides[s].relics) out.push({ side: s, source: `relic:${id}`, effects: lib.relics![id]!.effects });
    for (const [id, level] of Object.entries(sides[s].upgrades ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      for (const l of lib.upgrades![id]!.levels.slice(0, level)) out.push({ side: s, source: `upgrade:${id}`, effects: l.effects });
    }
  }
  return out;
}

/** A side's kit, upgrade levels and relics, as its config gives them or its state holds them once it has drafted (§8.3). */
export interface RoundLoadout { kit: readonly KitCard[]; upgrades?: Record<string, number>; relics: readonly string[] }

/**
 * Every modifier and trigger in force for each side, from the battle's modifiers in order. A modifier
 * marked `side: opponent` lands on the other side; `battle.*` stats are left to `battleModifiers`. A
 * modifier on a stat a battle doesn't read is listed once, on the side it would have reached. A run's relics
 * and upgrade levels arrive among them (`roundModifiers`).
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
      for (const t of bm.effects.triggers ?? []) out[s].triggers.push({ on: t.on, ...(t.if ? { if: t.if } : {}), do: [...t.do] });
    }
  }
  return out;
}

export type Match = (w: SelectorDef | undefined) => boolean;

/**
 * Where a squad's or building's plot stands, which `rank` and `onLoam` read (§4.6), and what holds for its
 * building as it fields, which `plantedThisRound` and `inCounterSet` read (§14.2).
 */
export interface Place {
  rank: number;
  terrain: Terrain;
  /** Planted in this planning phase (Fresh Spores, §11.7). */
  planted?: boolean;
  /** In its side's counter sets in force at this Begin (the Pale Sovereign, §7.7, R2-Q17). */
  inCounterSet?: boolean;
}

/** Does a selector read a squad's or building's place: its plot's `rank` or `onLoam`, its planting or the counter sets (§4.6, T046)? */
export const onPlot = (w: SelectorDef | undefined): boolean =>
  !!w && (w.rank !== undefined || w.onLoam !== undefined || w.plantedThisRound !== undefined || w.inCounterSet !== undefined);

/**
 * Does a selector's place part hold at `place`: `rank` the plot's rank, `onLoam` whether it's a loam plot,
 * `plantedThisRound` and `inCounterSet` what holds for its building. Without a place it never does, so a
 * side-wide compile leaves the modifier to each squad's place (T046).
 */
export function placeMatches(w: SelectorDef, place?: Place): boolean {
  if (!onPlot(w)) return true;
  if (!place) return false;
  if (w.rank !== undefined && w.rank !== place.rank) return false;
  if (w.onLoam !== undefined && w.onLoam !== (place.terrain === 'loam')) return false;
  if (w.plantedThisRound !== undefined && w.plantedThisRound !== !!place.planted) return false;
  return w.inCounterSet === undefined || w.inCounterSet === !!place.inCounterSet;
}

/** Does `melee` hold for a unit with these tags: a melee unit is one without the `ranged` tag (Call 13)? */
const meleeMatches = (w: SelectorDef, tags: readonly string[] | undefined): boolean =>
  w.melee === undefined || (!!tags && w.melee !== tags.includes('ranged'));

/** Selector match for a unit at a tier, on its squad's plot if given. `building` matches the units that building's squad fields. */
export function unitMatcher(lib: Library, u: LibraryUnit, tier: number, place?: Place): Match {
  return (w) => {
    if (!w) return true;
    if (w.unit !== undefined && w.unit !== u.id) return false;
    if (w.tag !== undefined && !u.tags.includes(w.tag)) return false;
    if (!meleeMatches(w, u.tags)) return false;
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
    if (!meleeMatches(w, unit?.tags)) return false;
    return placeMatches(w, place);
  };
}

/** Does a modifier's condition hold in this round, at this storm step: from its `roundGte`, and from its `sporestormGte` (§11.7, R2-Q19)? */
export const holdsNow = (m: ModifierDef, round: number, sporestorm: number): boolean =>
  !m.if || ((m.if.roundGte === undefined || round >= m.if.roundGte) && (m.if.sporestormGte === undefined || sporestorm >= m.if.sporestormGte));

/**
 * × the side's commander power's effect as the battle stands (§6.6, §11.7): its `side.powerEffectMult`
 * modifiers that hold now, such as the Sporestorm Sigil's 1.5 from the storm's first round. The powers read it.
 */
export function powerEffectMult(state: BattleState, side: Side): number {
  const mods = state.compiled[side].powerMods.filter((m) => holdsNow(m, state.round, state.sporestorm));
  return resolveStat(1, mods, 'side.powerEffectMult');
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

function triggerMatches(state: BattleState, t: RoundTrigger, ctx: TriggerContext): boolean {
  const w = t.if;
  if (!w) return true;
  if (w.sporestormGte !== undefined && state.sporestorm < w.sporestormGte) return false;
  if (w.unit !== undefined && w.unit !== ctx.unitId) return false;
  if (w.tag !== undefined && !ctx.tags?.includes(w.tag)) return false;
  if (!meleeMatches(w, ctx.tags)) return false;
  if (w.tier !== undefined && w.tier !== ctx.tier) return false;
  if (w.building !== undefined && w.building !== ctx.buildingId) return false;
  return placeMatches(w, ctx.place);
}

/** Fires `side`'s triggers of one kind, each once, in source order. Cheap when the side has none. */
export function fireTriggers(state: BattleState, side: Side, on: RoundTriggerOn, ctx: TriggerContext): void {
  for (const t of state.compiled[side].triggers) {
    if (t.on !== on || !triggerMatches(state, t, ctx)) continue;
    for (const a of t.do) runAction(state, side, a, ctx);
  }
}

/**
 * Runs one action for `side` (§14.2). `gainGold` credits its own side at once, with a `gold` event: in a
 * clash it's clash gold, which the next opening shows as its "from the clash" row (§6.2, R2-Q20). `explode`
 * is v1's ground burst where it fired, at full damage within its radius, next tick. `cloud` leaves a spore
 * cloud there, or on the middle of each lane's enemy front rank (Forward Spores). `healHeartcap` heals the
 * side's Heartcap up to its max, but never one that has fallen, so a heal never undoes a Rout (§6.7, #24).
 */
export function runAction(state: BattleState, side: Side, a: RoundAction, ctx: TriggerContext): void {
  if ('gainGold' in a) {
    const source = state.phase === 'clash' ? 'clash' : 'effects';
    state.sides[side].gold += a.gainGold;
    state.stats[side].goldEarned[source] += a.gainGold;
    state.events.push({ t: 'gold', side, amount: a.gainGold, source });
  } else if ('explode' in a) {
    insertHit(state, {
      tick: state.tick + 1, sourceId: 0, seq: state.nextHitSeq++, side, targetId: 0,
      x: ctx.x, y: ctx.y, fromX: ctx.x, fromY: ctx.y, fireTick: state.tick, lane: ctx.lane,
      damage: a.explode.damage, damageType: a.explode.damageType, splashRadius: a.explode.radius,
      siegeMult: 1, slayerMult: 1, sourceBuildingId: ctx.sourceBuildingId, sourceType: 'effect', ranged: false,
    });
  } else if ('cloud' in a) {
    const tr = state.rules.tickRate, c = a.cloud;
    const spec = { radius: c.radius, ticks: Math.round(c.seconds * tr), pulseTicks: tr, damage: Math.max(1, Math.round(c.damagePerSecond)) };
    const at = c.at === 'enemyFrontRank' ? frontRanks(state, other(side)) : [{ lane: ctx.lane, x: ctx.x, y: ctx.y }];
    state.clouds ??= [];
    for (const p of at) addCloud(state, side, p.lane, p.x, p.y, ctx.sourceBuildingId, spec);
  } else {
    const ss = state.sides[side];
    const amount = ss.heartcapHp > 0 ? Math.min(a.healHeartcap, ss.heartcapMaxHp - ss.heartcapHp) : 0;
    if (amount <= 0) return;
    ss.heartcapHp += amount;
    state.events.push({ t: 'heartcapHealed', side, amount });
  }
}

/** The middle of `side`'s front rank in each lane (§4.6): its formation box's front column, at the lane's middle row. */
function frontRanks(state: BattleState, side: Side): { lane: number; x: number; y: number }[] {
  const front = formationBox({ width: state.map.width, lanes: state.lanes, gapTiles: state.rules.formationGapTiles }, side, 1);
  return state.lanes.map((l, lane) => ({ lane, x: front.find((slot) => slot.lane === lane)!.col + 1, y: (l.rowStart + l.rowEnd + 1) / 2 }));
}
