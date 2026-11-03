// The balance tools in round form (SPEC §12.2, §15.3; R2a/T116): one round clash from R1's armies
// (`playRoundClash`), the squad and supply duels (G1, G2) and the bots' tournament against the scripted general,
// all on the round sim. Never R1's `playClash`, which plays on v1's sim (§12.2: from R2 every tool measures the
// real loop). Each battle, clash and duel is a `RoundJob`, which `tools/lib/pool.ts` plays in worker threads with
// the same results as in process (T117). S18 adds the guardrail evaluators here (T123). It stands beside v1's
// `tools/lib/balance.ts` until R2b moves it there.
import type { Content } from '../../../src/data/registry.ts';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { hash32, nextFloat, seedStream } from '../../../src/sim/rng.ts';
import { basePlots, buildable, colonyPlots } from '../../../src/sim/rounds/colony.ts';
import { addUnit } from '../../../src/sim/rounds/create.ts';
import { commandStamp, createFromScenario, queueCommand, runHeadless } from '../../../src/sim/rounds/index.ts';
import type { BattleState, Flags, Side } from '../../../src/sim/rounds/index.ts';
import { duelUnit, spawnerIds } from '../balance.ts';
import type { DuelOutcome } from '../balance.ts';
import { armyOf, assignSlots, clashField } from '../clash.ts';
import type { Army, ClashField, FieldId, LanesRule } from '../clash.ts';
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
function colonyFor(content: Content, army: Army, base: ClashField, side: Side, plots: number, lanesRule?: LanesRule): NonNullable<RoundScenarioDef['sides']['player']['colony']> {
  const own = colonyPlots(content.maps[base.mapId]!, side, plots);
  const open = base.open.filter((r) => {
    const p = own.find((q) => q.lane === r.lane && q.rank === r.rank && q.file === r.file);
    return p !== undefined && buildable(p);
  });
  return assignSlots(content, army, { ...base, open, plots: open.length }, lanesRule ? { lanesRule } : {})
    .map((p) => ({ building: p.entry.buildingId, lane: p.lane, rank: p.rank, file: p.file, merge: p.entry.mergeOn }));
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
  const side = (s: Side) => ({ plots, colony: colonyFor(content, armyOn(s), base, s, plots, opts.lanesRule) });
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
}

export function playRoundBattle(content: Content, job: RoundBattleJob): RoundBattleRecord {
  const { state, result } = runRoundBattle(content, { seed: job.seed, map: job.map, player: job.player, enemy: job.enemy, ...(job.flags ? { flags: job.flags } : {}) });
  const max = { player: state.sides.player.heartcapMaxHp, enemy: state.sides.enemy.heartcapMaxHp };
  const leads = state.rounds.map((r) => {
    const p = r.heartcaps.player * max.enemy, e = r.heartcaps.enemy * max.player;
    return p === e ? null : p > e ? 'player' : 'enemy';
  });
  return {
    ...job, winner: result.winner, by: result.by, rounds: result.rounds,
    clashes: state.rounds.flatMap((r) => r.lanes.map((l) => ({ round: r.round, ticks: l.ticks, capped: l.capped }))),
    leads, rejected: result.rejectedCommands,
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
  const g1 = content.targets.G1, g2 = content.targets.G2;
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

/** The duels in a few lines (§12.2): each building's pairings won and lost clearly, each unit's edges, and the intended edges. */
export function duelLines(content: Content, d: Awaited<ReturnType<typeof duels>>): string[] {
  const g1 = content.targets.G1, g2 = content.targets.G2;
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

/** §12.3's first guesses for G4's band and G13's, read beside a row until T119 writes them into the `rounds` targets. */
export const G4_FIRST_GUESS = { medianRounds: [6, 8], maxLastRoundShare: 0.15, botWin: [0.3, 0.7], maxCappedShare: 0.15, clashSeconds: [20, 40] } as const;

/** G4's reading of a `bot:balanced` row against §12.3's band, and G13's beside it, each within or outside (no verdict until T123). */
export function g4Lines(r: TournamentRow, maxRounds: number): string[] {
  const g = G4_FIRST_GUESS;
  const within = (ok: boolean) => (ok ? 'within' : 'OUTSIDE');
  const m = r.medianRounds ?? 0, win = r.wins / r.games, last = r.lastRound / r.games, cap = r.capped / Math.max(1, r.clashes), len = (r.medianClashTicks ?? 0) / 20;
  return [
    rowLine(r, maxRounds),
    `  G4: median ${m} rounds ${within(m >= g.medianRounds[0] && m <= g.medianRounds[1])} ${g.medianRounds.join('–')}`
      + ` · round ${maxRounds} ${pct(r.lastRound, r.games)} ${within(last <= g.maxLastRoundShare)} ≤ ${g.maxLastRoundShare * 100}%`
      + ` · the bot wins ${pct(r.wins, r.games)} ${within(win >= g.botWin[0] && win <= g.botWin[1])} ${g.botWin.map((x) => x * 100).join('–')}%`,
    `  G13: capped ${pct(r.capped, r.clashes)} ${within(cap <= g.maxCappedShare)} ≤ ${g.maxCappedShare * 100}%`
      + ` · median clash ${len.toFixed(1)} s ${within(len >= g.clashSeconds[0] && len <= g.clashSeconds[1])} ${g.clashSeconds.join('–')} s`,
  ];
}
