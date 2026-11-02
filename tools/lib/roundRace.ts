// The race model for X5, the scoring curve (SPEC §4.5, §6.4, §6.5, §6.7; R1 plan call 17; A193, A197,
// A208, A022). It chains clash records into battles of up to 9 rounds and reads how they end under the
// 500 cap and its alternatives. It's crude: no income, comeback gold or counters, and one seed's armies
// at each budget stand in for a colony growing within a battle. It's for X5's call at R1's gate (R1/T049),
// not a guardrail; R2a's round loop replaces it (R2a/T119). Pure functions over clash records.
import type { Side } from '../../src/sim/index.ts';
import { CLASH } from './clash.ts';
import type { ClashRecord, FieldId } from './clash.ts';

/** The race's numbers (§4.5, §6.4, §6.5), until R2a puts them in the data (plan call 19). */
export const RACE = {
  rounds: 9,
  playerHeartcap: 3000,
  /** The general's Heartcap: 2000 + 250 × (i − 1); the boss's 3600; a Fortified elite's +30% (§4.5, §7.7). */
  generalBase: 2000,
  generalStep: 250,
  bossHeartcap: 3600,
  fortifiedBp: 13000,
  /** The storm, in basis points: from round 5, +20% a round, at most ×2.0 (§6.4). */
  stormStart: 5,
  stormStepBp: 2000,
  stormMaxBp: 20000,
  /** Round r of battle i reads the clash at 300 + 75 × (i − 1) + 150 × (r − 1) gold, at most 1,500 (plan call 17). */
  gold: { start: 300, perBattle: 75, perRound: 150, max: 1500 },
} as const;

/** The race's two sides: the player's Heartcap and the general's. */
export type Role = 'player' | 'general';
const ROLES: readonly Role[] = ['player', 'general'];

/** The battles a case gives: indices 1–5, a Fortified elite at index 3, and the boss at index 6. */
export type BattleKind = '1' | '2' | '3' | '4' | '5' | 'elite' | 'boss';
export const BATTLES: readonly { kind: BattleKind; index: number }[] = [
  { kind: '1', index: 1 }, { kind: '2', index: 2 }, { kind: '3', index: 3 }, { kind: '4', index: 4 }, { kind: '5', index: 5 },
  { kind: 'elite', index: 3 }, { kind: 'boss', index: 6 },
];

/** A way to score the race: §6.7's first guess, or one of X5's alternatives. */
export interface RaceRules {
  id: string;
  /** A cap of this share of the loser's max HP, in basis points, in place of the flat 500. */
  capShareBp?: number;
  /** The storm multiplies the cap too (A208). */
  stormCap?: boolean;
  /** Both Heartcaps at the general's 2000 + 250 × (i − 1) (A193); an elite's and the boss's stay the general's. */
  equal?: boolean;
  /** The Decision after round 9: by damage dealt (§6.5), or by the share of max HP lost. */
  decision: 'damage' | 'share';
}

/** The first guess, then X5's alternatives one at a time, then X5's lean (a 25% cap and a Decision by share). */
export const RACE_RULES: readonly RaceRules[] = [
  { id: 'first guess', decision: 'damage' },
  { id: 'cap 25%', capShareBp: 2500, decision: 'damage' },
  { id: 'storm cap', stormCap: true, decision: 'damage' },
  { id: 'equal', equal: true, decision: 'damage' },
  { id: 'share Decision', decision: 'share' },
  { id: 'X5 lean', capShareBp: 2500, decision: 'share' },
];

/** The storm's multiplier in round r, in basis points (§6.4). */
export function stormBp(round: number): number {
  return round < RACE.stormStart ? 10000 : Math.min(RACE.stormMaxBp, 10000 + RACE.stormStepBp * (round - RACE.stormStart + 1));
}

/** The gold round r of battle `index` reads at (plan call 17). */
export function raceGold(index: number, round: number): number {
  const g = RACE.gold;
  return Math.min(g.max, g.start + g.perBattle * (index - 1) + g.perRound * (round - 1));
}

