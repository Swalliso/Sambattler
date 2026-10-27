// npm run sim -- [options]: headless battle and run simulator (SPEC §15.2), Milestone 3 subset.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { nodeContent, ROOT } from './lib/content.ts';
import { DIVERGE_COLUMNS, fmtTicks, median, runBattle } from './lib/run.ts';
import type { BattleResult, RunSpec } from './lib/run.ts';
import { simulateRun } from '../src/run/index.ts';
import type { DraftAutoPolicy, RoutePolicy, RunResult } from '../src/run/index.ts';
import { checkAssert, parseAssert } from './lib/asserts.ts';
import type { Assertion } from './lib/asserts.ts';
import { MILESTONE, parseFlags } from '../src/sim/index.ts';
import type { BattleConfig, Command } from '../src/sim/index.ts';

/** Options for later milestones' features (commanders, powers, meta-progression). */
const NOT_YET = ['--commander', '--power-policy', '--bot', '--meta-progress', '--runs'];
const DRAFT_POLICIES = ['first', 'random', 'greedy'];
const ROUTE_POLICIES = ['first', 'random', 'battles'];

interface Args {
  map?: string; seeds: number[]; player?: string; enemy?: string; scenario?: string; replay?: string;
  until: 'end' | number; battleIndex?: number; flags?: Partial<BattleConfig['flags']>; hashEvery?: number;
  asserts: Assertion[]; out?: string; summary: boolean;
  run: boolean; autoDraft?: DraftAutoPolicy; autoRoute?: RoutePolicy;
}

function parseUntil(v: string): 'end' | number {
  if (v === 'end') return 'end';
  const m = v.match(/^(\d+):(\d{2})$/);
  if (m) return (Number(m[1]) * 60 + Number(m[2])) * 20;
  if (/^\d+$/.test(v)) return Number(v);
  throw new Error(`bad --until "${v}"`);
}

/** `--flags a,b` turns on exactly those features (`none` for none); without it, the milestone's defaults apply. */
function flagsArg(v: string): BattleConfig['flags'] {
  const { flags, problems } = parseFlags(v);
  if (problems.length) throw new Error(`--flags: ${problems.join('; ')}`);
  return flags;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { seeds: [1], until: 'end', asserts: [], summary: false, run: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const v = () => {
      const x = argv[++i];
      if (x === undefined) throw new Error(`${k} needs a value`);
      return x;
    };
    if (NOT_YET.includes(k)) throw new Error(`${k} is not available in Milestone ${MILESTONE}`);
    switch (k) {
      case '--map': a.map = v(); break;
      case '--seed': a.seeds = [Number(v())]; break;
      case '--seeds': {
        const m = v().match(/^(\d+)\.\.(\d+)$/);
        if (!m) throw new Error('--seeds expects a..b');
        a.seeds = [];
        for (let s = Number(m[1]); s <= Number(m[2]); s++) a.seeds.push(s);
        break;
      }
      case '--player': a.player = v(); break;
      case '--enemy': a.enemy = v(); break;
      case '--scenario': a.scenario = v(); break;
      case '--replay': a.replay = v(); break;
      case '--until': a.until = parseUntil(v()); break;
      case '--battle-index': a.battleIndex = Number(v()); break;
      case '--flags': a.flags = flagsArg(v()); break;
      case '--hash-every': a.hashEvery = Number(v()); break;
      case '--assert': a.asserts.push(parseAssert(v())); break;
      case '--out': a.out = v(); break;
      case '--summary': a.summary = true; break;
      case '--run': a.run = true; break;
      case '--auto-draft': {
        const p = v();
        if (!DRAFT_POLICIES.includes(p)) throw new Error(`--auto-draft expects ${DRAFT_POLICIES.join(' | ')}`);
        a.autoDraft = p as DraftAutoPolicy;
        break;
      }
      case '--auto-route': {
        const p = v();
        if (!ROUTE_POLICIES.includes(p)) throw new Error(`--auto-route expects ${ROUTE_POLICIES.join(' | ')}`);
        a.autoRoute = p as RoutePolicy;
        break;
      }
      default: throw new Error(`unknown option ${k}`);
    }
  }
  return a;
}

