// npm run golden -- verify | update (SPEC §15.5). Golden replays pin the sim's behaviour: a battle
// replay holds a config, a command log and the expected state hashes at checkpoints; a run replay
// (`kind: "run"`) holds a seed and autoplay policies and pins every battle's checkpoint hashes plus
// the final run-state hash.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeContent, ROOT } from './lib/content.ts';
import { createBattle, makeConfig, runHeadless } from '../src/sim/index.ts';
import type { BattleConfig, Command, Flags } from '../src/sim/index.ts';
import { hashRun, simulateRun } from '../src/run/index.ts';
import type { AutoPolicies } from '../src/run/index.ts';

const DIR = join(ROOT, 'tests', 'golden');
const CHECK_EVERY = 600;

interface Replay {
  name: string;
  description: string;
  config: BattleConfig;
  commands: Command[];
  expected: Record<string, string>;
}

const M1_KIT = ['sporelingBurrow', 'capguardHall', 'gillNest', 'rootbreakerDen', 'puffballMortar', 'truffleCellar'];

/**
 * The replays each milestone ships (SPEC §16 verification). Each pins its milestone's flags (and
 * M1's roster), so a refresh after a balance change keeps M1 replays free of later features.
 */
const REPLAYS: { name: string; description: string; seed: number; player: string; enemy: string; flags: Partial<Flags>; kit?: string[] }[] = [
  { name: 'm1-balanced-vs-scripted-s1', description: 'bot:balanced vs the scripted general, seed 1', seed: 1, player: 'bot:balanced', enemy: 'general:scripted', flags: { merging: false, adaptiveGeneral: false }, kit: M1_KIT },
  { name: 'm1-turtle-vs-scripted-s2', description: 'bot:turtle vs the scripted general, seed 2', seed: 2, player: 'bot:turtle', enemy: 'general:scripted', flags: { merging: false, adaptiveGeneral: false }, kit: M1_KIT },
  { name: 'm2-merge-mirror-s3', description: 'merge-on vs merge-off mirror (bot:balanced vs bot:balanced-nomerge, the G7 setup), seed 3', seed: 3, player: 'bot:balanced', enemy: 'bot:balanced-nomerge', flags: { merging: true, adaptiveGeneral: false } },
];

interface RunReplay {
  name: string;
  description: string;
  kind: 'run';
  seed: number;
  policies: AutoPolicies;
  expected: { battles: Record<string, string>[]; run: string };
}

/** Whole-run replays (SPEC §16 Milestone 3, verification 4). */
const RUN_REPLAYS: Omit<RunReplay, 'expected' | 'kind'>[] = [
  { name: 'm3-run-s7', description: 'a whole run, seed 7: bot:balanced, greedy drafts, random route', seed: 7, policies: { route: 'random', draft: 'greedy', player: 'bot:balanced' } },
];

function runHashes(r: Pick<RunReplay, 'seed' | 'policies'>): RunReplay['expected'] {
  const res = simulateRun(nodeContent(), r.seed, r.policies, { hashEvery: CHECK_EVERY });
  return { battles: res.hashes, run: hashRun(res.run) };
}

function verifyRun(rep: RunReplay): boolean {
  const got = runHashes(rep);
  let diverged: string | null = null;
  rep.expected.battles.forEach((exp, b) => {
    if (diverged) return;
    const g = got.battles[b];
    if (!g) { diverged = `battle ${b + 1} (not played)`; return; }
    const keys = Object.keys(exp).filter((k) => k !== 'final').sort((x, y) => Number(x) - Number(y));
    keys.push('final');
    for (const k of keys) if (g[k] !== exp[k]) { diverged = `battle ${b + 1} ${k === 'final' ? 'final hash' : `tick ${k}`} (expected ${exp[k]}, got ${g[k] ?? '-'})`; return; }
  });
  if (!diverged && got.battles.length !== rep.expected.battles.length) diverged = `battle count (expected ${rep.expected.battles.length}, got ${got.battles.length})`;
  if (!diverged && got.run !== rep.expected.run) diverged = `the final run state (expected ${rep.expected.run}, got ${got.run})`;
  if (diverged) console.log(`FAIL  ${rep.name}: first divergence at ${diverged}`);
  else console.log(`PASS  ${rep.name}: ${got.battles.length} battles, ${got.battles.reduce((n, b) => n + Object.keys(b).length, 0)} checkpoints, run ${got.run}`);
  return !diverged;
}

