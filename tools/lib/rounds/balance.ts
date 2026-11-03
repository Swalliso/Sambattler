// The balance tools in round form (SPEC §12.2, §15.3; R2a/T116): one round clash from R1's armies
// (`playRoundClash`), the squad and supply duels (G1, G2) and the bots' tournament against the scripted general,
// all on the round sim. Never R1's `playClash`, which plays on v1's sim (§12.2: from R2 every tool measures the
// real loop). Each battle, clash and duel is a `RoundJob`, which `tools/lib/pool.ts` plays in worker threads with
// the same results as in process (T117). S18 adds the guardrail evaluators here (T123). It stands beside v1's
// `tools/lib/balance.ts` until R2b moves it there.
import type { Content } from '../../../src/data/registry.ts';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { mapPool } from '../../../src/run/index.ts';
import { hash32, nextFloat, seedStream } from '../../../src/sim/rng.ts';
import { basePlots, buildable, colonyPlots } from '../../../src/sim/rounds/colony.ts';
import { addUnit } from '../../../src/sim/rounds/create.ts';
import { commandStamp, createFromScenario, makeRoundConfig, queueCommand, runHeadless } from '../../../src/sim/rounds/index.ts';
import type { BattleState, Flags, Side } from '../../../src/sim/rounds/index.ts';
import { answerKind, armyIds, counterAnswers, duelUnit, spawnerIds } from '../balance.ts';
import type { AnswerKind, DuelOutcome, Verdict } from '../balance.ts';
import { armyFromBot, armyOf, assignSlots, clashField, lineOf } from '../clash.ts';
import type { Army, ClashField, FieldId, LanesRule } from '../clash.ts';
import { rosterIds } from '../roster.ts';
import { median } from '../run.ts';
import { runRoundBattle } from './run.ts';

// ---- one round clash ----

/** One round clash: two armies on one of R1's fields, a seed, the seat the first army takes, and its options. */
export interface RoundClashJob {
  field: FieldId;
  seed: number;
  /** The side the first army plays; the second plays the other. */
  seat: Side;
  armies: [Army, Army];
  opts?: {
    /** Merging, at the muster and after it (default on); an army's own policy sets each building's toggle. */
    merging?: boolean;
    /** Plots a side opens past the base ones, in a third rank (R1-Q4; default 0). */
    extraPlots?: number;
    lanesRule?: LanesRule;
    /** Per army, whether its front and back ranks trade places, a third rank left where it stands (G16, R2-Q10). */
    swap?: [boolean, boolean];
  };
}

/** A round clash as the tools read it, from the first army's side (`a`) and the second's (`b`). */
export interface RoundClashRecord {
  field: FieldId;
  seed: number;
  seat: Side;
  controllers: [string, string];
  budget: number;
  lanes: { winner: 'a' | 'b' | null; ticks: number; capped: boolean; survivors: [number, number] }[];
  /** The Heartcap damage each army dealt: capped (§6.7), and before the cap, each lane's summed. */
  damage: [number, number];
  uncapped: [number, number];
  /** R1-Q3's winner: more lanes won, then more uncapped damage, else a draw. */
  winner: 'a' | 'b' | 'draw';
  /** The gold each army has left on the field: every unit's HP share of its building's cost a unit. */
  value: [number, number];
  /** The clash's length, its longest lane, the muster counted. */
  ticks: number;
}

/**
 * Each side's slots on R1's field: `assignSlots` over the field's plots that are buildable on that side, since a
 * stump plot holds no building in rounds (§4.6) and R1's field, on v1's sim, has none (Twin Roots' front rank).
 */
function colonyFor(content: Content, army: Army, base: ClashField, side: Side, plots: number, lanesRule?: LanesRule, swap = false): NonNullable<RoundScenarioDef['sides']['player']['colony']> {
  const own = colonyPlots(content.maps[base.mapId]!, side, plots);
  const open = base.open.filter((r) => {
    const p = own.find((q) => q.lane === r.lane && q.rank === r.rank && q.file === r.file);
    return p !== undefined && buildable(p);
  });
  const traded = (rank: number) => (swap && rank < 2 ? 1 - rank : rank);
  return assignSlots(content, army, { ...base, open, plots: open.length }, lanesRule ? { lanesRule } : {})
    .map((p) => {
      const rank = traded(p.rank);
      if (!open.some((r) => r.lane === p.lane && r.rank === rank && r.file === p.file)) throw new Error(`colonyFor: ${base.id} has no plot at lane ${p.lane}, rank ${rank}, file ${p.file} to trade ranks into`);
      return { building: p.entry.buildingId, lane: p.lane, rank, file: p.file, merge: p.entry.mergeOn };
    });
}

