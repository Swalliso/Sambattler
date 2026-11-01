// The formation and the muster (SPEC §4.6, §5.6): a side's formation box, its 2×2 slots, where a squad's
// units stand in their slot, and how squads with merging on knit in place at the clash's opening muster.
// These are pure functions of plain records. They read no battle state and draw on no random stream
// (§13.3 rule 2), so the same colony always gives the same formation and a preview can't differ from
// the clash. R1's clash check (`tools/lib/clash.ts`) calls them on its armies. R2a's `formationOf` maps
// plots to these slots, and it, `mergePreview` and the arrival call these functions unchanged (§13.4,
// §14.6). `findTrios` copies the detection rule of `detectTrios` in `systems/merging.ts`, which stays as
// it is; tests/unit/formation.test.ts checks that the two agree.
import type { Side, Tier } from './state.ts';

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
 * three are reserved. Returns each trio's keys ascending, the trios in order of their lowest key: the
 * order `resolveKnits` completes knits in.
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

/** `findTrios` on units already in key order, returning the trios' units. */
function walk(units: readonly MusterUnit[], radius: number): MusterUnit[][] {
  const r2 = radius * radius;
  const reserved = new Uint8Array(units.length);
  const trios: MusterUnit[][] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (reserved[i] || !canKnit(u)) continue;
    // the two nearest unreserved matches; scanning in key order with strict < sends ties to the lower key
    let a = -1, b = -1, da = Infinity, db = Infinity;
    for (let j = 0; j < units.length; j++) {
      if (j === i || reserved[j]) continue;
      const v = units[j]!;
      if (!canKnit(v) || v.side !== u.side || v.unitId !== u.unitId || v.tier !== u.tier || v.lane !== u.lane) continue;
      const dx = v.x - u.x, dy = v.y - u.y;
      const d = dx * dx + dy * dy;
      if (d > r2) continue;
      if (d < da) { b = a; db = da; a = j; da = d; }
      else if (d < db) { b = j; db = d; }
    }
    if (b < 0) continue;
    reserved[i] = 1; reserved[a] = 1; reserved[b] = 1;
    trios.push([u, units[a]!, units[b]!].sort(byKey));
  }
  return trios.sort((p, q) => p[0]!.key - q[0]!.key);
}

/** The unit a trio (in key order) knits into, as `complete` in `systems/merging.ts` places it. */
function knit(trio: readonly MusterUnit[], key: number, opts: MusterOpts): MusterUnit {
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
