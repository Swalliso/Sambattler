// The formation and the muster (SPEC §4.6, §5.6, §14.6). The pure core (R1): a side's formation box, its
// 2×2 slots, where a squad's units stand in their slot, and how squads with merging on knit in place at the
// clash's opening muster. These are pure functions of plain records. They read no battle state and draw on
// no random stream (§13.3 rule 2), so the same colony always gives the same formation and a preview can't
// differ from the clash. R1's clash check (`tools/lib/clash.ts`) calls them on its armies. `findTrios` keeps
// the detection rule of `detectTrios` in `systems/merging.ts` but breaks exact ties by key, where
// `detectTrios` leaves them to floating-point rounding; tests/unit/formation.test.ts checks that the two
// agree on the sim's own cases.
//
// On it (R2a): `formationFor` stands a side's squads in the formation box its colony copies, and `musterFor`
// knits them in place at the clash's opening muster, to a fixed point, giving `mergePreview`'s shape (plan
// call 5). `formationOf` and `mergePreview` build their input from the state, with an optional change to
// preview (plan call 6), and the arrival puts units where `formationOf` says, so the preview and the clash
// can't disagree.
import type { BuildingDef } from '../data/schema.ts';
import { counterKindsOf, doctrineKinds } from './ai/counter.ts';
import { buildingMatcher, resolveStat } from './effects.ts';
import type { Place } from './effects.ts';
import { plantProblem, sellProblem, toggleProblem } from './planning.ts';
import type { BattleState, CompiledBuilding, CompiledUnit, Side, Tier } from './state.ts';

/** A field's geometry: its width in tiles, its lanes' tile rows, and the tiles between the two front ranks. */
export interface FieldGeom {
  width: number;
  lanes: readonly { rowStart: number; rowEnd: number }[];
  gapTiles: number;
}

/** One 2×2 slot of a formation box, named as its plot is (§4.6), at its top-left tile. */
export interface Slot {
  lane: number;
  /** 0 is the front rank, which faces the other side's across the gap. */
  rank: number;
  /** 1 at the lane's top row, on both sides. */
  file: number;
  col: number;
  row: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A side's formation box: `ranks` deep, with one slot per pair of rows in each lane (a leftover row holds
 * none), set mid-field with `gapTiles` between the two sides' front ranks. The player's ranks run back
 * toward x = 0 and the general's toward x = width, so the two boxes mirror. Slots are ordered by lane,
 * then rank, then file (§13.3 rule 4).
 */
export function formationBox(geom: FieldGeom, side: Side, ranks: number): Slot[] {
  const span = geom.width - geom.gapTiles;
  if (span % 2 !== 0) throw new Error(`formationBox: the width less the gap (${geom.width} - ${geom.gapTiles}) must be even to centre the box`);
  const front = span / 2 - 2; // the player's front-rank column
  if (front - 2 * (ranks - 1) < 0) throw new Error(`formationBox: ${ranks} ranks don't fit a field ${geom.width} wide`);
  const slots: Slot[] = [];
  geom.lanes.forEach((lane, l) => {
    const files = Math.floor((lane.rowEnd - lane.rowStart + 1) / 2);
    for (let rank = 0; rank < ranks; rank++) {
      const col = side === 'player' ? front - 2 * rank : geom.width - 2 - front + 2 * rank;
      for (let file = 1; file <= files; file++) slots.push({ lane: l, rank, file, col, row: lane.rowStart + 2 * (file - 1) });
    }
  });
  return slots;
}

/** The grid a squad of n stands on in its slot: k × k cells, k = ceil(sqrt(n)), each 2/k tiles wide. */
export function slotGrid(n: number): { k: number; spacing: number } {
  const k = Math.ceil(Math.sqrt(n));
  return { k, spacing: 2 / k };
}

/**
 * Where a squad of n stands in its slot, each unit at its cell's centre: unit j in the grid's column
 * j mod k, counted from the slot's front (its +x edge for the player, its −x edge for the general), and
 * its row floor(j / k), counted from the top. So the grid fills front to back, then top to bottom.
 */
