// §7.3's placement scores in rounds (SPEC §4.6, §7.3): a planner's colony is its formation, so where it
// plants a building is where its squad stands: melee and Bursters in front, ranged, support and emplacements
// behind, economy at the back.
// Call 11's back-line term prefers the third rank to the front (A043). Each candidate takes noise of
// ±`score.noise` from the side's own AI stream, drawn in plot order, before the ties, which go to the front
// rank, then the lower file. On a map of several lanes it first picks a lane by #30's rule, which reads only
// the fielded record (A047). The weights are `balance.rounds.ai.score`. It stands beside v1's controller
// until R2b moves it to `src/sim/ai/formationScore.ts`.
import { nextSigned } from '../../rng.ts';
import { buildable, plotNeighbors } from '../colony.ts';
import type { ColonyPlot } from '../colony.ts';
import { other } from '../state.ts';
import type { PlanningView } from './view.ts';

/** Where a building stands in the line (§7.3). */
export type LineRole = 'front' | 'back' | 'economy' | 'utility';

/** Tags that put a spawner in the back line (§7.3). A Burster rolls at the enemy's thickest knot, so `burst` is a front-line tag (T159). */
const BACK_TAGS: readonly string[] = ['ranged', 'support'];

/** A building's place in the line (§7.3): a spawner of ranged or support units and every tower behind, other spawners in front. */
export function lineRole(view: PlanningView, buildingId: string): LineRole {
  const card = view.cards[buildingId]!;
  if (card.kind === 'economy' || card.kind === 'utility') return card.kind;
  if (card.kind === 'tower') return 'back';
  const unit = card.squad ? view.units[card.squad.unit] : undefined;
  return unit?.tags.some((t) => BACK_TAGS.includes(t)) ? 'back' : 'front';
}

/** The distance in tiles from the centre of plot i's file to its lane's centre: 3, 1, 1, 3 on 4 files and 2, 0, 2 on 3 (§7.3). */
export function offCentre(plots: readonly Pick<ColonyPlot, 'lane' | 'rank' | 'file'>[], i: number): number {
  const p = plots[i]!;
  const files = plots.filter((q) => q.lane === p.lane && q.rank === p.rank).length;
  return Math.abs(2 * p.file - files - 1);
}

/** A squad's supply as it arrives: its count × its unit's base supply, 0 for an emplacement or a building that fields none (§5.4). */
export function squadSupply(view: PlanningView, buildingId: string): number {
  const squad = view.cards[buildingId]?.squad;
  return squad ? squad.count * view.units[squad.unit]!.tiers[0].supply : 0;
}

/**
 * Plot i's score for the building (§7.3), before noise. `depth` is the plot's rank. `merges` says whether
 * the building's squads merge this round, step 3's toggle (§7.2), which a neighbour of the same building
 * shares, so the +2 beside it holds only then.
 */
export function plotScore(view: PlanningView, buildingId: string, plot: number, merges: boolean): number {
  const k = view.knobs.score, p = view.plots[plot]!, depth = p.rank, off = offCentre(view.plots, plot);
  const near = plotNeighbors(view.plots, plot);
  const holds = (i: number | null, test: (buildingId: string) => boolean): boolean => {
    const id = i === null ? 0 : view.plots[i]!.building;
    const b = id ? view.buildings.find((x) => x.id === id) : undefined;
    return b !== undefined && test(b.buildingId);
  };
  const beside = merges && near.beside.some((i) => holds(i, (id) => id === buildingId)) ? k.besideSame : 0;
  switch (lineRole(view, buildingId)) {
    case 'front':
      return -k.depth * depth - k.offCentre * off + beside;
    case 'back': {
      const support = holds(near.inFront, (id) => lineRole(view, id) === 'front') ? k.frontSupport : 0;
      return -k.depth * Math.max(0, 1 - depth) - k.backThird * Math.max(0, depth - 1) - k.offCentre * off + support + beside;
    }
    case 'economy':
      return k.depth * depth + (p.terrain === 'loam' ? k.loam : 0) + k.offCentre * off;
    case 'utility':
      return k.depth * depth + k.offCentre * off;
  }
}

