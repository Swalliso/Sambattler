// How runs end (`npm run experiment -- --checks runs`): runs per commander and power policy, when asked, with
// where they end, the maps and battles lost, and the boss reached. Runs play in rounds (R2b).
import type { Content } from '../../src/data/registry.ts';
import type { PowerPolicy } from '../../src/sim/index.ts';
import { simulateRun } from '../../src/run/index.ts';
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
  let boss = 0, wins = 0, full = 0, minutes = 0, commander = opts.commander ?? '';
  for (let seed = 1; seed <= runs; seed++) {
    const r = simulateRun(content, seed, { player, draft: 'greedy', route: 'random', power }, opts.commander ? { commander: opts.commander } : {});
    commander = r.run.commander;
    const mins = r.totalBattleTicks / content.balance.tickRate / 60;
    minutes += mins;
    if (r.reachedBoss) { boss++; atBoss.push(mins); }
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
    `    battles lost by place in the run: ${Object.keys(r.playedAt).map((i) => `${i}: ${r.lostAt[Number(i)] ?? 0}/${r.playedAt[Number(i)]}`).join(', ')}; cards drafted per battle ${r.cardsPerBattle.toFixed(2)}`,
    `    battle minutes: mean ${r.meanBattleMinutes.toFixed(1)} per run, median ${Number.isFinite(r.medianBattleMinutesAtBoss) ? r.medianBattleMinutesAtBoss.toFixed(1) : '—'} when the boss is reached; battles lost by map: ${lost}`,
  ];
}
