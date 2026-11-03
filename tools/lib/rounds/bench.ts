// Performance measurement for battles in rounds, shared by `npm run bench -- --rounds` and the round G11 test
// (SPEC §13.7, §15.4; R2a plan Call 24, T113, T114). Its cases: bench-300's clash, played as repeated fresh
// clashes and weighted by live units (A112, A119); R1's full-colony clash on the round loop, its arrival timed
// (R1-Q5, #7, A200); the general's planning turn; one battle with bots on both sides; and the sim part of a
// planning command (A113). It stands beside v1's `tools/lib/bench.ts` until R2b moves it there.
import { performance } from 'node:perf_hooks';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { basePlots, buildable, colonyPlots } from '../../../src/sim/rounds/colony.ts';
import {
  SIDES, commandStamp, createFromScenario, formationOf, mergePreview, queueCommand, restore, snapshot, step,
} from '../../../src/sim/rounds/index.ts';
import type { BattleState, Content, Side } from '../../../src/sim/rounds/index.ts';
import { FULL_COLONY } from '../clash.ts';
import { buildRoundState, runRoundBattle } from './run.ts';


/** Tick times: the mean, p95, p99 and the slowest. */
export interface TickTimes {
  meanMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

function gc(): void {
  const g = (globalThis as { gc?: () => void }).gc;
  if (g) g();
}

const heapKb = (): number => process.memoryUsage().heapUsed / 1024;

/** Each time counted `weights[i]` times: the weighted mean and percentiles (A119). Unweighted when every weight is 1. */
function tickTimes(times: readonly number[], weights: readonly number[] = times.map(() => 1)): TickTimes {
  const order = times.map((_, i) => i).sort((a, b) => times[a]! - times[b]!);
  const total = weights.reduce((a, b) => a + b, 0);
  const q = (p: number): number => {
    let acc = 0;
    for (const i of order) if ((acc += weights[i]!) >= p * total) return times[i]!;
    return times[order.at(-1)!] ?? 0;
  };
  const mean = total ? times.reduce((a, t, i) => a + t * weights[i]!, 0) / total : 0;
  return { meanMs: mean, p95Ms: q(0.95), p99Ms: q(0.99), maxMs: times[order.at(-1)!] ?? 0 };
}

/** Steps through the muster's ticks, which run no targeting, movement or attacks (§5.6), so the cases time only the fight. */
function pastMuster(state: BattleState): void {
  while (state.phase === 'clash' && state.tick < state.clash!.startTick + state.rules.musterTicks) step(state);
}

// ---- bench-300 ----

export interface Bench300 extends TickTimes {
  /** Ticks timed, over this many fresh clashes. */
  ticks: number;
  clashes: number;
  /** Live units at a clash's start, at most and on average over the ticks timed. */
  startUnits: number;
  peakUnits: number;
  meanUnits: number;
  heapGrowthKb: number;
}

/**
 * bench-300's clash (`data/scenarios/rounds/bench-300.json`, §15.4, A112, A119): a clash ends within 900 ticks
 * and its units die from first contact, so this plays fresh clashes until `ticks` fighting ticks are timed, the
 * muster's untimed, after a warm-up on one. Each tick weighs as the live units it began with, so the figures read
 * the cost of a tick at 300 units rather than of the thinning end of each clash.
 */
export function bench300(content: Content, ticks: number): Bench300 {
  const warm = createFromScenario(content, 'bench-300');
  while (warm.phase === 'clash') step(warm);
  const times: number[] = [], units: number[] = [];
  let clashes = 0, startUnits = 0, peak = 0;
  gc();
  const heap0 = heapKb();
  while (times.length < ticks) {
    const state = createFromScenario(content, 'bench-300');
    clashes++;
    startUnits = state.units.length;
    pastMuster(state);
    while (state.phase === 'clash' && times.length < ticks) {
      const n = state.units.length;
      const t0 = performance.now();
      step(state);
      times.push(performance.now() - t0);
      units.push(n);
      if (n > peak) peak = n;
    }
  }
  gc();
  const heapGrowthKb = Math.round(heapKb() - heap0);
  return {
    ticks: times.length, clashes, startUnits, peakUnits: peak, meanUnits: units.reduce((a, b) => a + b, 0) / units.length, heapGrowthKb,
    ...tickTimes(times, units),
  };
}

// ---- the full colony ----

/** R1's fields on the round loop: one lane (test-flat, as Bogwater Hollow without its stumps) and Twin Roots. */
export type ColonyField = 'one' | 'twin';
const COLONY_MAPS: Record<ColonyField, string> = { one: 'test-flat', twin: 'twin-roots' };

/** The spawner whose squad fields the most units (today the Sporeling Burrow's 8), ties to the first id. */
function biggestSquad(content: Content): { buildingId: string; count: number } {
  let best = { buildingId: '', count: 0 };
  for (const id of Object.keys(content.buildings).sort()) {
    const b = content.buildings[id]!;
    if (b.kind === 'spawner' && b.squad && b.squad.count > best.count) best = { buildingId: id, count: b.squad.count };
  }
  return best;
}

/**
 * A full colony on each side (§4.6, §13.7): the map's base plots and sprawl's 4 more (12 on one lane, 16 on Twin
 * Roots), every one planted with the biggest squad, both sides human. `free` plots of the player's are left empty,
 * the last to open, and the player holds gold for a plant there.
 */
function colonyScenario(content: Content, field: ColonyField, opts: { merging: boolean; free?: number }): { def: RoundScenarioDef; buildingId: string; free: number[] } {
  const map = content.maps[COLONY_MAPS[field]]!;
  const plots = basePlots(map) + FULL_COLONY.extraPlots;
  const { buildingId } = biggestSquad(content);
  const open = (s: Side) => colonyPlots(map, s, plots).map((p, i) => ({ p, i })).filter(({ p }) => buildable(p));
  const keep = (s: Side) => (s === 'player' ? open(s).slice(0, open(s).length - (opts.free ?? 0)) : open(s));
  const colony = (s: Side) => keep(s).map(({ p }) => ({ building: buildingId, lane: p.lane, rank: p.rank, file: p.file }));
  const def: RoundScenarioDef = {
    id: `full-colony-${field}`, description: 'A full colony on each side.', map: map.id,
    flags: { merging: opts.merging, adaptiveGeneral: false, powers: false },
    sides: { player: { plots, colony: colony('player'), gold: 100_000 }, enemy: { plots, colony: colony('enemy') } },
  };
  return { def, buildingId, free: open('player').slice(open('player').length - (opts.free ?? 0)).map(({ i }) => i) };
}

/** Begin, queued for the player and run (§4.7): both armies arrive in formation, shielded, and the muster's passes apply. */
function arrive(state: BattleState): number {
  queueCommand(state, { ...commandStamp(state), side: 'player', type: 'beginClash' });
  const t0 = performance.now();
  step(state);
  const ms = performance.now() - t0;
  if (state.phase !== 'clash') throw new Error(`the full colony's Begin was refused in round ${state.round}`);
  return ms;
}

export interface FullColonyCase extends TickTimes {
  field: ColonyField;
  mapId: string;
  plots: number;
  buildingId: string;
  squad: number;
  /** Each side's live units and supply when the armies arrive. */
  units: number;
  supply: number;
  /** Inside §13.7's 150 live units a side, and if not, what brings it inside. */
  fits: boolean;
  levers: string[];
  /** Begin's step: both armies arriving, the clash's first tick (budget 5 ms). */
  arrivalMs: number;
  /** Fighting ticks timed after the muster, and the tick the clash ended on. */
  ticks: number;
  endTick: number;
  peakUnits: number;
  heapGrowthKb: number;
}

/** One whole clash of two full colonies on a field, merging off so all stay live: Begin timed, then every tick to its end. */
function colonyClash(content: Content, field: ColonyField): FullColonyCase {
  const { def, buildingId } = colonyScenario(content, field, { merging: false });
  const state = createFromScenario(content, def);
  const arrivalMs = arrive(state);
  const per = (s: Side) => state.units.filter((u) => u.side === s);
  const units = Math.max(...SIDES.map((s) => per(s).length)), supply = Math.max(...SIDES.map((s) => per(s).reduce((n, u) => n + u.supply, 0)));
  const squad = state.compiled.player.buildings[buildingId]!.squad!.count;
  const plots = def.sides.player.colony!.length;
  const budget = content.targets.rounds.G11.colonyUnits;
  const fits = units <= budget;
  const levers = fits ? [] : [`squads of at most ${Math.floor(budget / plots)}`, `at most ${Math.floor(budget / squad)} plots`];
  const times: number[] = [];
  let peak = state.units.length;
  pastMuster(state);
  gc();
  const heap0 = heapKb();
  while (state.phase === 'clash') {
    const t0 = performance.now();
    step(state);
    times.push(performance.now() - t0);
    if (state.units.length > peak) peak = state.units.length;
  }
  gc();
  return {
    field, mapId: def.map, plots, buildingId, squad, units, supply, fits, levers, arrivalMs,
    ticks: times.length, endTick: state.tick - state.clash!.startTick, peakUnits: peak, heapGrowthKb: Math.round(heapKb() - heap0), ...tickTimes(times),
  };
}

/**
 * R1's full-colony clash on the round loop (§13.7, §15.4, R1-Q5): two full colonies, every plot the biggest squad
 * (today the Burrow's 8, since an upgrade adds no unit in rounds, #7), on one lane and on Twin Roots. Each is
 * warmed on a throwaway copy, then its arrival and every fighting tick are timed.
 */
export function fullColonyClashes(content: Content): FullColonyCase[] {
  const fields: ColonyField[] = ['one', 'twin'];
  for (const f of fields) colonyClash(content, f);
  return fields.map((f) => colonyClash(content, f));
}

// ---- the general's planning turn ----

/** The generals whose turns are timed: the scripted one, and two that run the counter cycle (§7.4). */
export const TURN_GENERALS = ['general:scripted', 'general:mother-mold', 'general:lichen-baron'] as const;

export interface GeneralTurns {
  turns: number;
  meanMs: number;
  maxMs: number;
  worst: { enemy: string; seed: number; round: number };
}

/**
 * The general's planning turn (§7.2, §13.7), in battles of `bot:balanced` against each of `TURN_GENERALS` on
 * Bogwater Hollow with every flag on. At each aftermath a copy opens the next round with the player's AI taken
 * off, so its opening times the general's turn with only the round's bookkeeping beside it: income, the storm and
 * the triggers. Round 1's turn runs inside `createBattle`, so it isn't timed; it plans from an empty colony.
 */
export function generalTurns(content: Content, seeds: readonly number[]): GeneralTurns {
  const times: { ms: number; enemy: string; seed: number; round: number }[] = [];
  const play = (enemy: string, seed: number, timed: boolean) => {
    const state = buildRoundState(content, { seed, player: 'bot:balanced', enemy });
    while (state.phase !== 'ended') {
      if (timed && state.phase === 'aftermath' && !state.outcome) {
        const copy = restore(snapshot(state));
        delete copy.sides.player.ai;
        const t0 = performance.now();
        step(copy);
        const ms = performance.now() - t0;
        if (copy.sides.enemy.ai?.plans.at(-1)?.round !== copy.round) throw new Error(`${enemy} didn't plan round ${copy.round} on seed ${seed}`);
        times.push({ ms, enemy, seed, round: copy.round });
      }
      step(state);
    }
  };
  play(TURN_GENERALS[0], 99, false);
  for (const enemy of TURN_GENERALS) for (const seed of seeds) play(enemy, seed, true);
  const worst = times.reduce((a, b) => (b.ms > a.ms ? b : a), times[0]!);
  return {
    turns: times.length, meanMs: times.reduce((a, t) => a + t.ms, 0) / times.length, maxMs: worst.ms,
    worst: { enemy: worst.enemy, seed: worst.seed, round: worst.round },
  };
}

// ---- one battle ----

/** One battle of rounds with bots on both sides (§13.7, §15.4): `bot:balanced` against the scripted general, seed 1, after a warm one. */
export function fullBattle(content: Content): { wallMs: number; rounds: number } {
  runRoundBattle(content, { seed: 99, player: 'bot:balanced', enemy: 'general:scripted' });
  const { result } = runRoundBattle(content, { seed: 1, player: 'bot:balanced', enemy: 'general:scripted' });
  return { wallMs: result.wallMs, rounds: result.rounds };
}

// ---- a planning command ----

export interface PlanCommandCase {
  field: ColonyField;
  /** The plots planted after the plant, and the units the side then fields. */
  plots: number;
  units: number;
  runs: number;
  meanMs: number;
  maxMs: number;
}

/**
 * The sim part of a planning command (§13.7, §15.4, A113): on a full colony with merging on but for one free
 * plot, a plant of the biggest squad there, then `formationOf` and `mergePreview` for the planting side, which
 * the page's preview recomputes. Each run plays on a fresh copy, after 20 warm-up runs.
 */
export function planCommand(content: Content, runs: number): PlanCommandCase[] {
  return (['one', 'twin'] as const).map((field): PlanCommandCase => {
    const { def, buildingId, free } = colonyScenario(content, field, { merging: true, free: 1 });
    const json = snapshot(createFromScenario(content, def));
    let units = 0;
    const once = (): number => {
      const s = restore(json);
      const had = s.buildings.length;
      const t0 = performance.now();
      queueCommand(s, { ...commandStamp(s), side: 'player', type: 'plant', buildingId, plot: free[0]! });
      step(s);
      const squads = formationOf(s, 'player');
      mergePreview(s, 'player');
      const ms = performance.now() - t0;
      if (s.buildings.length !== had + 1) throw new Error(`the ${field} field's plant was refused`);
      units = squads.reduce((n, q) => n + q.units.length, 0);
      return ms;
    };
    for (let i = 0; i < 20; i++) once();
    const times = Array.from({ length: runs }, once);
    return { field, plots: def.sides.player.colony!.length + 1, units, runs, meanMs: times.reduce((a, b) => a + b, 0) / runs, maxMs: Math.max(...times) };
  });
}

// ---- the whole bench ----

export interface RoundBench {
  quick: boolean;
  bench: Bench300;
  colonies: FullColonyCase[];
  turns: GeneralTurns;
  battle: { wallMs: number; rounds: number };
  plans: PlanCommandCase[];
}

/** Every case, `quick` with G11's quick ticks, one seed a general and fewer plants (verify's run, §15.1). */
export function runRoundBench(content: Content, opts: { quick: boolean }): RoundBench {
  const g = content.targets.rounds.G11;
  return {
    quick: opts.quick,
    bench: bench300(content, opts.quick ? g.quickTicks : g.benchTicks),
    colonies: fullColonyClashes(content),
    turns: generalTurns(content, opts.quick ? [1] : [1, 2, 3]),
    battle: fullBattle(content),
    plans: planCommand(content, opts.quick ? 20 : 50),
  };
}

/**
 * On CI's shared runner, a guard of this many times each timing budget, which catches a gross slowdown: §13.7's
 * budgets are for a real machine (its Node rows say "this machine"), and CI's runner ticks slower. Counts stay exact.
 */
export const CI_GUARD = 3;

/** G11's round checks (§13.7): each with whether it passed and its numbers against the budget, or against CI's guard under `process.env.CI`. */
export function roundBenchChecks(content: Content, r: RoundBench): [string, boolean, string][] {
  const g = content.targets.rounds.G11;
  const guard = process.env.CI ? CI_GUARD : 1;
  const ms = (x: number) => `${x.toFixed(3)} ms`;
  /** A timing within its budget, or within CI's guard, with the bound it was held to. */
  const timed = (x: number, budget: number): [boolean, string] =>
    [x <= guard * budget, guard === 1 ? `budget ${budget} ms` : `CI's guard ${guard * budget} ms, ${guard}× the ${budget} ms budget`];
  const arrival = r.colonies.reduce((a, c) => (c.arrivalMs > a.arrivalMs ? c : a));
  const colony = r.colonies.reduce((a, c) => (c.units > a.units ? c : a));
  const plan = r.plans.reduce((a, c) => (c.maxMs > a.maxMs ? c : a));
  const w = r.turns.worst;
  const check = (name: string, x: number, budget: number, detail: string): [string, boolean, string] => {
    const [ok, bound] = timed(x, budget);
    return [name, ok, `${detail} (${bound})`];
  };
  return [
    check('tick mean', r.bench.meanMs, g.tickMeanMs, `${ms(r.bench.meanMs)} at bench-300, weighted by live units`),
    check('tick p99', r.bench.p99Ms, g.tickP99Ms, ms(r.bench.p99Ms)),
    ['peak units', r.bench.peakUnits >= 300, `${r.bench.peakUnits} live (at least 300)`],
    ['full colony', colony.fits, `${colony.units} live units a side on ${colony.field} (budget ${g.colonyUnits})`],
    check('arrival', arrival.arrivalMs, g.arrivalMs, `${ms(arrival.arrivalMs)} on ${arrival.field}`),
    check("general's turn", r.turns.maxMs, g.generalTurnMs, `${ms(r.turns.maxMs)} at most, ${w.enemy} seed ${w.seed} round ${w.round}`),
    check('planning command', plan.maxMs, g.planCommandMs, `${ms(plan.maxMs)} at most on ${plan.field}, the sim part, a Node budget`),
    check('full battle', r.battle.wallMs, g.battleWallMs, `${r.battle.wallMs} ms wall`),
  ];
}
