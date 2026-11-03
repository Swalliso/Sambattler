// The headless runner for a battle (SPEC §15.2), which `npm run sim` plays and the round tools share.
import { performance } from 'node:perf_hooks';
import {
  bestBloom, createBattle, createFromScenario, kitCards, makeRoundConfig, powerOf, runHeadless, summarize,
} from '../../src/sim/index.ts';
import type {
  BattleConfig, BattleState, Command, Content, Controller, CounterKind, Flags, HeadlessResult, HeadlessUntil, PowerPolicy,
  RoundLogEntry, RoundScenarioOverrides, RoundSummary, Side, SideStats,
} from '../../src/sim/index.ts';
import type { ScenarioDef } from '../../src/data/schema.ts';

export interface RoundRunSpec {
  seed: number;
  map?: string;
  player?: string;
  enemy?: string;
  /** A scenario's id, in `data/scenarios/`, or a scenario given whole (G6's mirror, T123). */
  scenario?: string | ScenarioDef;
  battleIndex?: number;
  flags?: Partial<Flags>;
  /** The player's commander (its passive, and its power with the powers flag). */
  commander?: string;
  /** Whether a bot player fires its power, at most once per clash (§6.6). */
  powerPolicy?: PowerPolicy;
  /** The player's kit by building id, in place of its faction's roster (R2-Q7: a commander's starter). */
  kit?: string[];
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
  /** X8's readouts, one a round (§7.2, A049, A206). */
  byRound: RoundPace[];
  /** The first round each side's colony had no free open plot at Begin, or null if it never filled (X8). */
  fullAt: Record<Side, number | null>;
  events: Record<string, number>;
  stats: RoundSummary['stats'];
  rejectedCommands: number;
  /** Summaries recorded at checkpoints, for `path@r<n>` asserts. */
  at: HeadlessResult['summaries'];
  /**
   * With the player's Puppet Bloom, a clash each (R2-Q7, A057): the most trios a 3-tile circle could merge on
   * the clash's first tick, after the muster, and at any of the auto policy's think ticks before the power
   * was used, with whether it fired and the trios it merged.
   */
  bloom?: { round: number; atMuster: number; best: number; fired: boolean; merged: number }[];
}

/** X8's readouts for one round (§7.2): the colonies at Begin, an AI side's plan, and whether the clash replayed the last. */
export interface RoundPace {
  round: number;
  /** Open plots with no building at Begin; a stump plot takes none (§4.6). */
  free: Record<Side, number>;
  /** The gold each side held at Begin, which interest reads (§6.2). */
  banked: Record<Side, number>;
  /** What an AI side planted and sold this round, by building id, from its plan (`ai.plans`); nothing for a human. */
  planted: Record<Side, string[]>;
  sold: Record<Side, string[]>;
  /** Whether the clash replayed the last round's exactly: the same squads fielded, the same lane ends and the same damage and survivors by building (A206). */
  replayed: boolean;
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
  if (spec.kit) config.player.kit = kitCards(content, config.player.controller, spec.kit);
  return createBattle(content, config);
}

const per = <T>(f: (s: Side) => T): Record<Side, T> => ({ player: f('player'), enemy: f('enemy') });
const label = (c: Controller): string => (c.kind === 'human' ? 'human' : `${c.kind}:${c.id}`);

/** The general's counter cycles: each activation, the round it landed in (§7.4, #31). */
function roundCounters(state: BattleState): RoundBattleResult['counters'] {
  return (state.sides.enemy.ai?.counter?.history ?? []).map((c) => ({ kind: c.kind, round: c.round }));
}

/** Each side's free open plots and banked gold, read at a clash's first tick, as Begin left them. */
type AtBegin = Pick<RoundPace, 'free' | 'banked'>;
const atBegin = (state: BattleState): AtBegin => ({
  free: per((s) => state.sides[s].plots.filter((p) => p.open && p.terrain !== 'stump' && p.building === 0).length),
  banked: per((s) => state.sides[s].bankedAtBegin),
});

/** X8's readouts from the battle's rounds, its AI plans and what each Begin left (§7.2). */
function roundPace(state: BattleState, begins: Map<number, AtBegin>): { byRound: RoundPace[]; fullAt: RoundBattleResult['fullAt'] } {
  const plan = (s: Side, round: number) => state.sides[s].ai?.plans.find((p) => p.round === round);
  const key = (r: BattleState['rounds'][number]) => JSON.stringify([
    r.lanes.map((l) => [l.winner, l.survivors, l.ticks, l.capped]), r.fielded, r.damageByBuilding, r.survivorsByBuilding,
  ]);
  const byRound = state.rounds.map((r, i): RoundPace => ({
    round: r.round,
    ...(begins.get(r.round) ?? { free: per(() => 0), banked: per(() => 0) }),
    planted: per((s) => plan(s, r.round)?.planted.map((x) => x.building) ?? []),
    sold: per((s) => plan(s, r.round)?.sold.map((x) => x.building) ?? []),
    replayed: i > 0 && key(r) === key(state.rounds[i - 1]!),
  }));
  return { byRound, fullAt: per((s) => byRound.find((x) => x.free[s] === 0)?.round ?? null) };
}