/** The side's free plots, in plot order: open, not a stump plot, and empty (§4.6). */
export function freePlots(view: PlanningView): number[] {
  const out: number[] = [];
  view.plots.forEach((p, i) => { if (buildable(p) && p.building === 0) out.push(i); });
  return out;
}

/**
 * The best free plot for the building (§7.3), or null if none: in the lane `laneFor` picks, each candidate
 * scored with its noise, drawn in plot order. A strictly better score wins, so ties go to the earlier plot,
 * the front rank, then the lower file.
 */
export function choosePlot(view: PlanningView, buildingId: string, merges: boolean): number | null {
  const free = freePlots(view);
  if (!free.length) return null;
  const lane = laneFor(view, buildingId, free);
  let best: number | null = null, bestScore = -Infinity;
  for (const i of free) {
    if (view.plots[i]!.lane !== lane) continue;
    const score = plotScore(view, buildingId, i, merges) + nextSigned(view.rng) * view.knobs.score.noise;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  return best;
}

/**
 * The lane for the building on a map of several lanes (§7.3, #30), among the lanes with a free plot, so a
 * full lane falls back to the others:
 * - a spawner or a tower: the lane it lost by most last round, its need the other side's surviving supply
 *   less its own when the lane ended, and each spawner it planted this round lowering its lane's need by its
 *   squad's supply. A Blightwright's spawner (`laneStyle: aggressive`) goes to the lane where the other side
 *   fielded least supply instead;
 * - economy and utility: a lane with a free loam plot, else the lane with more free plots behind the front;
 * - in round 1 and on ties: the lane where it has planned less supply, then the lower lane.
 */
export function laneFor(view: PlanningView, buildingId: string, free: readonly number[]): number {
  const lanes = [...new Set(free.map((i) => view.plots[i]!.lane))];
  if (lanes.length === 1) return lanes[0]!;
  const last = view.rounds.at(-1), them = other(view.side), role = lineRole(view, buildingId);
  const supplyIn = (lane: number, thisRound: boolean): number => view.buildings.reduce((n, b) => (
    view.plots[b.plot]!.lane === lane && (!thisRound || b.plantedRound === view.round) ? n + squadSupply(view, b.buildingId) : n
  ), 0);
  const freeIn = (lane: number, test: (p: ColonyPlot) => boolean): number => free.filter((i) => view.plots[i]!.lane === lane && test(view.plots[i]!)).length;
  let key: (lane: number) => number[];
  if (role === 'economy' || role === 'utility') {
    key = (lane) => [freeIn(lane, (p) => p.terrain === 'loam') > 0 ? 1 : 0, freeIn(lane, (p) => p.rank > 0)];
  } else if (view.ai?.laneStyle === 'aggressive' && view.cards[buildingId]!.kind === 'spawner') {
    const fielded = (lane: number): number => (last?.fielded[them] ?? []).reduce((n, f) => (
      f.lane === lane ? n + f.count * (view.theirUnits[f.unitId]?.tiers[f.tier - 1]!.supply ?? 0) : n
    ), 0);
    key = (lane) => [-fielded(lane)];
  } else {
    const lost = (lane: number): number => (last ? last.lanes[lane]!.survivors[them] - last.lanes[lane]!.survivors[view.side] : 0);
    key = (lane) => [lost(lane) - supplyIn(lane, true)];
  }
  // higher keys first, then less supply planned, then the lower lane
  const ranked = lanes.map((lane) => ({ lane, key: [...key(lane), -supplyIn(lane, false), -lane] }));
  ranked.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return b.key[i]! - a.key[i]!;
    return 0;
  });
  return ranked[0]!.lane;
}