/** The measured budget round r of battle `index` reads: the nearest at or below its gold, else the smallest. */
export function raceBudget(index: number, round: number, budgets: readonly number[]): number {
  const gold = raceGold(index, round);
  let best = Infinity, low = Infinity;
  for (const b of budgets) {
    if (b <= gold && (best === Infinity || b > best)) best = b;
    if (b < low) low = b;
  }
  return best === Infinity ? low : best;
}

/** The round of battle 1 whose gold a budget is: 300 is round 1, 600 round 3, 1,500 round 9. */
export function budgetRound(budget: number): number {
  return Math.min(RACE.rounds, Math.max(1, 1 + Math.floor((budget - RACE.gold.start) / RACE.gold.perRound)));
}

/** Each Heartcap's max HP in a battle, by the rules (§4.5). */
export function heartcaps(kind: BattleKind, rules: RaceRules): Record<Role, number> {
  const { index } = BATTLES.find((b) => b.kind === kind)!;
  const base = RACE.generalBase + RACE.generalStep * (index - 1);
  const general = kind === 'boss' ? RACE.bossHeartcap : kind === 'elite' ? Math.floor((base * RACE.fortifiedBp) / 10000) : base;
  return { player: rules.equal ? base : RACE.playerHeartcap, general };
}

/** One round as the race reads it: the raw damage (25 × the margin, §6.7) of each lane each Heartcap lost. */
export interface RaceRound {
  player: readonly number[];
  general: readonly number[];
}

export interface RaceBattle {
  /** The rounds played: the Rout's round, or 9 for a Decision. */
  rounds: number;
  winner: Role;
  by: 'rout' | 'decision';
  /** The HP each Heartcap lost, after the storm and the cap. */
  lost: Record<Role, number>;
  /** How often the side ahead on the Decision's measure changed, ties not counted. */
  leadChanges: number;
}

/**
 * One battle of up to 9 rounds (§6.5, §6.7): each round, each Heartcap takes each lane it lost's raw
 * damage × the storm, floored per lane, summed, and capped. A Heartcap at 0 is a Rout, and when both
 * reach 0 in one round the player loses (E8). After round 9 the Decision goes to more damage dealt, then
 * the higher HP fraction, else the general; or, under `decision: 'share'`, to the smaller share of max
 * HP lost, else the general.
 */
export function raceBattle(rounds: readonly RaceRound[], opts: { heartcaps: Record<Role, number>; rules: RaceRules }): RaceBattle {
  const max = opts.heartcaps, rules = opts.rules;
  const hp = { ...max }, lost = { player: 0, general: 0 };
  let leader: Role | undefined, leadChanges = 0;
  for (let r = 1; r <= RACE.rounds; r++) {
    const round = rounds[r - 1];
    if (!round) throw new Error(`raceBattle: no clash for round ${r}`);
    const bp = stormBp(r);
    for (const role of ROLES) {
      let dmg = 0;
      for (const raw of round[role]) dmg += Math.floor((raw * bp) / 10000);
      let cap = rules.capShareBp ? Math.floor((max[role] * rules.capShareBp) / 10000) : CLASH.damageCap;
      if (rules.stormCap) cap = Math.floor((cap * bp) / 10000);
      const d = Math.min(hp[role], cap, dmg);
      hp[role] -= d;
      lost[role] += d;
    }
    const ahead = leaderOf(lost, max, rules);
    if (ahead) {
      if (leader && ahead !== leader) leadChanges++;
      leader = ahead;
    }
    if (hp.player === 0 || hp.general === 0) return { rounds: r, winner: hp.player === 0 ? 'general' : 'player', by: 'rout', lost, leadChanges };
  }
  return { rounds: RACE.rounds, winner: leaderOf(lost, max, rules) ?? 'general', by: 'decision', lost, leadChanges };
}

/** The side a Decision would go to now, before its last tiebreak: undefined when they're level. */
function leaderOf(lost: Record<Role, number>, max: Record<Role, number>, rules: RaceRules): Role | undefined {
  // the player dealt what the general lost; cross-multiplied, so the fractions compare exactly
  if (rules.decision === 'damage' && lost.general !== lost.player) return lost.general > lost.player ? 'player' : 'general';
  const p = lost.player * max.general, g = lost.general * max.player;
  return p < g ? 'player' : g < p ? 'general' : undefined;
}

