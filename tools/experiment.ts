// npm run experiment -- --proto <spec> [--label name] [--checks duels,g3,g3gill,g4,g5,g6,g7,g8,g11,boss] [--defender bot:<id>]
// Measures a balance-backlog prototype (src/data/proto.ts) against the guardrails and the archer
// checks in docs/archive/v1/balance-backlog.md: G1–G8 and G11, G3 mono Gill Nest per seat, the Sporeling →
// Gill Archer → Capguard → Sporeling edges at 12, 30 and 60 supply and under sustained production,
// and boss reach over 80 runs. Without --proto it measures the shipped rules. Opt-in checks:
// `engagement` (pacing numbers from docs/archive/v1/engagement-review.md, `--seeds n`), `runs` (how runs
// end), `lanes` (per-lane traces), `spread` (placement spread) and `counters` (the counter matrix). Writes
// reports/experiments/<label>.json and prints a summary.
//
// G3 options (g3, g3gill and lanes): `--maps a,b` plays every listed map (G3 itself plays the run's
// map pool, the default for g3 and g3gill; maps outside the pool, like test-3lane, are reported as
// leads), `--g3seeds n` sets seeds per seat (default G3's 50, about ±5 points; 20 gives about ±8 for
// a quicker read), `--mono a,b` picks the mono bots. g3 and g3gill share G3's loop (tools/lib/balance.ts)
// and play its cells on `--workers n` threads, as the counter matrix does (the same results).
// `lanes` traces mono bots (default Gill Nest) against the defender on `--maps`, `--seeds n` per
// seat (default 10), `--traces` keeps every battle's trace in the report (tools/lib/lanes.ts).
// `g4` also plays every map in `--maps` (the guardrail itself is Bogwater Hollow), and `--g4seeds n`
// plays n games in place of its 40 (about ±6 points on the Decision share; 200 gives about ±3).
//
// Run options (runs and engagement): `--commander <id|all>` plays a commander (runs default to
// Vesper; single battles to none) and `--power-policy none|auto` sets how the bot uses its power
// (default none, as before M5). `--runs n` sets runs per commander (default 80).
//
// Counter matrix (counters, tools/lib/balance.ts, opt-in): every mono build with a G3 mean above 40%
// (or `--mono`) against each answer: every other mono bot, every even pair of army buildings,
// `bot:balanced`, hand-written counter bots and the other data bots (or `--answers a,b`). It plays G3
// itself unless `g3` ran on the whole roster too. A screen at `--screen-seeds n` per seat (default 10)
// picks each build's `--top n` answers (default 3), which `--confirm-seeds n` more (default 50) then
// measure, on `--maps` (default the run pool). `--workers n` plays the cells in worker threads
// (default half the machine's threads; 1 plays them in process, with the same results).
//
// Placement spread (spread, tools/lib/spread.ts): `bot:balanced` against `--spread-enemy` (default
// general:scripted) on `--maps`, paused at `--spread-at 60,180` seconds on `--seeds n` board seeds
// (default 3). Each of `--spread-buildings` (default Gill Nest, Sporeling Burrow, Capguard Hall,
// Truffle Cellar, Puffball Mortar) goes on every legal plot, played on for `--spread-horizon`
// seconds (default 90) over `--futures n` reseeded futures (default 8). `--relics a,b` gives the
// player relics from the start (e.g. mycorrhizalLink); `--plots` keeps every plot's scores.
//
// The clash check (clash, SPEC §12.2 and §16 R1, tools/lib/clash.ts and the clash bars in
// tools/lib/balance.ts, opt-in): R1's whole armies at equal gold, meeting at once in formation on v1's
// sim with v2's targeting and movement switched on. A clash's winner is R1-Q3's: more lanes won, then
// more uncapped Heartcap damage, else a draw worth half a win. Every army is built here and each distinct
// clash is played once, on `--workers n` threads (default half the machine's; 1 plays them in process,
// with the same results). The check plays, at each of `--budgets` (default 300,600,900,1200,1500) on each
// of `--fields` (default one,twin; `three` is the three-lane screen, a lead outside the means):
// - clash G3: every mono army against bot:balanced's, both seats, `--g3seeds n` a seat (default G3's 50).
//   The mean counts the one-lane field twice;
// - G12, the strict counter matrix: the monos with a clash G3 mean above 40% (every mono G3 played with
//   `--matrix all`, or the `--mono a,b` builds whatever their mean; G3 still plays every mono, so every
//   mono answer is tested) against every answer the counter check tries but the economy and utility monos
//   (or `--answers a,b`). A screen on `--screen-seeds n` a seat (default 20) ranks them by the worst field,
//   and the best `--top n` answers that count (default 3) are confirmed on `--confirm-seeds n` more
//   (default 50). A mono answer that fails clash G3 doesn't count;
// - the clash matrix (#14, #15): each build's best 3 answers per budget, beside §7.4's counter sets, and
//   how many of the answers that count tied for the best against mono Gill Nest field only swarm spawners;
// - G13: the share of every clash that reached the 45 s cap, both cap readings, and the median length,
//   over the counted fields (the three-lane screen is reported beside it).
// `--jitter j` moves each unit up to ±j tiles per axis after the muster (default 0, no jitter; numbers
// are quoted at 0.2). It prints the bars per budget beside the pooled result, then the clashes played and
// the wall time. The report, labelled `clash` (or `clash-<proto>`), holds the options, each mono's and
// bot:balanced's armies, the bars, the matrix and a `timing` block; `--records` adds every clash's
// record. `--proto` refuses `rework`: it's v1's P3 package, not R1's variant.
//
// `--checks clash --pair a,b` plays one matchup instead (any bot the counter check knows, or a general):
// both armies at each budget on each field for seeds 1 to `--seeds n` (default 3), with `a` in each
// seat. A mirror (a = b) builds its second army on seed 1,000 + s. It prints one line per clash in the
// cap reading (the muster counted): each lane's winner, how it ended, the surviving supply a–b and when;
// each Heartcap's damage, capped and uncapped; the length, and the reading with the cap after the muster
// when it was capped; the clash winner and §6.7's round result; and the merges at the muster (to Bloomed
// + to Elder). Then a's score per field and budget, draws worth half. Every record goes in the report,
// whose label defaults to `clash-pair-<a>-<b>`, with `-<proto>` when `--proto` is set.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { protoContent, ROOT } from './lib/content.ts';
import {
  CLASH_CHECK, clashCache, clashG13, counterBotSpec, evaluateClashCounters, evaluateClashG3, evaluateCounters, evaluateG1, evaluateG2, evaluateG3, evaluateG4,
  evaluateG5, evaluateG6, evaluateG7, evaluateG8, g3Setup, g3Verdict, inProcessRows, rosterIds, supplyDuel, uniqueCells,
} from './lib/balance.ts';
import type { G3Verdict, Verdict } from './lib/balance.ts';
import { runBench } from './lib/bench.ts';
import { pairLine, pairScore, playPair } from './lib/clash.ts';
import type { FieldId } from './lib/clash.ts';
import { clashPool, defaultWorkers, inProcessClashes, rowPool } from './lib/pool.ts';
import { engagement, engagementLines, runEndingLines, runEndings } from './lib/engagement.ts';
import { laneLines, laneSummary } from './lib/lanes.ts';
import { spreadCase, spreadLines, spreadSummary } from './lib/spread.ts';
import type { SpreadOptions } from './lib/spread.ts';
import { fmtTicks, median } from './lib/run.ts';
import { specPresets } from '../src/data/proto.ts';
import { mapPool, simulateRun } from '../src/run/index.ts';
import type { PowerPolicy } from '../src/sim/index.ts';

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const proto = opt('--proto') ?? '';
const ALL = ['duels', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g11', 'boss'];
const checks = new Set((opt('--checks') ?? ALL.join(',')).split(','));
/** The clash check's one matchup (`--pair a,b`). */
const pair = opt('--pair')?.split(',');
const defaultLabel = checks.has('clash') ? `clash${pair ? `-pair-${pair.join('-')}` : ''}${proto ? `-${proto}` : ''}` : proto || 'baseline';
const label = opt('--label') ?? defaultLabel.replace(/[^a-zA-Z0-9.=-]+/g, '_');
/** G3's opponent: `bot:balanced` (the guardrail), or a one-off diagnostic bot added with `--proto bot.<id>:{…}`. */
const defender = opt('--defender') ?? 'bot:balanced';
const mapsOpt = opt('--maps')?.split(',');
/** Maps for the lanes, spread and g4 checks (default Bogwater Hollow). */
const maps = mapsOpt ?? ['bogwater-hollow'];
/** Seeds per seat for g3 and g3gill (default G3's own). */
const g3SeedsOpt = Number(opt('--g3seeds') ?? 0);
/** Mono bots for g3, g3gill and lanes, in place of the check's default list. */
const monoIds = opt('--mono')?.split(',');
const content = protoContent(proto);
const g3Seeds = g3SeedsOpt || content.targets.G3.seeds;
/** G4's games (default the target's). */
const g4Seeds = Number(opt('--g4seeds') ?? 0) || content.targets.G4.seeds;
/** Threads for G3's cells and the counter matrix (1 plays them in process). */
const workers = Number(opt('--workers') ?? defaultWorkers());
/** Maps for g3 and g3gill: G3's own, the run pool, unless `--maps` lists others (maps outside the pool are leads). */
const g3Maps = mapsOpt ?? mapPool(content);
/** Commanders for the runs and engagement checks: one id, `all`, or none (the run default, Vesper; no commander in single battles). */
const commanderOpt = opt('--commander');
const commanders: (string | undefined)[] = commanderOpt === 'all' ? Object.keys(content.commanders) : [commanderOpt];
/** How the bot uses the commander power in runs and engagement battles (default none, as before M5). */
const power = (opt('--power-policy') ?? 'none') as PowerPolicy;
if (power !== 'none' && power !== 'auto') throw new Error(`--power-policy must be none or auto, not ${String(power)}`);
if (checks.has('clash')) {
  // the clash check refuses a bad spec or number before any check runs, so it throws away no other check's work (T055)
  if (specPresets(proto).includes('rework')) throw new Error("rework is v1's P3 package, not R1's variant (SPEC §16 R1)");
  for (const k of ['--top', '--screen-seeds', '--g3seeds', '--confirm-seeds', ...(pair ? ['--seeds'] : [])]) {
    const v = opt(k);
    if (v !== undefined && !(Number.isInteger(Number(v)) && Number(v) >= 1)) throw new Error(`${k} must be a whole number of at least 1, not ${v}`);
  }
  const j = opt('--jitter');
  if (j !== undefined && !(Number(j) >= 0)) throw new Error(`--jitter must be at least 0, not ${j}`);
}
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

/** G3 on the whole roster against `bot:balanced`, kept for the counters check. */
let fullG3: G3Verdict | undefined;
if (checks.has('g3') || checks.has('g3gill')) {
  const ids = monoIds ?? (checks.has('g3') ? rosterIds(content) : ['gillNest', 'sporelingBurrow', 'capguardHall']);
  const g3Opts = { maps: g3Maps, ids, seeds: g3Seeds, defender };
  let g3: G3Verdict;
  if (workers > 1) {
    const s = g3Setup(content, g3Opts);
    const pool = rowPool(proto, workers);
    try {
      g3 = g3Verdict(content, await pool.run(s.maps.flatMap((map) => s.ids.map((id) => ({ map, id, seeds: s.seeds, defender: s.defender })))), s);
    } finally {
      await pool.close();
    }
  } else g3 = evaluateG3(content, g3Opts);
  if (checks.has('g3') && !monoIds && defender === 'bot:balanced') fullG3 = g3;
  // per map and mono bot: both seats, length, Decisions, and for Gill Nest what the defender does to it
  for (const r of g3.rows) {
    const others = Object.entries(r.defDamage).filter(([src]) => src !== 'sporeling' && src !== 'turret').sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([src, n]) => `${src} ${pct(n / Math.max(1, r.defDamageTotal))}`).join(', ');
    const diag = `mono units lost ${r.monoLost}/${r.monoSpawned} (${pct(r.monoLost / Math.max(1, r.monoSpawned))}); defender damage: Sporelings ${pct((r.defDamage.sporeling ?? 0) / Math.max(1, r.defDamageTotal))}, turrets ${pct((r.defDamage.turret ?? 0) / Math.max(1, r.defDamageTotal))}${others ? `; then ${others}` : ''}`;
    lines.push(`G3 ${r.map} mono:${r.id}: ${pct(r.rate)} (as player ${pct(r.player)}, as enemy ${pct(r.enemy)}), median ${fmtTicks(r.median)}, decisions ${pct(r.decisions)}${r.id === 'gillNest' ? `\n    ${diag}` : ''}`);
  }
  out.G3 = { ...verdict(g3), seeds: g3.seeds, maps: g3.maps, bots: g3.bots, rows: g3.rows };
}

