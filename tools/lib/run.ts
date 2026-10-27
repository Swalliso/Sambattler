// Shared headless battle runner used by the sim CLI, balance tools, golden replays, the screenshot
// cross-check and the slow test suite.
import { performance } from 'node:perf_hooks';
import type { Content } from '../../src/data/registry.ts';
import {
  createBattle, createFromScenario, makeConfig, runHeadless, summarize,
} from '../../src/sim/index.ts';
import type { BattleConfig, BattleState, BattleSummary, Command, DraftPolicy, Side } from '../../src/sim/index.ts';

export interface RunSpec {
  seed: number;
  map?: string;
  player?: string;
  enemy?: string;
  scenario?: string;
  battleIndex?: number;
  flags?: Partial<BattleConfig['flags']>;
  /** Draft policy for a bot player when drafts are on. */
  autoDraft?: DraftPolicy;
  startingGold?: Partial<Record<Side, number>>;
  test?: BattleConfig['test'];
  /** Use this exact config instead of building one (replays). */
  config?: BattleConfig;
  commands?: Command[];
  until?: 'end' | number;
  hashEvery?: number;
  recordAt?: number[];
}

export interface BattleResult {
  seed: number;
  map: string;
  player: string;
  enemy: string;
  winner: Side | null;
  by: 'rout' | 'decision' | null;
  durationTicks: number;
  duration: string;
  wallMs: number;
  finalHash: string;
  hash: string;
  hashes: Record<string, string>;
  columns: Record<Side, number>;
  heartcap: Record<Side, number>;
  spawned: Record<Side, Record<string, number>>;
  merges: Record<Side, { '2': number; '3': number }>;
  goldEarned: BattleSummary['goldEarned'];
  frontLine: [number, number, number][][];
  counters: unknown[];
  rejectedCommands: number;
  events: Record<string, number>;
  stats: BattleSummary['stats'];
  lanes: BattleSummary['lanes'];
  gold: Record<Side, number>;
  supply: BattleSummary['supply'];
  /** Multi-lane maps: how far apart the lanes' fronts got (null on one-lane maps). */
  laneDivergence: LaneDivergence | null;
  /** Summaries recorded at specific ticks (for `path@tick` asserts). */
  at: Record<string, Record<string, unknown>>;
}

/** Lanes count as diverged when their front midpoints were at least this many columns apart. */
export const DIVERGE_COLUMNS = 4;

export interface LaneDivergence {
  /** Largest gap between the lanes' front midpoints over the 1 s samples, in columns. */
  maxGap: number;
  /** Mean gap over the samples. */
  meanGap: number;
  diverged: boolean;
}

/** Per-lane divergence from the front-line samples ([tick, pBorder, eBorder] per lane, every second). */
export function laneDivergence(frontLine: [number, number, number][][]): LaneDivergence | null {
  if (frontLine.length < 2) return null;
  const n = Math.min(...frontLine.map((l) => l.length));
  let maxGap = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const mids = frontLine.map((l) => (l[i]![1] + l[i]![2]) / 2);
    const gap = Math.max(...mids) - Math.min(...mids);
    sum += gap;
    if (gap > maxGap) maxGap = gap;
  }
  return { maxGap, meanGap: n ? sum / n : 0, diverged: maxGap >= DIVERGE_COLUMNS };
}

export function buildState(content: Content, spec: RunSpec): BattleState {
  if (spec.config) return createBattle(content, spec.config);
  if (spec.scenario) {
    const over: Parameters<typeof createFromScenario>[2] = { seed: spec.seed };
    if (spec.player) over.player = spec.player;
    if (spec.enemy) over.enemy = spec.enemy;
    if (spec.flags) over.flags = spec.flags;
    return createFromScenario(content, spec.scenario, over);
  }
  const opts: Parameters<typeof makeConfig>[1] = {
    seed: spec.seed,
    mapId: spec.map ?? 'bogwater-hollow',
    battleIndex: spec.battleIndex ?? 1,
    player: spec.player ?? 'bot:balanced',
    enemy: spec.enemy ?? 'general:scripted',
  };
  if (spec.flags) opts.flags = spec.flags;
  if (spec.startingGold) opts.startingGold = spec.startingGold;
  if (spec.test) opts.test = spec.test;
  const config = makeConfig(content, opts);
  if (spec.autoDraft && config.player.controller.kind !== 'human') config.player.autoDraft = spec.autoDraft;
  return createBattle(content, config);
}

export function runBattle(content: Content, spec: RunSpec): { state: BattleState; result: BattleResult } {
  const state = buildState(content, spec);
  const t0 = performance.now();
  const opts: Parameters<typeof runHeadless>[1] = { until: spec.until ?? 'end' };
  if (spec.commands) opts.commands = spec.commands;
  if (spec.hashEvery) opts.hashEvery = spec.hashEvery;
  if (spec.recordAt) opts.recordAt = spec.recordAt;
  const res = runHeadless(state, opts);
  const wallMs = performance.now() - t0;
  const sum = summarize(state);
  const at: Record<string, Record<string, unknown>> = {};
  for (const [tick, s] of Object.entries(res.summaries)) at[tick] = { ...s };
  const ctl = (s: Side) => {
    const c = state.config[s].controller;
    return c.kind === 'human' ? 'human' : `${c.kind}:${c.id}`;
  };
  const result: BattleResult = {
    seed: state.config.seed,
    map: state.map.id,
    player: ctl('player'),
    enemy: ctl('enemy'),
    winner: sum.winner,
    by: sum.by,
    durationTicks: state.tick,
    duration: sum.duration,
    wallMs: Math.round(wallMs),
    finalHash: res.finalHash,
    hash: res.finalHash,
    hashes: res.hashes,
    columns: sum.columns,
    heartcap: sum.heartcap,
    spawned: sum.spawned,
    merges: sum.merges,
    goldEarned: sum.goldEarned,
    frontLine: state.frontLine,
    counters: [],
    rejectedCommands: sum.rejectedCommands,
    events: res.eventCounts,
    stats: sum.stats,
    lanes: sum.lanes,
    gold: sum.gold,
    supply: sum.supply,
    laneDivergence: laneDivergence(state.frontLine),
    at,
  };
  return { state, result };
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function fmtTicks(t: number): string {
  const s = Math.round(t / 20);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