/** How one rule set's battles of one kind came out over a group's cases. */
export interface RaceRead {
  battles: number;
  medianRounds: number;
  /** The share of battles that reached round 9, a Rout in it included. */
  round9: number;
  /** The battles each side won by Rout, by the round it came in (index 0 is round 1). */
  routs: Record<Role, number[]>;
  /** The battles each side won by Decision. */
  decisions: Record<Role, number>;
  /** The mean lead changes a battle. */
  leadChanges: number;
  /** The shares of battles the general won by Rout and by Decision. */
  general: { rout: number; decision: number };
}

/** The race's groups: G4's pairing (§12.3), `bot:balanced` against itself beside it, and G3's pairs. */
export type RaceGroupId = 'g4' | 'mirror' | 'g3';

export interface RaceGroup {
  id: RaceGroupId;
  field: FieldId;
  /** The cases read: one per pairing, seed and seat. */
  cases: number;
  reads: { rules: string; battles: Record<BattleKind, RaceRead> }[];
}

export interface RaceReport {
  groups: RaceGroup[];
  /** The section as printed: its header, then each group's table, the G4 case first. */
  lines: string[];
}

const G4_PLAYER = 'bot:balanced', G4_GENERAL = 'general:scripted';
const GROUP_ORDER: readonly RaceGroupId[] = ['g4', 'mirror', 'g3'];
const FIELD_ORDER: readonly FieldId[] = ['one', 'twin', 'three'];

/**
 * Which group a record joins, and the side the race's player played: G4's pairing with `bot:balanced` the
 * player whichever seat it played; `bot:balanced` against itself (its second army on seed 1,000 + s) and
 * G3's pairs (a mono against `bot:balanced`) with the player seat's army the player. Others join none.
 */
function groupOf(r: ClashRecord): { id: RaceGroupId; player: Side } | undefined {
  const p = r.armies.player.controller, e = r.armies.enemy.controller;
  if (p === G4_PLAYER && e === G4_PLAYER) return { id: 'mirror', player: 'player' };
  if ((p === G4_PLAYER && e === G4_GENERAL) || (p === G4_GENERAL && e === G4_PLAYER)) return { id: 'g4', player: p === G4_PLAYER ? 'player' : 'enemy' };
  if ((p.startsWith('bot:mono:') && e === G4_PLAYER) || (e.startsWith('bot:mono:') && p === G4_PLAYER)) return { id: 'g3', player: 'player' };
  return undefined;
}

/**
 * The race over clash records (plan call 17). Each case is a pairing's armies on a field from one seed in
 * one seat, with a clash at each budget measured. It gives one battle per index 1–5, the elite and the
 * boss, round r of battle i reading the clash at `raceBudget(i, r, …)`, under each of `RACE_RULES`. Each
 * group is read per field: G4's case first (the even battles A193 and G4's band are about), its mirror
 * beside it, then G3's lopsided cases.
 */
export function raceReport(records: readonly ClashRecord[]): RaceReport {
  const cases = new Map<string, { id: RaceGroupId; field: FieldId; rounds: Map<number, RaceRound> }>();
  for (const r of records) {
    const g = groupOf(r);
    if (!g) continue;
    const key = `${g.id}|${r.field}|${r.armies.player.controller}|${r.armies.enemy.controller}|${r.seat}|${r.seed}`;
    let c = cases.get(key);
    if (!c) cases.set(key, (c = { id: g.id, field: r.field, rounds: new Map() }));
    const round = { player: [] as number[], general: [] as number[] };
    for (const l of r.lanes) {
      if (l.cap.winner === 'draw' || l.cap.raw === 0) continue;
      (l.cap.winner === g.player ? round.general : round.player).push(l.cap.raw);
    }
    c.rounds.set(r.budget, round);
  }

  const groups: RaceGroup[] = [];
  for (const id of GROUP_ORDER) {
    for (const field of FIELD_ORDER) {
      const mine = [...cases.values()].filter((c) => c.id === id && c.field === field);
      if (!mine.length) continue;
      const reads = RACE_RULES.map((rules) => {
        const battles = {} as Record<BattleKind, RaceRead>;
        for (const { kind, index } of BATTLES) {
          const hc = heartcaps(kind, rules);
          const out = mine.map((c) => {
            const budgets = [...c.rounds.keys()];
            const rounds = Array.from({ length: RACE.rounds }, (_, i) => c.rounds.get(raceBudget(index, i + 1, budgets))!);
            return raceBattle(rounds, { heartcaps: hc, rules });
          });
          battles[kind] = readOf(out);
        }
        return { rules: rules.id, battles };
      });
      groups.push({ id, field, cases: mine.length, reads });
    }
  }
  return { groups, lines: raceLines(groups) };
}

