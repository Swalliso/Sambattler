// The headless runner for a battle in rounds (SPEC §15.2), which `npm run sim -- --rounds` plays and the
// round tools after it will share. It stands beside v1's `tools/lib/run.ts` until R2b moves it there.
import { performance } from 'node:perf_hooks';
import {
  createBattle, createFromScenario, makeRoundConfig, runHeadless, summarize,
} from '../../../src/sim/rounds/index.ts';
import type {
  BattleConfig, BattleState, Command, Content, Controller, CounterKind, Flags, HeadlessResult, HeadlessUntil, PowerPolicy,
  RoundLogEntry, RoundScenarioOverrides, RoundSummary, Side, SideStats,
} from '../../../src/sim/rounds/index.ts';
import { fmtTicks } from '../run.ts';

export interface RoundRunSpec {
  seed: number;
  map?: string;
  player?: string;
  enemy?: string;
  /** A round scenario's id, in `data/scenarios/rounds/`. */
  scenario?: string;
  battleIndex?: number;
  flags?: Partial<Flags>;
  /** The player's commander (its passive, and its power with the powers flag). */
  commander?: string;
  /** Whether a bot player fires its power, at most once per clash (§6.6). */
  powerPolicy?: PowerPolicy;
  /** Use this exact config instead of building one (replays). */
  config?: BattleConfig;
  commands?: Command[];
  until?: HeadlessUntil;
  hashEvery?: number;
  /** Checkpoints to record a summary at, for `--assert path@r<n>` (plan Call 17). */
  recordAt?: string[];
}

/** One battle's result, with §15.2's keys. */
export interface RoundBattleResult {
  seed: number;
  map: string;
  player: string;
  enemy: string;
  winner: Side | null;
  by: 'rout' | 'decision' | null;
  /** The round the battle reached. */
  rounds: number;
  clashTicks: number;
  clashTime: string;
  wallMs: number;
  finalHash: string;
  hashes: Record<string, string>;
  heartcap: Record<Side, number>;
  dealt: Record<Side, number>;
  roundLog: RoundLogEntry[];
  /** Units fielded over the battle by type, summed from each round's fielded record (§14.4). */
  fielded: Record<Side, Record<string, number>>;
  merges: Record<Side, SideStats['merges']>;
  goldEarned: Record<Side, SideStats['goldEarned']>;
  /** Each of the general's counter cycles: its kind, and the round its buildings first stood in its colony (§7.4). */
  counters: { kind: CounterKind; round: number }[];
  events: Record<string, number>;
  stats: RoundSummary['stats'];
  rejectedCommands: number;
  /** Summaries recorded at checkpoints, for `path@r<n>` asserts. */
  at: HeadlessResult['summaries'];
}

export function buildRoundState(content: Content, spec: RoundRunSpec): BattleState {
  if (spec.config) return createBattle(content, spec.config);
  if (spec.scenario) {
    const over: RoundScenarioOverrides = { seed: spec.seed };
    if (spec.player) over.player = spec.player;
    if (spec.enemy) over.enemy = spec.enemy;
    if (spec.flags) over.flags = spec.flags;
    const state = createFromScenario(content, spec.scenario, over);
    // nothing in a round's opening reads the power policy, so it's set as the config would have held it
    if (spec.powerPolicy) state.config.player.powerPolicy = spec.powerPolicy;
    return state;
  }
  const config = makeRoundConfig(content, {
    seed: spec.seed,
    mapId: spec.map ?? 'bogwater-hollow',
    battleIndex: spec.battleIndex ?? 1,
    player: spec.player ?? 'bot:balanced',
    enemy: spec.enemy ?? 'general:scripted',
    ...(spec.flags ? { flags: spec.flags } : {}),
    ...(spec.commander ? { commander: spec.commander } : {}),
  });
  if (spec.powerPolicy) config.player.powerPolicy = spec.powerPolicy;
  return createBattle(content, config);
}

const per = <T>(f: (s: Side) => T): Record<Side, T> => ({ player: f('player'), enemy: f('enemy') });
const label = (c: Controller): string => (c.kind === 'human' ? 'human' : `${c.kind}:${c.id}`);

/** The general's counter cycles from its plans: a plan that names a counter its last plan didn't starts one. */
function roundCounters(state: BattleState): RoundBattleResult['counters'] {
  const out: RoundBattleResult['counters'] = [];
  let last: CounterKind | undefined;
  for (const p of state.sides.enemy.ai?.plans ?? []) {
    if (p.counter && p.counter !== last) out.push({ kind: p.counter, round: p.round });
    last = p.counter;
  }
  return out;
}

export function runRoundBattle(content: Content, spec: RoundRunSpec): { state: BattleState; result: RoundBattleResult } {
  const state = buildRoundState(content, spec);
  const t0 = performance.now();
  const res = runHeadless(state, {
    until: spec.until ?? 'end',
    ...(spec.commands ? { commands: spec.commands } : {}),
    ...(spec.hashEvery ? { hashEvery: spec.hashEvery } : {}),
    ...(spec.recordAt ? { recordAt: spec.recordAt } : {}),
  });
  const wallMs = performance.now() - t0;
  const sum = summarize(state);
  const fielded = per((s) => {
    const byType: Record<string, number> = {};
    for (const r of state.rounds) for (const f of r.fielded[s]) byType[f.unitId] = (byType[f.unitId] ?? 0) + f.count;
    return byType;
  });
  const result: RoundBattleResult = {
    seed: state.config.seed,
    map: state.map.id,
    player: label(state.config.player.controller),
    enemy: label(state.config.enemy.controller),
    winner: sum.winner,
    by: sum.by,
    rounds: state.round,
    clashTicks: state.tick,
    clashTime: fmtTicks(state.tick),
    wallMs: Math.round(wallMs),
    finalHash: res.finalHash,
    hashes: res.hashes,
    heartcap: sum.heartcap,
    dealt: sum.dealt,
    roundLog: sum.roundLog,
    fielded,
    merges: per((s) => ({ ...sum.stats[s].merges })),
    goldEarned: per((s) => ({ ...sum.stats[s].goldEarned })),
    counters: roundCounters(state),
    events: res.eventCounts,
    stats: sum.stats,
    rejectedCommands: sum.rejectedCommands,
    at: { ...res.summaries },
  };
  return { state, result };
}
