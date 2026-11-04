// Balance harness (SPEC §12, §15.3): the squad and supply duels (G1, G2), the bots' tournament against the
// scripted general, the round guardrails (G3–G8, G12, G13, G16) on whole battles in rounds, R1's clash bars
// (G3, G12 and G13 on single clashes, §12.2, §16 R1), battle 1's pairings and the commander tournament (§16 M5).
// Every battle, clash and duel plays on the round sim: a clash through `playRoundClash` (tools/lib/clash.ts),
// and each battle, clash and duel as a `RoundJob`, which `tools/lib/pool.ts` plays in worker threads with the
// same results as in process. Shared by `npm run balance`, `npm run experiment` and the slow test suite.
import type { Content } from '../../src/data/registry.ts';
import type { BotDef, ScenarioDef } from '../../src/data/schema.ts';
import { createRun, generalKit, mapPool, simulateRun } from '../../src/run/index.ts';
import { counterKindsOf } from '../../src/sim/ai/counter.ts';
import { addUnit } from '../../src/sim/create.ts';
import { COUNTER_KINDS, SIDES, createBattle, createFromScenario, makeRoundConfig, other, planningView, runHeadless } from '../../src/sim/index.ts';
import type { CounterKind, Flags, Side, Tier } from '../../src/sim/index.ts';
import { hash32, nextFloat, seedStream } from '../../src/sim/rng.ts';
import { CLASH, MIRROR_SEED, armyFromBot, armyOf, clashArmyIds, clashField, clashOpts, lineOf, playRoundClash, squadSize } from './clash.ts';
import type { Army, ArmyEntry, ArmyOpts, ClashField, ClashJob, ClashOpts, ClashRecord, FieldId, RoundClashJob, RoundClashRecord } from './clash.ts';
import { rosterIds } from './roster.ts';
import { budgetRound, raceReport, stormBp } from './roundRace.ts';
import type { RaceReport } from './roundRace.ts';
import { median, runRoundBattle } from './run.ts';

export { rosterIds };

export function spawnerIds(content: Content): string[] {
  return rosterIds(content).filter((id) => {
    const b = content.buildings[id]!;
    return b.kind === 'spawner' && !content.units[b.squad!.unit]!.tags.includes('support');
  });
}

/** `capguard@2` → { unit: 'capguard', tier: 2 }. */
export function duelUnit(ref: string): { unit: string; tier: Tier } {
  const [unit, tier] = ref.split('@');
  return { unit: unit!, tier: (tier ? Number(tier) : 1) as Tier };
}

export interface DuelOutcome { a: string; b: string; seed: number; valueA: number; valueB: number; winner: 'a' | 'b' | 'draw' }

export interface Verdict { id: string; pass: boolean; summary: string; details: string[] }

// ---------------------------------------------------------------- duels

/** A supply duel: `supply` of unit A (as `id` or `id@tier`) against the same of B, placed units fought to the end of one clash. */
export interface SupplyDuelJob {
  a: string;
  b: string;
  seed: number;
  supply: number;
}

/**
 * A supply duel in a round clash (G2, §12.2): each side's units placed spread over the one-lane field's 8 rows,
 * A as the player, with a small seeded scatter, then one clash to its end, a wipe or the 45 s cap (§6.7). Each
 * side's value is its surviving supply, weighed by HP.
 */
export function supplyDuel(content: Content, job: SupplyDuelJob): DuelOutcome & { seconds: number } {
  const { a, b, seed, supply } = job;
  const def: ScenarioDef = {
    id: 'supply-duel', description: 'A supply duel (R2a/T116).', map: 'test-flat',
    flags: { merging: false, adaptiveGeneral: false, powers: false }, sides: { player: {}, enemy: {} }, clash: { units: [] },
  };
  const state = createFromScenario(content, def, { seed });
  const rng = seedStream(hash32(seed, `supply:${a}:${b}`, 0), 'combat', 0);
  const scatter = () => nextFloat(rng) - 0.5;
  const span = state.map.height - 1.2, mid = state.map.width / 2;
  const put = (side: Side, ref: string) => {
    const { unit, tier } = duelUnit(ref);
    const def = state.compiled[side].units[unit];
    if (!def) throw new Error(`supplyDuel: ${side} fields no ${unit}`);
    const n = Math.floor(supply / def.tiers[tier - 1]!.supply);
    // up to 7 rows over the lane, so the frontage isn't an artefact of the setup; the fronts stand 12 tiles apart
    const rows = Math.min(n, 7);
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / rows), row = i % rows;
      const x = (side === 'player' ? mid - 6 - col * 0.9 : mid + 6 + col * 0.9) + scatter() * 0.6;
      const y = 0.6 + (rows > 1 ? (row * span) / (rows - 1) : span / 2) + scatter() * 0.4;
      addUnit(state, side, unit, 0, x, y, 0, tier);
    }
  };
  put('player', a);
  put('enemy', b);
  runHeadless(state, { until: { round: 1 } });
  const left = (side: Side) => state.units.filter((u) => u.side === side && u.hp > 0).reduce((v, u) => v + (u.hp / u.maxHp) * u.supply, 0);
  const valueA = left('player'), valueB = left('enemy');
  return { a, b, seed, valueA, valueB, winner: valueA > valueB ? 'a' : valueB > valueA ? 'b' : 'draw', seconds: (state.tick - state.clash!.startTick) / 20 };
}

/**
 * A squad duel (G1, §12.2): the budget spent on as many of one building as fit a side's plots, A's against B's,
 * fielded in formation by role on the one-lane field and fought as one round clash. Each side's value is the gold
 * it has left on the field, scaled to the budget, since whole buildings rarely spend it exactly.
 */
export function squadDuel(content: Content, a: string, b: string, seed: number, budget: number): RoundClashJob {
  const plots = clashField(content, 'one').plots;
  const army = (id: string) => armyOf(content, `squad:${id}`, budget, Array<string>(Math.min(plots, Math.floor(budget / content.buildings[id]!.cost))).fill(id), true);
  return { field: 'one', seed, seat: 'player', armies: [army(a), army(b)] };
}

/** A squad duel's outcome from its clash, each value scaled to the budget. */
export function squadOutcome(a: string, b: string, job: RoundClashJob, r: RoundClashRecord): DuelOutcome {
  const valueA = (r.value[0] * job.armies[0].budget) / job.armies[0].spent, valueB = (r.value[1] * job.armies[1].budget) / job.armies[1].spent;
  return { a, b, seed: job.seed, valueA, valueB, winner: valueA > valueB ? 'a' : valueB > valueA ? 'b' : 'draw' };
}

// ---- battles ----

/** One battle of rounds to play as a job: its seed, map, controllers and flags (§12.2). */
export interface RoundBattleJob {
  seed: number;
  map: string;
  player: string;
  enemy: string;
  flags?: Partial<Flags>;
  /** A round scenario to start from, by id or whole (G6, which plays one in both seats). */
  scenario?: string | ScenarioDef;
  /** Starting gold added to a side (G5). */
  bonusGold?: Partial<Record<Side, number>>;
}

/** A battle of rounds as the tools read it. */
export interface RoundBattleRecord extends RoundBattleJob {
  winner: Side | null;
  by: 'rout' | 'decision' | null;
  rounds: number;
  /** Each lane's clash, round by round: its length, the muster counted, and whether it reached the 45 s cap. */
  clashes: { round: number; ticks: number; capped: boolean }[];
  /** Who led the Heartcap race after each round, by the share of max HP left that a Decision reads (§6.5); null when level. */
  leads: (Side | null)[];
  rejected: number;
  /** The Heartcap damage each side took over the battle (G6's second clause). */
  damageTaken: Record<Side, number>;
  /** The supply each side fielded over the battle at its units' tiers, and its Slayers' part, from the `fielded` record (G7). */
  supply: Record<Side, { all: number; slayers: number }>;
  /** Rounds that dealt Heartcap damage, and how many of them the round's damage cap bound (§6.7 step 4, G4). */
  damageRounds: number;
  cappedRounds: number;
}

export function playRoundBattle(content: Content, job: RoundBattleJob): RoundBattleRecord {
  const spec = { seed: job.seed, map: job.map, player: job.player, enemy: job.enemy, ...(job.flags ? { flags: job.flags } : {}) };
  let config;
  if (job.bonusGold) {
    config = makeRoundConfig(content, { seed: job.seed, mapId: job.map, player: job.player, enemy: job.enemy, ...(job.flags ? { flags: job.flags } : {}) });
    for (const s of ['player', 'enemy'] as const) config[s].startingGold += job.bonusGold[s] ?? 0;
  }
  const { state, result } = runRoundBattle(content, { ...spec, ...(job.scenario ? { scenario: job.scenario } : {}), ...(config ? { config } : {}) });
  const max = { player: state.sides.player.heartcapMaxHp, enemy: state.sides.enemy.heartcapMaxHp };
  const supplyOf = (s: Side) => {
    let all = 0, slayers = 0;
    for (const r of state.rounds) for (const f of r.fielded[s]) {
      const u = state.compiled[s].units[f.unitId];
      if (!u) continue;
      const n = f.count * u.tiers[f.tier - 1]!.supply;
      all += n;
      if (u.slayer) slayers += n;
    }
    return { all, slayers };
  };
  const leads = state.rounds.map((r) => {
    const p = r.heartcaps.player * max.enemy, e = r.heartcaps.enemy * max.player;
    return p === e ? null : p > e ? 'player' : 'enemy';
  });
  return {
    ...job, winner: result.winner, by: result.by, rounds: result.rounds,
    clashes: state.rounds.flatMap((r) => r.lanes.map((l) => ({ round: r.round, ticks: l.ticks, capped: l.capped }))),
    leads, rejected: result.rejectedCommands,
    damageTaken: { player: max.player - state.sides.player.heartcapHp, enemy: max.enemy - state.sides.enemy.heartcapHp },
    supply: { player: supplyOf('player'), enemy: supplyOf('enemy') },
    damageRounds: state.rounds.filter((r) => r.damage.player + r.damage.enemy > 0).length,
    cappedRounds: state.rounds.filter((r) => r.capped).length,
  };
}

// ---- jobs, for the pool ----

/** A round battle, a round clash or a supply duel, as the pool plays it (T117). */
export type RoundJob = { kind: 'battle'; job: RoundBattleJob } | { kind: 'clash'; job: RoundClashJob } | { kind: 'supply'; job: SupplyDuelJob };
export type RoundJobResult = RoundBattleRecord | RoundClashRecord | (DuelOutcome & { seconds: number });
/** Plays round jobs, in process or on the pool, one result per job in job order. */
export type RoundRunner = (jobs: RoundJob[]) => Promise<RoundJobResult[]>;

export function playRoundJob(content: Content, job: RoundJob): RoundJobResult {
  if (job.kind === 'battle') return playRoundBattle(content, job.job);
  if (job.kind === 'clash') return playRoundClash(content, job.job);
  return supplyDuel(content, job.job);
}

// ---- the duels and the tournament ----

/** G1's squad duels and G2's supply duels, every ordered pair of the duel spawners and their units over `seeds`. */
export async function duels(content: Content, run: RoundRunner, opts: { squadSeeds?: number; supplySeeds?: number; supply?: number } = {}): Promise<{
  squad: DuelOutcome[]; supply: (DuelOutcome & { seconds: number })[]; edges: Record<string, number>;
}> {
  const g1 = content.targets.rounds.G1, g2 = content.targets.G2;
  const ids = spawnerIds(content);
  const pairs = <T>(xs: string[], f: (a: string, b: string) => T[]) => xs.flatMap((a) => xs.filter((b) => b !== a).flatMap((b) => f(a, b)));
  const seeds = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  const squadJobs = pairs(ids, (a, b) => seeds(opts.squadSeeds ?? g1.seeds).map((seed) => ({ a, b, job: squadDuel(content, a, b, seed, g1.goldBudget) })));
  const units = ids.map((id) => content.buildings[id]!.squad!.unit);
  const supplyPairs = [...pairs(units, (a, b) => [[a, b] as const]), ...g2.intendedEdges.filter(([a, b]) => !units.includes(a) || !units.includes(b))];
  const supplyJobs = supplyPairs.flatMap(([a, b]) => seeds(opts.supplySeeds ?? g2.seeds).map((seed): SupplyDuelJob => ({ a, b, seed, supply: opts.supply ?? g2.supply })));
  const results = await run([...squadJobs.map(({ job }): RoundJob => ({ kind: 'clash', job })), ...supplyJobs.map((job): RoundJob => ({ kind: 'supply', job }))]);
  const squad = squadJobs.map(({ a, b, job }, i) => squadOutcome(a, b, job, results[i] as RoundClashRecord));
  const supply = results.slice(squadJobs.length) as (DuelOutcome & { seconds: number })[];
  const edges: Record<string, number> = {};
  for (const o of supply) edges[`${o.a}>${o.b}`] = (edges[`${o.a}>${o.b}`] ?? 0) + (o.winner === 'a' ? 1 : 0);
  return { squad, supply, edges };
}

/** G1's and G2's duels as played. */
export type Duels = Awaited<ReturnType<typeof duels>>;

/** The duels in a few lines (§12.2): each building's pairings won and lost clearly, each unit's edges, and the intended edges. */
export function duelLines(content: Content, d: Duels): string[] {
  const g1 = content.targets.rounds.G1, g2 = content.targets.G2;
  const lines: string[] = [];
  const ids = [...new Set(d.squad.map((o) => o.a))];
  for (const a of ids) {
    let won = 0, clear = 0;
    for (const b of ids.filter((x) => x !== a)) {
      const games = d.squad.filter((o) => (o.a === a && o.b === b) || (o.a === b && o.b === a));
      const mine = (o: DuelOutcome) => (o.a === a ? [o.valueA, o.valueB] : [o.valueB, o.valueA]) as [number, number];
      const wins = games.filter((o) => mine(o)[0] > mine(o)[1]).length;
      if (wins * 2 > games.length) won++;
      if (wins * 2 < games.length && games.reduce((s, o) => s + (mine(o)[1] + 1) / (mine(o)[0] + 1), 0) / games.length >= g1.clearLossRatio) clear++;
    }
    lines.push(`squad duels ${a}: wins ${won}/${ids.length - 1} pairings, loses ${clear} clearly`);
  }
  const units = [...new Set(d.supply.map((o) => o.a))].filter((u) => !u.includes('@'));
  for (const a of units) {
    const beats = units.filter((b) => b !== a && (d.edges[`${a}>${b}`] ?? 0) >= g2.minSeedsForEdge);
    const losesTo = units.filter((b) => b !== a && (d.edges[`${b}>${a}`] ?? 0) >= g2.minSeedsForEdge);
    lines.push(`supply duels ${a}: beats [${beats.join(', ')}] · loses to [${losesTo.join(', ')}]`);
  }
  for (const [a, b] of g2.intendedEdges) lines.push(`intended edge ${a} > ${b}: ${d.edges[`${a}>${b}`] ?? 0}/${g2.seeds} seeds`);
  return lines;
}

/** A matchup's battles in the tournament's terms (§12.2): win rates, rounds, the cap, clash lengths and lead changes. */
export interface TournamentRow {
  player: string;
  enemy: string;
  map: string;
  games: number;
  /** The player's wins. */
  wins: number;
  medianRounds: number | null;
  /** Battles that reached the last round, and so ended by Rout in it or by Decision. */
  lastRound: number;
  /** Each lane's clash: how many, how many reached the 45 s cap, and the median length in ticks. */
  clashes: number;
  capped: number;
  medianClashTicks: number | null;
  /** How often the lead in the Heartcap race changed hands, over every battle, and in how many battles it did. */
  leadChanges: number;
  changedBattles: number;
  rejected: number;
}

