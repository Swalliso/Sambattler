// Placement spread (step A of docs/ideas/one-more-run-review.md): colony-swarm's version of
// Hivemind's puzzle generator. Does *where* a building goes matter? From a set of paused bot
// battles, place one building at every legal plot, play each on for a fixed horizon over several
// futures, and compare the best plot with the median one. A narrow spread means placement doesn't
// matter. Used by `npm run experiment -- --checks spread`.
//
// Method, per board state (a seed, paused at a clock time) and building:
// - The placing side gets the building's base cost as a gift and pays the plot's price from its
//   bank, so a forward plot costs its supply-line surcharge and every plot leaves the same bank.
//   Plots it can't afford even so are skipped, as in play. "Pass" places nothing and gets nothing.
// - Each future reseeds the combat and AI streams the same way for every plot (common random
//   numbers), so plots are compared on the same luck.
// - The score is the placing side's margin at the horizon, in supply: field supply, plus columns
//   held, plus material (bank + standing buildings' cost × HP fraction) / 50, plus Heartcap HP
//   taken / 50, each as the placing side's minus the opponent's.
// - The best plot is cross-validated: chosen on half the futures and scored on the other half (and
//   the reverse), so noise doesn't inflate it. The split-half rank correlation over plots says how
//   much of the ranking is signal (near 0: placement is noise; near 1: plots really differ).
import type { Content } from '../../src/data/registry.ts';
import { createBattle, makeConfig, queueCommand, restore, runHeadless, seedStream, snapshot } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
import { legalPlacements } from '../../src/sim/placement.ts';
import { columnsOwned } from '../../src/sim/world.ts';
import { median } from './run.ts';

export interface SpreadOptions {
  map: string;
  player: string;
  enemy: string;
  /** Board-state seeds. */
  seeds: number[];
  /** Clock times (seconds) at which each battle is paused. */
  atSeconds: number[];
  buildings: string[];
  horizonSeconds: number;
  /** Futures per plot; split in two halves for the cross-validated best. */
  futures: number;
  /** The placing side's relics (e.g. `mycorrhizalLink`), held from the start of the battle. */
  relics?: string[];
}

/** Gold per supply in the score's material term. */
export const GOLD_PER_SUPPLY = 50;

export interface Margin { supply: number; columns: number; material: number; heartcap: number; total: number }

/** The player side's margin over the enemy, in supply (see the header). */
export function margin(state: BattleState): Margin {
  const side = (s: Side) => {
    let supply = 0, material = state.sides[s].gold;
    for (const u of state.units) if (u.side === s) supply += u.supply;
    for (const b of state.buildings) {
      if (b.side !== s || b.hp <= 0) continue;
      material += (state.compiled[s].buildings[b.buildingId]!.cost * b.hp) / b.maxHp;
    }
    const ss = state.sides[s];
    return { supply, material, lost: ss.heartcapMaxHp - ss.heartcapHp };
  };
  const p = side('player'), e = side('enemy');
  const m = {
    supply: p.supply - e.supply,
    columns: columnsOwned(state, 'player') - columnsOwned(state, 'enemy'),
    material: (p.material - e.material) / GOLD_PER_SUPPLY,
    heartcap: (e.lost - p.lost) / GOLD_PER_SUPPLY,
  };
  return { ...m, total: m.supply + m.columns + m.material + m.heartcap };
}

export interface PlotResult {
  lane: number; col: number; row: number; depth: number; price: number; loam: boolean;
  /** Own buildings sharing an edge with the plot when it is placed. */
  adjacent: number;
  /** Total margin per future. */
  totals: number[];
  mean: number;
}

export interface SpreadCase {
  seed: number;
  atSeconds: number;
  building: string;
  legal: number;
  /** Plots placed (legal, affordable and accepted). */
  plots: number;
  pass: number;
  median: number;
  /** Cross-validated best and worst plots' scores, and the in-sample best for reference. */
  bestCv: number;
  worstCv: number;
  bestInSample: number;
  /** Cross-validated best minus median, and the same over (median − pass): the best plot's edge relative to what the building itself is worth. */
  spread: number;
  spreadVsValue: number;
  /** Split-half Spearman correlation of the plots' scores. */
  splitHalf: number;
  /** Spearman correlation of a plot's score with its depth and its adjacency count. */
  vsDepth: number;
  vsAdjacent: number;
  /** Standard error of one plot's mean over the futures (paired against pass). */
  noise: number;
  best: Omit<PlotResult, 'totals'>;
  plotsDetail?: PlotResult[];
}

function reseed(state: BattleState, seed: number, future: number): void {
  state.rng.combat = seedStream(seed, 'combat', 1000 + future);
  state.rng.ai = seedStream(seed, 'ai', 1000 + future);
}

