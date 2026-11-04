// How runs end (`npm run experiment -- --checks runs`): runs per commander and power policy, when asked, with
// where they end, the maps and battles lost, the boss reached and the lives (R2b/T124). And engagement in round terms
// (`--checks engagement`): the clash's length, each round's Heartcap damage, comebacks, and how often the lead in the
// Heartcap race changes hands, over G4's battles. Runs play in rounds (R2b).
import type { Content } from '../../src/data/registry.ts';
import type { PowerPolicy, Side } from '../../src/sim/index.ts';
import { simulateRun } from '../../src/run/index.ts';
import type { RoundBattleRecord } from './balance.ts';
import { median } from './run.ts';

export interface RunEnding {
  runs: number;
  /** The run's commander (the run default when none was asked for) and how the bot used its power. */
  commander: string;
  power: PowerPolicy;
  reachedBoss: number;
  victories: number;
  /** Defeats by the battle they ended in (1-based). */
  endedInBattle: Record<number, number>;
  /** Runs won without losing a life (§8.5). */
  fullLivesVictories: number;
  /** Lives lost a run, and lives left when the boss battle began, over the runs that reached it (§8.5, A199). */
  meanLivesLost: number;
  meanLivesAtBoss: number;
  /** Battles played and lost, by map. */
  playedOnMap: Record<string, number>;
  lostOnMap: Record<string, number>;
  /** Battles played and lost, by the battle's place in the run (1-based), whether or not the loss ended the run. */
  playedAt: Record<number, number>;
  lostAt: Record<number, number>;
  /** Cards the player drafted, per battle played. */
  cardsPerBattle: number;
  /** Battle minutes per run: the mean over all runs, and the median over runs that reached the boss. */
  meanBattleMinutes: number;
  medianBattleMinutesAtBoss: number;
}

export interface RunEndingOptions {
  player?: string;
  /** A commander id; omitted plays the run default. */
  commander?: string;
  /** How the bot uses the commander power (default none, as before M5). */
  power?: PowerPolicy;
}

/** How runs end (`bot:balanced`, greedy drafts, random route), with an optional commander and power policy. */
export function runEndings(content: Content, runs: number, opts: RunEndingOptions = {}): RunEnding {
  const player = opts.player ?? 'bot:balanced';
  const power = opts.power ?? 'none';
  const ended: Record<number, number> = {}, playedOnMap: Record<string, number> = {}, lostOnMap: Record<string, number> = {};
  const playedAt: Record<number, number> = {}, lostAt: Record<number, number> = {};
  let battles = 0, cards = 0;
  const atBoss: number[] = [];
  let boss = 0, wins = 0, full = 0, minutes = 0, livesLost = 0, commander = opts.commander ?? '';
  const livesAtBoss: number[] = [];
  for (let seed = 1; seed <= runs; seed++) {
    const r = simulateRun(content, seed, { player, draft: 'greedy', route: 'random', power }, opts.commander ? { commander: opts.commander } : {});
    commander = r.run.commander;
    const mins = r.totalBattleTicks / content.balance.tickRate / 60;
    minutes += mins;
    if (r.reachedBoss) { boss++; atBoss.push(mins); livesAtBoss.push(r.lives.left + (r.battles.find((b) => b.kind === 'boss')?.lifeLost ? 1 : 0)); }
    livesLost += r.battles.filter((b) => b.lifeLost).length;
    if (r.outcome === 'victory') { wins++; if (r.lives.left === r.lives.max) full++; } else ended[r.battleCount] = (ended[r.battleCount] ?? 0) + 1;
    for (const b of r.battles) {
      playedOnMap[b.map] = (playedOnMap[b.map] ?? 0) + 1;
      playedAt[b.index] = (playedAt[b.index] ?? 0) + 1;
      if (b.winner !== 'player') {
        lostOnMap[b.map] = (lostOnMap[b.map] ?? 0) + 1;
        lostAt[b.index] = (lostAt[b.index] ?? 0) + 1;
      }
      battles++;
      cards += b.drafted.length;
    }
  }
  return {
    runs, commander, power, reachedBoss: boss, victories: wins, endedInBattle: ended, fullLivesVictories: full, playedOnMap, lostOnMap,
    meanLivesLost: livesLost / runs, meanLivesAtBoss: livesAtBoss.length ? livesAtBoss.reduce((a, b) => a + b, 0) / livesAtBoss.length : NaN,
    playedAt, lostAt, cardsPerBattle: cards / Math.max(1, battles),
    meanBattleMinutes: minutes / runs, medianBattleMinutesAtBoss: median(atBoss),
  };
}

