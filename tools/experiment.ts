// npm run experiment -- --proto <spec> [--label name] [--checks duels,g3,g3gill,g4,g5,g6,g7,g8,g11,boss] [--defender bot:<id>]
// Measures a balance-backlog prototype (src/data/proto.ts) against the guardrails and the archer
// checks in docs/balance-backlog.md: G1–G8 and G11, G3 mono Gill Nest per seat, the Sporeling →
// Gill Archer → Capguard → Sporeling edges at 12, 30 and 60 supply and under sustained production,
// and boss reach over 80 runs. Without --proto it measures the shipped rules. Opt-in checks:
// `engagement` (pacing numbers from docs/engagement-review.md, `--seeds n`), `runs` (how runs
// end), `lanes` (per-lane traces) and `spread` (placement spread). Writes
// reports/experiments/<label>.json and prints a summary.
//
// G3 options (g3, g3gill and lanes): `--maps a,b` plays every listed map (G3 itself is Bogwater
// Hollow; `testOnly` maps like test-3lane are reported as leads), `--g3seeds n` sets seeds per seat
// (default G3's 20, about ±8 points; 50 gives about ±5), `--mono a,b` picks the mono bots.
// `lanes` traces mono bots (default Gill Nest) against the defender on `--maps`, `--seeds n` per
// seat (default 10), `--traces` keeps every battle's trace in the report (tools/lib/lanes.ts).
// `g4` also plays every map in `--maps` (the guardrail itself is Bogwater Hollow).
//
// Run options (runs and engagement): `--commander <id|all>` plays a commander (runs default to
// Vesper; single battles to none) and `--power-policy none|auto` sets how the bot uses its power
// (default none, as before M5). `--runs n` sets runs per commander (default 80).
//
// Placement spread (spread, tools/lib/spread.ts): `bot:balanced` against `--spread-enemy` (default
// general:scripted) on `--maps`, paused at `--spread-at 60,180` seconds on `--seeds n` board seeds
// (default 3). Each of `--spread-buildings` (default Gill Nest, Sporeling Burrow, Capguard Hall,
// Truffle Cellar, Puffball Mortar) goes on every legal plot, played on for `--spread-horizon`
// seconds (default 90) over `--futures n` reseeded futures (default 8). `--relics a,b` gives the
// player relics from the start (e.g. mycorrhizalLink); `--plots` keeps every plot's scores.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { protoContent, ROOT } from './lib/content.ts';
import {
  evaluateG1, evaluateG2, evaluateG4, evaluateG5, evaluateG6, evaluateG7, evaluateG8, rosterIds, supplyDuel,
} from './lib/balance.ts';
import type { Verdict } from './lib/balance.ts';
import { runBench } from './lib/bench.ts';
import { engagement, engagementLines, runEndingLines, runEndings } from './lib/engagement.ts';
import { laneLines, laneSummary } from './lib/lanes.ts';
import { spreadCase, spreadLines, spreadSummary } from './lib/spread.ts';
import type { SpreadOptions } from './lib/spread.ts';
import { fmtTicks, median, runBattle } from './lib/run.ts';
import { simulateRun } from '../src/run/index.ts';
import type { PowerPolicy } from '../src/sim/index.ts';

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const proto = opt('--proto') ?? '';
const label = opt('--label') ?? (proto || 'baseline').replace(/[^a-zA-Z0-9.=-]+/g, '_');
/** G3's opponent: `bot:balanced` (the guardrail), or a one-off diagnostic bot added with `--proto bot.<id>:{…}`. */
const defender = opt('--defender') ?? 'bot:balanced';
const ALL = ['duels', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g11', 'boss'];
const checks = new Set((opt('--checks') ?? ALL.join(',')).split(','));
/** Maps for the g3, g3gill and lanes checks (G3 itself is Bogwater Hollow). */
const maps = (opt('--maps') ?? 'bogwater-hollow').split(',');
/** Seeds per seat for g3 and g3gill (default G3's own). */
const g3SeedsOpt = Number(opt('--g3seeds') ?? 0);
/** Mono bots for g3, g3gill and lanes, in place of the check's default list. */
const monoIds = opt('--mono')?.split(',');
const content = protoContent(proto);
const g3Seeds = g3SeedsOpt || content.targets.G3.seeds;
/** Test maps (`testOnly`) are reported as leads; their G3 rows don't fail the check. */
const isTestMap = (map: string): boolean => !!content.maps[map]?.testOnly;
/** Commanders for the runs and engagement checks: one id, `all`, or none (the run default, Vesper; no commander in single battles). */
const commanderOpt = opt('--commander');
const commanders: (string | undefined)[] = commanderOpt === 'all' ? Object.keys(content.commanders) : [commanderOpt];
/** How the bot uses the commander power in runs and engagement battles (default none, as before M5). */
const power = (opt('--power-policy') ?? 'none') as PowerPolicy;
if (power !== 'none' && power !== 'auto') throw new Error(`--power-policy must be none or auto, not ${String(power)}`);
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
  const ids = monoIds ?? (checks.has('g3') ? rosterIds(content) : ['gillNest', 'sporelingBurrow', 'capguardHall']);
  const rows: Record<string, unknown>[] = [];
  let pass = true;
  for (const map of maps) {
    if (maps.length > 1) lines.push(`G3 on ${map}${isTestMap(map) ? ' (test map: a lead, not a verdict)' : ''}, ${g3Seeds} seeds per seat`);
    for (const id of ids) {
      const seat = { player: 0, enemy: 0 };
      const lengths: number[] = [];
      let decisions = 0, monoSpawned = 0, monoLost = 0, sporeDmg = 0, turretDmg = 0, balDmg = 0;
      const defDamage: Record<string, number> = {};
      for (let seed = 1; seed <= g3Seeds; seed++) {
        for (const side of ['player', 'enemy'] as const) {
          const { result } = runBattle(content, {
            seed, map, player: side === 'player' ? `bot:mono:${id}` : defender, enemy: side === 'player' ? defender : `bot:mono:${id}`,
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
          for (const [src, n] of Object.entries(bySrc)) defDamage[src] = (defDamage[src] ?? 0) + n;
          balDmg += result.stats[bal].damageDealt;
        }
      }
      const others = Object.entries(defDamage).filter(([src]) => src !== 'sporeling' && src !== 'turret').sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([src, n]) => `${src} ${pct(n / Math.max(1, balDmg))}`).join(', ');
      const diag = `mono units lost ${monoLost}/${monoSpawned} (${pct(monoLost / Math.max(1, monoSpawned))}); balanced damage: Sporelings ${pct(sporeDmg / Math.max(1, balDmg))}, turrets ${pct(turretDmg / Math.max(1, balDmg))}${others ? `; then ${others}` : ''}`;
      const rate = (seat.player + seat.enemy) / (2 * g3Seeds);
      if (rate > t.maxMonoWinRate && !isTestMap(map)) pass = false;
      rows.push({
        map, id, rate, player: seat.player / g3Seeds, enemy: seat.enemy / g3Seeds, median: median(lengths), decisions: decisions / (2 * g3Seeds),
        monoLost, monoSpawned, sporeDmg, turretDmg, balDmg, defDamage,
      });
      lines.push(`${rate > t.maxMonoWinRate ? 'FAIL' : 'ok  '} G3 mono:${id}: ${pct(rate)} (as player ${pct(seat.player / g3Seeds)}, as enemy ${pct(seat.enemy / g3Seeds)}), median ${fmtTicks(median(lengths))}, decisions ${pct(decisions / (2 * g3Seeds))}${id === 'gillNest' ? `\n    ${diag}` : ''}`);
    }
  }
  if (maps.length > 1) {
    // mono win rate per map, one row per mono bot
    lines.push(`G3 by map (mono win %, ${2 * g3Seeds} games each): ${maps.join(' | ')}`);
    for (const id of ids) {
      const cells = maps.map((m) => rows.find((r) => r.map === m && r.id === id)).map((r) => `${Math.round(100 * (r!.rate as number))}`.padStart(3));
      lines.push(`    ${id.padEnd(18)} ${cells.join(' | ')}`);
    }
  }
  out.G3 = { pass, seeds: g3Seeds, maps, rows };
}

if (checks.has('lanes')) {
  // per-lane traces of mono bots against the defender (step A: why Twin Roots differs)
  const seeds = Number(opt('--seeds') ?? 10);
  const rows = [];
  for (const map of maps) {
    for (const id of monoIds ?? ['gillNest']) {
      const s = laneSummary(content, { map, mono: id, defender, seeds });
      lines.push(...laneLines(s));
      rows.push({ ...s, traces: args.includes('--traces') ? s.traces : undefined });
    }
  }
  out.lanes = rows;
}

if (checks.has('g4')) {
  const rows = maps.map((map) => {
    const v = evaluateG4(content, map);
    return { map, ...verdict(v), median: median(v.stats.lengths), decisions: v.stats.decisions / v.stats.games, win: v.stats.winsA / v.stats.games };
  });
  out.G4 = rows.length === 1 ? rows[0] : rows;
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

if (checks.has('engagement')) {
  // bot:balanced against the scripted general and each battle-1 general, as in docs/engagement-review.md
  const seeds = Array.from({ length: Number(opt('--seeds') ?? 30) }, (_, i) => i + 1);
  const rows = [];
  for (const commander of commanders) {
    for (const enemy of ['general:scripted', 'general:mother-mold', 'general:lichen-baron', 'general:blightwright']) {
      const r = engagement(content, { player: 'bot:balanced', enemy, seeds, ...(commander ? { commander, powerPolicy: power } : {}) });
      rows.push(r);
      lines.push(...engagementLines(r));
    }
  }
  out.engagement = rows;
}
if (checks.has('runs')) {
  const rows = commanders.map((commander) => runEndings(content, Number(opt('--runs') ?? 80), { power, ...(commander ? { commander } : {}) }));
  for (const r of rows) lines.push(...runEndingLines(r));
  out.runs = rows.length === 1 ? rows[0] : rows;
}

if (checks.has('spread')) {
  // placement spread (tools/lib/spread.ts): every legal plot for a building, from paused bot battles
  const num = (k: string, d: string) => (opt(k) ?? d).split(',').map(Number);
  const relics = opt('--relics')?.split(',');
  const rows = [];
  for (const map of maps) {
    const sp: SpreadOptions = {
      map, player: 'bot:balanced', enemy: opt('--spread-enemy') ?? 'general:scripted',
      seeds: Array.from({ length: Number(opt('--seeds') ?? 3) }, (_, i) => i + 1),
      atSeconds: num('--spread-at', '60,180'),
      buildings: (opt('--spread-buildings') ?? 'gillNest,sporelingBurrow,capguardHall,truffleCellar,puffballMortar').split(','),
      horizonSeconds: Number(opt('--spread-horizon') ?? 90),
      futures: Number(opt('--futures') ?? 8),
      ...(relics ? { relics } : {}),
    };
    lines.push(`spread on ${map}: ${sp.player} vs ${sp.enemy}, seeds ${sp.seeds.join(',')}, paused at ${sp.atSeconds.join(', ')} s, horizon ${sp.horizonSeconds} s, ${sp.futures} futures${relics ? `, relics ${relics.join(', ')}` : ''}`);
    const cases = [];
    for (const building of sp.buildings) {
      for (const at of sp.atSeconds) {
        for (const seed of sp.seeds) {
          const c = spreadCase(content, sp, seed, at, building, args.includes('--plots'));
          if (!c) { lines.push(`spread ${building} seed ${seed} at ${at} s: battle over or fewer than 2 plots`); continue; }
          cases.push(c);
          lines.push(...spreadLines(c));
        }
      }
      const s = spreadSummary(cases.filter((c) => c.building === building));
      lines.push(`  ${building}: median best − median ${s.medianSpread.toFixed(1)} supply (${Math.round(100 * s.medianSpreadVsValue)}% of the building's worth ${s.medianValue.toFixed(1)}), split-half ρ ${s.medianSplitHalf.toFixed(2)}, noise ±${s.medianNoise.toFixed(1)}`);
    }
    const all = spreadSummary(cases);
    lines.push(`spread on ${map}, all ${all.cases} cases: median best − median ${all.medianSpread.toFixed(1)} supply (${Math.round(100 * all.medianSpreadVsValue)}% of the building's worth ${all.medianValue.toFixed(1)}), split-half ρ ${all.medianSplitHalf.toFixed(2)}, noise ±${all.medianNoise.toFixed(1)}`);
    rows.push({ options: sp, summary: all, cases });
  }
  out.spread = rows;
}

const dir = join(ROOT, 'reports', 'experiments');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${label}.json`), JSON.stringify(out, null, 2));
console.log(lines.join('\n'));
console.log(`\nreport: reports/experiments/${label}.json`);
