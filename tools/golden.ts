// npm run golden -- verify | update (SPEC §15.5). Golden replays pin the sim's behaviour: a battle replay holds a
// config, a command log and the expected state hashes at its round checkpoints (R2a plan Call 17); a run replay
// (`kind: "run"`) holds a seed and autoplay policies and pins every battle's checkpoint hashes plus the final
// run-state hash.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeContent, ROOT } from './lib/content.ts';
import { createBattle, kitCards, makeRoundConfig, runHeadless } from '../src/sim/index.ts';
import type { BattleConfig, Command, Flags, PowerPolicy } from '../src/sim/index.ts';
import { hashRun, simulateRun } from '../src/run/index.ts';
import type { AutoPolicies } from '../src/run/index.ts';

const DIR = join(ROOT, 'tests', 'golden');
/** A golden hashes every phase's checkpoint and every 200 ticks of each clash (R2a plan Call 17). */
const CHECK_EVERY = 200;

interface Replay {
  name: string;
  description: string;
  config: BattleConfig;
  commands: Command[];
  expected: Record<string, string>;
}

/**
 * The battle replays (`r2-…`, SPEC §15.5). `update` writes a golden only for an entry here, keeps its commands
 * and takes its config afresh, so data changes flow into it.
 */
const REPLAYS: {
  name: string; description: string; seed: number; player: string; enemy: string; flags: Partial<Flags>;
  commander?: string; powerPolicy?: PowerPolicy; map?: string;
  /** The player's kit is its commander's starter (§11.10) rather than the faction's roster. */
  starter?: boolean;
  /** `v3` plays the v3 prototype's rules (`src/sim/v3.ts`); its replays are `v3-…`, beside v2's unchanged `r2-…`. */
  rules?: 'v3';
}[] = [
  {
    name: 'r2-balanced-vs-scripted-s1', description: 'bot:balanced vs the scripted general, which plans first, a battle in rounds on Bogwater Hollow, seed 1 (R2a/T072)',
    seed: 1, player: 'bot:balanced', enemy: 'general:scripted', flags: { merging: true, adaptiveGeneral: true, powers: true },
  },
  // Twin Roots, where each lane is its own clash (§15.5): on seed 3 the lanes split in 6 of the battle's 8 rounds (R2a/T112)
  {
    name: 'r2-twin-roots-balanced-vs-scripted-s3', description: 'bot:balanced vs the scripted general on Twin Roots, each lane its own clash, seed 3 (R2a/T112)',
    seed: 3, player: 'bot:balanced', enemy: 'general:scripted', flags: { merging: true, adaptiveGeneral: false, powers: false }, map: 'twin-roots',
  },
  // the merge mirror, knitting at the muster (§5.6, §15.5): v1's G7 setup in rounds, merge-on against merge-off (R2a/T112)
  {
    name: 'r2-merge-mirror-s3', description: 'merge-on vs merge-off mirror (bot:balanced vs bot:balanced-nomerge, the G7 setup), knitting at the muster, seed 3 (R2a/T112)',
    seed: 3, player: 'bot:balanced', enemy: 'bot:balanced-nomerge', flags: { merging: true, adaptiveGeneral: false, powers: false },
  },
  // the power once per clash (§15.5), with the adaptive general off so the counter cycle can't move them (R2a/T111),
  // and Armilla's Rhizome Tithe once it pays in rounds (R2b/T156)
  ...(['vesper', 'cordis', 'armilla'] as const).map((c) => ({
    name: `r2-${c}-power-s3`,
    description: `bot:balanced as ${c}, with the starter kit and the auto power policy, vs the scripted general, seed 3 (${c === 'armilla' ? 'R2b/T156' : 'R2a/T111'})`,
    seed: 3, player: 'bot:balanced', enemy: 'general:scripted', flags: { merging: true, adaptiveGeneral: false, powers: true },
    commander: c, powerPolicy: 'auto' as const, starter: true,
  })),
  // the v3 prototype's battle (docs/v3-proto-plan.md, Goldens; T005): its rules on both maps, Vesper with the auto
  // power policy against Old Mother Mold and the Lichen Baron, at battle index 1. Each session that changes v3's
  // rules or data re-records them; the `r2-…` replays never move for v3
  {
    name: 'v3-mold-bogwater-s1', description: 'bot:balanced as Vesper vs Old Mother Mold on Bogwater Hollow by the v3 prototype\'s rules, seed 1 (v3 prototype T005)',
    seed: 1, player: 'bot:balanced', enemy: 'general:mother-mold', flags: { merging: true, adaptiveGeneral: true, powers: true },
    commander: 'vesper', powerPolicy: 'auto', rules: 'v3',
  },
  {
    name: 'v3-baron-twin-s1', description: 'bot:balanced as Vesper vs the Lichen Baron on Twin Roots by the v3 prototype\'s rules, seed 1 (v3 prototype T005)',
    seed: 1, player: 'bot:balanced', enemy: 'general:lichen-baron', flags: { merging: true, adaptiveGeneral: true, powers: true },
    commander: 'vesper', powerPolicy: 'auto', map: 'twin-roots', rules: 'v3',
  },
];