/** The gold value a side has left on the field: each unit's HP share of what its building cost a unit of its squad. */
function fieldValue(state: BattleState, side: Side): number {
  let v = 0;
  for (const u of state.units) {
    if (u.side !== side || u.hp <= 0) continue;
    const b = state.buildings.find((x) => x.id === u.sourceBuildingId);
    const card = b ? state.compiled[side].buildings[b.buildingId] : undefined;
    if (card?.squad) v += (u.hp / u.maxHp) * (card.cost / card.squad.count);
  }
  return v;
}

/**
 * One round clash of two armies from R1's `armyFromBot` (or `armyOf`), on the round sim (R2a/T116, §12.2): their
 * slots by R1's `assignSlots` become each side's colony in a round scenario (`createFromScenario`, T029), both
 * sides human; the player's `beginClash` is queued, `runHeadless` plays to round 1's end, and `state.rounds[0]`
 * is read. G1's squad duels, G12's clash rows and G16's swaps play through it.
 */
export function playRoundClash(content: Content, job: RoundClashJob): RoundClashRecord {
  const opts = job.opts ?? {};
  const base = clashField(content, job.field, { extraPlots: opts.extraPlots ?? 0 });
  const plots = basePlots(content.maps[base.mapId]!) + (opts.extraPlots ?? 0);
  const armyOn = (s: Side): Army => job.armies[s === job.seat ? 0 : 1];
  const swapOn = (s: Side): boolean => opts.swap?.[s === job.seat ? 0 : 1] ?? false;
  const side = (s: Side) => ({ plots, colony: colonyFor(content, armyOn(s), base, s, plots, opts.lanesRule, swapOn(s)) });
  const def: RoundScenarioDef = {
    id: 'round-clash', description: 'One clash of two armies (R2a/T116).', map: base.mapId,
    flags: { merging: opts.merging ?? true, adaptiveGeneral: false, powers: false },
    sides: { player: side('player'), enemy: side('enemy') },
  };
  const state = createFromScenario(content, def, { seed: job.seed });
  queueCommand(state, { ...commandStamp(state), side: 'player', type: 'beginClash' });
  runHeadless(state, { until: { round: 1 } });
  const r = state.rounds[0];
  if (!r) throw new Error(`playRoundClash: the clash on ${job.field}, seed ${job.seed}, never ended`);
  const a = job.seat, b: Side = a === 'player' ? 'enemy' : 'player';
  const ab = (s: Side | null): 'a' | 'b' | null => (s === null ? null : s === a ? 'a' : 'b');
  const lanes = r.lanes.map((l) => ({ winner: ab(l.winner), ticks: l.ticks, capped: l.capped, survivors: [l.survivors[a], l.survivors[b]] as [number, number] }));
  const uncapped = (s: Side) => r.lanes.reduce((n, l) => n + (l.winner === s ? l.damage : 0), 0);
  const won = (w: 'a' | 'b') => lanes.filter((l) => l.winner === w).length;
  const ua = uncapped(a), ub = uncapped(b);
  const winner = won('a') !== won('b') ? (won('a') > won('b') ? 'a' : 'b') : ua !== ub ? (ua > ub ? 'a' : 'b') : 'draw';
  return {
    field: job.field, seed: job.seed, seat: job.seat, controllers: [job.armies[0].controller, job.armies[1].controller], budget: job.armies[0].budget,
    lanes, damage: [r.damage[a], r.damage[b]], uncapped: [ua, ub], winner, value: [fieldValue(state, a), fieldValue(state, b)],
    ticks: Math.max(...r.lanes.map((l) => l.ticks)),
  };
}

// ---- duels ----

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
  const def: RoundScenarioDef = {
    id: 'supply-duel', description: 'A supply duel (R2a/T116).', map: 'test-flat',
    flags: { merging: false, adaptiveGeneral: false, powers: false }, sides: { player: {}, enemy: {} }, clash: { units: [] },
  };
  const state = createFromScenario(content, def, { seed });
  const rng = seedStream(hash32(seed, `supply:${a}:${b}`, 0), 'ai', 0);
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
  scenario?: string | RoundScenarioDef;
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
  const units = ids.map((id) => content.buildings[id]!.spawn!.unit);
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

const pct = (n: number, d: number) => `${d ? Math.round((100 * n) / d) : 0}%`;
const secs = (ticks: number | null) => (ticks === null ? '-' : `${(ticks / 20).toFixed(1)} s`);