export function slotPositions(n: number, slot: Slot, side: Side): Point[] {
  const { k, spacing } = slotGrid(n);
  const out: Point[] = [];
  for (let j = 0; j < n; j++) {
    const depth = ((j % k) + 0.5) * spacing;
    out.push({ x: side === 'player' ? slot.col + 2 - depth : slot.col + depth, y: slot.row + (Math.floor(j / k) + 0.5) * spacing });
  }
  return out;
}

/** Where a tower's emplacement stands: its slot's centre. */
export function emplacementPosition(slot: Slot): Point {
  return { x: slot.col + 1, y: slot.row + 1 };
}

/**
 * True if a squad of n units of this radius is too big to stand apart in its slot: its units are wider
 * than the grid's spacing. It still fields on the same grid, packed tighter (§4.6's first guess, §18.2 #11).
 */
export function overflows(n: number, radius: number): boolean {
  return 2 * radius > slotGrid(n).spacing;
}

/** A unit at the muster, as a plain record. Its key orders it as the sim's id does (§13.3 rule 4). */
export interface MusterUnit {
  key: number;
  side: Side;
  lane: number;
  unitId: string;
  tier: Tier;
  x: number;
  y: number;
  /** Its squad's merge toggle (§5.6). */
  mergeOn: boolean;
  /** False for a unit that can't knit whatever its toggle: burrowed, or a `burst` unit (§5.6). */
  eligible: boolean;
  /** Its building's id, the sim's `sourceBuildingId`. */
  source: number;
}

/** A trio's three keys, ascending. */
export type Trio = [number, number, number];

export interface MusterOpts {
  /** The key the first merged unit takes. Pass `state.nextId`, so each key is the id `mergeTriosNow` gives. */
  firstKey: number;
  /** The side's merge radius, with any bonus (§5.6). */
  mergeRadius: number;
  /** A unit's body radius at a tier, which clamps a merged unit to its lane. */
  radiusOf: (unitId: string, tier: Tier) => number;
  /** Each lane's top and bottom tile rows (`rowStart` and `rowEnd`), by lane index. */
  lanes: readonly { top: number; bottom: number }[];
  /** The map's width in tiles. */
  width: number;
}

/**
 * One pass of merging's detection rule (§5.6), as `detectTrios` runs it. Per side, walk the eligible
 * units in key order. Each unit not yet reserved takes the two nearest unreserved units of its type,
 * tier and lane within `radius` (squared centre distance ≤ radius², ties to the lower key), and the
 * three are reserved. A tie is exact: squared distances within `TIE` of each other are equal, so the same
 * colony musters the same on both sides of the field. Returns each trio's keys ascending, the trios in
 * order of their lowest key: the order `resolveKnits` completes knits in.
 */
export function findTrios(units: readonly MusterUnit[], radius: number): Trio[] {
  return walk([...units].sort(byKey), radius).map(keysOf);
}

/**
 * The muster's knitting (§5.6): one side's units knit in place to a fixed point. Each pass finds trios by
 * `findTrios`'s rule, and each trio becomes one unit of the next tier at its centroid, clamped to its lane
 * by its new radius as `addUnit` clamps it (`clampToLane`, `world.ts`), with its lowest-key parent's
 * `source` and `mergeOn`. New keys follow the trios in `passes` order from `opts.firstKey`, so the caller
 * that applies each pass with `mergeTriosNow` in that order gets the same units with ids equal to keys.
 * Passes repeat until none forms. The input is left as it was; `units` comes back in key order, and the
 * passes are returned so the caller can apply them once with their side effects (A032).
 */
