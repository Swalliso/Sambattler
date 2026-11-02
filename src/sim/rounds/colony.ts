// The colony (SPEC §4.6, §11.9): a map's `colony` block cut into fixed 2×2 plots. Ranks count back from
// the arena (rank 0 borders it), and files from 1 at each lane's top row, on both sides. The general's
// colony is the point mirror of yours (§4.1), so its file 1 mirrors your last file and its loam lane
// faces your stump lane. Ranks past `startRanks` stay closed until the run gains plots, which open in
// #19's order (§18.2). These are pure functions of the map, and plots go lane, rank, file (§13.3 rule 4).
import type { MapDef } from '../../data/schema.ts';
import type { Side } from '../state.ts';

export type Terrain = 'soil' | 'loam' | 'stump';

/** A plot as `PlotState` holds it (§14.4), without its building: its place, top-left tile, terrain and whether it's open. */
export interface ColonyPlot {
  lane: number;
  /** 0 is the front rank, which borders the arena; 2 is the third rank, closed until gained. */
  rank: number;
  /** 1 at the lane's top row, on both sides. */
  file: number;
  col: number;
  row: number;
  terrain: Terrain;
  open: boolean;
}

/** The plots neighbouring one (§4.6), which combos read (§11.14), as indices into the same list. */
export interface PlotNeighbors {
  /** The plot one rank nearer the enemy, in the same file. */
  inFront: number | null;
  /** The plot one rank farther from the enemy, in the same file. */
  behind: number | null;
  /** The plots in the next files, in the same rank, by file. */
  beside: number[];
}

/**
 * A side's colony: every plot, closed ones included, in plot order, with the first `plotCount` of
 * `openOrder` open. Your rank 0 stands in columns homeCols − 2 and homeCols − 1, and each rank behind
 * it 2 columns nearer x = 0. A lane of odd rows leaves its bottom row out of your plots; the general's
 * plots mirror yours, so its leftover row is the top one. A plot with a stump tile is a stump plot,
 * and otherwise one with a loam tile is a loam plot.
 */
export function colonyPlots(map: MapDef, side: Side, plotCount: number): ColonyPlot[] {
  const { homeCols, tiles } = colonyOf(map);
  const plots: ColonyPlot[] = [];
  map.lanes.forEach((lane, l) => {
    const files = filesOf(lane);
    for (let rank = 0; rank < homeCols / 2; rank++) {
      const col = side === 'player' ? homeCols - 2 - 2 * rank : map.width - homeCols + 2 * rank;
      for (let file = 1; file <= files; file++) {
        const row = side === 'player' ? lane.rowStart + 2 * (file - 1) : lane.rowEnd - 1 - 2 * (files - file);
        plots.push({ lane: l, rank, file, col, row, terrain: terrainAt(tiles, col, row), open: false });
      }
    }
  });
  const order = openOrder(map);
  if (!Number.isInteger(plotCount) || plotCount < 0 || plotCount > order.length) {
    throw new Error(`colonyPlots: ${map.id}'s colony holds 0 to ${order.length} plots, not ${plotCount}`);
  }
  for (const i of order.slice(0, plotCount)) plots[i]!.open = true;
  return plots;
}

/**
 * The order a colony's plots open in, as indices into `colonyPlots`'s list: the `startRanks` ranks'
 * plots in plot order, then each closed rank's (§18.2 #19). A closed rank's files open from the lane's
 * middle out, the upper of two first: 2, 3, 1, 4 on a lane of 4 files and 2, 1, 3 on a lane of 3. On a
 * map of several lanes each file opens in every lane before the next, alternating lanes from the top,
 * as on Twin Roots. The order is the same on both sides, by each side's own files, so the plots both
 * colonies gain face each other in the formation (§4.6).
 */
export function openOrder(map: MapDef): number[] {
  const { homeCols, startRanks } = colonyOf(map);
  const ranks = homeCols / 2;
  const files = map.lanes.map(filesOf);
  const first: number[] = []; // each lane's first index in `colonyPlots`'s list
  let n = 0;
  for (const f of files) { first.push(n); n += ranks * f; }
  const index = (lane: number, rank: number, file: number): number => first[lane]! + rank * files[lane]! + file - 1;
  const order: number[] = [];
  files.forEach((f, lane) => {
    for (let rank = 0; rank < startRanks; rank++) for (let file = 1; file <= f; file++) order.push(index(lane, rank, file));
  });
  const outward = files.map((f) => Array.from({ length: f }, (_, i) => i + 1).sort((a, b) => Math.abs(2 * a - f - 1) - Math.abs(2 * b - f - 1) || a - b));
  for (let rank = startRanks; rank < ranks; rank++) {
    for (let k = 0; k < Math.max(...files); k++) {
      outward.forEach((fileOrder, lane) => { if (k < fileOrder.length) order.push(index(lane, rank, fileOrder[k]!)); });
    }
  }
  return order;
}

/** The plots a colony starts a battle with: its `startRanks` ranks, stump plots included (§4.6). */
export function basePlots(map: MapDef): number {
  return colonyOf(map).startRanks * map.lanes.reduce((n, lane) => n + filesOf(lane), 0);
}

/** True if a building may stand on the plot: it's open and not a stump plot (§4.6). Whether it's free is the state's. */
export function buildable(plot: ColonyPlot): boolean {
  return plot.open && plot.terrain !== 'stump';
}

/**
 * Plot i's neighbours in `plots` (§4.6): in front of, behind and beside it, never at a corner or in
 * another lane. Closed plots count, though no building stands on one.
 */
export function plotNeighbors(plots: readonly Pick<ColonyPlot, 'lane' | 'rank' | 'file'>[], i: number): PlotNeighbors {
  const p = plots[i];
  if (!p) throw new Error(`plotNeighbors: no plot ${i}`);
  const find = (rank: number, file: number): number => plots.findIndex((q) => q.lane === p.lane && q.rank === rank && q.file === file);
  const some = (j: number): number | null => (j < 0 ? null : j);
  return { inFront: some(find(p.rank - 1, p.file)), behind: some(find(p.rank + 1, p.file)), beside: [find(p.rank, p.file - 1), find(p.rank, p.file + 1)].filter((j) => j >= 0) };
}

function colonyOf(map: MapDef): NonNullable<MapDef['colony']> {
  if (!map.colony) throw new Error(`${map.id} has no colony block, so it can't hold a battle in rounds`);
  return map.colony;
}

/** A lane's files: one per pair of rows, a leftover row holding none. */
const filesOf = (lane: { rowStart: number; rowEnd: number }): number => Math.floor((lane.rowEnd - lane.rowStart + 1) / 2);

function terrainAt(tiles: readonly string[], col: number, row: number): Terrain {
  const glyphs = tiles[row]!.slice(col, col + 2) + tiles[row + 1]!.slice(col, col + 2);
  return glyphs.includes('o') ? 'stump' : glyphs.includes('$') ? 'loam' : 'soil';
}