export function runEndingLines(r: RunEnding): string[] {
  const pct = (x: number) => `${Math.round((100 * x) / Math.max(1, r.runs))}%`;
  const ended = Object.entries(r.endedInBattle).map(([b, n]) => `${n} in battle ${b}`).join(', ');
  const lost = Object.entries(r.playedOnMap).sort((a, b) => a[0].localeCompare(b[0])).map(([m, n]) => `${m} ${r.lostOnMap[m] ?? 0}/${n}`).join(', ');
  return [
    `runs (${r.commander}, power ${r.power}): ${r.reachedBoss}/${r.runs} reach the boss (${pct(r.reachedBoss)}), ${r.victories} win (${pct(r.victories)}; ${r.fullLivesVictories} with every Regrowth); boss fights won ${r.victories} of ${r.reachedBoss}`,
    `    defeats ended ${ended || 'nowhere'}; ended in battle 1: ${r.endedInBattle[1] ?? 0} (${pct(r.endedInBattle[1] ?? 0)})`,
    `    lives: ${r.meanLivesLost.toFixed(2)} lost a run; ${Number.isFinite(r.meanLivesAtBoss) ? r.meanLivesAtBoss.toFixed(2) : '–'} left when the boss battle began (§8.5, A199)`,
    `    battles lost by place in the run: ${Object.keys(r.playedAt).map((i) => `${i}: ${r.lostAt[Number(i)] ?? 0}/${r.playedAt[Number(i)]}`).join(', ')}; cards drafted per battle ${r.cardsPerBattle.toFixed(2)}`,
    `    battle minutes: mean ${r.meanBattleMinutes.toFixed(1)} per run, median ${Number.isFinite(r.medianBattleMinutesAtBoss) ? r.medianBattleMinutesAtBoss.toFixed(1) : '—'} when the boss is reached; battles lost by map: ${lost}`,
  ];
}

/** Engagement over battles of rounds (R2b/T124): how long clashes run, what a round deals, and how often the race turns. */
export interface Engagement {
  battles: number;
  /** The median clash, the muster counted, in seconds. */
  clashSeconds: number | null;
  /** Each side's Heartcap damage in a round that dealt any: the median and the 90th percentile; and the share of such rounds where both sides dealt some. */
  roundDamage: { median: number | null; p90: number | null; bothDealt: number };
  /** Battles the winner won from behind: it trailed the Heartcap race after some round (§6.5). */
  comebacks: number;
  decided: number;
  /** How often the lead changed hands, over every battle, and in how many battles it did. */
  leadChanges: number;
  changedBattles: number;
}

export function engagement(records: readonly RoundBattleRecord[], tickRate: number): Engagement {
  const sides: Side[] = ['player', 'enemy'];
  const rounds = records.flatMap((r) => r.roundDamage).filter((d) => d.player + d.enemy > 0);
  const dealt = rounds.flatMap((d) => sides.map((s) => d[s]).filter((x) => x > 0)).sort((a, b) => a - b);
  const decided = records.filter((r) => r.winner !== null);
  const changes = records.map((r) => {
    let n = 0, last: Side | null = null;
    for (const l of r.leads) { if (l && last && l !== last) n++; if (l) last = l; }
    return n;
  });
  return {
    battles: records.length,
    clashSeconds: records.length ? median(records.flatMap((r) => r.clashes.map((c) => c.ticks))) / tickRate : null,
    roundDamage: {
      median: dealt.length ? median(dealt) : null, p90: dealt.length ? dealt[Math.min(dealt.length - 1, Math.floor(0.9 * dealt.length))]! : null,
      bothDealt: rounds.filter((d) => d.player > 0 && d.enemy > 0).length / Math.max(1, rounds.length),
    },
    comebacks: decided.filter((r) => r.leads.some((l) => l !== null && l !== r.winner)).length, decided: decided.length,
    leadChanges: changes.reduce((a, b) => a + b, 0), changedBattles: changes.filter((n) => n > 0).length,
  };
}

export function engagementLines(e: Engagement): string[] {
  const pct = (n: number, d: number) => `${Math.round((100 * n) / Math.max(1, d))}%`;
  return [
    `engagement over ${e.battles} battles: median clash ${e.clashSeconds === null ? '–' : `${e.clashSeconds.toFixed(1)} s`} · a round's Heartcap damage, a side that dealt any: median ${e.roundDamage.median ?? '–'}, 90th percentile ${e.roundDamage.p90 ?? '–'}; both sides dealt some in ${pct(e.roundDamage.bothDealt, 1)} of damaging rounds`,
    `    comebacks: the winner trailed the race after some round in ${e.comebacks} of ${e.decided} decided battles (${pct(e.comebacks, e.decided)}) · the lead changed hands ${e.leadChanges} times, in ${pct(e.changedBattles, e.battles)} of battles`,
  ];
}