if (checks.has('counters')) {
  // the counter matrix (combat rework P0): the answer bots join the content through a proto spec
  const spec = [proto, counterBotSpec(content)].filter(Boolean).join(',');
  const cc = protoContent(spec);
  const num = (k: string) => (opt(k) ? Number(opt(k)) : undefined);
  const pool = workers > 1 ? rowPool(spec, workers) : undefined;
  try {
    const t0 = Date.now();
    const r = await evaluateCounters(cc, {
      maps: g3Maps, g3Seeds, rows: pool?.run ?? inProcessRows(cc),
      ...(fullG3 ? { g3: fullG3 } : {}), ...(monoIds ? { builds: monoIds } : {}),
      ...(opt('--answers') ? { answers: opt('--answers')!.split(',') } : {}),
      ...(num('--screen-seeds') ? { screenSeeds: num('--screen-seeds')! } : {}),
      ...(num('--confirm-seeds') ? { confirmSeeds: num('--confirm-seeds')! } : {}),
      ...(num('--top') ? { top: num('--top')! } : {}),
    });
    if (!fullG3) out.G3 = { ...verdict(r.g3), seeds: r.g3.seeds, maps: r.g3.maps, bots: r.g3.bots, rows: r.g3.rows };
    out.counters = {
      ...verdict(r), maps: r.maps, screenSeeds: r.screenSeeds, confirmSeeds: r.confirmSeeds, builds: r.builds, answers: r.answers,
      bots: Object.fromEntries([...new Set(Object.values(r.answers).flat())].map((a) => [a, cc.bots[a.slice(4)]?.description ?? ''])),
    };
    lines.push(`counters: ${((Date.now() - t0) / 1000).toFixed(0)} s on ${workers} worker${workers > 1 ? 's' : ''}`);
  } finally {
    await pool?.close();
  }
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
    const v = evaluateG4(content, map, g4Seeds);
    return { map, ...verdict(v), games: v.stats.games, median: median(v.stats.lengths), decisions: v.stats.decisions / v.stats.games, win: v.stats.winsA / v.stats.games };
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
  // bot:balanced against the scripted general and each battle-1 general, as in docs/archive/v1/engagement-review.md
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

if (checks.has('clash')) {
  // R1's clash check (SPEC §12.2, §16 R1): the bars on clashes, or one matchup with --pair
  const budgets = (opt('--budgets')?.split(',') ?? CLASH_CHECK.budgets).map(Number);
  if (budgets.some((n) => !Number.isFinite(n) || n <= 0)) throw new Error(`--budgets must be gold amounts, not ${opt('--budgets')}`);
  const fields = (opt('--fields')?.split(',') ?? CLASH_CHECK.fields) as FieldId[];
  for (const f of fields) if (!['one', 'twin', 'three'].includes(f)) throw new Error(`--fields takes one, twin and three, not ${f}`);
  const jitter = Number(opt('--jitter') ?? 0);
  // the counter check's pair and counter bots join the content, so any answer it knows can play
  const spec = [proto, counterBotSpec(content)].filter(Boolean).join(',');
  const cc = protoContent(spec);
  if (pair) {
    if (pair.length !== 2 || !pair[0] || !pair[1]) throw new Error('--pair takes two controllers, a,b');
    const [a, b] = pair as [string, string];
    const seeds = Number(opt('--seeds') ?? 3);
    const t0 = Date.now();
    const records = playPair(cc, { a, b, budgets, fields, seeds, jitter });
    const ms = Date.now() - t0;
    lines.push(`clash: a = ${a}, b = ${b}; ${seeds} seed${seeds > 1 ? 's' : ''} a seat, jitter ${jitter ? `±${jitter}` : 'off'}; the cap reading (the muster counted)`);
    lines.push(...records.map(pairLine));
    const summary = [];
    for (const field of fields) {
      for (const budget of budgets) {
        const s = pairScore(records.filter((r) => r.field === field && r.budget === budget));
        summary.push({ field, budget, ...s });
        lines.push(`clash ${field} ${budget}: a won ${s.wins}, drew ${s.draws}, lost ${s.losses} (a's score ${pct(s.score)}); capped ${s.capped}`);
      }
    }
    lines.push(`clash: ${records.length} clashes in ${(ms / 1000).toFixed(1)} s`);
    out.clash = { pair: { a, b }, options: { budgets, fields, seeds, jitter }, summary, timing: { ms, clashes: records.length }, records };
  } else {
    const num = (k: string) => (opt(k) ? Number(opt(k)) : undefined);
    const matrix = opt('--matrix');
    if (matrix !== undefined && matrix !== 'all') throw new Error(`--matrix takes all, not ${matrix}`);
    const answers = opt('--answers')?.split(',');
    const options = {
      budgets, fields, jitter, g3Seeds,
      screenSeeds: num('--screen-seeds') ?? CLASH_CHECK.screenSeeds, confirmSeeds: num('--confirm-seeds') ?? CLASH_CHECK.confirmSeeds, top: num('--top') ?? CLASH_CHECK.top,
      mono: monoIds ?? null, answers: answers ?? null, matrix: matrix ?? null, records: args.includes('--records'), workers,
    };
    const pool = workers > 1 ? clashPool(spec, workers) : undefined;
    try {
      const t0 = Date.now();
      const cache = clashCache(cc, pool?.run ?? inProcessClashes(cc), { jitter, keep: options.records });
      lines.push(`clash check: ${budgets.join(', ')} gold on ${fields.join(', ')}, jitter ${jitter ? `±${jitter}` : 'off'}; a draw is half a win; the cap reading (the muster counted)`);
      // G3 plays every mono, so G12 can count every mono answer; --mono picks only G12's builds, as in v1 (T054)
      const g3 = await evaluateClashG3(cc, { cache, budgets, fields, seeds: g3Seeds });
      const g12 = await evaluateClashCounters(cc, {
        cache, g3, screenSeeds: options.screenSeeds, confirmSeeds: options.confirmSeeds, top: options.top,
        ...(matrix ? { matrix: 'all' as const } : {}), ...(answers ? { answers } : {}), ...(monoIds ? { builds: monoIds } : {}),
      });
      // G13 reads every cell the check played, each once (plan call 15)
      const g13 = clashG13(uniqueCells(g3.records, g12.records), g3.records);
      const ms = Date.now() - t0;
      const { cells, played } = cache.stats();
      const descriptions = Object.fromEntries([...new Set(Object.values(g12.answers).flat())].map((a) => [a, cc.bots[a.slice(4)]?.description ?? '']));
      const g3Lines = verdict(g3), g12Lines = verdict(g12);
      lines.push(...g12.matrixLines);
      const g13Lines = verdict(g13);
      lines.push(`clash check: ${played} clashes played for ${cells} cells in ${(ms / 1000).toFixed(1)} s on ${workers} worker${workers > 1 ? 's' : ''}`);
      out.clash = {
        options,
        armies: g3.armies,
        G3: { ...g3Lines, seeds: g3.seeds, budgets: g3.budgets, fields: g3.fields, bots: g3.bots },
        G12: {
          ...g12Lines, screenSeeds: g12.screenSeeds, confirmSeeds: g12.confirmSeeds, top: g12.top, sets: g12.sets,
          builds: g12.builds.map(({ matrix: _matrix, ...b }) => b), answers: g12.answers, bots: descriptions,
        },
        matrix: g12.builds.map((b) => ({ build: b.build, rows: b.matrix })),
        G13: { ...g13Lines, all: g13.all, g3: g13.g3, ...(g13.three ? { three: g13.three } : {}), cells: g13.cells },
        timing: { ms, clashes: played, cells },
        ...(options.records ? { records: cache.records() } : {}),
      };
    } finally {
      await pool?.close();
    }
  }
}

const dir = join(ROOT, 'reports', 'experiments');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${label}.json`), JSON.stringify(out, null, 2));
console.log(lines.join('\n'));
console.log(`\nreport: reports/experiments/${label}.json`);