/** Tallies one matchup's battles; `maxRounds` is the battle's last round (9). */
export function tournamentRow(records: readonly RoundBattleRecord[], maxRounds: number): TournamentRow {
  const changes = records.map((r) => {
    let n = 0, last: Side | null = null;
    for (const l of r.leads) { if (l && last && l !== last) n++; if (l) last = l; }
    return n;
  });
  const clashes = records.flatMap((r) => r.clashes);
  const first = records[0]!;
  return {
    player: first.player, enemy: first.enemy, map: first.map, games: records.length,
    wins: records.filter((r) => r.winner === 'player').length,
    medianRounds: median(records.map((r) => r.rounds)), lastRound: records.filter((r) => r.rounds >= maxRounds).length,
    clashes: clashes.length, capped: clashes.filter((c) => c.capped).length, medianClashTicks: median(clashes.map((c) => c.ticks)),
    leadChanges: changes.reduce((a, b) => a + b, 0), changedBattles: changes.filter((n) => n > 0).length,
    rejected: records.reduce((n, r) => n + r.rejected, 0),
  };
}

/** The strategy bots of the tournament (§12.2, §15.3). */
export const TOURNAMENT_BOTS = ['bot:balanced', 'bot:rush', 'bot:turtle', 'bot:greedy'];

/**
 * The tournament (§12.2, §15.3): each of `bots` against `enemy` (the scripted general) on `map` (Bogwater Hollow)
 * over seeds 1 to `seeds` (G4's 40), battles of rounds with the battle's default flags, played by `run`.
 */
export async function tournament(content: Content, run: RoundRunner, opts: { bots?: string[]; enemy?: string; map?: string; seeds?: number } = {}): Promise<TournamentRow[]> {
  const bots = opts.bots ?? TOURNAMENT_BOTS, seeds = opts.seeds ?? content.targets.G4.seeds;
  const jobs = bots.flatMap((player) => Array.from({ length: seeds }, (_, i): RoundJob => ({
    kind: 'battle', job: { seed: i + 1, map: opts.map ?? 'bogwater-hollow', player, enemy: opts.enemy ?? 'general:scripted' },
  })));
  const records = (await run(jobs)) as RoundBattleRecord[];
  return bots.map((_, i) => tournamentRow(records.slice(i * seeds, (i + 1) * seeds), content.balance.rounds.maxRounds));
}

const pctOf = (n: number, d: number) => `${d ? Math.round((100 * n) / d) : 0}%`;
const secs = (ticks: number | null) => (ticks === null ? '-' : `${(ticks / 20).toFixed(1)} s`);

/** A row in a line: win rate, median rounds, the last round, the cap, the clash length and the lead's changes. */
export function rowLine(r: TournamentRow, maxRounds: number): string {
  return `${r.player} vs ${r.enemy} on ${r.map}, ${r.games} battles: wins ${pctOf(r.wins, r.games)} · rounds median ${r.medianRounds ?? '-'}`
    + ` · reached round ${maxRounds} ${pctOf(r.lastRound, r.games)} · clashes at the cap ${r.capped}/${r.clashes} (${pctOf(r.capped, r.clashes)})`
    + ` · clash length median ${secs(r.medianClashTicks)} · the lead changed hands ${r.leadChanges} times, in ${pctOf(r.changedBattles, r.games)} of battles`
    + `${r.rejected ? ` · ${r.rejected} commands rejected` : ''}`;
}

/** G4's reading of a `bot:balanced` row against the `rounds` targets' band, and G13's beside it, each within or outside. */
export function g4Lines(content: Content, r: TournamentRow): string[] {
  const g4 = content.targets.rounds.G4, g13 = content.targets.rounds.G13, maxRounds = content.balance.rounds.maxRounds;
  const within = (ok: boolean) => (ok ? 'within' : 'OUTSIDE');
  const m = r.medianRounds ?? 0, win = r.wins / r.games, last = r.lastRound / r.games, cap = r.capped / Math.max(1, r.clashes), len = (r.medianClashTicks ?? 0) / 20;
  return [
    rowLine(r, maxRounds),
    `  G4: median ${m} rounds ${within(m >= g4.medianMinRounds && m <= g4.medianMaxRounds)} ${g4.medianMinRounds}–${g4.medianMaxRounds}`
      + ` · round ${maxRounds} ${pctOf(r.lastRound, r.games)} ${within(last <= g4.maxRound9Share)} ≤ ${g4.maxRound9Share * 100}%`
      + ` · the bot wins ${pctOf(r.wins, r.games)} ${within(win >= g4.botWinMin && win <= g4.botWinMax)} ${g4.botWinMin * 100}–${g4.botWinMax * 100}%`,
    `  G13: capped ${pctOf(r.capped, r.clashes)} ${within(cap <= g13.maxCappedShare)} ≤ ${g13.maxCappedShare * 100}%`
      + ` · median clash ${len.toFixed(1)} s ${within(len >= g13.clashSecondsMin && len <= g13.clashSecondsMax)} ${g13.clashSecondsMin}–${g13.clashSecondsMax} s`,
  ];
}

// ---- the guardrails in round form (§12.3, T123) ----

// Each evaluator reads the `rounds` block of `data/balance-targets.json` (T119), plays its battles, clashes and
// duels as round jobs through a `RoundRunner` (in process, or on the pool for G3, G12 and the battles, R2-Q9), and
// returns v1's `Verdict`. The battle-level bands are §12.3's first guesses until the user sets them (#35, T125).

const ok = (pass: boolean) => (pass ? 'ok  ' : 'FAIL');
const rate = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '–');
const seedList = (n: number, first = 1) => Array.from({ length: n }, (_, i) => first + i);

/** G1: the squad duels (§12.3). No building wins more than `maxPairingWinShare` of its pairings, and each wins one and loses one clearly. */
export function evaluateG1(content: Content, d: Duels): Verdict {
  const t = content.targets.rounds.G1;
  const ids = [...new Set(d.squad.map((o) => o.a))];
  const details: string[] = [];
  let pass = true;
  for (const a of ids) {
    let won = 0, clear = false;
    for (const b of ids.filter((x) => x !== a)) {
      const games = d.squad.filter((o) => (o.a === a && o.b === b) || (o.a === b && o.b === a));
      const mine = (o: DuelOutcome) => (o.a === a ? [o.valueA, o.valueB] : [o.valueB, o.valueA]) as [number, number];
      const wins = games.filter((o) => mine(o)[0] > mine(o)[1]).length;
      if (wins * 2 > games.length) won++;
      if (wins * 2 < games.length && games.reduce((n, o) => n + (mine(o)[1] + 1) / (mine(o)[0] + 1), 0) / games.length >= t.clearLossRatio) clear = true;
    }
    const good = won / (ids.length - 1) <= t.maxPairingWinShare && won > 0 && clear;
    if (!good) pass = false;
    details.push(`${ok(good)} ${a}: wins ${won}/${ids.length - 1} pairings${won ? '' : ' (wins none)'}${clear ? '' : ' (never loses clearly)'}`);
  }
  return { id: 'G1', pass, summary: `squad duels in a round clash at ${t.goldBudget} gold: ≤${rate(t.maxPairingWinShare)} of pairings won, ≥1 win and ≥1 clear loss each`, details };
}

/** G2: the supply duels form a healthy counter graph, and the asserted intended edges hold (§12.3; G2's block is v1's, kept). */
export function evaluateG2(content: Content, d: Duels): Verdict {
  const t = content.targets.G2;
  const units = [...new Set(d.supply.map((o) => o.a))].filter((u) => !u.includes('@'));
  const seeds = d.supply.filter((o) => o.a === units[0] && o.b === units[1]).length;
  const details: string[] = [];
  let pass = true;
  for (const a of units) {
    const beats = units.filter((b) => b !== a && (d.edges[`${a}>${b}`] ?? 0) >= t.minSeedsForEdge);
    const losesTo = units.filter((b) => b !== a && (d.edges[`${b}>${a}`] ?? 0) >= t.minSeedsForEdge);
    const good = beats.length > 0 && losesTo.length > 0;
    if (!good) pass = false;
    details.push(`${ok(good)} ${a}: beats [${beats.join(', ')}] · loses to [${losesTo.join(', ')}]`);
  }
  for (const [a, b] of t.intendedEdges) {
    const w = d.edges[`${a}>${b}`] ?? 0;
    const asserted = (t.assertedEdges ?? []).some(([x, y]) => x === a && y === b);
    if (asserted && w < t.minSeedsForEdge) pass = false;
    details.push(`${w >= t.minSeedsForEdge ? 'held' : 'MISS'} intended edge ${a} > ${b}: ${w}/${seeds} seeds${asserted ? ' (asserted)' : ' (report only)'}`);
  }
  return { id: 'G2', pass, summary: `supply duels in a round clash form a healthy counter graph (≥${t.minSeedsForEdge}/${seeds} seeds an edge) and the asserted edges hold`, details };
}

/** One pairing on one map: `a` against `b`, with the battle's flags unless set. */
export interface SeatCell {
  a: string;
  b: string;
  map: string;
  flags?: Partial<Flags>;
}

/** A pairing's battles: A's wins over both seats (or the seats played), as the player and as the enemy, and the median rounds. */
export interface SeatRow extends SeatCell {
  winsA: number;
  games: number;
  player: number;
  enemy: number;
  medianRounds: number | null;
}

/** Plays each cell over `seeds` from `firstSeed`, in each of `seats` (A as the player, then as the enemy), as one batch of battles. */
export async function playSeats(run: RoundRunner, cells: readonly SeatCell[], seeds: number, firstSeed = 1, seats: readonly Side[] = ['player', 'enemy']): Promise<SeatRow[]> {
  const jobs = cells.flatMap((c) => seats.flatMap((seat) => seedList(seeds, firstSeed).map((seed): RoundJob => ({
    kind: 'battle', job: { seed, map: c.map, player: seat === 'player' ? c.a : c.b, enemy: seat === 'player' ? c.b : c.a, ...(c.flags ? { flags: c.flags } : {}) },
  }))));
  const records = (await run(jobs)) as RoundBattleRecord[];
  const per = seats.length * seeds;
  return cells.map((c, i) => {
    const mine = records.slice(i * per, (i + 1) * per);
    const won = (seat: Side) => mine.filter((r, k) => seats[Math.floor(k / seeds)] === seat && r.winner === seat).length;
    const player = won('player'), enemy = won('enemy');
    return { ...c, winsA: player + enemy, games: mine.length, player, enemy, medianRounds: median(mine.map((r) => r.rounds)) };
  });
}

/** A mono bot's G3 reading over the run's maps. */
export interface RoundG3Bot { id: string; mean: number; worst: number; worstMap: string; pass: boolean }
export type RoundG3Verdict = Verdict & { rows: SeatRow[]; bots: RoundG3Bot[]; maps: string[]; seeds: number };

/** G3 in rounds (§12.3): every mono bot against `bot:balanced` on every run-pool map, `seeds` a seat; mean ≤ 55%, worst map ≤ 60%. */
export async function evaluateG3(content: Content, run: RoundRunner, opts: { maps?: string[]; ids?: string[]; seeds?: number } = {}): Promise<RoundG3Verdict> {
  const t = content.targets.rounds.G3;
  const maps = opts.maps ?? mapPool(content), ids = opts.ids ?? rosterIds(content), seeds = opts.seeds ?? t.seeds;
  const rows = await playSeats(run, maps.flatMap((map) => ids.map((id) => ({ a: `bot:mono:${id}`, b: 'bot:balanced', map }))), seeds);
  const bots = ids.map((id): RoundG3Bot => {
    const mine = maps.map((m) => rows.find((r) => r.map === m && r.a === `bot:mono:${id}`)!);
    const rates = mine.map((r) => r.winsA / r.games);
    const worst = Math.max(...rates);
    const mean = mine.reduce((n, r) => n + r.winsA, 0) / mine.reduce((n, r) => n + r.games, 0);
    return { id, mean, worst, worstMap: maps[rates.indexOf(worst)]!, pass: mean <= t.maxMeanWinRate && worst <= t.maxMapWinRate };
  });
  const w = Math.max(...ids.map((id) => id.length));
  const details = [
    `mono win % against bot:balanced in battles of rounds, ${2 * seeds} a map (both seats). Limits: mean ≤${rate(t.maxMeanWinRate)}, worst map ≤${rate(t.maxMapWinRate)}`,
    `     ${''.padEnd(w)}  ${maps.join('  ')}  mean  worst`,
    ...bots.map((b) => `${ok(b.pass)} ${b.id.padEnd(w)}  ${maps.map((m) => rate(rows.find((r) => r.map === m && r.a === `bot:mono:${b.id}`)!.winsA / (2 * seeds)).padStart(m.length)).join('  ')}  ${rate(b.mean).padStart(4)}  ${rate(b.worst).padStart(5)}`),
  ];
  return { id: 'G3', pass: bots.every((b) => b.pass), rows, bots, maps, seeds, summary: `every mono bot vs bot:balanced in rounds on the run's maps: mean ≤${rate(t.maxMeanWinRate)}, worst map ≤${rate(t.maxMapWinRate)}`, details };
}

/** An answer's results against one mono build, the answer's win rate on each map, its worst and its mean. */
export interface RoundCounterResult { answer: string; kind: AnswerKind; maps: Record<string, number>; worst: number; mean: number; failsG3: boolean }
export interface RoundCounterBuild { build: string; g3Mean: number; screen: RoundCounterResult[]; top: RoundCounterResult[]; pass: boolean }

/**
 * G12, the strict counter bar in rounds (§12.3): each mono build whose G3 mean is above `minBuildMean` against every
 * answer of the counter matrix on every run-pool map, both seats; the best `top` of a screen at `screenSeeds` a seat
 * that don't fail G3 themselves (§12.3) are confirmed on the next `confirmSeeds`. A build passes if one wins
 * `minAnswerRate` on every map. Content must hold `counterBotSpec`'s bots.
 */
export async function evaluateG12(content: Content, run: RoundRunner, opts: { g3: RoundG3Verdict; screenSeeds?: number; confirmSeeds?: number }): Promise<Verdict & { builds: RoundCounterBuild[] }> {
  const t = content.targets.rounds.G12;
  const { g3 } = opts, maps = g3.maps;
  const screenSeeds = opts.screenSeeds ?? t.screenSeeds, confirmSeeds = opts.confirmSeeds ?? t.confirmSeeds;
  const builds = g3.bots.filter((b) => b.mean > t.minBuildMean).map((b) => b.id);
  const failsG3 = (a: string) => g3.bots.some((b) => `bot:mono:${b.id}` === a && !b.pass);
  const play = async (pairs: [string, string][], seeds: number, first: number): Promise<RoundCounterResult[]> => {
    const rows = await playSeats(run, pairs.flatMap(([build, answer]) => maps.map((map) => ({ a: answer, b: `bot:mono:${build}`, map }))), seeds, first);
    return pairs.map(([, answer], i) => {
      const mine = rows.slice(i * maps.length, (i + 1) * maps.length);
      const rates = Object.fromEntries(mine.map((r) => [r.map, r.winsA / r.games]));
      return { answer, kind: answerKind(answer), maps: rates, worst: Math.min(...Object.values(rates)), mean: mine.reduce((n, r) => n + r.winsA, 0) / mine.reduce((n, r) => n + r.games, 0), failsG3: failsG3(answer) };
    });
  };
  const best = (rs: RoundCounterResult[]) => [...rs].sort((x, y) => y.worst - x.worst || y.mean - x.mean);
  const screenPairs = builds.flatMap((b) => counterAnswers(content, b).map((a): [string, string] => [b, a]));
  const screened = await play(screenPairs, screenSeeds, 1);
  const screens = builds.map((b) => best(screened.filter((_, i) => screenPairs[i]![0] === b)));
  // an answer that fails G3 itself doesn't count (§12.3), so the confirmations go to the best that pass it
  const confirmPairs = builds.flatMap((b, i) => screens[i]!.filter((r) => !r.failsG3).slice(0, t.top).map((r): [string, string] => [b, r.answer]));
  const confirmed = await play(confirmPairs, confirmSeeds, screenSeeds + 1);
  const results = builds.map((build, i): RoundCounterBuild => {
    const top = best(confirmed.filter((_, k) => confirmPairs[k]![0] === build));
    return { build, g3Mean: g3.bots.find((b) => b.id === build)!.mean, screen: screens[i]!, top, pass: (top[0]?.worst ?? 0) >= t.minAnswerRate };
  });
  const details = [
    `answer win % against each mono build with a G3 mean above ${rate(t.minBuildMean)}, both seats. Screen ${2 * screenSeeds} a map; the top ${t.top} that pass G3 confirmed on ${2 * confirmSeeds} a map. Pass: one wins ≥${rate(t.minAnswerRate)} on every map`,
    ...(results.length ? [] : ['no mono build has a G3 mean above the bar']),
    ...results.flatMap((r) => [
      `${ok(r.pass)} mono:${r.build} (G3 mean ${rate(r.g3Mean)}, ${r.screen.length} answers; best on the screen ${r.screen[0] ? `${r.screen[0].answer}, worst map ${rate(r.screen[0].worst)}${r.screen[0].failsG3 ? ', fails G3 itself' : ''}` : 'none'})`,
      ...r.top.map((a) => `       ${a.answer}: ${maps.map((m) => `${m} ${rate(a.maps[m]!)}`).join(', ')} · worst ${rate(a.worst)}`),
    ]),
  ];
  return { id: 'G12', pass: results.every((r) => r.pass), builds: results, summary: `the strict counter bar in rounds: every mono build above ${rate(t.minBuildMean)} in G3 has an answer winning ≥${rate(t.minAnswerRate)} on every run-pool map`, details };
}

