// The formation (SPEC §4.6): a side's formation box, its 2×2 slots, and where a squad's units stand in
// their slot. These are pure functions of plain data. They read no battle state and draw on no random
// stream (§13.3 rule 2), so the same colony always gives the same formation and a preview can't differ
// from the clash. R1's clash check (`tools/lib/clash.ts`) calls them on its armies. R2a's `formationOf`
// maps plots to these slots, and it and the arrival call these functions unchanged (§13.4, §14.6).
import type { Side } from './state.ts';

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
