// Performance measurement shared by `npm run bench` and the G11 guardrail (SPEC §13.7, §15.4).
import { performance } from 'node:perf_hooks';
import type { Content } from '../../src/data/registry.ts';
import { SIDES, createBattle, createFromScenario, makeConfig, step } from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';
import { CLASH, FULL_COLONY, armyOf, assignSlots, clashField, fullColony, placeArmy } from './clash.ts';
import type { Army, ClashField, FieldId } from './clash.ts';
import { runBattle } from './run.ts';

export interface BenchResult {
  ticks: number;
  meanMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  peakUnits: number;
  startUnits: number;
  heapGrowthKb: number;
  battleWallMs: number;
}

function gc(): void {
  const g = (globalThis as { gc?: () => void }).gc;
  if (g) g();
}

export function runBench(content: Content, ticks: number): BenchResult {
  // warm the JIT on a throwaway copy so the timed run measures steady-state code
  const warm = createFromScenario(content, 'bench-300');
  for (let i = 0; i < 300; i++) step(warm);

  const state = createFromScenario(content, 'bench-300');
  const times = new Float64Array(ticks);
  let peak = state.units.length;
  const startUnits = state.units.length;
  gc();
  const heap0 = process.memoryUsage().heapUsed;
  for (let i = 0; i < ticks; i++) {
    const t0 = performance.now();
    step(state);
    times[i] = performance.now() - t0;
    if (state.units.length > peak) peak = state.units.length;
  }
  gc();
  const heap1 = process.memoryUsage().heapUsed;
  const sorted = Array.from(times).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  // one full battle, headless (warm)
  runBattle(content, { seed: 99, player: 'bot:balanced', enemy: 'general:scripted' });
  const battle = runBattle(content, { seed: 1, player: 'bot:balanced', enemy: 'general:scripted' });

  return {
    ticks,
    meanMs: mean,
    p95Ms: q(0.95),
    p99Ms: q(0.99),
    maxMs: sorted[sorted.length - 1]!,
    peakUnits: peak,
    startUnits,
    heapGrowthKb: Math.round((heap1 - heap0) / 1024),
    battleWallMs: battle.result.wallMs,
  };
}

/** One full-colony clash, timed (§13.7, §15.4). */
export interface ClashBenchCase {
  field: FieldId;
  plots: number;
  buildingId: string;
  squad: number;
  /** Each side's units and supply when the armies arrive. */
  units: number;
  supply: number;
  /** Inside §13.7's 150 live units a side, and if not, what brings it inside. */
  fits: boolean;
  levers: string[];
  /** Placing both armies in formation: the clash's first tick (budget 5 ms). */
  arrivalMs: number;
  /** Ticks stepped after the muster, and the tick the clash ended on (at most 920). */
  ticks: number;
  endTick: number;
  meanMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  peakUnits: number;
  heapGrowthKb: number;
}

/** The full colony's army: every plot the biggest squad by units, the upgrades that add units included, merging off (A018). */
function colonyArmy(content: Content, field: ClashField): { army: Army; fits: boolean; levers: string[] } {
  const colony = fullColony(content, { fields: [field.id] }), f = colony.fields[0]!;
  const squad = colony.squads.find((s) => s.buildingId === f.byUnits.buildingId)!;
  const base = armyOf(content, 'bench', 0, Array<string>(field.plots).fill(squad.buildingId), false);
  const army = { ...base, entries: base.entries.map((e) => ({ ...e, count: squad.upgraded })), units: f.byUnits.units, supply: f.byUnits.supply };
  return { army, fits: f.fits, levers: f.levers };
}

/** A clash's battle as `playClash` sets one up (tools/lib/clash.ts), with merging off. */
function clashState(content: Content, field: ClashField): BattleState {
  const state = createBattle(content, makeConfig(content, {
    seed: 1, mapId: field.mapId, player: 'human', enemy: 'human', flags: { merging: false },
    test: { noTurrets: true, noTerritory: true, noHeartcapTargets: true, timeLimitSeconds: 47, noBuildingPreference: true, idleSeek: true },
  }));
  state.phase = 'live';
  return state;
}

/** Some lane still has both sides in it: a living unit or a standing emplacement (§6.7). */
function fighting(state: BattleState): boolean {
  return state.lanes.some((_, l) => SIDES.every((side) => state.units.some((u) => u.lane === l && u.side === side && u.hp > 0)
    || state.buildings.some((b) => b.lane === l && b.side === side && b.hp > 0)));
}

/** One whole clash of two full colonies on `id`: the arrival, then the muster (merging off, so nothing knits), then every tick to its end. */
function clashCase(content: Content, id: FieldId): ClashBenchCase {
  const field = clashField(content, id, { extraPlots: FULL_COLONY.extraPlots });
  const { army, fits, levers } = colonyArmy(content, field);
  const state = clashState(content, field);
  const placements = assignSlots(content, army, field);
  const t0 = performance.now();
  for (const side of SIDES) placeArmy(state, side, placements);
  const arrivalMs = performance.now() - t0;
  state.tick = CLASH.musterTicks;
  const times: number[] = [];
  let peak = state.units.length;
  gc();
  const heap0 = process.memoryUsage().heapUsed;
  while (fighting(state) && state.tick < CLASH.capTicks + CLASH.musterTicks) {
    const t = performance.now();
    step(state);
    times.push(performance.now() - t);
    if (state.units.length > peak) peak = state.units.length;
  }
  gc();
  const heap1 = process.memoryUsage().heapUsed;
  const sorted = times.sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  return {
    field: id, plots: field.plots, buildingId: army.entries[0]!.buildingId, squad: army.entries[0]!.count, units: army.units, supply: army.supply, fits, levers,
    arrivalMs, ticks: times.length, endTick: state.tick, meanMs: sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length),
    p95Ms: q(0.95), p99Ms: q(0.99), maxMs: sorted[sorted.length - 1] ?? 0, peakUnits: peak, heapGrowthKb: Math.round((heap1 - heap0) / 1024),
  };
}

/**
 * The full-colony clash (§13.7, §15.4, R1-Q5): one whole clash of two full colonies on the one-lane field
 * (12 plots) and on Twin Roots (16), every plot the biggest squad (today the Burrow's upgraded 12
 * Sporelings), merging off so every unit stays live (A018). Each case is warmed on a throwaway copy, then
 * the arrival and every tick to the clash's end (at most 920) are timed. Report only until R2 adds it to G11.
 */
export function runClashBench(content: Content): ClashBenchCase[] {
  const fields: FieldId[] = ['one', 'twin'];
  for (const id of fields) clashCase(content, id);
  return fields.map((id) => clashCase(content, id));
}