export function musterKnits(units: readonly MusterUnit[], opts: MusterOpts): { passes: Trio[][]; units: MusterUnit[] } {
  let list = units.map((u) => ({ ...u })).sort(byKey);
  checkKeys(list, opts.firstKey);
  const passes: Trio[][] = [];
  let next = opts.firstKey;
  for (let found = walk(list, opts.mergeRadius); found.length; found = walk(list, opts.mergeRadius)) {
    const parents = new Set<number>();
    for (const trio of found) {
      for (const u of trio) parents.add(u.key);
      list.push(knit(trio, next++, opts)); // above every key, so `list` stays in key order
    }
    list = list.filter((u) => !parents.has(u.key));
    passes.push(found.map(keysOf));
  }
  return { passes, units: list };
}

/**
 * Squared distances closer than this are a tie (§5.6: ties go to the lower key). §4.6's grid stands many
 * units at exactly equal distances, and the two sides' mirrored positions round differently (13 − 1/3
 * against 19 + 1/3), so strict comparisons alone sent ties different ways by seat (R1/T053). Rounding
 * moves a squared distance by about 1e-14; two different distances on the grid differ by over 1e-4.
 */
const TIE = 1e-9;

/** `findTrios` on units already in key order, returning the trios' units. */
function walk(units: readonly MusterUnit[], radius: number): MusterUnit[][] {
  const r2 = radius * radius;
  const reserved = new Uint8Array(units.length);
  const trios: MusterUnit[][] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (reserved[i] || !canKnit(u)) continue;
    // the two nearest unreserved matches; scanning in key order, a match must be nearer by more than TIE
    // to displace one found earlier, so ties go to the lower key
    let a = -1, b = -1, da = Infinity, db = Infinity;
    for (let j = 0; j < units.length; j++) {
      if (j === i || reserved[j]) continue;
      const v = units[j]!;
      if (!canKnit(v) || v.side !== u.side || v.unitId !== u.unitId || v.tier !== u.tier || v.lane !== u.lane) continue;
      const dx = v.x - u.x, dy = v.y - u.y;
      const d = dx * dx + dy * dy;
      if (d > r2 + TIE) continue;
      if (d < da - TIE) { b = a; db = da; a = j; da = d; }
      else if (d < db - TIE) { b = j; db = d; }
    }
    if (b < 0) continue;
    reserved[i] = 1; reserved[a] = 1; reserved[b] = 1;
    trios.push([u, units[a]!, units[b]!].sort(byKey));
  }
  return trios.sort((p, q) => p[0]!.key - q[0]!.key);
}

/**
 * The unit a trio (in key order) knits into, as `complete` in `systems/merging.ts` places it. R2a's
 * `musterFor` (`rounds/formation.ts`) makes each trio's unit again with it, to show where the muster
 * knits each one, Bloomed units that later knit into an Elder included.
 */
export function knit(trio: readonly MusterUnit[], key: number, opts: MusterOpts): MusterUnit {
  const [a, b, c] = trio as [MusterUnit, MusterUnit, MusterUnit];
  const tier = (a.tier + 1) as Tier;
  const lane = opts.lanes[a.lane];
  if (!lane) throw new Error(`musterKnits: no rows given for lane ${a.lane}`);
  const r = opts.radiusOf(a.unitId, tier);
  // the centroid summed in key order, then `clampToLane`'s bounds for the new radius
  let x = (a.x + b.x + c.x) / 3, y = (a.y + b.y + c.y) / 3;
  const top = lane.top + r, bottom = lane.bottom + 1 - r;
  if (y < top) y = top; else if (y > bottom) y = bottom;
  if (x < r) x = r; else if (x > opts.width - r) x = opts.width - r;
  return { key, side: a.side, lane: a.lane, unitId: a.unitId, tier, x, y, mergeOn: a.mergeOn, eligible: true, source: a.source };
}

/** The muster's keys must be distinct, on one side (the merge radius is the side's), and below `firstKey`. */
function checkKeys(sorted: readonly MusterUnit[], firstKey: number): void {
  for (let i = 1; i < sorted.length; i++) {
    const u = sorted[i]!;
    if (u.key === sorted[i - 1]!.key) throw new Error(`musterKnits: key ${u.key} is used twice`);
    if (u.side !== sorted[0]!.side) throw new Error('musterKnits: give one side a call');
  }
  const last = sorted[sorted.length - 1];
  if (last && firstKey <= last.key) throw new Error(`musterKnits: firstKey ${firstKey} must be above every key (${last.key})`);
}