/** G4's battles, which G6's second clause and G13 read too: `bot:balanced` against the scripted general on Bogwater Hollow. */
export async function g4Battles(content: Content, run: RoundRunner, opts: { map?: string; seeds?: number } = {}): Promise<RoundBattleRecord[]> {
  const seeds = opts.seeds ?? content.targets.rounds.G4.seeds;
  return (await run(seedList(seeds).map((seed): RoundJob => ({ kind: 'battle', job: { seed, map: opts.map ?? 'bogwater-hollow', player: 'bot:balanced', enemy: 'general:scripted' } })))) as RoundBattleRecord[];
}

/** G4 in rounds (§12.3): the median rounds within the band, at most `maxRound9Share` reaching the last round, the bot's wins within its band. */
export function evaluateG4(content: Content, records: readonly RoundBattleRecord[]): Verdict & { row: TournamentRow } {
  const t = content.targets.rounds.G4, maxRounds = content.balance.rounds.maxRounds;
  const row = tournamentRow(records, maxRounds);
  const m = row.medianRounds ?? 0, last = row.lastRound / row.games, win = row.wins / row.games;
  const checks: [boolean, string][] = [
    [m >= t.medianMinRounds && m <= t.medianMaxRounds, `median ${m} rounds (band ${t.medianMinRounds}–${t.medianMaxRounds})`],
    [last <= t.maxRound9Share, `${rate(last)} reached round ${maxRounds} (≤${rate(t.maxRound9Share)})`],
    [win >= t.botWinMin && win <= t.botWinMax, `bot:balanced wins ${rate(win)} (band ${rate(t.botWinMin)}–${rate(t.botWinMax)})`],
    [row.rejected === 0, `${row.rejected} commands rejected`],
  ];
  const damaging = records.reduce((n, r) => n + r.damageRounds, 0), capped = records.reduce((n, r) => n + r.cappedRounds, 0);
  return {
    id: 'G4', pass: checks.every(([p]) => p), row, summary: `rounds per battle: bot:balanced vs the scripted general on ${records[0]?.map}, ${records.length} battles`,
    details: [...checks.map(([p, d]) => `${ok(p)} ${d}`), `info the round's damage cap bound in ${capped} of ${damaging} rounds with Heartcap damage, ${rate(capped / Math.max(1, damaging))}`],
  };
}

/** G13 in rounds (§12.3), over G4's battles: at most `maxCappedShare` of clashes reach the 45 s cap, and the median clash within its band. */
export function evaluateG13(content: Content, records: readonly RoundBattleRecord[]): Verdict {
  const t = content.targets.rounds.G13;
  const row = tournamentRow(records, content.balance.rounds.maxRounds);
  const cap = row.capped / Math.max(1, row.clashes), len = (row.medianClashTicks ?? 0) / 20;
  const checks: [boolean, string][] = [
    [cap <= t.maxCappedShare, `${row.capped} of ${row.clashes} clashes reached the cap, ${rate(cap)} (≤${rate(t.maxCappedShare)})`],
    [len >= t.clashSecondsMin && len <= t.clashSecondsMax, `median clash ${len.toFixed(1)} s, the muster counted (band ${t.clashSecondsMin}–${t.clashSecondsMax} s)`],
  ];
  return { id: 'G13', pass: checks.every(([p]) => p), summary: `clash stalls over G4's ${records.length} battles`, details: checks.map(([p, d]) => `${ok(p)} ${d}`) };
}

/** Battles of `a` against `b` on Bogwater Hollow in both seats over `seeds`, each job made by `job`, with A's seat beside each record. */
async function bothSeats(run: RoundRunner, seeds: number, job: (seat: Side, seed: number) => RoundBattleJob): Promise<{ seat: Side; r: RoundBattleRecord }[]> {
  const seats: Side[] = ['player', 'enemy'];
  const jobs = seats.flatMap((seat) => seedList(seeds).map((seed): RoundJob => ({ kind: 'battle', job: job(seat, seed) })));
  const records = (await run(jobs)) as RoundBattleRecord[];
  return records.map((r, i) => ({ seat: seats[Math.floor(i / seeds)]!, r }));
}

const pairJob = (a: string, b: string) => (seat: Side, seed: number): RoundBattleJob => ({ seed, map: 'bogwater-hollow', player: seat === 'player' ? a : b, enemy: seat === 'player' ? b : a });

/** G5 in rounds (§12.3): `bot:balanced` given `bonusGold` more starting gold beats itself in 55–75% of battles, both seats. */
export async function evaluateG5(content: Content, run: RoundRunner): Promise<Verdict> {
  const t = content.targets.rounds.G5;
  const games = await bothSeats(run, t.seeds, (seat, seed) => ({ ...pairJob('bot:balanced', 'bot:balanced')(seat, seed), bonusGold: { [seat]: t.bonusGold } }));
  const r = games.filter((g) => g.r.winner === g.seat).length / games.length;
  const pass = r >= t.minWinRate && r <= t.maxWinRate;
  return { id: 'G5', pass, summary: `snowball in rounds: +${t.bonusGold} starting gold wins ${rate(t.minWinRate)}–${rate(t.maxWinRate)}`, details: [`${ok(pass)} the +${t.bonusGold} side wins ${rate(r)} of ${games.length} battles (both seats)`] };
}

/** A round scenario with its sides traded, so the side it puts behind plays as the enemy: colonies, Heartcaps and the record (G6). */
export function mirrorScenario(content: Content, def: ScenarioDef): ScenarioDef {
  const bal = content.balance, swap = (s: Side | null) => (s === null ? null : s === 'player' ? 'enemy' : 'player');
  const maxHp = { player: def.sides.player.heartcapMaxHp ?? bal.heartcapPlayerHp, enemy: def.sides.enemy.heartcapMaxHp ?? bal.heartcapEnemyHp.base + bal.heartcapEnemyHp.perBattle * ((def.battleIndex ?? 1) - 1) };
  const traded = <T extends { lanes?: (Side | null)[]; damage?: Record<Side, number> }>(r: T): T => ({
    ...r, ...(r.lanes ? { lanes: r.lanes.map(swap) } : {}), ...(r.damage ? { damage: { player: r.damage.enemy, enemy: r.damage.player } } : {}),
  });
  return {
    ...def, id: `${def.id}-mirror`,
    sides: { player: { ...def.sides.enemy, heartcapMaxHp: maxHp.enemy }, enemy: { ...def.sides.player, heartcapMaxHp: maxHp.player } },
    ...(def.last ? { last: traded(def.last) } : {}),
    ...(def.rounds ? { rounds: def.rounds.map((r) => ({ ...traded(r), ...(r.fielded ? { fielded: { player: r.fielded.enemy, enemy: r.fielded.player } } : {}) })) } : {}),
  };
}

/**
 * G6 in rounds (§12.3): from `scenario` (round 4, the behind side 700 below full, equal max HP), played by `bot` on both
 * sides in both seats, the behind side wins within its band; and in G4's battles, the winner's Heartcap was hit in at
 * least `winnerHitShare` of them.
 */
export async function evaluateG6(content: Content, run: RoundRunner, g4: readonly RoundBattleRecord[]): Promise<Verdict> {
  const t = content.targets.rounds.G6, def = content.scenarios[t.scenario];
  if (!def) throw new Error(`G6: no round scenario ${t.scenario}`);
  const behind: Side = (def.sides.player.heartcapHp ?? Infinity) < (def.sides.enemy.heartcapHp ?? Infinity) ? 'player' : 'enemy';
  const bot = `bot:${t.bot}`, mirror = mirrorScenario(content, def);
  const games = await bothSeats(run, t.seeds, (seat, seed) => {
    const d = seat === behind ? def : mirror;
    return { seed, map: d.map, player: bot, enemy: bot, scenario: d };
  });
  const r = games.filter((g) => g.r.winner === g.seat).length / games.length;
  const won = g4.filter((x) => x.winner !== null), hit = won.filter((x) => x.damageTaken[x.winner!] > 0).length / Math.max(1, won.length);
  const comeback = r >= t.minBehindWinRate && r <= t.maxBehindWinRate, race = hit >= t.winnerHitShare;
  return {
    id: 'G6', pass: comeback && race, summary: `comeback in rounds: behind at round 4, the behind side wins ${rate(t.minBehindWinRate)}–${rate(t.maxBehindWinRate)}; the winner is hit in ≥${rate(t.winnerHitShare)} of G4's battles`,
    details: [
      `${ok(comeback)} the behind side wins ${rate(r)} of ${games.length} battles from ${t.scenario}, ${bot} on both sides, both seats`,
      `${ok(race)} the winner's Heartcap took damage in ${rate(hit)} of G4's ${won.length} battles`,
    ],
  };
}

/** G7 in rounds (§12.3): merge-on against its merge-off twin wins 55–70% of the mirror, and ≤ 50% with about 25% of fielded supply in Slayers. */
export async function evaluateG7(content: Content, run: RoundRunner): Promise<Verdict> {
  const t = content.targets.rounds.G7;
  const twin = async (c: { mergeBot: string; noMergeBot: string }) => bothSeats(run, t.seeds, pairJob(`bot:${c.mergeBot}`, `bot:${c.noMergeBot}`));
  const mirror = await twin(t.mirror), slayers = await twin(t.slayers);
  const won = (gs: { seat: Side; r: RoundBattleRecord }[]) => gs.filter((g) => g.r.winner === g.seat).length / gs.length;
  const fielded = slayers.flatMap((g) => [g.r.supply.player, g.r.supply.enemy]);
  const share = fielded.reduce((n, s) => n + s.slayers, 0) / Math.max(1, fielded.reduce((n, s) => n + s.all, 0));
  const m = won(mirror), s = won(slayers);
  const mirrorOk = m >= t.mirror.minWinRate && m <= t.mirror.maxWinRate, slayerOk = s <= t.slayers.maxWinRate;
  return {
    id: 'G7', pass: mirrorOk && slayerOk,
    summary: `merging in rounds: merge-on wins ${rate(t.mirror.minWinRate)}–${rate(t.mirror.maxWinRate)} of the mirror, ≤${rate(t.slayers.maxWinRate)} with ~${rate(t.slayers.share)} Slayers`,
    details: [
      `${ok(mirrorOk)} bot:${t.mirror.mergeBot} vs bot:${t.mirror.noMergeBot}: ${rate(m)} of ${mirror.length} battles (both seats)`,
      `${ok(slayerOk)} bot:${t.slayers.mergeBot} vs bot:${t.slayers.noMergeBot}: ${rate(s)} of ${slayers.length} battles; Slayers ${rate(share)} of the supply both fielded (target ~${rate(t.slayers.share)})`,
    ],
  };
}

/** A mono bot's G8 reading: its win rate against the general with the counter cycle off and on. */
export interface RoundG8Row { bot: string; off: number; on: number; drop: number; asserted: boolean; ok: boolean }

/**
 * G8 in rounds (§12.3): each mono bot's win rate against `general` drops by `minDrop` with the counter cycle on (one
 * below `minBaseline` without it is reported only), and each planning policy's bot wins within its band against the
 * adaptive general at battle index 1: `bot:balanced` 40–65%, `bot:answer` at most 80% (X7, #35, T125).
 */
export async function evaluateG8(content: Content, run: RoundRunner): Promise<Verdict & { rows: RoundG8Row[]; policies: Record<string, number> }> {
  const t = content.targets.rounds.G8, general = `general:${t.general}`, map = 'bogwater-hollow';
  const off = { merging: true, adaptiveGeneral: false }, on = { merging: true, adaptiveGeneral: true };
  const ids = rosterIds(content);
  const cells: SeatCell[] = [
    ...ids.flatMap((id) => [{ a: `bot:mono:${id}`, b: general, map, flags: off }, { a: `bot:mono:${id}`, b: general, map, flags: on }]),
    ...t.policies.map((p) => ({ a: `bot:${p.bot}`, b: general, map, flags: on })),
  ];
  const rows = await playSeats(run, cells, t.seeds, 1, ['player']);
  const winRate = (i: number) => rows[i]!.winsA / rows[i]!.games;
  const monos = ids.map((id, i): RoundG8Row => {
    const rOff = winRate(2 * i), rOn = winRate(2 * i + 1), asserted = rOff >= t.minBaseline;
    // a drop of exactly `minDrop` passes: 11/30 − 5/30 is a hair under 0.2 in floats
    return { bot: id, off: rOff, on: rOn, drop: rOff - rOn, asserted, ok: !asserted || rOff - rOn >= t.minDrop - 1e-9 };
  });
  const bands = t.policies.map((p, k) => {
    const r = winRate(2 * ids.length + k), good = (p.min === undefined || r >= p.min) && (p.max === undefined || r <= p.max);
    const band = p.min === undefined ? `at most ${rate(p.max!)}` : p.max === undefined ? `at least ${rate(p.min)}` : `${rate(p.min)}–${rate(p.max)}`;
    return { bot: p.bot, r, good, band };
  });
  const details = [
    ...monos.map((r) => `${!r.asserted ? 'n/a ' : ok(r.ok)} mono:${r.bot} vs ${t.general}: ${rate(r.off)} → ${rate(r.on)} with the counter cycle (drop ${Math.round(r.drop * 100)} points${r.asserted ? '' : `; under the ${rate(t.minBaseline)} baseline, report only`})`),
    ...bands.map((b) => `${ok(b.good)} bot:${b.bot} vs adaptive ${t.general} at battle index 1: ${rate(b.r)} (band ${b.band})`),
  ];
  return {
    id: 'G8', pass: monos.every((r) => r.ok) && bands.every((b) => b.good), rows: monos, policies: Object.fromEntries(bands.map((b) => [b.bot, b.r])),
    summary: `adaptation in rounds: every mono bot drops ≥${Math.round(t.minDrop * 100)} points against the adaptive ${t.general}; ${bands.map((b) => `bot:${b.bot} ${b.band}`).join(', ')}`,
    details,
  };
}

/** One G16 cell: a pair's army at a budget, by the formation rule against its own ranks traded, each seat. */
export interface G16Cell { a: string; b: string; budget: number; seed: number; roleSplit: boolean; score: number }

/**
 * G16 in rounds (§12.3, R2-Q10): each pair of army buildings' army (its even pair bot's, so the content must hold
 * `counterBotSpec`'s bots) at each budget where both fit, on the one-lane field, planted by the formation rule
 * against the same army with its front and back ranks traded, in both seats: R1-Q3's winner, a draw worth half.
 * Pooled over role-split pairs it wins at least `minWinRate`, with a column per budget; same-role pairs are reported.
 */