function readOf(out: readonly RaceBattle[]): RaceRead {
  const routs = { player: new Array<number>(RACE.rounds).fill(0), general: new Array<number>(RACE.rounds).fill(0) };
  const decisions = { player: 0, general: 0 };
  let round9 = 0, changes = 0;
  for (const b of out) {
    if (b.by === 'rout') routs[b.winner][b.rounds - 1]!++; else decisions[b.winner]++;
    if (b.rounds === RACE.rounds) round9++;
    changes += b.leadChanges;
  }
  const n = out.length;
  return {
    battles: n, medianRounds: median(out.map((b) => b.rounds)), round9: round9 / n, routs, decisions, leadChanges: changes / n,
    general: { rout: routs.general.reduce((a, x) => a + x, 0) / n, decision: decisions.general / n },
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

const pct = (x: number): string => `${Math.round(100 * x)}%`;

/** The section's lines: the header, the rule sets, then per group a row pair per rule set, a column per battle. */
function raceLines(groups: readonly RaceGroup[]): string[] {
  const lines = [
    "race model (X5; §6.4, §6.5, §6.7, plan call 17): each case's clashes chained into battles of up to 9 rounds, round r of battle i reading the clash at the measured budget nearest below 300 + 75 × (i − 1) + 150 × (r − 1) gold, at most 1,500. Crude and not a guardrail: it leaves out income, comeback gold and counters, and one seed's armies at each budget stand in for a colony growing within a battle",
    '  rules: first guess = a flat 500 cap, Heartcaps 3000 against 2000 + 250 × (i − 1) (a Fortified elite at index 3 +30%, the boss 3600), a Decision by damage dealt; cap 25% = a cap of 25% of the loser\'s max HP; storm cap = the cap × the storm; equal = the player\'s Heartcap 2000 + 250 × (i − 1); share Decision = by the share of max HP lost; X5 lean = cap 25% and share Decision',
    '  each cell: the median rounds and the share reaching round 9; then the general\'s wins by Rout / by Decision and the lead changes a battle. G4\'s band: median 6–8, ≤ 15% reach round 9, the bot wins 30–70%',
  ];
  const label: Record<RaceGroupId, (g: RaceGroup) => string> = {
    g4: (g) => `G4 case: ${G4_PLAYER} (the player) against ${G4_GENERAL} on ${g.field}, ${g.cases} cases (seeds × seats)`,
    mirror: (g) => `mirror: ${G4_PLAYER} against itself on fresh seeds (its second army on seed 1,000 + s) on ${g.field}, the player seat's army the player, ${g.cases} cases`,
    g3: (g) => `G3 cases: each mono against ${G4_PLAYER} on ${g.field}, the player seat's army the player (lopsided), ${g.cases} cases`,
  };
  const w = 14, rw = Math.max(...RACE_RULES.map((r) => r.id.length)) + 2;
  for (const g of groups) {
    lines.push(label[g.id](g));
    lines.push(`  ${'rules'.padEnd(rw)}${BATTLES.map((b) => (b.kind.length > 1 ? b.kind : `battle ${b.kind}`).padStart(w)).join('')}`);
    for (const r of g.reads) {
      const cells = BATTLES.map((b) => r.battles[b.kind]);
      lines.push(`  ${r.rules.padEnd(rw)}${cells.map((x) => `${x.medianRounds} ${pct(x.round9)}`.padStart(w)).join('')}`);
      lines.push(`  ${''.padEnd(rw)}${cells.map((x) => `${pct(x.general.rout)}/${pct(x.general.decision)} ${x.leadChanges.toFixed(1)}`.padStart(w)).join('')}`);
    }
  }
  return lines;
}