function replayConfig(r: (typeof REPLAYS)[number]): BattleConfig {
  const config = makeConfig(nodeContent(), { seed: r.seed, player: r.player, enemy: r.enemy, flags: r.flags });
  if (r.kit) { config.player.kit = [...r.kit]; config.enemy.kit = [...r.kit]; }
  return config;
}

export function replayHashes(config: BattleConfig, commands: Command[]): Record<string, string> {
  const content = nodeContent();
  const state = createBattle(content, config);
  const res = runHeadless(state, { until: 'end', commands, hashEvery: CHECK_EVERY });
  return { ...res.hashes, final: res.finalHash };
}

function files(): string[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR).filter((f) => f.endsWith('.replay.json')).sort();
}

function verify(): number {
  const list = files();
  if (!list.length) { console.error('no golden replays in tests/golden (run `npm run golden -- update`)'); return 1; }
  let failed = 0;
  for (const f of list) {
    const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Replay | RunReplay;
    if ('kind' in raw && raw.kind === 'run') { if (!verifyRun(raw)) failed++; continue; }
    const rep = raw as Replay;
    const got = replayHashes(rep.config, rep.commands);
    const keys = Object.keys(rep.expected).filter((k) => k !== 'final').sort((a, b) => Number(a) - Number(b));
    keys.push('final');
    let diverged: string | null = null;
    for (const k of keys) {
      if (got[k] !== rep.expected[k]) { diverged = k; break; }
    }
    if (!diverged && Object.keys(got).length !== Object.keys(rep.expected).length) diverged = 'checkpoint count';
    if (diverged) {
      failed++;
      console.log(`FAIL  ${rep.name}: first divergence at ${diverged === 'final' ? 'the final hash' : `tick ${diverged}`} ` +
        `(expected ${rep.expected[diverged] ?? '-'}, got ${got[diverged] ?? '-'})`);
    } else {
      console.log(`PASS  ${rep.name}: ${keys.length} checkpoints, final ${got.final}`);
    }
  }
  return failed ? 1 : 0;
}

function update(): number {
  mkdirSync(DIR, { recursive: true });
  const existing = new Set(files());
  for (const r of REPLAYS) {
    const file = `${r.name}.replay.json`;
    let rep: Replay;
    if (existing.has(file)) {
      rep = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as Replay;
      // refresh the config from the current data so balance changes flow into the replay
      rep.config = replayConfig(r);
    } else {
      rep = {
        name: r.name, description: r.description,
        config: replayConfig(r),
        commands: [{ tick: 0, side: 'player', seq: 0, type: 'begin' }],
        expected: {},
      };
    }
    rep.expected = replayHashes(rep.config, rep.commands);
    writeFileSync(join(DIR, file), JSON.stringify(rep, null, 2) + '\n');
    console.log(`updated ${file}: ${Object.keys(rep.expected).length} checkpoints, final ${rep.expected.final}`);
  }
  for (const r of RUN_REPLAYS) {
    const rep: RunReplay = { ...r, kind: 'run', expected: runHashes(r) };
    writeFileSync(join(DIR, `${r.name}.replay.json`), JSON.stringify(rep, null, 2) + '\n');
    console.log(`updated ${r.name}.replay.json: ${rep.expected.battles.length} battles, run ${rep.expected.run}`);
  }
  for (const f of files()) {
    if (REPLAYS.some((r) => `${r.name}.replay.json` === f) || RUN_REPLAYS.some((r) => `${r.name}.replay.json` === f)) continue;
    const rep = JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Replay;
    rep.expected = replayHashes(rep.config, rep.commands);
    writeFileSync(join(DIR, f), JSON.stringify(rep, null, 2) + '\n');
    console.log(`updated ${f}`);
  }
  return 0;
}

const mode = process.argv[2] ?? 'verify';
if (mode === 'verify') process.exitCode = verify();
else if (mode === 'update') process.exitCode = update();
else { console.error('usage: npm run golden -- verify | update'); process.exitCode = 2; }
