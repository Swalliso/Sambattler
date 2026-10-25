// Performance measurement shared by `npm run bench` and the G11 guardrail (SPEC §13.7, §15.4).
import { performance } from 'node:perf_hooks';
import type { Content } from '../../src/data/registry.ts';
import { createFromScenario, step } from '../../src/sim/index.ts';
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

  // one full M1 battle, headless (warm)
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