/** The player's Puppet Bloom clash by clash, read after each of the auto policy's think ticks (clash ticks 1, 21, 41 …). */
function bloomReadout(state: BattleState): { onTick: (s: BattleState) => void; clashes: NonNullable<RoundBattleResult['bloom']> } | null {
  if (powerOf(state, 'player')?.kind !== 'bloom') return null;
  const clashes: NonNullable<RoundBattleResult['bloom']> = [];
  const onTick = (s: BattleState) => {
    const t = s.tick - s.clash!.startTick;
    let c = clashes.at(-1);
    if (c?.round !== s.round) clashes.push(c = { round: s.round, atMuster: 0, best: 0, fired: false, merged: 0 });
    for (const e of s.events) if (e.t === 'power' && e.side === 'player') { c.fired = true; c.merged += e.merges; }
    if ((t - 1) % 20 !== 0 || s.sides.player.powerUsed) return;
    const trios = bestBloom(s, 'player')?.trios ?? 0;
    if (t === 1) c.atMuster = trios;
    c.best = Math.max(c.best, trios);
  };
  return { onTick, clashes };
}

export function runRoundBattle(content: Content, spec: RoundRunSpec): { state: BattleState; result: RoundBattleResult } {
  const state = buildRoundState(content, spec);
  const bloom = bloomReadout(state);
  const begins = new Map<number, AtBegin>();
  const t0 = performance.now();
  const res = runHeadless(state, {
    until: spec.until ?? 'end',
    ...(spec.commands ? { commands: spec.commands } : {}),
    ...(spec.hashEvery ? { hashEvery: spec.hashEvery } : {}),
    ...(spec.recordAt ? { recordAt: spec.recordAt } : {}),
    onTick: (s) => {
      if (s.tick - s.clash!.startTick === 1) begins.set(s.round, atBegin(s));
      bloom?.onTick(s);
    },
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
    ...roundPace(state, begins),
    events: res.eventCounts,
    stats: sum.stats,
    rejectedCommands: sum.rejectedCommands,
    at: { ...res.summaries },
    ...(bloom ? { bloom: bloom.clashes } : {}),
  };
  return { state, result };
}

const medianOrNull = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const v = [...xs].sort((a, b) => a - b), m = v.length >> 1;
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
};

/**
 * X8's readouts over a set of battles (§7.2, A049, A206), for the summary: by round, each side's median free open
 * plots and banked gold at Begin among the battles that reached it; the round each side's colony fills, and the gold
 * it banks from then on; and the share of clashes that replayed the last one exactly.
 */
export function paceLines(results: RoundBattleResult[]): string[] {
  const last = Math.max(0, ...results.map((r) => r.byRound.length));
  const both = (f: (p: RoundPace, s: Side) => number) => (round: number) => {
    const at = results.flatMap((r) => r.byRound.filter((p) => p.round === round));
    return `r${round} ${medianOrNull(at.map((p) => f(p, 'player')))}/${medianOrNull(at.map((p) => f(p, 'enemy')))}`;
  };
  const rounds = Array.from({ length: last }, (_, i) => i + 1);
  const fills = (s: Side) => {
    const at = results.map((r) => r.fullAt[s]).filter((x): x is number => x !== null);
    const after = results.flatMap((r) => r.byRound.filter((p) => r.fullAt[s] !== null && p.round >= r.fullAt[s]!).map((p) => p.banked[s]));
    const mean = after.length ? Math.round(after.reduce((a, b) => a + b, 0) / after.length) : null;
    return `${s} round ${medianOrNull(at) ?? '-'} (never ${results.length - at.length} of ${results.length}), then banks a median ${medianOrNull(after) ?? '-'} (mean ${mean ?? '-'})`;
  };
  const all = results.flatMap((r) => r.byRound);
  const replays = all.filter((p) => p.replayed).length;
  const sold = results.reduce((n, r) => n + r.byRound.reduce((k, p) => k + p.sold.enemy.length, 0), 0);
  return [
    `X8 free plots at Begin, median player/enemy: ${rounds.map(both((p, s) => p.free[s])).join(' · ')}`,
    `X8 banked at Begin, median player/enemy: ${rounds.map(both((p, s) => p.banked[s])).join(' · ')}`,
    `X8 colony full at Begin from: ${fills('player')}; ${fills('enemy')}`,
    `X8 the general sold ${sold} buildings · exact replays ${replays} of ${all.length} rounds`,
  ];
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