function outPath(p: string): string {
  if (isAbsolute(p)) return p;
  if (p.includes('/')) return join(ROOT, p);
  return join(ROOT, 'artifacts', 'sim', p);
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const content = nodeContent();
  if (args.run) return mainRun(args, content);
  if (args.autoRoute) throw new Error('--auto-route needs --run');
  const recordAt = [...new Set(args.asserts.filter((x) => x.tick !== undefined).map((x) => x.tick!))];
  if (typeof args.until === 'number') recordAt.push(args.until);

  let replay: { config: BattleConfig; commands: Command[] } | undefined;
  if (args.replay) replay = JSON.parse(readFileSync(args.replay, 'utf8'));

  const results: BattleResult[] = [];
  const failures: string[] = [];
  for (const seed of replay ? [replay.config.seed] : args.seeds) {
    const spec: RunSpec = { seed, until: args.until, recordAt };
    if (replay) { spec.config = replay.config; spec.commands = replay.commands; }
    if (args.map) spec.map = args.map;
    if (args.player) spec.player = args.player;
    if (args.enemy) spec.enemy = args.enemy;
    if (args.scenario) spec.scenario = args.scenario;
    if (args.battleIndex) spec.battleIndex = args.battleIndex;
    if (args.flags) spec.flags = args.flags;
    if (args.autoDraft) spec.autoDraft = args.autoDraft;
    if (args.hashEvery) spec.hashEvery = args.hashEvery;
    const { result } = runBattle(content, spec);
    results.push(result);
    for (const as of args.asserts) {
      const err = checkAssert(result as unknown as Record<string, unknown>, as);
      if (err) failures.push(`seed ${seed}: ${err}`);
    }
  }

  if (args.out) {
    const p = outPath(args.out);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
    console.error(`wrote ${p}`);
  }

  if (results.length === 1 && !args.summary) {
    const r = results[0]!;
    const { at: _at, frontLine: _fl, stats: _st, ...brief } = r;
    console.log(JSON.stringify({ ...brief, frontLineSamples: r.frontLine.map((l) => l.length) }, null, 2));
  } else {
    printSummary(results);
  }
  for (const as of args.asserts) {
    const ok = !failures.some((f) => f.includes(as.text));
    console.log(`${ok ? 'PASS' : 'FAIL'}  assert ${as.text}`);
  }
  if (failures.length) {
    console.error(`\n${failures.length} assertion failure(s):\n- ${failures.join('\n- ')}`);
    return 1;
  }
  return 0;
}

