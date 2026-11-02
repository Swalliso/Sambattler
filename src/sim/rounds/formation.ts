// The formation's pure core in rounds (SPEC §4.6, §5.6, §14.6): `formationFor` stands a side's squads in
// the formation box its colony copies, and `musterFor` knits them in place at the clash's opening muster,
// to a fixed point, giving `mergePreview`'s shape (plan call 5). Both take plain records and run on R1's
// `src/sim/formation.ts`, so they read no battle state and draw on no stream (§13.3 rule 2).
// `formationOf` and `mergePreview` build their input from the state, with an optional change to preview
// (plan call 6), and the arrival (T043) puts units where `formationOf` says, so the preview and the clash
// can't disagree.
import type { BuildingDef } from '../../data/schema.ts';
import { emplacementPosition, formationBox, knit, musterKnits, overflows, slotPositions } from '../formation.ts';
import type { FieldGeom, MusterOpts, MusterUnit, Point, Slot } from '../formation.ts';
import type { Side, Tier } from '../state.ts';
import { plantProblem, sellProblem, toggleProblem } from './planning.ts';
import type { BattleState, CompiledUnit } from './state.ts';

/** A building as the formation reads it: what it fields and its merge toggle. */
export interface FieldingBuilding {
  id: number;
  kind: BuildingDef['kind'];
  /**
   * What it fields (§4.6): a spawner's squad, or a tower's emplacement, one unit. An economy or utility
   * building fields nothing. `eligible` is false for a squad whose units can't knit whatever the
   * toggle: burst units, or units that arrive burrowed (§5.6).
   */
  squad?: { unitId: string; count: number; radius: number; eligible?: boolean };
  mergeOn: boolean;
}

/** A plot as the formation reads it: its place in the colony and the building on it, if any. */
export interface FormationPlot {
  lane: number;
  rank: number;
  file: number;
  building: FieldingBuilding | null;
}

export interface FormationInput {
  /** The map's width and lanes, and `balance.rounds.formationGapTiles` between the front ranks. */
  geom: FieldGeom;
  side: Side;
  /** The side's plots, as `colonyPlots` gives them. */
  plots: readonly FormationPlot[];
}

/** One squad as it arrives (§14.6's `SquadPlan`). */
export interface SquadPlan {
  building: number;
  /** Its plot's index in the input. */
  plot: number;
  lane: number;
  rank: number;
  file: number;
  slot: Slot;
  unitId: string;
  /** A tower's one unit, at its slot's centre. */
  emplacement: boolean;
  mergeOn: boolean;
  /** False if its units can't knit whatever the toggle: an emplacement, burst units, or units that arrive burrowed. */
  eligible: boolean;
  /** Too big to stand apart in its slot, so it packs tighter on the same grid (§18.2 #11). */
  overflows: boolean;
  /** Where unit j stands when it arrives, in tiles. */
  units: Point[];
}

export interface Formation {
  /** One slot per plot, in the input's order, in the plot's rank and file. */
  slots: Slot[];
  /** The squads in arrival order: plot order (lane, rank, file), each squad's units by j (A024). */
  squads: SquadPlan[];
}

export interface MusterInput extends FormationInput {
  /** The side's merge radius, with any bonus (§5.6). */
  mergeRadius: number;
  /** A unit's body radius at a tier, which holds a merged unit in its lane. */
  radiusOf: (unitId: string, tier: Tier) => number;
}

export interface TierCounts {
  elders: number;
  bloomed: number;
  base: number;
}

/** One trio the muster knits (plan call 5, A039). */
export interface MusterTrio {
  /** Every arrived unit it's made of, as its building and its index j in that squad: 3 for a Bloomed, 9 for an Elder. */
  parts: { building: number; j: number }[];
  tier: 2 | 3;
  /** Where the merged unit stands. */
  x: number;
  y: number;
  /** The pass of the fixed point that knits it, from 1. */
  pass: number;
}

/** What a side fields after the muster: `mergePreview`'s shape (§14.6, plan call 5). */
export interface MergePreview {
  /** By building id, the units it fields after the muster. A merged unit counts for its lowest-key parent's building (§5.6). */
  byBuilding: Record<number, TierCounts>;
  /** Every trio the muster knits, pass by pass. */
  trios: MusterTrio[];
}

/**
 * A side's formation (§4.6): one slot per plot in the formation box, in the same rank and file, and each
 * fielding building's squad in its plot's slot. A squad stands on `slotPositions`'s k × k grid, front
 * toward the enemy, and a tower's emplacement at its slot's centre. Each unit is held inside its lane by
 * its radius, as `addUnit` holds it. An empty plot, or an economy or utility building, leaves a hole, and
 * nothing closes up around it. The squads come in arrival order, whatever order the plots come in.
 */