function adjacentCount(state: BattleState, side: Side, col: number, row: number, w: number, h: number): number {
  let n = 0;
  for (const o of state.buildings) {
    if (o.side !== side || o.hp <= 0) continue;
    const od = state.compiled[o.side].buildings[o.buildingId]!;
    const overlapX = o.col < col + w && col < o.col + od.w;
    const overlapY = o.row < row + h && row < o.row + od.h;
    const touchX = o.col + od.w === col || col + w === o.col;
    const touchY = o.row + od.h === row || row + h === o.row;
    if ((touchX && overlapY) || (touchY && overlapX)) n++;
  }
  return n;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function ranks(xs: number[]): number[] {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    for (let k = i; k <= j; k++) r[order[k]![1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}

export function spearman(a: number[], b: number[]): number {
  if (a.length < 3) return NaN;
  const ra = ranks(a), rb = ranks(b);
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2;
    db += (rb[i]! - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** The paused board state for one seed and clock time. */
export function boardState(content: Content, opts: SpreadOptions, seed: number, atSeconds: number): BattleState {
  const config = makeConfig(content, { seed, mapId: opts.map, player: opts.player, enemy: opts.enemy });
  if (opts.relics?.length) config.player.relics = [...opts.relics];
  const state = createBattle(content, config);
  runHeadless(state, { until: atSeconds * state.rules.tickRate });
  return state;
}

/** Scores every legal plot for one building on one paused board state. */
export function spreadCase(content: Content, opts: SpreadOptions, seed: number, atSeconds: number, building: string, keepPlots = false): SpreadCase | null {
  const board = boardState(content, opts, seed, atSeconds);
  if (board.phase === 'ended') return null;
  const json = snapshot(board);
  const until = board.tick + opts.horizonSeconds * board.rules.tickRate;
  const def = board.compiled.player.buildings[building]!;
  const futures = Array.from({ length: opts.futures }, (_, f) => f);
  const play = (place?: { lane: number; col: number; row: number }): number[] | null => {
    const totals: number[] = [];
    for (const f of futures) {
      const s = restore(json);
      reseed(s, seed, f);
      if (place) {
        s.sides.player.gold += def.cost;
        queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'place', buildingId: building, lane: place.lane, col: place.col, row: place.row });
        runHeadless(s, { until: s.tick + 1 });
        if (!s.buildings.some((b) => b.side === 'player' && b.buildingId === building && b.col === place.col && b.row === place.row)) return null;
      }
      runHeadless(s, { until });
      totals.push(margin(s).total);
    }
    return totals;
  };
  const passTotals = play()!;
  const legal = legalPlacements(board, 'player', building);
  const plots: PlotResult[] = [];
  for (const p of legal) {
    if (p.price > board.sides.player.gold + def.cost) continue;
    const totals = play(p);
    if (!totals) continue;
    plots.push({
      lane: p.lane, col: p.col, row: p.row, depth: p.depth, price: p.price, loam: p.loam,
      adjacent: adjacentCount(board, 'player', p.col, p.row, def.w, def.h), totals, mean: mean(totals),
    });
  }
  if (plots.length < 2) return null;
  const half = (p: PlotResult, h: 0 | 1) => mean(p.totals.filter((_, i) => i % 2 === h));
  const scoreA = plots.map((p) => half(p, 0)), scoreB = plots.map((p) => half(p, 1));
  const argmax = (xs: number[]) => xs.indexOf(Math.max(...xs));
  const argmin = (xs: number[]) => xs.indexOf(Math.min(...xs));
  const medA = median(scoreA), medB = median(scoreB);
  const bestCv = (scoreB[argmax(scoreA)]! + scoreA[argmax(scoreB)]!) / 2;
  const worstCv = (scoreB[argmin(scoreA)]! + scoreA[argmin(scoreB)]!) / 2;
  const means = plots.map((p) => p.mean);
  const med = median(means);
  const pass = mean(passTotals);
  // noise: spread of (plot − pass) across futures, as a standard error of one plot's mean
  const sds = plots.map((p) => {
    const d = p.totals.map((t, i) => t - passTotals[i]!);
    const m = mean(d);
    return Math.sqrt(d.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, d.length - 1));
  });
  const noise = mean(sds) / Math.sqrt(opts.futures);
  const spread = bestCv - (medA + medB) / 2;
  const b = plots[argmax(means)]!;
  const best = { lane: b.lane, col: b.col, row: b.row, depth: b.depth, price: b.price, loam: b.loam, adjacent: b.adjacent, mean: b.mean };
  return {
    seed, atSeconds, building, legal: legal.length, plots: plots.length, pass, median: med,
    bestCv, worstCv, bestInSample: Math.max(...means), spread, spreadVsValue: spread / Math.max(1e-9, Math.abs(med - pass)),
    splitHalf: spearman(scoreA, scoreB), vsDepth: spearman(means, plots.map((p) => p.depth)), vsAdjacent: spearman(means, plots.map((p) => p.adjacent)),
    noise, best, ...(keepPlots ? { plotsDetail: plots } : {}),
  };
}

export function spreadLines(c: SpreadCase): string[] {
  const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(1);
  const clock = `${Math.floor(c.atSeconds / 60)}:${String(c.atSeconds % 60).padStart(2, '0')}`;
  return [
    `spread ${c.building} seed ${c.seed} at ${clock}: ${c.plots}/${c.legal} plots; pass ${f(c.pass)}, median ${f(c.median)} (building worth ${f(c.median - c.pass)}), best ${f(c.bestCv)} (in-sample ${f(c.bestInSample)}), worst ${f(c.worstCv)}`,
    `    best − median ${f(c.spread)} (${Math.round(100 * c.spreadVsValue)}% of the building's worth), noise ±${c.noise.toFixed(1)}; split-half ρ ${c.splitHalf.toFixed(2)}, ρ vs depth ${c.vsDepth.toFixed(2)}, vs adjacency ${c.vsAdjacent.toFixed(2)}; best plot lane ${c.best.lane} col ${c.best.col} row ${c.best.row} (depth ${c.best.depth}, ${c.best.adjacent} adjacent${c.best.loam ? ', loam' : ''})`,
  ];
}

export interface SpreadSummary { cases: number; medianSpread: number; medianSpreadVsValue: number; medianSplitHalf: number; medianNoise: number; medianValue: number }

export function spreadSummary(cases: SpreadCase[]): SpreadSummary {
  return {
    cases: cases.length,
    medianSpread: median(cases.map((c) => c.spread)),
    medianSpreadVsValue: median(cases.map((c) => c.spreadVsValue)),
    medianSplitHalf: median(cases.map((c) => c.splitHalf)),
    medianNoise: median(cases.map((c) => c.noise)),
    medianValue: median(cases.map((c) => c.median - c.pass)),
  };
}
