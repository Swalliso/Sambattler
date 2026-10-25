// npm run sim -- [options]: headless battle simulator (SPEC §15.2), Milestone 1 subset.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { nodeContent, ROOT } from './lib/content.ts';
import { fmtTicks, median, runBattle } from './lib/run.ts';
import type { BattleResult, RunSpec } from './lib/run.ts';
import { checkAssert, parseAssert } from './lib/asserts.ts';
import type { Assertion } from './lib/asserts.ts';
import type { BattleConfig, Command } from '../src/sim/index.ts';

const NOT_IN_M1 = ['--auto-draft', '--commander', '--power-policy', '--bot', '--run', '--auto-route', '--meta-progress', '--runs'];

interface Args {
  map?: string; seeds: number[]; player?: string; enemy?: string; scenario?: string; replay?: string;
  until: 'end' | number; battleIndex?: number; flags?: Partial<BattleConfig['flags']>; hashEvery?: number;
  asserts: Assertion[]; out?: string; summary: boolean;
}

function parseUntil(v: string): 'end' | number {
  if (v === 'end') return 'end';
  const m = v.match(/^(\d+):(\d{2})$/);
  if (m) return (Number(m[1]) * 60 + Number(m[2])) * 20;
  if (/^\d+$/.test(v)) return Number(v);
  throw new Error(`bad --until "${v}"`);
}

function parseFlags(v: string): Partial<BattleConfig['flags']> {
  const flags: Partial<BattleConfig['flags']> = {};
  for (const f of v.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (f === 'merging' || f === 'drafts' || f === 'powers') {
      throw new Error(`--flags ${f}: not available in Milestone 1`);
    }
    if (f === 'adaptive') throw new Error('--flags adaptive: not available in Milestone 1');
    throw new Error(`unknown flag ${f}`);
  }
  return flags;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { seeds: [1], until: 'end', asserts: [], summary: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const v = () => {
      const x = argv[++i];
      if (x === undefined) throw new Error(`${k} needs a value`);
      return x;
    };
    if (NOT_IN_M1.includes(k)) throw new Error(`${k} is not available in Milestone 1`);
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
      case '--flags': a.flags = parseFlags(v()); break;
      case '--hash-every': a.hashEvery = Number(v()); break;
      case '--assert': a.asserts.push(parseAssert(v())); break;
      case '--out': a.out = v(); break;
      case '--summary': a.summary = true; break;
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
  const rows = results.map((r) => [
    String(r.seed), r.winner ?? '-', r.by ?? '-', r.duration, `${r.columns.player}:${r.columns.enemy}`,
    `${r.heartcap.player}/${r.heartcap.enemy}`, String(r.rejectedCommands), `${r.wallMs}ms`,
  ]);
  const head = ['seed', 'winner', 'by', 'length', 'cols', 'heartcaps', 'rejected', 'wall'];
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
  console.log(`mean wall ${(results.reduce((a, r) => a + r.wallMs, 0) / n).toFixed(0)} ms · rejected commands ${results.reduce((a, r) => a + r.rejectedCommands, 0)}`);
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