interface RunReplay {
  name: string;
  description: string;
  kind: 'run';
  seed: number;
  policies: AutoPolicies;
  expected: { battles: Record<string, string>[]; run: string };
}

/**
 * Whole-run replays (SPEC §15.5, §16 R2): a run in rounds, which R2b's S1 recorded in place of v1's `m3-run-s7` (T027).
 * Its seed (R2b/T126) is the first whose run has drafts after rounds 2, 4 and 6 and a life lost in a run that goes on:
 * seed 1 loses battle 2, then wins battles 3 and 4 in rounds 8 and 7 with all three drafts, and the boss. Seed 7 lost a
 * life but no battle reached round 7.
 */
const RUN_REPLAYS: Omit<RunReplay, 'expected' | 'kind'>[] = [
  {
    name: 'r2-run-s1', description: 'a whole run in rounds, seed 1: bot:balanced, greedy drafts, random route; a life lost in battle 2, drafts after rounds 2, 4 and 6 (R2b/T126)',
    seed: 1, policies: { route: 'random', draft: 'greedy', player: 'bot:balanced' },
  },
];

/** Each battle's round checkpoints, as a round golden takes them (R2a plan Call 17), and the run's final hash. */
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
    // the checkpoints in battle order, as recorded: r<n>.planning, r<n>:<tick>, r<n>.clash, r<n>.aftermath
    const keys = Object.keys(exp).filter((k) => k !== 'final');
    keys.push('final');
    for (const k of keys) if (g[k] !== exp[k]) { diverged = `battle ${b + 1} ${k === 'final' ? 'final hash' : `checkpoint ${k}`} (expected ${exp[k]}, got ${g[k] ?? '-'})`; return; }
  });
  if (!diverged && got.battles.length !== rep.expected.battles.length) diverged = `battle count (expected ${rep.expected.battles.length}, got ${got.battles.length})`;
  if (!diverged && got.run !== rep.expected.run) diverged = `the final run state (expected ${rep.expected.run}, got ${got.run})`;
  if (diverged) console.log(`FAIL  ${rep.name}: first divergence at ${diverged}`);
  else console.log(`PASS  ${rep.name}: ${got.battles.length} battles, ${got.battles.reduce((n, b) => n + Object.keys(b).length, 0)} checkpoints, run ${got.run}`);
  return !diverged;
}

function replayConfig(r: (typeof REPLAYS)[number]): BattleConfig {
  const config = makeRoundConfig(nodeContent(), {
    seed: r.seed, player: r.player, enemy: r.enemy, flags: r.flags,
    ...(r.map ? { mapId: r.map } : {}), ...(r.commander ? { commander: r.commander } : {}), ...(r.rules ? { rules: r.rules } : {}),
  });
  if (r.powerPolicy) config.player.powerPolicy = r.powerPolicy;
  if (r.starter && r.commander) config.player.kit = kitCards(nodeContent(), config.player.controller, nodeContent().commanders[r.commander]!.starter);
  return config;
}

function replayHashes(config: BattleConfig, commands: Command[]): Record<string, string> {
  const res = runHeadless(createBattle(nodeContent(), config), { until: 'end', commands, hashEvery: CHECK_EVERY });
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

function verifyReplay(rep: Replay): boolean {
  let got: Record<string, string>;
  try {
    got = replayHashes(rep.config, rep.commands);
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
    if (!('kind' in raw ? verifyRun(raw) : verifyReplay(raw))) failed++;
  }
  return failed ? 1 : 0;
}

function update(): number {
  mkdirSync(DIR, { recursive: true });
  const existing = new Set(files());
  for (const r of REPLAYS) {
    const file = `${r.name}.replay.json`;
    const commands = existing.has(file) ? (JSON.parse(readFileSync(join(DIR, file), 'utf8')) as Replay).commands : [];
    const config = replayConfig(r);
    const rep: Replay = { name: r.name, description: r.description, config, commands, expected: replayHashes(config, commands) };
    writeFileSync(join(DIR, file), JSON.stringify(rep, null, 2) + '\n');
    console.log(`updated ${file}: ${Object.keys(rep.expected).length} checkpoints, final ${rep.expected.final}`);
  }
  for (const r of RUN_REPLAYS) {
    const rep: RunReplay = { ...r, kind: 'run', expected: runHashes(r) };
    writeFileSync(join(DIR, `${r.name}.replay.json`), JSON.stringify(rep, null, 2) + '\n');
    console.log(`updated ${r.name}.replay.json: ${rep.expected.battles.length} battles, run ${rep.expected.run}`);
  }
  const listed = [...REPLAYS, ...RUN_REPLAYS].map((r) => `${r.name}.replay.json`);
  for (const f of files()) if (!listed.includes(f)) console.log(`left ${f}: it isn't in REPLAYS or RUN_REPLAYS, so it isn't written`);
  return 0;
}

const mode = process.argv[2] ?? 'verify';
if (mode === 'verify') process.exitCode = verify();
else if (mode === 'update') process.exitCode = update();
else { console.error('usage: npm run golden -- verify | update'); process.exitCode = 2; }