export async function evaluateG16(content: Content, run: RoundRunner, opts: { seeds?: number; budgets?: number[] } = {}): Promise<Verdict & { cells: G16Cell[] }> {
  const t = content.targets.rounds.G16, seeds = opts.seeds ?? t.seeds, budgets = opts.budgets ?? t.budgets;
  const ids = armyIds(content), plots = clashField(content, 'one').plots;
  const specs: Omit<G16Cell, 'score'>[] = [];
  const jobs: RoundJob[] = [];
  ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => {
    const roleSplit = lineOf(content, a) !== lineOf(content, b);
    for (const budget of budgets) for (const seed of seedList(seeds)) {
      const army = armyFromBot(content, `bot:pair-${a}-${b}`, budget, seed, plots);
      if (!army.entries.some((e) => e.buildingId === a) || !army.entries.some((e) => e.buildingId === b)) continue;
      specs.push({ a, b, budget, seed, roleSplit });
      for (const seat of ['player', 'enemy'] as const) jobs.push({ kind: 'clash', job: { field: 'one', seed, seat, armies: [army, army], opts: { swap: [false, true] } } });
    }
  }));
  const records = (await run(jobs)) as RoundClashRecord[];
  const point = (r: RoundClashRecord) => (r.winner === 'a' ? 1 : r.winner === 'draw' ? 0.5 : 0);
  const cells = specs.map((c, i): G16Cell => ({ ...c, score: (point(records[2 * i]!) + point(records[2 * i + 1]!)) / 2 }));
  const pooled = (cs: G16Cell[]) => cs.reduce((n, c) => n + c.score, 0) / Math.max(1, cs.length);
  const split = cells.filter((c) => c.roleSplit), same = cells.filter((c) => !c.roleSplit);
  const r = pooled(split), pass = r >= t.minWinRate;
  const column = (cs: G16Cell[]) => budgets.map((g) => { const at = cs.filter((c) => c.budget === g); return `${g}: ${at.length ? rate(pooled(at)) : '–'}`; }).join(' · ');
  return {
    id: 'G16', pass, cells,
    summary: `formation in rounds: the formation rule beats its ranks traded in ≥${rate(t.minWinRate)} of clashes, pooled over role-split pairs`,
    details: [
      `${ok(pass)} role-split pairs: ${rate(r)} of ${2 * split.length} clashes, ${seeds} seeds a budget, both seats · by budget ${column(split)}`,
      `info same-role pairs (reported): ${rate(pooled(same))} of ${2 * same.length} clashes · by budget ${column(same)}`,
    ],
  };
}

// ---------------------------------------------------------------- the counter matrix

/**
 * The counter check (docs/archive/v1/ideas/combat-rework.md): a strong mono build is a strategy if something beats
 * it, and the bug if nothing does. Defaults, and the proposed pass rule: some answer wins ≥ 60%.
 */
export const COUNTERS = { screenSeeds: 10, confirmSeeds: 50, top: 3, minBuildMean: 0.4, minAnswerRate: 0.6 };

/** The buildings that fight: spawners of fighting units (spawnerIds) and towers. The check pairs these. */
export function armyIds(content: Content): string[] {
  const spawners = spawnerIds(content);
  return rosterIds(content).filter((id) => spawners.includes(id) || content.buildings[id]!.kind === 'tower');
}

/** A pair bot's opener: a, b, a, … while the starting gold covers it, as a mono bot spends its starting gold on its building. */
function pairOpener(content: Content, a: string, b: string): string[] {
  const opener: string[] = [];
  for (let spent = 0, i = 0; ; i++) {
    const id = i % 2 ? b : a;
    spent += content.buildings[id]!.cost;
    if (spent > content.balance.startingGold) return opener;
    opener.push(id);
  }
}

/**
 * The answer bots the check adds to the content: one bot per pair of army buildings, weighted evenly
 * (`pair-<a>-<b>`), and hand-written counter bots in the style of round 2's D1 defenders. D1's own
 * specs weren't recorded, so `d1-*` are rebuilt from the backlog's descriptions; on v1's battle without Hold
 * they reproduced D1's table, Amanita-heavy within 2 games of 40.
 */