/** A row in a line: win rate, median rounds, the last round, the cap, the clash length and the lead's changes. */
export function rowLine(r: TournamentRow, maxRounds: number): string {
  return `${r.player} vs ${r.enemy} on ${r.map}, ${r.games} battles: wins ${pct(r.wins, r.games)} · rounds median ${r.medianRounds ?? '-'}`
    + ` · reached round ${maxRounds} ${pct(r.lastRound, r.games)} · clashes at the cap ${r.capped}/${r.clashes} (${pct(r.capped, r.clashes)})`
    + ` · clash length median ${secs(r.medianClashTicks)} · the lead changed hands ${r.leadChanges} times, in ${pct(r.changedBattles, r.games)} of battles`
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
      + ` · round ${maxRounds} ${pct(r.lastRound, r.games)} ${within(last <= g4.maxRound9Share)} ≤ ${g4.maxRound9Share * 100}%`
      + ` · the bot wins ${pct(r.wins, r.games)} ${within(win >= g4.botWinMin && win <= g4.botWinMax)} ${g4.botWinMin * 100}–${g4.botWinMax * 100}%`,
    `  G13: capped ${pct(r.capped, r.clashes)} ${within(cap <= g13.maxCappedShare)} ≤ ${g13.maxCappedShare * 100}%`
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
  return { id: 'G4', pass: checks.every(([p]) => p), row, summary: `rounds per battle: bot:balanced vs the scripted general on ${records[0]?.map}, ${records.length} battles`, details: checks.map(([p, d]) => `${ok(p)} ${d}`) };
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
export function mirrorScenario(content: Content, def: RoundScenarioDef): RoundScenarioDef {
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
  const t = content.targets.rounds.G6, def = content.roundScenarios[t.scenario];
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
 * below `minBaseline` without it is reported only), and the first of `policies` wins within the band against the
 * adaptive general at battle index 1. The others are reported beside it until #35 sets their band (X7).
 */
export async function evaluateG8(content: Content, run: RoundRunner): Promise<Verdict & { rows: RoundG8Row[]; policies: Record<string, number> }> {
  const t = content.targets.rounds.G8, general = `general:${t.general}`, map = 'bogwater-hollow';
  const off = { merging: true, adaptiveGeneral: false }, on = { merging: true, adaptiveGeneral: true };
  const ids = rosterIds(content);
  const cells: SeatCell[] = [
    ...ids.flatMap((id) => [{ a: `bot:mono:${id}`, b: general, map, flags: off }, { a: `bot:mono:${id}`, b: general, map, flags: on }]),
    ...t.policies.map((p) => ({ a: `bot:${p}`, b: general, map, flags: on })),
  ];
  const rows = await playSeats(run, cells, t.seeds, 1, ['player']);
  const winRate = (i: number) => rows[i]!.winsA / rows[i]!.games;
  const monos = ids.map((id, i): RoundG8Row => {
    const rOff = winRate(2 * i), rOn = winRate(2 * i + 1), asserted = rOff >= t.minBaseline;
    // a drop of exactly `minDrop` passes: 11/30 − 5/30 is a hair under 0.2 in floats
    return { bot: id, off: rOff, on: rOn, drop: rOff - rOn, asserted, ok: !asserted || rOff - rOn >= t.minDrop - 1e-9 };
  });
  const policies = Object.fromEntries(t.policies.map((p, k) => [p, winRate(2 * ids.length + k)]));
  const first = policies[t.policies[0]!]!, bandOk = first >= t.balancedMin && first <= t.balancedMax;
  const details = [
    ...monos.map((r) => `${!r.asserted ? 'n/a ' : ok(r.ok)} mono:${r.bot} vs ${t.general}: ${rate(r.off)} → ${rate(r.on)} with the counter cycle (drop ${Math.round(r.drop * 100)} points${r.asserted ? '' : `; under the ${rate(t.minBaseline)} baseline, report only`})`),
    `${ok(bandOk)} bot:${t.policies[0]} vs adaptive ${t.general} at battle index 1: ${rate(first)} (band ${rate(t.balancedMin)}–${rate(t.balancedMax)})`,
    ...t.policies.slice(1).map((p) => `info bot:${p} vs adaptive ${t.general} at battle index 1: ${rate(policies[p]!)} (reported, no band until #35)`),
  ];
  return {
    id: 'G8', pass: monos.every((r) => r.ok) && bandOk, rows: monos, policies,
    summary: `adaptation in rounds: every mono bot drops ≥${Math.round(t.minDrop * 100)} points against the adaptive ${t.general}; bot:${t.policies[0]} wins ${rate(t.balancedMin)}–${rate(t.balancedMax)}`,
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
