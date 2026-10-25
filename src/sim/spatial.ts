// Uniform-grid spatial hash with 2-tile cells, rebuilt every tick (SPEC §13.7). It is a transient
// scratch structure (not part of the state) with reused typed arrays, so it never allocates in
// the hot loop once warm. Indices refer to positions in `state.units` at build time.
import type { BattleState } from './state.ts';

const CELL = 2;

interface Grid {
  cols: number;
  rows: number;
  head: Int32Array;
  next: Int32Array;
  size: number;
}

const grid: Grid = { cols: 0, rows: 0, head: new Int32Array(64), next: new Int32Array(512), size: 0 };
let near = new Int32Array(512);

export function buildGrid(state: BattleState): void {
  const cols = Math.ceil(state.map.width / CELL) + 1;
  const rows = Math.ceil(state.map.height / CELL) + 1;
  const n = state.units.length;
  if (grid.head.length < cols * rows) grid.head = new Int32Array(cols * rows);
  if (grid.next.length < n) grid.next = new Int32Array(n * 2);
  if (near.length < n) near = new Int32Array(n * 2);
  grid.cols = cols;
  grid.rows = rows;
  grid.size = n;
  grid.head.fill(-1, 0, cols * rows);
  // insert in descending index order so each cell's list iterates in ascending index (id) order
  for (let i = n - 1; i >= 0; i--) {
    const u = state.units[i]!;
    let cx = Math.floor(u.x / CELL), cy = Math.floor(u.y / CELL);
    if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
    if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
    const cell = cx + cy * cols;
    grid.next[i] = grid.head[cell]!;
    grid.head[cell] = i;
  }
}

/**
 * Collects indices of units whose cell overlaps the square of half-size `r` around (x, y).
 * Returns the count; the indices are in `nearBuffer()` until the next query. Callers filter by
 * exact distance, side and lane.
 */
export function queryNear(x: number, y: number, r: number): number {
  let x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
  let y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
  if (x0 < 0) x0 = 0;
  if (y0 < 0) y0 = 0;
  if (x1 >= grid.cols) x1 = grid.cols - 1;
  if (y1 >= grid.rows) y1 = grid.rows - 1;
  let count = 0;
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      let i = grid.head[cx + cy * grid.cols]!;
      while (i !== -1) {
        near[count++] = i;
        i = grid.next[i]!;
      }
    }
  }
  return count;
}

export function nearBuffer(): Int32Array {
  return near;
}