export function counterBots(content: Content): Record<string, Omit<BotDef, 'id'>> {
  const bots: Record<string, Omit<BotDef, 'id'>> = {};
  const army = armyIds(content);
  for (let i = 0; i < army.length; i++) for (let j = i + 1; j < army.length; j++) {
    const a = army[i]!, b = army[j]!;
    bots[`pair-${a}-${b}`] = { description: `${content.buildings[a]!.name} and ${content.buildings[b]!.name}, weighted evenly`, opener: pairOpener(content, a, b), weights: { [a]: 1, [b]: 1 }, mergePolicy: 'on' };
  }
  const { id: _id, description: _desc, ...balanced } = content.bots.balanced!;
  const cellar = { truffleCellar: { maxOwned: 2 } };
  Object.assign(bots, {
    'd1-burrows': { ...balanced, description: 'D1: bot:balanced with a two-Burrow opener (no Cellar)', opener: ['sporelingBurrow', 'sporelingBurrow'] },
    'd1-sporeling': {
      description: 'D1: Sporeling-heavy (two Burrows; weight 5 Burrow, 1 Capguard, Cellar, Scythecap)', opener: ['sporelingBurrow', 'sporelingBurrow'],
      weights: { sporelingBurrow: 5, capguardHall: 1, truffleCellar: 1, scythecapGrove: 1 }, limits: { truffleCellar: { maxOwned: 3 } }, mergePolicy: 'on',
    },
    'd1-amanita': { description: 'D1: Amanita-heavy (Lodge opener; weight 4 Lodge, 2 Burrow)', opener: ['amanitaLodge'], weights: { amanitaLodge: 4, sporelingBurrow: 2 }, mergePolicy: 'on' },
    'd1-adaptive': { ...balanced, description: 'D1: bot:balanced running the adaptive counter cycle', adaptive: true },
    diverdef: {
      ...balanced, description: "Step A's defender: bot:balanced with a Veilstalker opener and weight 5 Hollow (no diver rule)", opener: ['sporelingBurrow', 'veilstalkerHollow'],
      weights: { ...balanced.weights, veilstalkerHollow: 5 },
    },
    'counter-archers': {
      description: 'vs archers: Amanita Knights soak arrows (Pierce ×0.75 on heavy) while Sporelings and Veilstalkers close in', opener: ['sporelingBurrow', 'sporelingBurrow'],
      weights: { amanitaLodge: 3, sporelingBurrow: 3, veilstalkerHollow: 2, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
    'counter-rush': {
      description: 'vs archers: Sporelings and Veilstalkers placed forward, to strike before the mass stands', opener: ['sporelingBurrow', 'sporelingBurrow'],
      weights: { sporelingBurrow: 4, veilstalkerHollow: 3, amanitaLodge: 1 }, placement: { spawnerDepthWeight: 3 }, mergePolicy: 'on',
    },
    'counter-swarm': {
      description: 'vs swarms: Capguards and Scythecaps (Slash ×1.5 on light) behind Mortar splash', opener: ['capguardHall', 'capguardHall'],
      weights: { capguardHall: 4, scythecapGrove: 3, puffballMortar: 2, truffleCellar: 1 }, limits: { ...cellar, puffballMortar: { maxOwned: 3 } }, mergePolicy: 'on',
    },
    'counter-tenders': {
      description: 'vs swarms: Capguards and Scythecaps healed by Tenders', opener: ['capguardHall', 'capguardHall'],
      weights: { capguardHall: 4, scythecapGrove: 2, tendersRing: 2, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
    'counter-knights': {
      description: 'vs Amanita Knights: Hammercaps and Rootbreakers (Crush ×1.5 on heavy), Veilstalkers for merged Knights (Slayer ×3 on elites)', opener: ['hammercapForge'],
      weights: { hammercapForge: 4, rootbreakerDen: 2, veilstalkerHollow: 2, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
    'counter-runners': {
      description: 'vs Morel Runners: archers and Veilstalkers (Pierce ×1.5 on medium) behind Capguards, with Mortar splash', opener: ['gillNest', 'capguardHall'],
      weights: { gillNest: 3, veilstalkerHollow: 2, capguardHall: 2, puffballMortar: 1, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
  } satisfies Record<string, Omit<BotDef, 'id'>>);
  // each answer stays what it's named: it buys only what its weights list
  for (const def of Object.values(bots)) def.fixedWeights = true;
  return bots;
}

/** §11.2's five core spawners (★); the sixth archetype is open, between the Burster Pod and the Puffball Mortar (§18.2 #36). */
export const CORE_SPAWNERS = ['sporelingBurrow', 'capguardHall', 'gillNest', 'amanitaLodge', 'hammercapForge'] as const;

/**
 * The core-six check's reference, `bot:core6` (R1-Q6), as a spec item the check appends: the five core
 * spawners and the candidate at weight 1 each, the Burrow as its opener, merging on and its weights fixed.
 */
export function core6Spec(candidate: string): string {
  const weights = Object.fromEntries([...CORE_SPAWNERS, candidate].map((id) => [id, 1]));
  return `bot.core6:${JSON.stringify({ description: 'core six, even', opener: ['sporelingBurrow'], weights, mergePolicy: 'on', fixedWeights: true })}`;
}

/** The proto spec that adds `counterBots` (`bot.<id>:{…}` entries): build the check's content with `protoContent`. */
export function counterBotSpec(content: Content): string {
  return Object.entries(counterBots(content)).map(([id, def]) => `bot.${id}:${JSON.stringify(def)}`).join(',');
}

/** The data bots that are strategies of their own (the G7 merge-off twins are left out). */
const OTHER_BOTS = ['bot:rush', 'bot:turtle', 'bot:greedy', 'bot:slayer'];

export type AnswerKind = 'mono' | 'pair' | 'reference' | 'counter' | 'bot';

/** Every answer the check tries: each other mono bot, every even pair, `bot:balanced`, the counter bots and the other data bots. */
export function counterAnswers(content: Content, build: string): string[] {
  const added = Object.keys(counterBots(content));
  return [
    ...rosterIds(content).filter((id) => id !== build).map((id) => `bot:mono:${id}`),
    ...added.filter((id) => id.startsWith('pair-')).map((id) => `bot:${id}`),
    'bot:balanced',
    ...added.filter((id) => !id.startsWith('pair-')).map((id) => `bot:${id}`),
    ...OTHER_BOTS.filter((c) => content.bots[c.slice(4)]),
  ];
}

export function answerKind(controller: string): AnswerKind {
  if (controller.startsWith('bot:mono:')) return 'mono';
  if (controller.startsWith('bot:pair-')) return 'pair';
  if (controller === 'bot:balanced') return 'reference';
  return OTHER_BOTS.includes(controller) ? 'bot' : 'counter';
}

// ---------------------------------------------------------------- R1's clash bars

// G3, G12 and G13 on clashes (SPEC §12.2, §12.3, §16 R1), each clash played on the round sim through
// `playRoundClash` (R2b/T158). A cell is one game a bar needs: two armies at a budget on a field, a seed and a
// seat. Its winner is R1-Q3's: more lanes won, then more uncapped Heartcap damage, else a draw worth half a win.

/**
 * The clash check's defaults (§12.2, §16 R1): budgets of 300 to 1,500 gold, about rounds 1, 3, 5, 7 and
 * 9; the one-lane field and Twin Roots; the counter matrix's seeds, 20 a seat for a screen; and the
 * answers the clash matrix lists per budget. The pass rules are `COUNTERS`'s and G3's targets.
 */
export const CLASH_CHECK: typeof COUNTERS & {
  budgets: readonly number[]; fields: readonly FieldId[]; matrixAnswers: number; extraPlotsFrom: number; mirrorSeeds: number;
} = {
  ...COUNTERS, screenSeeds: 20, budgets: [300, 600, 900, 1200, 1500], fields: ['one', 'twin'], matrixAnswers: 3,
  // R1-Q4's late-run reading: the extra plots at 1,200 and 1,500 gold
  extraPlotsFrom: 1200,
  // the merge mirror's seeds per seat (T030)
  mirrorSeeds: 20,
};

/** Plays clashes and returns their records in job order (tools/lib/pool.ts plays them in worker threads). */
export type ClashRunner = (jobs: ClashJob[]) => Promise<ClashRecord[]>;

/** One game a bar needs: `a`'s army against `b`'s with `budget` gold on a field and a seed, `a` in seat `seat`. */
export interface Cell {
  a: string;
  b: string;
  field: FieldId;
  budget: number;
  seed: number;
  seat: Side;
  /** `b`'s army is `a`'s own, built on the same seed, with merging off: the merge mirror's twin (T030). */
  twin?: true;
}

/** The controller name a merge-off twin plays under in the records. */
export const twinName = (controller: string): string => `${controller} (merging off)`;

/**
 * A cell's record as the bars read it: where and when it played, who played it, and its result. A
 * ClashRecord is one. The counter matrix keeps only this much of each cell, since it plays the most.
 */
export type CellRecord = Pick<ClashRecord, 'field' | 'budget' | 'seed' | 'seat' | 'jitter' | 'cap'> & {
  armies: Record<Side, { controller: string }>;
};

export interface ClashCacheOptions {
  /** Up to ± this many tiles per unit per axis after the muster (default 0, which draws nothing). */
  jitter?: number;
  /** The clashes' options, the same for every clash but the extra plots (A017). */
  opts?: ClashOpts;
  /** The least budget `opts.extraPlots` applies at; below it a side has the base plots (default 0, every budget; R1-Q4). */
  extraPlotsFrom?: number;
  /** The armies' copies cap, the same for every army (§16 R1's variants). */
  army?: ArmyOpts;
  /** Keep every record played, for the report (`--records`). */
  keep?: boolean;
}

export interface ClashCache {
  /** Each cell's record: its clash's, with the cell's own budget, seed and controllers. */
  full(cells: readonly Cell[]): Promise<ClashRecord[]>;
  /** Each cell's record as the bars read it. */
  slim(cells: readonly Cell[]): Promise<CellRecord[]>;
  /** The army `controller` builds with `budget` gold on a field from a seed's stream, built once. */
  army(controller: string, budget: number, seed: number, field: FieldId): Army;
  /** The cells asked for, and the clashes played for them. */
  stats(): { cells: number; played: number };
  /** Every clash played, in order, if the cache keeps them. */
  records(): ClashRecord[];
}

/** Clashes a runner takes at a time, so a long check never holds every record at once. */
const CLASH_BATCH = 2048;

const prints = new WeakMap<Army, string>();

/** An army's fingerprint: its entries in build-list order, each building with its squad size and merge toggle. */
function armyPrint(army: Army): string {
  let p = prints.get(army);
  if (p === undefined) prints.set(army, (p = army.entries.map((e) => `${e.buildingId}×${e.count}${e.mergeOn ? '' : ' off'}`).join(',')));
  return p;
}

/** The controller a cell's army on `side` comes from. */
const controllerOn = (c: Cell, side: Side): string => (side === c.seat ? c.a : c.twin ? twinName(c.b) : c.b);

/**
 * The check's clashes, each distinct one played once (A007). Every army is built in this thread. A clash
 * is its field, its extra plots, its seat and the two armies' fingerprints, and its seed when the jitter
 * is on. With no jitter a clash draws no random number (the round sim's draws are the AI's, and both sides
 * of a clash are human; `clashRecord` checks it), so a fixed pair of armies plays the same clash on every
 * seed and budget. A mirror's second army is built on seed 1,000 + s, as `playPair` builds it, and a twin
 * cell's is the first army with merging off. The extra plots vary by budget (`extraPlotsFrom`), and they
 * can move squads even for the same army, so both the army key and the clash key hold them (T031).
 */
export function clashCache(content: Content, runner: ClashRunner, o: ClashCacheOptions = {}): ClashCache {
  const jitter = o.jitter ?? 0;
  const opts = clashOpts(o.opts);
  const extraAt = (budget: number): number => (budget >= (o.extraPlotsFrom ?? 0) ? opts.extraPlots : 0);
  const fields = new Map<string, ClashField>();
  const armies = new Map<string, Army>();
  const twins = new WeakMap<Army, Army>();
  // each distinct fingerprint as a small number, so a long check's keys stay short
  const printIds = new Map<string, number>();
  const done = new Map<string, Pick<ClashRecord, 'cap'> & { record?: ClashRecord }>();
  const kept: ClashRecord[] = [];
  let asked = 0, played = 0;

  const army = (controller: string, budget: number, seed: number, id: FieldId): Army => {
    const extra = extraAt(budget);
    const key = `${controller}|${budget}|${seed}|${id}|${extra}`;
    let a = armies.get(key);
    if (!a) {
      let field = fields.get(`${id}|${extra}`);
      if (!field) fields.set(`${id}|${extra}`, (field = clashField(content, id, { extraPlots: extra })));
      armies.set(key, (a = armyFromBot(content, controller, budget, seed, field.plots, o.army)));
    }
    return a;
  };
  const twinOf = (a: Army): Army => {
    let t = twins.get(a);
    if (!t) twins.set(a, (t = { ...a, controller: twinName(a.controller), entries: a.entries.map((e) => (e.kind === 'squad' ? { ...e, mergeOn: false } : e)) }));
    return t;
  };
  const jobOf = (c: Cell): ClashJob => ({
    field: c.field, seed: c.seed, seat: c.seat, jitter, opts: { ...opts, extraPlots: extraAt(c.budget) },
    armies: [
      army(c.a, c.budget, c.seed, c.field),
      c.twin ? twinOf(army(c.b, c.budget, c.seed, c.field)) : army(c.b, c.budget, c.a === c.b ? MIRROR_SEED + c.seed : c.seed, c.field),
    ],
  });
  const printId = (a: Army): number => {
    const p = armyPrint(a);
    let n = printIds.get(p);
    if (n === undefined) printIds.set(p, (n = printIds.size));
    return n;
  };
  const keyOf = (j: ClashJob): string => `${j.field}|${j.opts!.extraPlots}|${j.seat}|${printId(j.armies[0])}|${printId(j.armies[1])}|${jitter > 0 ? j.seed : ''}`;

  /** Each cell's clash, playing the ones not played yet (or, for a full record, not kept yet). */
  async function play(cells: readonly Cell[], full: boolean) {
    asked += cells.length;
    const jobs = cells.map(jobOf);
    const keys = jobs.map(keyOf);
    const todo: number[] = [];
    const queued = new Set<string>();
    keys.forEach((k, i) => {
      const d = done.get(k);
      if ((d && (d.record || !full)) || queued.has(k)) return;
      queued.add(k);
      todo.push(i);
    });
    for (let s = 0; s < todo.length; s += CLASH_BATCH) {
      const batch = todo.slice(s, s + CLASH_BATCH);
      const records = await runner(batch.map((i) => jobs[i]!));
      records.forEach((r, n) => {
        const k = keys[batch[n]!]!;
        // a clash played for a slim record is played again for its full one, but counted and kept once
        if (!done.has(k)) {
          played++;
          if (o.keep) kept.push(r);
        }
        // a kept record costs nothing more to hold, so a full record asked for later reuses it
        done.set(k, { cap: r.cap, ...(full || o.keep ? { record: r } : {}) });
      });
    }
    return keys.map((k) => done.get(k)!);
  }

  return {
    full: async (cells) => (await play(cells, true)).map((d, i) => {
      const r = d.record!, c = cells[i]!;
      if (r.budget === c.budget && r.seed === c.seed && SIDES.every((s) => r.armies[s].controller === controllerOn(c, s))) return r;
      return {
        ...r, budget: c.budget, seed: c.seed,
        armies: { player: { ...r.armies.player, controller: controllerOn(c, 'player') }, enemy: { ...r.armies.enemy, controller: controllerOn(c, 'enemy') } },
      };
    }),
    slim: async (cells) => (await play(cells, false)).map((d, i) => {
      const c = cells[i]!;
      return {
        field: c.field, budget: c.budget, seed: c.seed, seat: c.seat, jitter,
        armies: { player: { controller: controllerOn(c, 'player') }, enemy: { controller: controllerOn(c, 'enemy') } },
        cap: d.cap,
      };
    }),
    army,
    stats: () => ({ cells: asked, played }),
    records: () => kept,
  };
}

/** One side's results over some clashes: a draw is worth half a win (R1-Q3). */
export interface ClashScore {
  wins: number;
  draws: number;
  losses: number;
  games: number;
  /** (wins + draws / 2) / games. */
  rate: number;
}

const scored = (wins: number, draws: number, losses: number): ClashScore => {
  const games = wins + draws + losses;
  return { wins, draws, losses, games, rate: (2 * wins + draws) / (2 * games) };
};

/** The score over these cells of each cell's army `a`, or of its army `b`. */
function scoreOf(cells: readonly CellRecord[], army: 'a' | 'b'): ClashScore {
  let wins = 0, draws = 0, losses = 0;
  for (const r of cells) {
    if (r.cap.winner === 'draw') draws++;
    else if ((r.cap.winner === r.seat) === (army === 'a')) wins++;
    else losses++;
  }
  return scored(wins, draws, losses);
}

const sumScores = (ss: readonly ClashScore[]): ClashScore =>
  scored(ss.reduce((n, s) => n + s.wins, 0), ss.reduce((n, s) => n + s.draws, 0), ss.reduce((n, s) => n + s.losses, 0));

/** Scores per field, in the fields' order. */
type FieldScores = Partial<Record<FieldId, ClashScore>>;

/** The fields a mean reads: the one-lane field and Twin Roots. A three-lane field is a lead, unless it's all there is. */
function countedFields(fields: readonly FieldId[]): FieldId[] {
  const counted = fields.filter((f) => f !== 'three');
  return counted.length ? counted : [...fields];
}

/**
 * The mean over the counted fields, with the one-lane field counted twice (it stands for Bogwater Hollow
 * and Stumpfield), and the worst field: the highest rate for a G3 build, the lowest for an answer.
 */
function overFields(scores: FieldScores, counted: readonly FieldId[], worst: 'highest' | 'lowest'): { mean: number; worst: number; worstField: FieldId } {
  let num = 0, den = 0, w = NaN, worstField = counted[0]!;
  for (const f of counted) {
    const s = scores[f]!;
    const weight = f === 'one' ? 2 : 1;
    // one division of whole numbers, so a mean of exactly 55% compares as 55%
    num += weight * (2 * s.wins + s.draws);
    den += weight * 2 * s.games;
    if (Number.isNaN(w) || (worst === 'highest' ? s.rate > w : s.rate < w)) { w = s.rate; worstField = f; }
  }
  return { mean: num / den, worst: w, worstField };
}

/** Per budget: the scores on each field over these cells, their mean and the worst field. */
function byBudget(cells: readonly CellRecord[], army: 'a' | 'b', budgets: readonly number[], fields: readonly FieldId[], worst: 'highest' | 'lowest') {
  const counted = countedFields(fields);
  return budgets.map((budget) => {
    const scores: FieldScores = {};
    for (const f of fields) scores[f] = scoreOf(cells.filter((r) => r.field === f && r.budget === budget), army);
    return { budget, fields: scores, ...overFields(scores, counted, worst) };
  });
}

/** Per field, pooled over the budgets, each budget weighing the same (each plays the same games). */
function pooled(at: readonly { fields: FieldScores }[], fields: readonly FieldId[]): FieldScores {
  const out: FieldScores = {};
  for (const f of fields) out[f] = sumScores(at.map((b) => b.fields[f]!));
  return out;
}

/** A whole percentage, or – when there's nothing to read. */
const whole = (x: number): string => (Number.isFinite(x) ? String(Math.round(x * 100)) : '–');

/** A mono army's clash G3 reading: per budget, per field pooled over the budgets, and the bar. */
export interface ClashG3Bot {
  id: string;
  /** Per budget: the score on each field, their mean and the worst field; `over` when either is over the bar. */
  budgets: { budget: number; fields: FieldScores; mean: number; worst: number; worstField: FieldId; over: boolean }[];
  /** Per field, pooled over the budgets. */
  fields: FieldScores;
  mean: number;
  worst: number;
  worstField: FieldId;
  pass: boolean;
}

/** What a controller's armies come to on a field at a budget, for the report. */
export interface ClashArmies {
  controller: string;
  field: FieldId;
  budget: number;
  /** The army on seed 1. A mono's is the same on every seed. */
  entries: ArmyEntry[];
  spent: number;
  supply: number;
  units: number;
  /** Over the seeds played: the mean spent, supply and units, and how many distinct armies. */
  seeds: { spent: number; supply: number; units: number; distinct: number };
}

export interface ClashG3Options {
  cache: ClashCache;
  /** Mono builds (default every army card's, `clashArmyIds`). */
  ids?: string[];
  /** Budgets (default 300 to 1,500). */
  budgets?: readonly number[];
  /** Fields (default the one-lane field and Twin Roots). A three-lane field is a lead, outside the mean and the worst. */
  fields?: readonly FieldId[];
  /** Seeds per seat (default G3's). */
  seeds?: number;
  /** The reference army (default `bot:balanced`; the core-six check's is `bot:core6`, R1-Q6). */
  defender?: string;
}

export type ClashG3Verdict = Verdict & {
  bots: ClashG3Bot[];
  budgets: number[];
  fields: FieldId[];
  seeds: number;
  /** The reference army the monos play. */
  defender: string;
  /** Each mono's armies and `bot:balanced`'s, per field and budget. */
  armies: ClashArmies[];
  /** Every cell's record, by build, field, budget, seed, then seat. */
  records: ClashRecord[];
};

/** G3's opponent, in clashes as in battles. */
const G3_DEFENDER = 'bot:balanced';

/**
 * G3 on clashes (§12.3, §16 R1): each mono army against `bot:balanced`'s with the same gold, on each field,
 * in both seats, seeds 1 to n. A build passes if its rate, pooled over the budgets, has a mean over the
 * fields of at most `maxMeanWinRate` (55%), with the one-lane field counted twice, and a worst field of at
 * most `maxMapWinRate` (60%). A budget over either while the pool passes is flagged, so a build that
 * dominates only early or only late shows.
 */
export async function evaluateClashG3(content: Content, o: ClashG3Options): Promise<ClashG3Verdict> {
  const t = content.targets.G3;
  const ids = o.ids ?? clashArmyIds(content);
  const defender = o.defender ?? G3_DEFENDER;
  const budgets = [...(o.budgets ?? CLASH_CHECK.budgets)], fields = [...(o.fields ?? CLASH_CHECK.fields)], seeds = o.seeds ?? t.seeds;
  const counted = countedFields(fields);
  const cells: Cell[] = [];
  for (const id of ids) for (const field of fields) for (const budget of budgets) {
    for (let seed = 1; seed <= seeds; seed++) for (const seat of SIDES) cells.push({ a: `bot:mono:${id}`, b: defender, field, budget, seed, seat });
  }
  const records = await o.cache.full(cells);
  const per = fields.length * budgets.length * seeds * 2;
  const bots = ids.map((id, i): ClashG3Bot => {
    const at = byBudget(records.slice(i * per, (i + 1) * per), 'a', budgets, fields, 'highest')
      .map((b) => ({ ...b, over: b.mean > t.maxMeanWinRate || b.worst > t.maxMapWinRate }));
    const all = pooled(at, fields);
    const read = overFields(all, counted, 'highest');
    return { id, budgets: at, fields: all, ...read, pass: read.mean <= t.maxMeanWinRate && read.worst <= t.maxMapWinRate };
  });

  const armies = [...ids.map((id) => `bot:mono:${id}`), defender].flatMap((controller) => fields.flatMap((field) => budgets.map((budget): ClashArmies => {
    const all = Array.from({ length: seeds }, (_, s) => o.cache.army(controller, budget, s + 1, field));
    const first = all[0]!;
    const mean = (f: (a: Army) => number) => all.reduce((n, a) => n + f(a), 0) / all.length;
    return {
      controller, field, budget, entries: first.entries, spent: first.spent, supply: first.supply, units: first.units,
      seeds: { spent: mean((a) => a.spent), supply: mean((a) => a.supply), units: mean((a) => a.units), distinct: new Set(all.map(armyPrint)).size },
    };
  })));

  // a row per field and a mean row per build, each budget then the pool
  const idWidth = Math.max(5, ...ids.map((id) => id.length));
  const col = (xs: number[]) => xs.map((x) => whole(x).padStart(7)).join('');
  const fieldName = (f: string) => (counted.includes(f as FieldId) ? f : `${f}*`).padEnd(5);
  const details = [
    `mono win % against ${defender}'s army with the same gold (a draw half), ${2 * seeds} games per field and budget (both seats). Limits: mean ≤${pct(t.maxMeanWinRate)} (the one-lane field twice), worst field ≤${pct(t.maxMapWinRate)}, pooled over the budgets`,
    `     ${'build'.padEnd(idWidth)}  field${[...budgets.map(String), 'pooled'].map((h) => h.padStart(7)).join('')}`,
  ];
  for (const b of bots) {
    fields.forEach((f, k) => {
      const lead = k === 0 ? `${b.pass ? 'ok  ' : 'FAIL'} ${b.id.padEnd(idWidth)}` : `     ${''.padEnd(idWidth)}`;
      details.push(`${lead}  ${fieldName(f)}${col([...b.budgets.map((x) => x.fields[f]!.rate), b.fields[f]!.rate])}`);
    });
    const over = [b.mean > t.maxMeanWinRate ? 'mean' : '', b.worst > t.maxMapWinRate ? `worst (${b.worstField})` : ''].filter(Boolean).join(', ');
    const flags = b.pass ? b.budgets.filter((x) => x.over).map((x) => `${x.budget} (mean ${whole(x.mean)}, worst ${x.worstField} ${whole(x.worst)})`) : [];
    details.push(`     ${''.padEnd(idWidth)}  ${'mean'.padEnd(5)}${col([...b.budgets.map((x) => x.mean), b.mean])}  worst ${b.worstField} ${whole(b.worst)}`
      + `${over ? `  over: ${over}` : ''}${flags.length ? `  flag: ${flags.join(', ')}` : ''}`);
  }
  if (fields.some((f) => !counted.includes(f))) details.push('* a lead (the three-lane screen): outside the mean and the worst field');
  return {
    id: 'clash G3', pass: bots.every((b) => b.pass), bots, budgets, fields, seeds, defender, armies, records,
    summary: `every mono army against ${defender}'s with the same gold, in clashes (both seats): mean ≤${pct(t.maxMeanWinRate)} over the fields, the one-lane field twice, and worst field ≤${pct(t.maxMapWinRate)}, pooled over the budgets`,
    details,
  };
}

/** An answer's results against one build, from the answer's side. */
export interface ClashAnswer {
  answer: string;
  kind: AnswerKind;
  /** Per budget: the score on each field, their mean and the worst field. */
  budgets: { budget: number; fields: FieldScores; mean: number; worst: number; worstField: FieldId }[];
  /** Per field, pooled over the budgets. */
  fields: FieldScores;
  mean: number;
  worst: number;
  worstField: FieldId;
  /** A mono answer that fails clash G3 itself: it's flagged, and it doesn't count. */
  failsG3: boolean;
}

/** One budget of the clash matrix (#14, #15): how §7.4 reads the build there, and the screen's best answers. */
export interface ClashMatrixRow {
  budget: number;
  /** §7.4's top kind for what the build's army fielded, on the first field. */
  read?: CounterKind | null;
  answers: {
    answer: string;
    worst: number;
    worstField: FieldId;
    mean: number;
    failsG3: boolean;
    /** The army cards its armies fielded at this budget, and the counter kinds §7.4 puts them in. */
    cards: string[];
    kinds: CounterKind[];
    /** It fields only `swarm` spawners (the Burrow, the Morel Warren). */
    swarm: boolean;
  }[];
  /**
   * The answers that count which share the best result here, by the worst field then the mean, and those
   * of them that field only `swarm` spawners (#15), each best first. Undefined when no answer counts.
   */
  best?: { worst: number; mean: number; answers: string[]; swarm: string[] };
}

export interface ClashCounterBuild {
  build: string;
  g3Mean: number;
  /** Every answer's screen result, best first: by the worst field, then the mean. */
  screen: ClashAnswer[];
  /** The best answers that count, confirmed on fresh seeds, best first. */
  top: ClashAnswer[];
  /** G12: the best confirmed answer wins ≥ `minAnswerRate` on its worst field. */
  pass: boolean;
  matrix: ClashMatrixRow[];
}

export interface ClashCounterOptions {
  cache: ClashCache;
  /** Clash G3 from the same run: its budgets and fields, the builds, and which mono answers fail it. */
  g3: ClashG3Verdict;
  /** `all`: every mono G3 played is a build, whatever its mean. */
  matrix?: 'all';
  /** The mono builds, whatever their mean (`--mono`), in place of the ones G3 picks. Each must be a mono G3 played. */
  builds?: string[];
  /** Answers to try against every build (default `counterAnswers` without the economy and utility monos). */
  answers?: string[];
  screenSeeds?: number;
  confirmSeeds?: number;
  top?: number;
}

export type ClashCounterVerdict = Verdict & {
  builds: ClashCounterBuild[];
  screenSeeds: number;
  confirmSeeds: number;
  top: number;
  answers: Record<string, string[]>;
  /** §7.4's counter sets over the army cards. */
  sets: Record<CounterKind, string[]>;
  /** The clash matrix, as the report prints it (#14, #15). */
  matrixLines: string[];
  /** Every cell the screens and confirmations played. */
  records: CellRecord[];
};

/**
 * The strict counter bar on clashes (G12, §12.3) and the clash matrix (#14, #15). The builds are the monos
 * with a clash G3 mean above `minBuildMean` (40%), every mono G3 played with `matrix: 'all'`, or `builds`.
 * Each plays every answer, in both seats, on G3's fields and budgets. A screen at `screenSeeds` per seat
 * ranks the answers by their worst field pooled over the budgets, then their mean. The best `top` answers
 * that count are confirmed on the next `confirmSeeds` seeds. Clash G3 must have played every mono answer
 * (T054): one that fails it is flagged and doesn't count, and every other answer counts, as in
 * `evaluateCounters`. A build passes if its best confirmed answer wins at least `minAnswerRate` (60%) on
 * its worst field. Content must hold the bots from `counterBotSpec`.
 */
export async function evaluateClashCounters(content: Content, o: ClashCounterOptions): Promise<ClashCounterVerdict> {
  const c = CLASH_CHECK;
  const { budgets, fields } = o.g3;
  const counted = countedFields(fields);
  const screenSeeds = o.screenSeeds ?? c.screenSeeds, confirmSeeds = o.confirmSeeds ?? c.confirmSeeds, top = o.top ?? c.top;
  const played = new Set(o.g3.bots.map((b) => b.id));
  const builds = o.builds ?? o.g3.bots.filter((b) => o.matrix === 'all' || b.mean > c.minBuildMean).map((b) => b.id);
  for (const b of builds) if (!played.has(b)) throw new Error(`clash G12: build ${b} isn't a mono clash G3 played`);
  const cards = clashArmyIds(content);
  const answers = Object.fromEntries(builds.map((b) => [b, (o.answers ?? counterAnswers(content, b).filter((a) => !a.startsWith('bot:mono:') || cards.includes(a.slice(9))))
    .filter((a) => a !== `bot:mono:${b}`)]));
  for (const a of new Set(Object.values(answers).flat())) {
    const id = a.match(/^bot:(.+)$/)?.[1];
    if (id === undefined) continue;
    if (!id.startsWith('mono:')) {
      if (!content.bots[id]) throw new Error(`clash answer ${a} isn't in the content (build it with counterBotSpec)`);
    } else if (!played.has(id.slice(5))) {
      // an untested mono could be a build's only answer, unflagged (T054)
      throw new Error(`clash G12: answer ${a} is a mono clash G3 didn't play, so G12 can't count it (play G3 on every mono of clashArmyIds)`);
    }
  }
  const g3Of = (controller: string) => o.g3.bots.find((b) => `bot:mono:${b.id}` === controller);
  const records: CellRecord[] = [];
  const result = (answer: string, cells: readonly CellRecord[]): ClashAnswer => {
    const at = byBudget(cells, 'b', budgets, fields, 'lowest');
    const all = pooled(at, fields);
    const g = g3Of(answer);
    return { answer, kind: answerKind(answer), budgets: at, fields: all, ...overFields(all, counted, 'lowest'), failsG3: !!g && !g.pass };
  };
  const play = async (pairs: [string, string][], seeds: number, first: number): Promise<ClashAnswer[]> => {
    const cells: Cell[] = [];
    for (const [build, answer] of pairs) for (const field of fields) for (const budget of budgets) {
      for (let seed = first; seed < first + seeds; seed++) for (const seat of SIDES) cells.push({ a: `bot:mono:${build}`, b: answer, field, budget, seed, seat });
    }
    const out = await o.cache.slim(cells);
    for (const r of out) records.push(r);
    const per = fields.length * budgets.length * seeds * 2;
    return pairs.map(([, answer], i) => result(answer, out.slice(i * per, (i + 1) * per)));
  };
  // sort is stable, so ties keep the answers' order
  const rank = <T extends { worst: number; mean: number }>(rs: readonly T[]): T[] => [...rs].sort((x, y) => y.worst - x.worst || y.mean - x.mean);
  const screenPairs = builds.flatMap((b) => answers[b]!.map((a): [string, string] => [b, a]));
  const screened = await play(screenPairs, screenSeeds, 1);
  const screens = builds.map((b) => rank(screened.filter((_, i) => screenPairs[i]![0] === b)));
  const confirmPairs = builds.flatMap((b, i) => screens[i]!.filter((r) => !r.failsG3).slice(0, top).map((r): [string, string] => [b, r.answer]));
  const confirmed = await play(confirmPairs, confirmSeeds, screenSeeds + 1);

  const kindsOf = roundCounterKinds(content);
  const sets = Object.fromEntries(COUNTER_KINDS.map((k) => [k, cards.filter((id) => kindsOf(id).includes(k))])) as Record<CounterKind, string[]>;
  const swarmSpawners = cards.filter((id) => {
    const sq = content.buildings[id]!.squad;
    return !!sq && content.units[sq.unit]!.tags.includes('swarm');
  });
  /** The army cards an answer's armies fielded at a budget, over the screen's fields and seeds. */
  const fieldedBy = (answer: string, budget: number): string[] => {
    const fielded = new Set<string>();
    for (const f of fields) for (let s = 1; s <= screenSeeds; s++) for (const e of o.cache.army(answer, budget, s, f).entries) fielded.add(e.buildingId);
    return cards.filter((id) => fielded.has(id));
  };
  const swarmOnly = (used: readonly string[]) => used.length > 0 && used.every((id) => swarmSpawners.includes(id));
  const matrixOf = (build: string, screen: readonly ClashAnswer[]): ClashMatrixRow[] => budgets.map((budget, k) => {
    const r = o.g3.records.find((x) => x.budget === budget && x.field === counted[0] && x.armies[x.seat].controller === `bot:mono:${build}`);
    const kinds = r?.armies[r.seat].kinds;
    const ranked = rank(screen.map((a) => ({ a, worst: a.budgets[k]!.worst, mean: a.budgets[k]!.mean })));
    // #15 asks what tops the answers, so a tie for the best is counted, among the answers that count (T054)
    const counting = ranked.filter((x) => !x.a.failsG3);
    const first = counting[0];
    const tied = first ? counting.filter((x) => x.worst === first.worst && x.mean === first.mean).map((x) => x.a.answer) : [];
    return {
      budget, ...(kinds ? { read: kinds.top } : {}),
      answers: ranked.slice(0, c.matrixAnswers).map(({ a }) => {
        const used = fieldedBy(a.answer, budget);
        return {
          answer: a.answer, worst: a.budgets[k]!.worst, worstField: a.budgets[k]!.worstField, mean: a.budgets[k]!.mean, failsG3: a.failsG3,
          cards: used, kinds: COUNTER_KINDS.filter((kind) => used.some((id) => kindsOf(id).includes(kind))), swarm: swarmOnly(used),
        };
      }),
      ...(first ? { best: { worst: first.worst, mean: first.mean, answers: tied, swarm: tied.filter((a) => swarmOnly(fieldedBy(a, budget))) } } : {}),
    };
  });
  const results = builds.map((build, i): ClashCounterBuild => {
    const tops = rank(confirmed.filter((_, k) => confirmPairs[k]![0] === build));
    return { build, g3Mean: g3Of(`bot:mono:${build}`)?.mean ?? NaN, screen: screens[i]!, top: tops, pass: (tops[0]?.worst ?? 0) >= c.minAnswerRate, matrix: matrixOf(build, screens[i]!) };
  });

  const heads = fields.map((f) => (counted.includes(f) ? f : `${f}*`));
  const ansWidth = Math.max(6, ...results.flatMap((r) => r.top.map((t) => t.answer.length)));
  const details = [
    `answer win % against each mono build with the same gold (a draw half), both seats. Screen: ${2 * screenSeeds} games per field and budget (seeds 1–${screenSeeds});`
    + ` the best ${top} answers that count confirmed on ${2 * confirmSeeds} more (seeds ${screenSeeds + 1}–${screenSeeds + confirmSeeds}).`
    + ` Pass: the best confirmed answer wins ≥${pct(c.minAnswerRate)} on its worst field, pooled over the budgets; a mono answer that fails clash G3 doesn't count`,
  ];
  for (const r of results) {
    const b = r.top[0];
    details.push(`${r.pass ? 'ok  ' : 'FAIL'} mono:${r.build} (clash G3 mean ${whole(r.g3Mean)}%, ${r.screen.length} answers): best ${b ? `${b.answer}, worst field ${b.worstField} ${whole(b.worst)}%` : 'none that counts'}`);
    details.push(`       ${'answer'.padEnd(ansWidth)}  ${heads.map((h) => h.padStart(5)).join(' ')}  worst   mean   per budget, worst field`);
    for (const t of r.top) {
      details.push(`       ${t.answer.padEnd(ansWidth)}  ${fields.map((f, i) => whole(t.fields[f]!.rate).padStart(Math.max(5, heads[i]!.length))).join(' ')}  ${whole(t.worst).padStart(5)}  ${whole(t.mean).padStart(5)}`
        + `   ${t.budgets.map((x) => `${x.budget} ${whole(x.worst)}`).join(' · ')}`);
    }
    const next = r.screen.filter((s) => !s.failsG3).slice(top, top + 5);
    details.push(`       screen, next best: ${next.map((s) => `${s.answer} ${whole(s.worst)}`).join(', ') || 'none'}`);
    const flagged = r.screen.filter((s) => s.failsG3);
    if (flagged.length) details.push(`       fail clash G3, so not counted: ${flagged.slice(0, 5).map((s) => `${s.answer} ${whole(s.worst)}`).join(', ')}`);
  }
  if (heads.some((h) => h.endsWith('*'))) details.push('* a lead (the three-lane screen): outside the worst field and the mean');

  const name = (id: string) => content.buildings[id]?.name ?? id;
  const matrixLines = [
    `clash matrix (#14, #15): each mono build's best ${c.matrixAnswers} answers at each budget in the screen, by the worst field (answer win %), with the counter kinds §7.4 puts their buildings in. ⚑ fails clash G3`,
    `    §7.4's counter sets: ${COUNTER_KINDS.map((k) => `${k} [${sets[k].join(', ')}]`).join(' · ')}`,
  ];
  for (const r of results) {
    matrixLines.push(`    mono:${r.build}`);
    for (const row of r.matrix) {
      const read = `§7.4 reads ${row.read ?? '–'}`;
      matrixLines.push(`      ${String(row.budget).padStart(4)} (${read}): ${row.answers.map((a) => `${a.answer} ${whole(a.worst)}${a.failsG3 ? ' ⚑' : ''} [${a.kinds.join(', ') || '–'}]`).join(' · ')}`);
    }
  }
  const gill = results.find((r) => r.build === 'gillNest');
  const swarm = swarmSpawners.map(name).join(' and ');
  const names = (xs: readonly string[]) => `${xs.slice(0, 3).join(', ')}${xs.length > 3 ? ', …' : ''}`;
  const best = ({ budget, best: b }: ClashMatrixRow) => {
    if (!b) return `${budget}: no answer counts`;
    const at = `${b.swarm.length} of ${b.answers.length}${b.answers.length > 1 ? ' tied' : ''} at ${whole(b.worst)}%`;
    return `${budget}: ${at} (${b.swarm.length ? names(b.swarm) : `best ${names(b.answers)}`})`;
  };
  matrixLines.push(gill
    ? `    swarm spawners (${swarm}) among the best answers to mono Gill Nest that count (⚑ left out): at each budget, how many of the answers tied for the best field only them · ${gill.matrix.map(best).join(' · ')}`
    : `    mono Gill Nest isn't a build in this run, so the matrix doesn't say whether swarm spawners (${swarm}) answer it`);

  return {
    id: 'G12', pass: results.every((r) => r.pass), builds: results, screenSeeds, confirmSeeds, top, answers, sets, matrixLines, records,
    summary: `the strict counter bar on clashes: every mono build with a clash G3 mean above ${pct(c.minBuildMean)} has an answer that wins ≥${pct(c.minAnswerRate)} on its worst field, among answers that pass clash G3`,
    details,
  };
}

/** §7.4's counter kinds of each card in rounds (#14, #15), read off a single battle with each faction's roster as its kit. */
function roundCounterKinds(content: Content): (buildingId: string) => CounterKind[] {
  const view = planningView(createBattle(content, makeRoundConfig(content, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' })), 'player');
  return (id) => counterKindsOf(view, id);
}

// ---------------------------------------------------------------- R1's variants on the bars (T030)

/**
 * §11.4's intended counter graph for the core six, each archetype's row by its building: what it beats and
 * what it loses to. The Puffball Mortar has no row, so the core-six check reports what it measures for it.
 */
export const CORE6_GRAPH: Record<string, { beats: string[]; losesTo: string[] }> = {
  sporelingBurrow: { beats: ['gillNest', 'hammercapForge'], losesTo: ['capguardHall', 'amanitaLodge', 'bursterPod'] },
  capguardHall: { beats: ['sporelingBurrow'], losesTo: ['gillNest', 'amanitaLodge'] },
  gillNest: { beats: ['capguardHall', 'hammercapForge'], losesTo: ['sporelingBurrow', 'amanitaLodge'] },
  amanitaLodge: { beats: ['sporelingBurrow', 'capguardHall', 'gillNest'], losesTo: ['hammercapForge'] },
  hammercapForge: { beats: ['amanitaLodge'], losesTo: ['sporelingBurrow', 'gillNest'] },
  bursterPod: { beats: ['sporelingBurrow'], losesTo: ['gillNest'] },
};

/** The six a core-six check plays: the five core spawners and the candidate (R1-Q6). */
export const core6Ids = (candidate: string): string[] => [...CORE_SPAWNERS, candidate];

/**
 * The core-six check's answers (R1-Q6): the six's monos, their 15 even pairs (the counter check's pair
 * bots) and `bot:core6`. Content must hold the bots from `counterBotSpec` and `core6Spec`.
 */
export function core6Answers(content: Content, candidate: string): string[] {
  const six = core6Ids(candidate);
  const pairs: string[] = [];
  for (let i = 0; i < six.length; i++) for (let j = i + 1; j < six.length; j++) {
    const id = [`pair-${six[i]}-${six[j]}`, `pair-${six[j]}-${six[i]}`].find((p) => content.bots[p]);
    if (!id) throw new Error(`core six: no pair bot for ${six[i]} and ${six[j]} (build the content with counterBotSpec)`);
    pairs.push(`bot:${id}`);
  }
  if (!content.bots.core6) throw new Error('core six: bot:core6 is missing (append core6Spec)');
  return [...six.map((id) => `bot:mono:${id}`), ...pairs, 'bot:core6'];
}

/** One directed edge between two of the six: the winner's mono's clash win rate against the loser's (a draw half). */
export interface GraphEdge {
  winner: string;
  loser: string;
  /** In §11.4's graph, or only measured (an edge of the Mortar's row, at 60% or more). */
  intended: boolean;
  /** Per budget: the mean over the fields, the one-lane field twice. */
  budgets: { budget: number; rate: number }[];
  /** Pooled over the budgets. */
  rate: number;
}

export interface Core6GraphOptions {
  cache: ClashCache;
  candidate: string;
  budgets?: readonly number[];
  fields?: readonly FieldId[];
  /** Seeds per seat (default the screen's 20, so the screen's cells are shared). */
  seeds?: number;
}

/**
 * §11.4's intended graph on clashes (R1-Q6, A011): every two of the six's monos play, in both seats, and
 * each of the graph's edges reads as its winner's rate per budget. A candidate with no row (the Mortar)
 * gets its measured one instead: what it beats, and what beats it, at 60% or more. Report only.
 */
export async function evaluateCore6Graph(content: Content, o: Core6GraphOptions): Promise<{ edges: GraphEdge[]; records: CellRecord[]; lines: string[] }> {
  const budgets = [...(o.budgets ?? CLASH_CHECK.budgets)], fields = [...(o.fields ?? CLASH_CHECK.fields)], seeds = o.seeds ?? CLASH_CHECK.screenSeeds;
  const counted = countedFields(fields);
  const six = core6Ids(o.candidate);
  const pairs: [string, string][] = [];
  for (let i = 0; i < six.length; i++) for (let j = i + 1; j < six.length; j++) pairs.push([six[i]!, six[j]!]);
  const cells: Cell[] = [];
  for (const [a, b] of pairs) for (const field of fields) for (const budget of budgets) {
    for (let seed = 1; seed <= seeds; seed++) for (const seat of SIDES) cells.push({ a: `bot:mono:${a}`, b: `bot:mono:${b}`, field, budget, seed, seat });
  }
  const records = await o.cache.slim(cells);
  const per = fields.length * budgets.length * seeds * 2;
  // a pair's cells read from either side: the second mono's results are the first's complement
  const read = new Map<string, ReturnType<typeof byBudget>>();
  pairs.forEach(([a, b], i) => {
    const mine = records.slice(i * per, (i + 1) * per);
    read.set(`${a}>${b}`, byBudget(mine, 'a', budgets, fields, 'lowest'));
    read.set(`${b}>${a}`, byBudget(mine, 'b', budgets, fields, 'lowest'));
  });
  const edge = (winner: string, loser: string, intended: boolean): GraphEdge => {
    const at = read.get(`${winner}>${loser}`)!;
    return { winner, loser, intended, budgets: at.map((x) => ({ budget: x.budget, rate: x.mean })), rate: overFields(pooled(at, fields), counted, 'lowest').mean };
  };
  const edges: GraphEdge[] = [];
  const have = (w: string, l: string) => edges.some((e) => e.winner === w && e.loser === l);
  for (const id of six) {
    const row = CORE6_GRAPH[id];
    for (const x of row?.beats ?? []) if (six.includes(x) && !have(id, x)) edges.push(edge(id, x, true));
    for (const x of row?.losesTo ?? []) if (six.includes(x) && !have(x, id)) edges.push(edge(x, id, true));
  }
  if (!CORE6_GRAPH[o.candidate]) {
    for (const x of six) {
      if (x === o.candidate) continue;
      for (const [w, l] of [[o.candidate, x], [x, o.candidate]] as const) {
        const e = edge(w, l, false);
        if (e.rate >= CLASH_CHECK.minAnswerRate) edges.push(e);
      }
    }
  }
  const name = (id: string) => content.buildings[id]?.name ?? id;
  const mark = (r: number) => (r >= CLASH_CHECK.minAnswerRate ? ' ✓' : r < 0.5 ? ' ✗' : '');
  const show = (e: GraphEdge, other: string) => `${name(other)} ${whole(e.rate)}${mark(e.rate)} (${e.budgets.map((b) => `${b.budget} ${whole(b.rate)}`).join(' · ')})`;
  const lines = [
    `core six with ${name(o.candidate)} (R1-Q6): §11.4's intended graph on clashes, each edge as its winner's win % against the loser's mono (a draw half), pooled and per budget; ✓ at ≥${pct(CLASH_CHECK.minAnswerRate)}, ✗ under 50%`,
  ];
  for (const id of six) {
    const beats = edges.filter((e) => e.winner === id), loses = edges.filter((e) => e.loser === id);
    const head = CORE6_GRAPH[id] ? name(id) : `${name(id)} (no row in §11.4, measured at ≥${pct(CLASH_CHECK.minAnswerRate)})`;
    lines.push(`    ${head}: beats ${beats.map((e) => show(e, e.loser)).join(', ') || '–'}; loses to ${loses.map((e) => show(e, e.winner)).join(', ') || '–'}`);
  }
  return { edges, records, lines };
}

/** A controller's merge mirror: its army, merging on, against its own twin with merging off. */
export interface MirrorRow {
  controller: string;
  /** The merge-on side's results per budget: the score on each field, their mean and the worst field. */
  budgets: { budget: number; fields: FieldScores; mean: number; worst: number; worstField: FieldId }[];
  fields: FieldScores;
  mean: number;
  /** Inside G7's band for the merge-on side (55–70%), report only. */
  inBand: boolean;
}

/**
 * The merge mirror (§12.3 G7 in round form, for #9; A015): every G3 build and the reference against its
 * own army with merging off, built on the same seed, on G3's budgets and fields, both seats. Report only:
 * each merge-on side's rate beside G7's band.
 */
export async function evaluateMergeMirror(content: Content, o: { cache: ClashCache; g3: ClashG3Verdict; seeds?: number }): Promise<{ rows: MirrorRow[]; records: CellRecord[]; lines: string[] }> {
  const band = content.targets.G7.mirror;
  const { budgets, fields } = o.g3;
  const counted = countedFields(fields);
  const seeds = o.seeds ?? CLASH_CHECK.mirrorSeeds;
  const controllers = [...o.g3.bots.map((b) => `bot:mono:${b.id}`), o.g3.defender];
  const cells: Cell[] = [];
  for (const c of controllers) for (const field of fields) for (const budget of budgets) {
    for (let seed = 1; seed <= seeds; seed++) for (const seat of SIDES) cells.push({ a: c, b: c, field, budget, seed, seat, twin: true });
  }
  const records = await o.cache.slim(cells);
  const per = fields.length * budgets.length * seeds * 2;
  const rows = controllers.map((controller, i): MirrorRow => {
    const at = byBudget(records.slice(i * per, (i + 1) * per), 'a', budgets, fields, 'lowest');
    const all = pooled(at, fields);
    const { mean } = overFields(all, counted, 'lowest');
    return { controller, budgets: at, fields: all, mean, inBand: mean >= band.minWinRate && mean <= band.maxWinRate };
  });
  const width = Math.max(10, ...controllers.map((c) => c.length));
  const lines = [
    `merge mirror (G7's round form, #9): each army, merging on, against its own twin with merging off, ${2 * seeds} games per field and budget; the merge-on side's win % (a draw half), its mean over the fields (the one-lane field twice), against G7's ${pct(band.minWinRate)}–${pct(band.maxWinRate)} (report only)`,
    `    ${'army'.padEnd(width)}${[...budgets.map(String), 'pooled'].map((h) => h.padStart(7)).join('')}`,
    ...rows.map((r) => `    ${r.controller.padEnd(width)}${[...r.budgets.map((b) => b.mean), r.mean].map((x) => whole(x).padStart(7)).join('')}${r.inBand ? '' : `  outside ${pct(band.minWinRate)}–${pct(band.maxWinRate)}`}`),
  ];
  return { rows, records, lines };
}

/** A spawner's squad and §11.4's value for it, under some squad options. */
export interface SquadRow {
  buildingId: string;
  squad: number;
  /** §11.4's role factor; undefined where the heuristic can't value the unit (the Burster, the Tender). */
  roleFactor?: number;
  perGold?: number;
  perPlot?: number;
}

/**
 * The squad table (§11.4, A010): each army card's spawner, its squad under these options and its value,
 * `squad × sqrt(HP × DPS) × roleFactor` per plot and that over the cost per gold, at tier 1. §11.4's role
 * factors: ranged 1.6, splash and cleave 1.4, siege 1.3, slayer 1.2, other 1.0.
 */
export function squadTable(content: Content): SquadRow[] {
  return clashArmyIds(content).filter((id) => content.buildings[id]!.squad).map((id): SquadRow => {
    const b = content.buildings[id]!, u = content.units[b.squad!.unit]!;
    const squad = squadSize(content, id);
    // what the heuristic can't value (§11.4): the Burster's one burst, the Tender's heals
    if (u.tags.includes('burst') || u.tags.includes('support')) return { buildingId: id, squad };
    const roleFactor = u.tags.includes('ranged') ? 1.6 : (u.splashRadius ?? 0) > 0 ? 1.4 : u.tags.includes('siege') ? 1.3 : u.tags.includes('slayer') ? 1.2 : 1;
    const perPlot = squad * Math.sqrt(u.hp * (u.damage / u.attackInterval)) * roleFactor;
    return { buildingId: id, squad, roleFactor, perGold: perPlot / b.cost, perPlot };
  });
}

/** The squad table as the clash report prints it. */
export function squadLines(content: Content): string[] {
  const rows = squadTable(content);
  const width = Math.max(8, ...rows.map((r) => r.buildingId.length));
  return [
    "squads and §11.4's value: squad × sqrt(HP × DPS) × role factor, per plot and per gold (target 1.45 ± 0.15 per gold)",
    ...rows.map((r) => `    ${r.buildingId.padEnd(width)} ${String(r.squad).padStart(3)}   ${r.roleFactor === undefined ? '  –' : `×${r.roleFactor.toFixed(1)}`}`
      + `   ${r.perGold === undefined ? '–' : `${r.perGold.toFixed(2)} a gold, ${Math.round(r.perPlot!)} a plot`}`),
  ];
}

/** A set of clashes read one way: how many, how many reached the cap and that share, and the median length. */
export interface StallRead {
  clashes: number;
  capped: number;
  share: number;
  medianSeconds: number;
}

export type ClashG13Verdict = Verdict & {
  /** Every clash on the counted fields. */
  all: StallRead;
  /** G3's clashes alone, on the counted fields. */
  g3: StallRead;
  /** The three-lane screen's clashes, a lead outside the bar (R1-Q9), when they were played beside the counted fields. */
  three?: StallRead;
  /** Per budget and field, budgets ascending. */
  cells: ({ budget: number; field: FieldId } & StallRead)[];
};

const FIELD_ORDER: readonly FieldId[] = ['one', 'twin', 'three'];

/**
 * G13 on clashes (§12.3, §16 R1, plan call 15): the share of clashes that reached the 45 s cap, against
 * `CLASH.g13StallShare` (15%). Pass every cell the check played, each once. The bar counts the fields G3 and
 * G12 count (T054): the three-lane screen is a lead beside it, unless it's all there is. G3's clashes alone,
 * the median length against 20–40 s (report only) and each budget and field are reported beside it.
 */
export function clashG13(records: readonly CellRecord[], g3: readonly CellRecord[] = []): ClashG13Verdict {
  const read = (rs: readonly CellRecord[]): StallRead => {
    let capped = 0;
    const lengths: number[] = [];
    for (const r of rs) {
      if (r.cap.capped) capped++;
      lengths.push(r.cap.ticks);
    }
    return { clashes: rs.length, capped, share: capped / rs.length, medianSeconds: median(lengths) / 20 };
  };
  const groups = new Map<string, CellRecord[]>();
  for (const r of records) {
    const k = `${r.budget}|${r.field}`;
    const g = groups.get(k);
    if (g) g.push(r); else groups.set(k, [r]);
  }
  const cells = [...groups.values()].map((rs) => ({ budget: rs[0]!.budget, field: rs[0]!.field, ...read(rs) }))
    .sort((p, q) => p.budget - q.budget || FIELD_ORDER.indexOf(p.field) - FIELD_ORDER.indexOf(q.field));
  const counted = countedFields(FIELD_ORDER.filter((f) => records.some((r) => r.field === f)));
  const inBar = (rs: readonly CellRecord[]) => rs.filter((r) => counted.includes(r.field));
  const leads = records.filter((r) => !counted.includes(r.field));
  const all = read(inBar(records)), mine = read(inBar(g3)), three = leads.length ? read(leads) : undefined;
  const pass = !(all.share > CLASH.g13StallShare);

  const share = (x: StallRead) => (Number.isFinite(x.share) ? `${(100 * x.share).toFixed(1)}%` : '–');
  const sec = (x: StallRead) => (Number.isFinite(x.medianSeconds) ? `${x.medianSeconds.toFixed(1)} s` : '–');
  const [lo, hi] = CLASH.g13MedianSeconds;
  const band = (x: StallRead) => (x.medianSeconds < lo ? 'under' : x.medianSeconds > hi ? 'over' : 'inside');
  const details = [
    `${pass ? 'ok  ' : 'FAIL'} ${share(all)} of ${all.clashes} clashes reached the cap; median length ${sec(all)}, ${band(all)} the ${lo}–${hi} s target (report only)`,
    `     G3's clashes: ${share(mine)} of ${mine.clashes} reached the cap; median ${sec(mine)}`,
    ...(three ? [`     the three-lane screen, a lead outside the bar: ${share(three)} of ${three.clashes} reached the cap; median ${sec(three)}`] : []),
    `     per budget and field, the share capped and the median${three ? ' (* a lead)' : ''}:`,
  ];
  for (const budget of [...new Set(cells.map((x) => x.budget))]) {
    details.push(`     ${String(budget).padStart(6)}: ${cells.filter((x) => x.budget === budget)
      .map((x) => `${counted.includes(x.field) ? x.field : `${x.field}*`} ${share(x)} ${sec(x)}`).join(' · ')}`);
  }
  return {
    id: 'G13', pass, all, g3: mine, ...(three ? { three } : {}), cells,
    summary: `clash stalls: ≤${pct(CLASH.g13StallShare)} of clashes reach the 45 s cap, over every clash the check played`,
    details,
  };
}

/**
 * Every cell in these lists once, in the order first seen, for G13: a cell is its two controllers, its
 * field, budget, seed and seat. So a counter-matrix cell that is also G3's (`bot:balanced` answering a
 * mono on G3's seeds) counts once.
 */
export function uniqueCells(...lists: readonly (readonly CellRecord[])[]): CellRecord[] {
  const seen = new Set<string>();
  const out: CellRecord[] = [];
  for (const list of lists) {
    for (const r of list) {
      const k = `${r.armies.player.controller}|${r.armies.enemy.controller}|${r.field}|${r.budget}|${r.seed}|${r.seat}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

// ---- the race section (X5): the G4 row, the cap-binding share and drawn rounds (§6.7, §12.3 G4, §16 R1) ----

/** G4's pairing (§12.3), for the race model's even battles: `bot:balanced` against the scripted general. */
const G4_PLAYER = 'bot:balanced', G4_GENERAL = 'general:scripted';

export interface ClashG4RowOptions {
  cache: ClashCache;
  /** Budgets (default 300 to 1,500). */
  budgets?: readonly number[];
  /** Seeds per seat (default 50, plan call 17). */
  seeds?: number;
}

export interface ClashG4Row {
  budgets: number[];
  seeds: number;
  /** `bot:balanced` against `general:scripted`, then against itself, each by budget, seed, then seat. */
  records: ClashRecord[];
  /** `bot:balanced`'s clash score against `general:scripted`, per budget. */
  scores: { budget: number; score: ClashScore }[];
  details: string[];
}

/**
 * The race model's G4 case (plan call 17, A193): `bot:balanced` against `general:scripted` on the one-lane
 * field at each budget, seeds 1 to n in both seats, and beside it `bot:balanced` against itself, its
 * second army on seed 1,000 + s. These are the even battles G4's band is about. Their records feed the
 * race model and G13.
 */
export async function evaluateClashG4Row(content: Content, o: ClashG4RowOptions): Promise<ClashG4Row> {
  if (!content.generals.scripted) throw new Error("the G4 row needs G4's scripted general");
  const budgets = [...(o.budgets ?? CLASH_CHECK.budgets)], seeds = o.seeds ?? 50;
  const cells = (b: string): Cell[] => budgets.flatMap((budget) => Array.from({ length: seeds }, (_, s) => s + 1)
    .flatMap((seed) => SIDES.map((seat): Cell => ({ a: G4_PLAYER, b, field: 'one', budget, seed, seat }))));
  const pairing = await o.cache.full(cells(G4_GENERAL));
  const mirror = await o.cache.full(cells(G4_PLAYER));
  const per = 2 * seeds;
  const scores = budgets.map((budget, i) => ({ budget, score: scoreOf(pairing.slice(i * per, (i + 1) * per), 'a') }));
  return {
    budgets, seeds, records: [...pairing, ...mirror], scores,
    details: [
      `G4 row: ${G4_PLAYER} against ${G4_GENERAL} on the one-lane field, ${seeds} seeds a seat, and against itself on fresh seeds (its second army on seed 1,000 + s), for the race model and G13`,
      `     ${G4_PLAYER}'s clash win % against ${G4_GENERAL} (a draw half): ${scores.map((s) => `${s.budget} ${whole(s.score.rate)}`).join(' · ')}`,
    ],
  };
}

/** A set of clashes' cap readings (A208, A022). */
export interface CapRead {
  clashes: number;
  /** The share whose loser's uncapped Heartcap damage passes the 500 cap at storm ×1.0. */
  binds: number;
  /** The same at the budget's round storm. */
  bindsStorm: number;
  /** The share whose capped round result (§6.7) is a draw. */
  drawn: number;
}

export interface ClashRace {
  /** Per budget and field, budgets ascending, with the budget's round storm. */
  cells: ({ budget: number; field: FieldId; stormBp: number } & CapRead)[];
  /** Every clash, pooled. */
  all: CapRead;
  race: RaceReport;
  details: string[];
}

/**
 * The race section (plan call 17): per budget and field over every clash the check played, the share
 * where the cap binds (A208), at storm ×1.0 and at the storm of the round of battle 1 the budget stands
 * for (×1.0, ×1.0, ×1.2, ×1.6 and ×2.0 at 300 to 1,500), and the share of drawn rounds (A022); then the
 * race model over `race`, the G4 row's records and G3's. A drawn clash's loser is its more damaged side.
 * Each lane's raw is 25 × its margin, so the storm's ×1.2 to ×2.0 multiply it exactly.
 */
export function clashRace(records: readonly CellRecord[], race: readonly ClashRecord[]): ClashRace {
  const read = (rs: readonly CellRecord[], bpOf: (r: CellRecord) => number): CapRead => {
    let binds = 0, bindsStorm = 0, drawn = 0;
    for (const r of rs) {
      const h = r.cap.heartcap;
      const taken = r.cap.winner === 'draw' ? Math.max(h.player.uncapped, h.enemy.uncapped) : h[other(r.cap.winner)].uncapped;
      if (taken > CLASH.damageCap) binds++;
      if (Math.floor((taken * bpOf(r)) / 10000) > CLASH.damageCap) bindsStorm++;
      if (r.cap.round === 'draw') drawn++;
    }
    return { clashes: rs.length, binds: binds / rs.length, bindsStorm: bindsStorm / rs.length, drawn: drawn / rs.length };
  };
  const bpOf = (r: CellRecord) => stormBp(budgetRound(r.budget));
  const groups = new Map<string, CellRecord[]>();
  for (const r of records) {
    const k = `${r.budget}|${r.field}`;
    const g = groups.get(k);
    if (g) g.push(r); else groups.set(k, [r]);
  }
  const cells = [...groups.values()].map((rs) => ({ budget: rs[0]!.budget, field: rs[0]!.field, stormBp: bpOf(rs[0]!), ...read(rs, bpOf) }))
    .sort((p, q) => p.budget - q.budget || FIELD_ORDER.indexOf(p.field) - FIELD_ORDER.indexOf(q.field));
  const all = read(records, bpOf);
  const report = raceReport(race);
  const details = [
    `cap-binding (A208) and drawn rounds (A022) over the ${records.length} clashes the check played: per budget and field, the share whose loser's uncapped Heartcap damage passes ${CLASH.damageCap} at storm ×1.0 → at the storm of the round of battle 1 the budget stands for, and the share of drawn rounds (§6.7's capped result)`,
  ];
  for (const budget of [...new Set(cells.map((c) => c.budget))]) {
    const at = cells.filter((c) => c.budget === budget);
    details.push(`     ${String(budget).padStart(5)} (round ${budgetRound(budget)}, ×${(at[0]!.stormBp / 10000).toFixed(1)}): ${at.map((c) => `${c.field} ${pct(c.binds)} → ${pct(c.bindsStorm)}, drawn ${pct(c.drawn)}`).join(' · ')}`);
  }
  details.push(`     pooled: ${pct(all.binds)} → ${pct(all.bindsStorm)}, drawn ${pct(all.drawn)}`);
  return { cells, all, race: report, details: [...details, ...report.lines] };
}

// ---- battle 1's pairings (§16 R1, §12.3 G14; R2-Q13, A201) ----

/** The generals a run meets in battle 1: adaptive (runs use no other, `assignGenerals`), not the boss, with 1 in `appearsIn`. */
export function battleOneGenerals(content: Content): string[] {
  return Object.values(content.generals).filter((g) => g.adaptive && !g.boss && g.appearsIn.includes(1)).map((g) => g.id);
}

/** Each commander's starter against each battle-1 general, commanders in the data's order. */
export function battleOnePairings(content: Content): { commander: string; general: string }[] {
  const generals = battleOneGenerals(content);
  return Object.keys(content.commanders).flatMap((commander) => generals.map((general) => ({ commander, general })));
}

/** A general's battle-1 kit (§7.8 at index 1): `generalKit`'s, its economy and utility cards filtered (R1-Q2). */
export function battleOneKit(content: Content, general: string): string[] {
  const cards = new Set(clashArmyIds(content));
  const run = createRun(content, { seed: 1, commander: Object.keys(content.commanders)[0]! });
  return generalKit(content, run, { kind: 'battle', map: 'bogwater-hollow', general }, 1).kit.filter((id) => cards.has(id));
}

/** A starter's candidate armies: each of its army cards' mono, then each even pair, as the counter check names them. */
export function starterCandidates(content: Content, commander: string): string[] {
  const order = armyIds(content), mine = new Set(clashArmyIds(content));
  const cards = content.commanders[commander]!.starter.filter((id) => mine.has(id));
  const sorted = [...cards].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const pairs: string[] = [];
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) pairs.push(`bot:pair-${sorted[i]}-${sorted[j]}`);
  return [...cards.map((id) => `bot:mono:${id}`), ...pairs];
}

/** Each battle-1 general as a bot, `bot:kit1-<id>`: its opener, weights and limits on its battle-1 kit alone, and its merge policy. */
export function pairingBots(content: Content): Record<string, Omit<BotDef, 'id'>> {
  const bots: Record<string, Omit<BotDef, 'id'>> = {};
  for (const id of battleOneGenerals(content)) {
    const g = content.generals[id]!, kit = new Set(battleOneKit(content, id));
    const only = <T>(r: Record<string, T> | undefined): Record<string, T> => Object.fromEntries(Object.entries(r ?? {}).filter(([k]) => kit.has(k)));
    bots[`kit1-${id}`] = {
      description: `${g.name}'s battle-1 army: its opener and weights on its battle-1 kit (§7.8)`,
      opener: g.opener.filter((b) => kit.has(b)), weights: only(g.weights), limits: only(g.limits), mergePolicy: g.mergePolicy ?? 'auto', fixedWeights: true,
    };
  }
  return bots;
}

/** The proto spec that adds `pairingBots`: the pairing check's content is `protoContent` of it with `counterBotSpec`'s pairs. */
export function pairingBotSpec(content: Content): string {
  return Object.entries(pairingBots(content)).map(([id, def]) => `bot.${id}:${JSON.stringify(def)}`).join(',');
}

/** A pairing's answer bar: a candidate that wins this share or more answers the general (§16 R1). */
const PAIRING_ANSWER = 0.6;

export interface PairingOptions {
  cache: ClashCache;
  /** Budgets (default 300, 600 and 900 gold: battle 1's rounds 1, 3 and 5). */
  budgets?: readonly number[];
  /** Fields (default the one-lane field and Twin Roots; the one-lane field counts twice in the mean). */
  fields?: readonly FieldId[];
  /** Seeds (default 20), the general in the enemy seat only. */
  seeds?: number;
}

/** A pairing's reading: per budget and pooled, the best candidate by its mean over the fields, and its rate. */
export interface PairingRow {
  commander: string;
  general: string;
  budgets: { budget: number; best: string; rate: number }[];
  pooled: { best: string; rate: number };
  /** The pooled best wins 60% or more. */
  answered: boolean;
  /** Each candidate's mean per budget, then pooled. */
  candidates: { controller: string; budgets: number[]; pooled: number }[];
}

export interface PairingVerdict {
  rows: PairingRow[];
  /** The share of pairings with no answer at 60% or more, pooled over the budgets. */
  unanswered: number;
  budgets: { budget: number; unanswered: number }[];
  fields: FieldId[];
  seeds: number;
  jitter: number;
  details: string[];
}

/**
 * Battle 1's pairing table (§16 R1, R2-Q13's measurement, A201): each commander's starter candidates (its army
 * cards' monos and even pairs) against each battle-1 general's army, built from its opener and weights on its
 * battle-1 kit, the general in the enemy seat, seeds 1 to n on each field, at 300, 600 and 900 gold. Both
 * controllers are `human` in a clash, so no passive applies (R2-Q17 decides their v2 form). It reports each
 * pairing's best candidate and its rate, per budget and pooled, and the share of pairings with no answer at 60%.
 */
export async function evaluatePairings(content: Content, o: PairingOptions): Promise<PairingVerdict> {
  const budgets = [...(o.budgets ?? [300, 600, 900])], fields = [...(o.fields ?? CLASH_CHECK.fields)], seeds = o.seeds ?? 20;
  const counted = countedFields(fields);
  const pairs = battleOnePairings(content);
  const rows: PairingRow[] = [];
  // the cache's jitter, as its records carry it
  let jitter = 0;
  for (const { commander, general } of pairs) {
    const b = `bot:kit1-${general}`;
    const candidates = starterCandidates(content, commander);
    const cells: Cell[] = candidates.flatMap((a) => fields.flatMap((field) => budgets.flatMap((budget) =>
      Array.from({ length: seeds }, (_, s): Cell => ({ a, b, field, budget, seed: s + 1, seat: 'player' })))));
    const records = await o.cache.slim(cells);
    jitter = records[0]?.jitter ?? 0;
    const per = fields.length * budgets.length * seeds;
    const reads = candidates.map((controller, i) => {
      const at = byBudget(records.slice(i * per, (i + 1) * per), 'a', budgets, fields, 'lowest');
      return { controller, budgets: at.map((x) => x.mean), pooled: overFields(pooled(at, fields), counted, 'lowest').mean };
    });
    const bestOf = (rate: (r: (typeof reads)[number]) => number) => reads.reduce((best, r) => (rate(r) > rate(best) ? r : best));
    const top = bestOf((r) => r.pooled);
    rows.push({
      commander, general, candidates: reads,
      budgets: budgets.map((budget, k) => { const r = bestOf((x) => x.budgets[k]!); return { budget, best: r.controller, rate: r.budgets[k]! }; }),
      pooled: { best: top.controller, rate: top.pooled }, answered: top.pooled >= PAIRING_ANSWER,
    });
  }
  const share = (n: number) => n / rows.length;
  const unanswered = share(rows.filter((r) => !r.answered).length);
  const perBudget = budgets.map((budget, k) => ({ budget, unanswered: share(rows.filter((r) => r.budgets[k]!.rate < PAIRING_ANSWER).length) }));
  const name = (c: string) => c.replace(/^bot:/, '');
  const details = [
    `battle-1 pairings (§16 R1, §12.3 G14; R2-Q13): each starter's candidates (its army cards' monos and even pairs) against each battle-1 general's army (its opener and weights on its battle-1 kit), the general in the enemy seat, ${seeds} seeds on ${fields.join(', ')}, jitter ${jitter ? `±${jitter}` : 'off'}; passives off (both sides human, R2-Q17). The best candidate's win % (a draw half; the one-lane field twice in the mean)`,
    ...rows.map((r) => `    ${r.answered ? 'ok  ' : 'none'} ${r.commander} against ${r.general}: ${r.budgets.map((x) => `${x.budget} ${name(x.best)} ${whole(x.rate)}`).join(' · ')} · pooled ${name(r.pooled.best)} ${whole(r.pooled.rate)}`),
    `no answer at ${pct(PAIRING_ANSWER)} or more: ${rows.filter((r) => !r.answered).length} of ${rows.length} pairings pooled (${pct(unanswered)}); per budget ${perBudget.map((x) => `${x.budget} ${pct(x.unanswered)}`).join(' · ')}`,
  ];
  return { rows, unanswered, budgets: perBudget, fields, seeds, jitter, details };
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// ---- the commander tournament (SPEC §16 Milestone 5, verification 3) ----

/** No commander's run win rate may be more than this many points above another's. */
export const COMMANDER_SPREAD = 15;

export interface CommanderRow {
  commander: string;
  runs: number;
  victories: number;
  reachedBoss: number;
  battlesWon: number;
  battles: number;
  /** Lives left at each run's end, summed (§8.5). */
  livesLeft: number;
  powerUses: number;
  powerDamage: number;
  /** Puppet Bloom's units lifted and Rhizome Tithe's gold (§11.10). */
  powerLifts: number;
  powerGold: number;
}

/**
 * Whole runs per commander: `bot:balanced` with greedy drafts, a random route and the auto power policy,
 * on seeds 1..n with the run's default flags (powers on). Each commander plays the same seeds.
 */
export function commanderTournament(content: Content, commanders: string[], seeds: number): { rows: CommanderRow[]; verdict: Verdict } {
  const rows: CommanderRow[] = [];
  for (const commander of commanders) {
    const row: CommanderRow = {
      commander, runs: 0, victories: 0, reachedBoss: 0, battlesWon: 0, battles: 0, livesLeft: 0, powerUses: 0, powerDamage: 0, powerLifts: 0, powerGold: 0,
    };
    for (let seed = 1; seed <= seeds; seed++) {
      const r = simulateRun(content, seed, { route: 'random', draft: 'greedy', player: 'bot:balanced', power: 'auto' }, {
        commander,
        onBattle: ({ state }) => {
          const st = state.stats.player;
          row.powerUses += st.powerUses ?? 0;
          row.powerDamage += st.powerDamage ?? 0;
          row.powerLifts += st.powerLifts ?? 0;
          row.powerGold += st.powerGold ?? 0;
        },
      });
      row.runs++;
      if (r.outcome === 'victory') row.victories++;
      if (r.reachedBoss) row.reachedBoss++;
      row.battles += r.battleCount;
      row.battlesWon += r.battles.filter((b) => b.winner === 'player').length;
      row.livesLeft += r.lives.left;
    }
    rows.push(row);
  }
  const rate = (r: CommanderRow) => (100 * r.victories) / Math.max(1, r.runs);
  const rates = rows.map(rate);
  const spread = Math.max(...rates) - Math.min(...rates);
  const pass = spread <= COMMANDER_SPREAD;
  return {
    rows,
    verdict: {
      id: 'M5', pass,
      summary: `commander run win rates within ${COMMANDER_SPREAD} points (${seeds} seeds each): spread ${spread.toFixed(0)} points`,
      details: rows.map((r) => `${r.commander}: ${rate(r).toFixed(0)}% runs won (${r.victories}/${r.runs}) · boss reached ${r.reachedBoss}/${r.runs} · ` +
        `battles won ${r.battlesWon}/${r.battles} · lives left ${(r.livesLeft / Math.max(1, r.runs)).toFixed(1)} a run · power used ${r.powerUses}× (damage ${r.powerDamage}, units lifted ${r.powerLifts}, gold ${r.powerGold})`),
    },
  };
}