const canKnit = (u: MusterUnit): boolean => u.tier < 3 && u.mergeOn && u.eligible;
const byKey = (p: MusterUnit, q: MusterUnit): number => p.key - q.key;
const keysOf = (t: readonly MusterUnit[]): Trio => [t[0]!.key, t[1]!.key, t[2]!.key];

// ---- the formation of a colony (R2a) ----

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

/**
 * What a building's squad reads as it fields (§14.2): its plot's rank and terrain, whether it was planted in
 * this planning phase, and whether it's in its side's counter sets in force (R2-Q17). Begin's per-squad stats
 * and the formation's squad counts read the same place, so a preview equals the arrival (A028).
 */
export function fieldPlace(state: BattleState, side: Side, plot: number, buildingId: string, plantedRound: number): Place {
  const p = state.sides[side].plots[plot]!, c = state.compiled[side];
  const kinds = doctrineKinds(state.sides[side].ai?.counter);
  return {
    rank: p.rank, terrain: p.terrain, planted: plantedRound === state.round,
    inCounterSet: kinds.length > 0 && counterKindsOf({ cards: c.buildings, units: c.units }, buildingId).some((k) => kinds.includes(k)),
  };
}

/** T020's plain input from the state: the map's geometry and the side's plots, each with its building as the formation reads it. */
function formationInput(state: BattleState, side: Side, change: PlanChange | undefined): FormationInput {
  const plots: FormationPlot[] = state.sides[side].plots.map((p, i) => {
    const b = p.building ? state.buildings.find((x) => x.id === p.building) : undefined;
    return { lane: p.lane, rank: p.rank, file: p.file, building: b ? fielding(state, side, b.id, b.buildingId, b.mergeOn, i, b.plantedRound) : null };
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
    if (!plantProblem(state, side, buildingId, plot)) plots[plot]!.building = fielding(state, side, state.nextId, buildingId, true, plot, state.round);
  } else if ('sell' in change) {
    if (!sellProblem(state, side, change.sell)) at(change.sell).building = null;
  } else if (!toggleProblem(state, side, change.toggle.id)) {
    const p = at(change.toggle.id);
    p.building = { ...p.building!, mergeOn: change.toggle.on };
  }
}

/** A building as the formation reads it, from its compiled card (§4.4): a spawner's squad, or a tower's one emplacement. */
function fielding(state: BattleState, side: Side, id: number, buildingId: string, mergeOn: boolean, plot: number, plantedRound: number): FieldingBuilding {
  const card = state.compiled[side].buildings[buildingId]!;
  if (!card.squad) return { id, kind: card.kind, mergeOn };
  const unit = state.compiled[side].units[card.squad.unit]!;
  const count = squadCount(state, side, card, plot, plantedRound);
  return { id, kind: card.kind, squad: { unitId: unit.id, count, radius: unit.tiers[0].radius, eligible: knitsAtMuster(state, unit) }, mergeOn };
}

/**
 * A spawner's squad at its plot (§4.4, §14.2): its count with the side's `building.squadCount` modifiers that
 * its place meets, such as Fresh Spores' +1 in the clash after planting, and at least 1. A tower fields one
 * emplacement whatever they say.
 */
function squadCount(state: BattleState, side: Side, card: CompiledBuilding, plot: number, plantedRound: number): number {
  const mods = state.compiled[side].squadMods, base = card.squad!.count;
  if (card.kind !== 'spawner' || !mods.length) return base;
  const place = fieldPlace(state, side, plot, card.id, plantedRound);
  return Math.max(1, Math.round(resolveStat(base, mods, 'building.squadCount', buildingMatcher(state.library, card.id, place))));
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
