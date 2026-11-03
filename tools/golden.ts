// npm run golden -- verify | update (SPEC §15.5). Golden replays pin the sim's behaviour: a battle
// replay holds a config, a command log and the expected state hashes at checkpoints; a run replay
// (`kind: "run"`) holds a seed and autoplay policies and pins every battle's checkpoint hashes plus
// the final run-state hash. R2a's round replays (`kind: "rounds"`) play through the rounds API beside them,
// with the round checkpoints (R2a plan Call 17).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeContent, ROOT } from './lib/content.ts';
import { createBattle, makeConfig, runHeadless } from '../src/sim/index.ts';
import type { BattleConfig, Command, Flags, PowerPolicy } from '../src/sim/index.ts';
import { hashRun, simulateRun } from '../src/run/index.ts';
import type { AutoPolicies } from '../src/run/index.ts';
import { createBattle as createRoundBattle, makeRoundConfig, runHeadless as runRoundHeadless } from '../src/sim/rounds/index.ts';
import type { BattleConfig as RoundConfig, Command as RoundCommand, Flags as RoundFlags } from '../src/sim/rounds/index.ts';

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
const REPLAYS: {
  name: string; description: string; seed: number; player: string; enemy: string; flags: Partial<Flags>; kit?: string[];
  commander?: string; powerPolicy?: PowerPolicy;
}[] = [
  { name: 'm1-balanced-vs-scripted-s1', description: 'bot:balanced vs the scripted general, seed 1', seed: 1, player: 'bot:balanced', enemy: 'general:scripted', flags: { merging: false, adaptiveGeneral: false, powers: false }, kit: M1_KIT },
  { name: 'm1-turtle-vs-scripted-s2', description: 'bot:turtle vs the scripted general, seed 2', seed: 2, player: 'bot:turtle', enemy: 'general:scripted', flags: { merging: false, adaptiveGeneral: false, powers: false }, kit: M1_KIT },
  { name: 'm2-merge-mirror-s3', description: 'merge-on vs merge-off mirror (bot:balanced vs bot:balanced-nomerge, the G7 setup), seed 3', seed: 3, player: 'bot:balanced', enemy: 'bot:balanced-nomerge', flags: { merging: true, adaptiveGeneral: false, powers: false } },
  { name: 'm4-adaptive-mold-s4', description: 'mono Sporeling Burrow vs adaptive Old Mother Mold (two Swarm counters), seed 4', seed: 4, player: 'bot:mono:sporelingBurrow', enemy: 'general:mother-mold', flags: { merging: true, adaptiveGeneral: true, powers: false } },
  ...(['vesper', 'armilla', 'cordis'] as const).map((c) => ({
    name: `m5-${c}-power-s3`, description: `bot:balanced as ${c} with the auto power policy vs the scripted general, seed 3 (SPEC §16 M5)`,
    seed: 3, player: 'bot:balanced', enemy: 'general:scripted', flags: { merging: true, adaptiveGeneral: true, powers: true }, commander: c, powerPolicy: 'auto' as const,
  })),
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

// ---- battles in rounds (R2a, SPEC §15.5) ----

/** A round golden hashes every phase's checkpoint and every 200 ticks of each clash (R2a plan Call 17). */
const ROUND_CHECK_EVERY = 200;

interface RoundReplay {
  name: string;
  description: string;
  kind: 'rounds';
  config: RoundConfig;
  commands: RoundCommand[];
  expected: Record<string, string>;
}

/**
 * R2a's round replays (`r2-…`), recorded beside v1's. `update` writes a round golden only for an entry here,
 * and a round rule or data change refreshes them without moving v1's.
 */
const ROUND_REPLAYS: {
  name: string; description: string; seed: number; player: string; enemy: string; flags: Partial<RoundFlags>;
  commander?: string; powerPolicy?: PowerPolicy; map?: string;
}[] = [
  {
    name: 'r2-balanced-vs-scripted-s1', description: 'bot:balanced vs the scripted general, which plans first, a battle in rounds on Bogwater Hollow, seed 1 (R2a/T072)',
    seed: 1, player: 'bot:balanced', enemy: 'general:scripted', flags: { merging: true, adaptiveGeneral: true, powers: true },
  },
];

function roundReplayConfig(r: (typeof ROUND_REPLAYS)[number]): RoundConfig {
  const config = makeRoundConfig(nodeContent(), {
    seed: r.seed, player: r.player, enemy: r.enemy, flags: r.flags,
    ...(r.map ? { mapId: r.map } : {}), ...(r.commander ? { commander: r.commander } : {}),
  });
  if (r.powerPolicy) config.player.powerPolicy = r.powerPolicy;
  return config;
}

function roundReplayHashes(config: RoundConfig, commands: RoundCommand[]): Record<string, string> {
  const res = runRoundHeadless(createRoundBattle(nodeContent(), config), { until: 'end', commands, hashEvery: ROUND_CHECK_EVERY });
  return { ...res.hashes, final: res.finalHash };
}

/** A round checkpoint's place in its battle: its round, then planning, the clash, its ticks and the aftermath; `final` last. */
function checkpointRank(key: string): [number, number] {
  const last = Number.MAX_SAFE_INTEGER;
  const m = key.match(/^r(\d+)(?:\.(planning|clash|aftermath)|:(\d+))$/);
  if (!m) return [last, last];
  return [Number(m[1]), m[3] !== undefined ? Number(m[3]) : m[2] === 'planning' ? -2 : m[2] === 'clash' ? -1 : last];
}

function byCheckpoint(a: string, b: string): number {
  const [ra, ta] = checkpointRank(a), [rb, tb] = checkpointRank(b);
  return ra !== rb ? ra - rb : ta - tb;
}

function verifyRounds(rep: RoundReplay): boolean {
  let got: Record<string, string>;
  try {
    got = roundReplayHashes(rep.config, rep.commands);
  } catch (e) {
    console.log(`FAIL  ${rep.name}: ${(e as Error).message}`);
    return false;
  }
  // the first key in battle order where the two differ, a key one of them lacks included
  const keys = [...new Set([...Object.keys(rep.expected), ...Object.keys(got)])].sort(byCheckpoint);
  const diverged = keys.find((k) => got[k] !== rep.expected[k]);
  if (diverged) {
    console.log(`FAIL  ${rep.name}: first divergence at ${diverged === 'final' ? 'the final hash' : diverged} ` +
      `(expected ${rep.expected[diverged] ?? '-'}, got ${got[diverged] ?? '-'})`);
  } else {
    console.log(`PASS  ${rep.name}: ${keys.length} checkpoints, final ${got.final}`);
  }
  return !diverged;
}

function replayConfig(r: (typeof REPLAYS)[number]): BattleConfig {
  const config = makeConfig(nodeContent(), {
    seed: r.seed, player: r.player, enemy: r.enemy, flags: r.flags,
    ...(r.commander ? { commander: r.commander } : {}), ...(r.powerPolicy ? { powerPolicy: r.powerPolicy } : {}),
  });
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
    const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Replay | RunReplay | RoundReplay;
    if ('kind' in raw && raw.kind === 'run') { if (!verifyRun(raw)) failed++; continue; }
    if ('kind' in raw && raw.kind === 'rounds') { if (!verifyRounds(raw)) failed++; continue; }
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
  for (const r of ROUND_REPLAYS) {
    const file = `${r.name}.replay.json`;
    // a listed replay keeps its commands and takes its config afresh, so data changes flow into it
    const commands = existing.has(file) ? (JSON.parse(readFileSync(join(DIR, file), 'utf8')) as RoundReplay).commands : [];
    const config = roundReplayConfig(r);
    const rep: RoundReplay = { name: r.name, description: r.description, kind: 'rounds', config, commands, expected: roundReplayHashes(config, commands) };
    writeFileSync(join(DIR, file), JSON.stringify(rep, null, 2) + '\n');
    console.log(`updated ${file}: ${Object.keys(rep.expected).length} checkpoints, final ${rep.expected.final}`);
  }
  const listed = [...REPLAYS, ...RUN_REPLAYS, ...ROUND_REPLAYS].map((r) => `${r.name}.replay.json`);
  for (const f of files()) {
    if (listed.includes(f)) continue;
    const raw = JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Replay | RoundReplay;
    if ('kind' in raw && raw.kind === 'rounds') { console.log(`left ${f}: a round golden is written only from ROUND_REPLAYS`); continue; }
    const rep = raw as Replay;
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