export function formationFor(input: FormationInput): Formation {
  const { geom, side, plots } = input;
  const box = formationBox(geom, side, plots.reduce((n, p) => Math.max(n, p.rank + 1), 1));
  const slots = plots.map((p) => {
    const slot = box.find((s) => s.lane === p.lane && s.rank === p.rank && s.file === p.file);
    if (!slot) throw new Error(`formationFor: no slot at lane ${p.lane}, rank ${p.rank}, file ${p.file}`);
    return slot;
  });
  const order = plots.map((_, i) => i).sort((i, j) => byPlace(plots[i]!, plots[j]!) || i - j);
  const placed = new Set<number>();
  const squads: SquadPlan[] = [];
  order.forEach((i, n) => {
    const p = plots[i]!, b = p.building;
    if (n > 0 && byPlace(plots[order[n - 1]!]!, p) === 0) throw new Error(`formationFor: two plots at lane ${p.lane}, rank ${p.rank}, file ${p.file}`);
    if (!b) return;
    if (placed.has(b.id)) throw new Error(`formationFor: building ${b.id} stands on two plots`);
    placed.add(b.id);
    if (b.kind === 'economy' || b.kind === 'utility') return;
    const squad = b.squad, emplacement = b.kind === 'tower';
    if (!squad || !Number.isInteger(squad.count) || squad.count < 1 || (emplacement && squad.count !== 1)) {
      throw new Error(`formationFor: ${b.kind} ${b.id} needs a squad${emplacement ? ' of one emplacement' : ''}`);
    }
    const slot = slots[i]!, lane = geom.lanes[p.lane]!;
    const at = emplacement ? [emplacementPosition(slot)] : slotPositions(squad.count, slot, side);
    squads.push({
      building: b.id, plot: i, lane: p.lane, rank: p.rank, file: p.file, slot, unitId: squad.unitId, emplacement,
      mergeOn: b.mergeOn, eligible: !emplacement && squad.eligible !== false, overflows: overflows(squad.count, squad.radius),
      units: at.map((u) => inLane(u, lane, squad.radius, geom.width)),
    });
  });
  return { slots, squads };
}

/**
 * The muster (§5.6): a side's squads knit in place to a fixed point by R1's `musterKnits`, on
 * `formationFor`'s positions, walking the units in arrival order (A024). A trio never crosses a root
 * wall, whatever the merge radius (A040). Units are keyed by arrival, so the result depends only on the
 * colony; Begin runs `musterKnits` on the same positions with the arrived units' ids (plan call 4).
 */
export function musterFor(input: MusterInput): MergePreview {
  const { squads } = formationFor(input);
  const units: MusterUnit[] = [];
  const partsOf = new Map<number, MusterTrio['parts']>();
  for (const s of squads) {
    s.units.forEach((at, j) => {
      partsOf.set(units.length, [{ building: s.building, j }]);
      units.push({ key: units.length, side: input.side, lane: s.lane, unitId: s.unitId, tier: 1, x: at.x, y: at.y, mergeOn: s.mergeOn, eligible: s.eligible, source: s.building });
    });
  }
  const opts: MusterOpts = {
    firstKey: units.length, mergeRadius: input.mergeRadius, radiusOf: input.radiusOf,
    lanes: input.geom.lanes.map((l) => ({ top: l.rowStart, bottom: l.rowEnd })), width: input.geom.width,
  };
  const { passes, units: fielded } = musterKnits(units, opts);
  const byBuilding: Record<number, TierCounts> = {};
  for (const s of squads) byBuilding[s.building] = { elders: 0, bloomed: 0, base: 0 };
  for (const u of fielded) byBuilding[u.source]![u.tier === 3 ? 'elders' : u.tier === 2 ? 'bloomed' : 'base']++;
  // Each trio's unit, made again by R1's `knit` with the key `musterKnits` gave it: keys follow the trios in `passes` order
  const byKey = new Map(units.map((u) => [u.key, u]));
  let key = opts.firstKey;
  const trios: MusterTrio[] = [];
  passes.forEach((pass, p) => {
    for (const trio of pass) {
      const made = knit(trio.map((k) => byKey.get(k)!), key++, opts);
      const parts = trio.flatMap((k) => partsOf.get(k)!);
      byKey.set(made.key, made);
      partsOf.set(made.key, parts);
      trios.push({ parts, tier: made.tier as 2 | 3, x: made.x, y: made.y, pass: p + 1 });
    }
  });
  return { byBuilding, trios };
}