export function printSummary(results: BattleResult[]): void {
  const merges = (r: BattleResult, s: 'player' | 'enemy') => `${r.merges[s]['2']}/${r.merges[s]['3']}`;
  const rows = results.map((r) => [
    String(r.seed), r.winner ?? '-', r.by ?? '-', r.duration, `${r.columns.player}:${r.columns.enemy}`,
    `${r.heartcap.player}/${r.heartcap.enemy}`, `${merges(r, 'player')} : ${merges(r, 'enemy')}`, String(r.rejectedCommands), `${r.wallMs}ms`,
  ]);
  const head = ['seed', 'winner', 'by', 'length', 'cols', 'heartcaps', 'merges (B/E)', 'rejected', 'wall'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ');
  console.log(line(head));
  for (const r of rows) console.log(line(r));
  const n = results.length;
  const ended = results.filter((r) => r.winner);
  const wins = (s: 'player' | 'enemy') => results.filter((r) => r.winner === s).length;
  const decisions = results.filter((r) => r.by === 'decision').length;
  const lens = ended.map((r) => r.durationTicks);
  console.log('');
  console.log(`battles ${n} · ended ${ended.length} · player wins ${wins('player')} (${pct(wins('player'), n)}) · enemy wins ${wins('enemy')} (${pct(wins('enemy'), n)})`);
  console.log(`length median ${fmtTicks(median(lens))} · min ${fmtTicks(Math.min(...lens))} · max ${fmtTicks(Math.max(...lens))} · decisions ${decisions} (${pct(decisions, n)})`);
  const merged = results.filter((r) => r.merges.player['2'] + r.merges.enemy['2'] > 0).length;
  const elders = results.filter((r) => r.merges.player['3'] + r.merges.enemy['3'] > 0).length;
  console.log(`battles with merges ${merged} (${pct(merged, n)}) · with an Elder ${elders} (${pct(elders, n)})`);
  console.log(`mean wall ${(results.reduce((a, r) => a + r.wallMs, 0) / n).toFixed(0)} ms · rejected commands ${results.reduce((a, r) => a + r.rejectedCommands, 0)}`);
  const multi = results.filter((r) => r.laneDivergence);
  if (multi.length) {
    const div = multi.filter((r) => r.laneDivergence!.diverged).length;
    const gaps = multi.map((r) => r.laneDivergence!.maxGap);
    console.log(`lanes diverged (front midpoints ≥${DIVERGE_COLUMNS} columns apart at some sample) in ${div}/${multi.length} battles (${pct(div, multi.length)}) · ` +
      `max gap median ${median(gaps).toFixed(1)} · mean gap ${(multi.reduce((a, r) => a + r.laneDivergence!.meanGap, 0) / multi.length).toFixed(1)}`);
  }
}

// ---- whole runs (SPEC §15.2 --run) ----

/** The M3 run expectations (SPEC §16 Milestone 3, verification 2). */
const RUN_MINUTES: [number, number] = [22, 38];

function mainRun(args: Args, content: ReturnType<typeof nodeContent>): number {
  if (args.scenario || args.replay || args.map || args.enemy) throw new Error('--run picks maps and generals itself; drop --map, --enemy, --scenario and --replay');
  const policies = { route: args.autoRoute ?? 'random', draft: args.autoDraft ?? 'greedy', player: args.player ?? 'bot:balanced' } as const;
  const results: (RunResult & { wallMs: number })[] = [];
  for (const seed of args.seeds) {
    const t0 = performance.now();
    const r = simulateRun(content, seed, { ...policies }, args.hashEvery ? { hashEvery: args.hashEvery } : {});
    results.push({ ...r, wallMs: Math.round(performance.now() - t0) });
  }
  const failures: string[] = [];
  for (const r of results) {
    for (const as of args.asserts) {
      const err = checkAssert(r as unknown as Record<string, unknown>, as);
      if (err) failures.push(`seed ${r.seed}: ${err}`);
    }
  }
  if (args.out) {
    const p = outPath(args.out);
    mkdirSync(dirname(p), { recursive: true });
    const strip = (r: (typeof results)[number]) => { const { run: _run, ...rest } = r; return rest; };
    writeFileSync(p, JSON.stringify(results.length === 1 ? strip(results[0]!) : results.map(strip), null, 2));
    console.error(`wrote ${p}`);
  }
  if (results.length === 1 && !args.summary) {
    const { run: _run, battles, ...brief } = results[0]!;
    console.log(JSON.stringify({ ...brief, battles: battles.map((b) => `${b.index} ${b.kind} ${b.map} ${b.winner} by ${b.by} ${fmtTicks(b.durationTicks)} hp ${b.heartcapAfter}`) }, null, 2));
  } else {
    printRunSummary(results);
  }
  for (const as of args.asserts) console.log(`${failures.some((f) => f.includes(as.text)) ? 'FAIL' : 'PASS'}  assert ${as.text}`);
  if (failures.length) {
    console.error(`\n${failures.length} assertion failure(s):\n- ${failures.join('\n- ')}`);
    return 1;
  }
  return 0;
}

function printRunSummary(results: (RunResult & { wallMs: number })[]): void {
  const mark = (b: RunResult['battles'][number]) => `${b.kind === 'boss' ? 'B' : b.kind === 'elite' ? 'E' : 'b'}${b.winner === 'player' ? '+' : '-'}${b.by[0]}`;
  const rows = results.map((r) => [
    String(r.seed), r.outcome, String(r.battleCount), fmtTicks(r.totalBattleTicks), r.reachedBoss ? 'yes' : 'no',
    `${r.heartcap.hp}/${r.heartcap.max}`, r.battles.map(mark).join(' '), String(r.cards.length), String(r.spores), `${r.wallMs}ms`,
  ]);
  const head = ['seed', 'outcome', 'battles', 'battle time', 'boss', 'heartcap', 'results', 'cards', 'spores', 'wall'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ');
  console.log(line(head));
  for (const r of rows) console.log(line(r));
  const n = results.length;
  const mins = results.map((r) => r.totalBattleTicks / 1200);
  const counts = results.map((r) => r.battleCount);
  const boss = results.filter((r) => r.reachedBoss).length;
  const wins = results.filter((r) => r.outcome === 'victory').length;
  const done = results.filter((r) => r.outcome === 'victory' || r.outcome === 'defeat').length;
  const inCount = counts.filter((c) => c >= 4 && c <= 5).length;
  const inTime = mins.filter((m) => m >= RUN_MINUTES[0] && m <= RUN_MINUTES[1]).length;
  const bossRuns = results.filter((r) => r.reachedBoss);
  console.log('');
  console.log(`runs ${n} · victories ${wins} (${pct(wins, n)}) · reached the boss ${boss} (${pct(boss, n)})`);
  console.log(`battles per run: median ${median(counts)} · min ${Math.min(...counts)} · max ${Math.max(...counts)} · ${inCount}/${n} runs fought 4–5`);
  console.log(`battle time per run: median ${median(mins).toFixed(1)} min · min ${Math.min(...mins).toFixed(1)} · max ${Math.max(...mins).toFixed(1)} · ${inTime}/${n} runs in ${RUN_MINUTES[0]}–${RUN_MINUTES[1]} min`);
  if (bossRuns.length) {
    const bm = bossRuns.map((r) => r.totalBattleTicks / 1200);
    console.log(`runs that reached the boss: battles ${Math.min(...bossRuns.map((r) => r.battleCount))}–${Math.max(...bossRuns.map((r) => r.battleCount))} · battle time median ${median(bm).toFixed(1)} min (${Math.min(...bm).toFixed(1)}–${Math.max(...bm).toFixed(1)})`);
  }
  console.log(`mean wall ${(results.reduce((a, r) => a + r.wallMs, 0) / n).toFixed(0)} ms per run`);
  console.log('');
  const expect = (ok: boolean, text: string) => console.log(`${ok ? 'PASS' : 'FAIL'}  expect ${text}`);
  expect(done === n, `every run completes (${done}/${n})`);
  expect(inCount === n, `4–5 battles per run (${inCount}/${n})`);
  expect(inTime === n, `${RUN_MINUTES[0]}–${RUN_MINUTES[1]} min of battle per run (${inTime}/${n})`);
  expect(boss / n >= 0.3, `≥30% of runs reach the boss (${pct(boss, n)})`);
}

function pct(a: number, n: number): string {
  return `${((100 * a) / Math.max(1, n)).toFixed(0)}%`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 2;
  }
}
