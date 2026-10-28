// npm run experiment -- --proto <spec> [--label name] [--checks duels,g3,g3gill,g4,g5,g6,g7,g8,g11,boss] [--defender bot:<id>]
// Measures a balance-backlog prototype (src/data/proto.ts) against the guardrails and the archer
// checks in docs/balance-backlog.md: G1–G8 and G11, G3 mono Gill Nest per seat, the Sporeling →
// Gill Archer → Capguard → Sporeling edges at 12, 30 and 60 supply and under sustained production,
// and boss reach over 80 runs. Without --proto it measures the shipped rules. Writes
// reports/experiments/<label>.json and prints a summary.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { protoContent, ROOT } from './lib/content.ts';
import {
  evaluateG1, evaluateG2, evaluateG4, evaluateG5, evaluateG6, evaluateG7, evaluateG8, rosterIds, supplyDuel,
} from './lib/balance.ts';
import type { Verdict } from './lib/balance.ts';
import { runBench } from './lib/bench.ts';
import { fmtTicks, median, runBattle } from './lib/run.ts';
import { simulateRun } from '../src/run/index.ts';

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const proto = opt('--proto') ?? '';
const label = opt('--label') ?? (proto || 'baseline').replace(/[^a-zA-Z0-9.=-]+/g, '_');
/** G3's opponent: `bot:balanced` (the guardrail), or a one-off diagnostic bot added with `--proto bot.<id>:{…}`. */
const defender = opt('--defender') ?? 'bot:balanced';
const ALL = ['duels', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g11', 'boss'];
const checks = new Set((opt('--checks') ?? ALL.join(',')).split(','));
const content = protoContent(proto);
const out: Record<string, unknown> = { proto, label };
const lines: string[] = [`experiment ${label} (proto: ${proto || 'none'}${defender !== 'bot:balanced' ? `, G3 defender ${defender}` : ''})`];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const verdict = (v: Verdict) => {
  lines.push(`${v.pass ? 'PASS' : 'FAIL'} ${v.id}: ${v.summary}`, ...v.details.map((d) => `    ${d}`));
  return { pass: v.pass, details: v.details };
};

// The intended triangle (backlog B1): Sporeling > Gill Archer > Capguard > Sporeling.
const TRIANGLE: [string, string, string, string][] = [
  ['sporeling', 'gillArcher', 'sporelingBurrow', 'gillNest'],
  ['gillArcher', 'capguard', 'gillNest', 'capguardHall'],
  ['capguard', 'sporeling', 'capguardHall', 'sporelingBurrow'],
];

if (checks.has('duels')) {
  const g1 = evaluateG1(content);
  out.G1 = verdict(g1.verdict);
  const g2 = evaluateG2(content);
  out.G2 = verdict(g2.verdict);
  const tri: Record<string, unknown>[] = [];
  for (const [a, b, ba, bb] of TRIANGLE) {
    for (const supply of [12, 30, 60]) {
      let wins = 0, margin = 0, bLeft = 0, secs = 0;
      const n = 5;
      for (let seed = 1; seed <= n; seed++) {
        const o = supplyDuel(content, a, b, seed, supply);
        if (o.winner === 'a') wins++;
        margin += (o.valueA - o.valueB) / n;
        bLeft += o.valueB / n;
        secs += o.seconds / n;
      }
      tri.push({ a, b, supply, wins, n, margin, bLeft, secs });
      lines.push(`edge ${a} > ${b} @${supply}: ${wins}/${n}, margin ${margin >= 0 ? '+' : ''}${margin.toFixed(1)} supply, ${b} left ${bLeft.toFixed(1)}/${supply}, ${secs.toFixed(0)} s`);
    }
    // sustained reinforcement: the G1 production duels for this pairing, both orientations
    const games = g1.outcomes.filter((o) => (o.a === ba && o.b === bb) || (o.a === bb && o.b === ba));
    const wins = games.filter((o) => (o.a === ba ? o.valueA > o.valueB : o.valueB > o.valueA)).length;
    const ratio = games.reduce((s, o) => s + (o.a === ba ? (o.valueA + 1) / (o.valueB + 1) : (o.valueB + 1) / (o.valueA + 1)), 0) / games.length;
    tri.push({ a: ba, b: bb, production: true, wins, n: games.length, ratio });
    lines.push(`edge ${ba} > ${bb} (production, 3 min): ${wins}/${games.length}, value ratio ${ratio.toFixed(2)}`);
  }
  out.triangle = tri;
}

if (checks.has('g3') || checks.has('g3gill')) {
  const t = content.targets.G3;
  const ids = checks.has('g3') ? rosterIds(content) : ['gillNest', 'sporelingBurrow', 'capguardHall'];
  const rows: Record<string, unknown>[] = [];
  let pass = true;
  for (const id of ids) {
    const seat = { player: 0, enemy: 0 };
    const lengths: number[] = [];
    let decisions = 0, monoSpawned = 0, monoLost = 0, sporeDmg = 0, turretDmg = 0, balDmg = 0;
    for (let seed = 1; seed <= t.seeds; seed++) {
      for (const side of ['player', 'enemy'] as const) {
        const { result } = runBattle(content, {
          seed, player: side === 'player' ? `bot:mono:${id}` : defender, enemy: side === 'player' ? defender : `bot:mono:${id}`,
        });
        if (result.winner === side) seat[side]++;
        if (result.by === 'decision') decisions++;
        lengths.push(result.durationTicks);
        const bal = side === 'player' ? 'enemy' : 'player';
        monoSpawned += Object.values(result.stats[side].spawned).reduce((a, b) => a + b, 0);
        monoLost += result.stats[side].unitsLost;
        const bySrc = result.stats[bal].damageBySource;
        sporeDmg += bySrc.sporeling ?? 0;
        turretDmg += bySrc.turret ?? 0;
        balDmg += result.stats[bal].damageDealt;
      }
    }
    const diag = `mono units lost ${monoLost}/${monoSpawned} (${pct(monoLost / Math.max(1, monoSpawned))}); balanced damage: Sporelings ${pct(sporeDmg / Math.max(1, balDmg))}, turrets ${pct(turretDmg / Math.max(1, balDmg))}`;
    const rate = (seat.player + seat.enemy) / (2 * t.seeds);
    if (rate > t.maxMonoWinRate) pass = false;
    rows.push({
      id, rate, player: seat.player / t.seeds, enemy: seat.enemy / t.seeds, median: median(lengths), decisions: decisions / (2 * t.seeds),
      monoLost, monoSpawned, sporeDmg, turretDmg, balDmg,
    });
    lines.push(`${rate > t.maxMonoWinRate ? 'FAIL' : 'ok  '} G3 mono:${id}: ${pct(rate)} (as player ${pct(seat.player / t.seeds)}, as enemy ${pct(seat.enemy / t.seeds)}), median ${fmtTicks(median(lengths))}, decisions ${pct(decisions / (2 * t.seeds))}${id === 'gillNest' ? `\n    ${diag}` : ''}`);
  }
  out.G3 = { pass, rows };
}

if (checks.has('g4')) {
  const v = evaluateG4(content);
  out.G4 = { ...verdict(v), median: median(v.stats.lengths), decisions: v.stats.decisions / v.stats.games, win: v.stats.winsA / v.stats.games };
}
if (checks.has('g5')) out.G5 = verdict(evaluateG5(content));
if (checks.has('g6')) out.G6 = verdict(evaluateG6(content));
if (checks.has('g7')) out.G7 = verdict(evaluateG7(content));
if (checks.has('g8')) {
  const v = evaluateG8(content);
  out.G8 = { ...verdict(v), rows: v.rows };
}
if (checks.has('g11')) {
  const g = content.targets.G11;
  const r = runBench(content, g.benchTicks);
  const pass = r.meanMs <= g.tickMeanMs && r.p99Ms <= g.tickP99Ms && r.battleWallMs <= g.battleWallMs;
  out.G11 = { pass, ...r };
  lines.push(`${pass ? 'PASS' : 'FAIL'} G11: mean ${r.meanMs.toFixed(3)} ms, p99 ${r.p99Ms.toFixed(3)} ms, battle ${r.battleWallMs} ms`);
}
if (checks.has('boss')) {
  const n = Number(opt('--runs') ?? 80);
  let boss = 0, wins = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = simulateRun(content, seed, { player: 'bot:balanced', draft: 'greedy', route: 'random' });
    if (r.reachedBoss) boss++;
    if (r.outcome === 'victory') wins++;
  }
  out.boss = { runs: n, reached: boss / n, victories: wins / n };
  lines.push(`runs reaching the boss: ${boss}/${n} (${pct(boss / n)}), victories ${wins}/${n}`);
}

const dir = join(ROOT, 'reports', 'experiments');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${label}.json`), JSON.stringify(out, null, 2));
console.log(lines.join('\n'));
console.log(`\nreport: reports/experiments/${label}.json`);