/**
 * A change to a colony that `formationOf` and `mergePreview` preview without touching the state (§14.6,
 * plan call 6, A060): the ghost before a plant, a sale or a toggle.
 */
export type PlanChange = { plant: { buildingId: string; plot: number } } | { sell: number } | { toggle: { id: number; on: boolean } };

/**
 * A side's squads as they arrive at the clash (§4.6, §14.6): `formationFor` on its colony as it stands, or
 * as it would stand after `change`. It's the one formation rule, which the arrival, the planning preview
 * and the AI read. It writes nothing and draws on no stream (§13.3), so a preview equals the state after
 * the change; a change its command would refuse now previews the colony as it stands.
 */
export function formationOf(state: BattleState, side: Side, change?: PlanChange): SquadPlan[] {
  return formationFor(formationInput(state, side, change)).squads;
}

/** What a side fields after the muster (§5.6, §14.6): `musterFor` on `formationOf`'s colony, with the side's merge radius. */
export function mergePreview(state: BattleState, side: Side, change?: PlanChange): MergePreview {
  const { units, mergeRadius } = state.compiled[side];
  return musterFor({ ...formationInput(state, side, change), mergeRadius, radiusOf: (unitId, tier) => units[unitId]!.tiers[tier - 1]!.radius });
}

/** T020's plain input from the state: the map's geometry and the side's plots, each with its building as the formation reads it. */
function formationInput(state: BattleState, side: Side, change: PlanChange | undefined): FormationInput {
  const plots: FormationPlot[] = state.sides[side].plots.map((p) => {
    const b = p.building ? state.buildings.find((x) => x.id === p.building) : undefined;
    return { lane: p.lane, rank: p.rank, file: p.file, building: b ? fielding(state, side, b.id, b.buildingId, b.mergeOn) : null };
  });
  if (change) applyChange(state, side, plots, change);
  return { geom: { width: state.map.width, lanes: state.lanes, gapTiles: state.rules.formationGapTiles }, side, plots };
}

/** Makes a change on the input's own plots, as its command would make it, unless the command would refuse it now. */
function applyChange(state: BattleState, side: Side, plots: FormationPlot[], change: PlanChange): void {
  const at = (id: number): FormationPlot => plots.find((p) => p.building?.id === id)!;
  if ('plant' in change) {
    const { buildingId, plot } = change.plant;
    // with the id `plant` would give it, and its toggle on
    if (!plantProblem(state, side, buildingId, plot)) plots[plot]!.building = fielding(state, side, state.nextId, buildingId, true);
  } else if ('sell' in change) {
    if (!sellProblem(state, side, change.sell)) at(change.sell).building = null;
  } else if (!toggleProblem(state, side, change.toggle.id)) {
    const p = at(change.toggle.id);
    p.building = { ...p.building!, mergeOn: change.toggle.on };
  }
}

/** A building as the formation reads it, from its compiled card (§4.4): a spawner's squad, or a tower's one emplacement. */
function fielding(state: BattleState, side: Side, id: number, buildingId: string, mergeOn: boolean): FieldingBuilding {
  const card = state.compiled[side].buildings[buildingId]!;
  if (!card.squad) return { id, kind: card.kind, mergeOn };
  const unit = state.compiled[side].units[card.squad.unit]!;
  return { id, kind: card.kind, squad: { unitId: unit.id, count: card.squad.count, radius: unit.tiers[0].radius, eligible: knitsAtMuster(state, unit) }, mergeOn };
}

/**
 * Whether a squad's units may knit at the muster, toggle aside (§5.6): never with the battle's merging off,
 * nor a unit that arrives burrowed, nor a Burster while bursts are in play, as v1's merging has it.
 */
function knitsAtMuster(state: BattleState, unit: CompiledUnit): boolean {
  return state.config.flags.merging && !unit.tags.includes('burrow') && !(state.rules.burst && unit.tags.includes('burst'));
}

const byPlace = (p: FormationPlot, q: FormationPlot): number => p.lane - q.lane || p.rank - q.rank || p.file - q.file;

/** A unit's position held inside its lane by its radius, as `clampToLane` (`world.ts`) holds it. */
function inLane(at: Point, lane: { rowStart: number; rowEnd: number }, r: number, width: number): Point {
  let { x, y } = at;
  const top = lane.rowStart + r, bottom = lane.rowEnd + 1 - r;
  if (y < top) y = top; else if (y > bottom) y = bottom;
  if (x < r) x = r; else if (x > width - r) x = width - r;
  return { x, y };
}
