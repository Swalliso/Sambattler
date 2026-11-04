// npm run sim -- [options]: headless battle and run simulator (SPEC §15.2): single battles in rounds, or whole
// runs with `--run`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { nodeContent, ROOT } from './lib/content.ts';
import { fmtTicks, median, paceLines, runRoundBattle } from './lib/run.ts';
import type { RoundBattleResult, RoundRunSpec } from './lib/run.ts';
import { simulateRun } from '../src/run/index.ts';
import type { DraftAutoPolicy, RoutePolicy, RunResult } from '../src/run/index.ts';
import { checkAssert, parseAssert } from './lib/asserts.ts';
import type { Assertion } from './lib/asserts.ts';
import { MILESTONE, parseFlags } from '../src/sim/index.ts';
import type { BattleConfig, Command, HeadlessUntil, PowerPolicy } from '../src/sim/index.ts';

/** Options for later milestones' features (meta-progression). */
const NOT_YET = ['--bot', '--meta-progress', '--runs'];
const POWER_POLICIES = ['none', 'auto'];
const DRAFT_POLICIES = ['first', 'random', 'greedy'];
const ROUTE_POLICIES = ['first', 'random', 'battles'];

interface Args {
  map?: string; seeds: number[]; player?: string; enemy?: string; scenario?: string; replay?: string;
  until: HeadlessUntil; battleIndex?: number; flags?: Partial<BattleConfig['flags']>; hashEvery?: number;
  asserts: Assertion[]; out?: string; summary: boolean;
  run: boolean; autoDraft?: DraftAutoPolicy; autoRoute?: RoutePolicy;
  commander?: string; powerPolicy?: PowerPolicy;
  /** The player's kit by building id, such as a commander's starter (R2-Q7's measure). */
  kit?: string[];
}

/** `end`, `r<n>` (the end of round n) or `r<n>:<tick>` (a tick of its clash, counted from the clash's start). */
function parseUntil(v: string): HeadlessUntil {
  if (v === 'end') return 'end';
  const m = v.match(/^r(\d+)(?::(\d+))?$/);
  if (!m) throw new Error(`bad --until "${v}" (expected end, r<n> or r<n>:<tick>)`);
  return m[2] === undefined ? { round: Number(m[1]) } : { round: Number(m[1]), tick: Number(m[2]) };
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
      case '--commander': a.commander = v(); break;
      case '--kit': a.kit = v().split(',').filter(Boolean); break;
      case '--power-policy': {
        const p = v();
        if (!POWER_POLICIES.includes(p)) throw new Error(`--power-policy expects ${POWER_POLICIES.join(' | ')}`);
        a.powerPolicy = p as PowerPolicy;
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
  if (!a.run) {
    if (a.autoRoute) throw new Error('--auto-route needs --run');
    // a single battle drafts with `--flags drafts` (§8.3), a bot player by `--auto-draft` (greedy unless set)
    if (a.autoDraft && !a.flags?.drafts) throw new Error('--auto-draft needs --run or --flags drafts');
  } else if (a.kit) {
    throw new Error('--kit is for a single battle; a run builds its own kit');
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
  if (args.commander && !content.commanders[args.commander]) throw new Error(`--commander: unknown commander "${args.commander}" (expected ${Object.keys(content.commanders).join(', ')})`);
  return args.run ? mainRun(args, content) : mainBattle(args, content);
}

// ---- single battles (SPEC §15.2) ----


/**
 * A scenario's human player has no one to plan for it from the CLI, so it plants nothing more and Begins each round
 * from the scenario's own, as `playerScript` does in the tests (§16 R2 step 4, R2a/T132). A bot player Begins itself.
 */
function scenarioBegins(content: ReturnType<typeof nodeContent>, id: string, player: string | undefined): Command[] {
  const def = content.scenarios[id];
  if ((player ?? def?.controllers?.player ?? 'human') !== 'human') return [];
  const out: Command[] = [];
  for (let round = def?.round ?? 1; round <= content.balance.rounds.maxRounds; round++) {
    out.push({ round, tick: 0, side: 'player', seq: out.length, type: 'beginClash' });
  }
  return out;
}

function mainBattle(args: Args, content: ReturnType<typeof nodeContent>): number {
  if (args.commander && args.scenario) throw new Error('--commander does not apply to a scenario (it names its own commander)');
  const recordAt = [...new Set(args.asserts.flatMap((x) => (x.checkpoint ? [x.checkpoint] : [])))];
  let replay: { config: BattleConfig; commands: Command[] } | undefined;
  if (args.replay) replay = JSON.parse(readFileSync(args.replay, 'utf8'));

  const results: RoundBattleResult[] = [];
  const failures: string[] = [];
  for (const seed of replay ? [replay.config.seed] : args.seeds) {
    const spec: RoundRunSpec = { seed, until: args.until, recordAt };
    if (replay) { spec.config = replay.config; spec.commands = replay.commands; }
    if (args.map) spec.map = args.map;
    if (args.player) spec.player = args.player;
    if (args.enemy) spec.enemy = args.enemy;
    if (args.scenario) spec.scenario = args.scenario;
    if (args.scenario && !replay) spec.commands = scenarioBegins(content, args.scenario, args.player);
    if (args.battleIndex) spec.battleIndex = args.battleIndex;
    if (args.flags) spec.flags = args.flags;
    if (args.commander) spec.commander = args.commander;
    if (args.powerPolicy) spec.powerPolicy = args.powerPolicy;
    if (args.autoDraft) spec.autoDraft = args.autoDraft;
    if (args.kit) spec.kit = args.kit;
    if (args.hashEvery) spec.hashEvery = args.hashEvery;
    const { result } = runRoundBattle(content, spec);
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
    const { at: _at, stats: _st, ...brief } = results[0]!;
    console.log(JSON.stringify(brief, null, 2));
  } else {
    printRoundSummary(results, content.balance.rounds.maxRounds);
  }
  for (const as of args.asserts) console.log(`${failures.some((f) => f.includes(as.text)) ? 'FAIL' : 'PASS'}  assert ${as.text}`);
  if (failures.length) {
    console.error(`\n${failures.length} assertion failure(s):\n- ${failures.join('\n- ')}`);
    return 1;
  }
  return 0;
}

export function printRoundSummary(results: RoundBattleResult[], maxRounds: number): void {
  const merges = (r: RoundBattleResult, s: 'player' | 'enemy') => `${r.merges[s]['2']}/${r.merges[s]['3']}`;
  const rows = results.map((r) => [
    String(r.seed), r.winner ?? '-', r.by ?? '-', String(r.rounds), r.clashTime, `${r.heartcap.player}/${r.heartcap.enemy}`,
    `${r.dealt.player}/${r.dealt.enemy}`, `${merges(r, 'player')} : ${merges(r, 'enemy')}`, String(r.rejectedCommands), `${r.wallMs}ms`,
  ]);
  const head = ['seed', 'winner', 'by', 'rounds', 'clash time', 'heartcaps', 'dealt', 'merges (B/E)', 'rejected', 'wall'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ');
  console.log(line(head));
  for (const r of rows) console.log(line(r));
  const n = results.length;
  const wins = (s: 'player' | 'enemy') => results.filter((r) => r.winner === s).length;
  const rounds = results.map((r) => r.rounds);
  const last = results.filter((r) => r.rounds >= maxRounds).length;
  // each lane's clash is its own (§6.7): a round on Twin Roots has two
  const clashes = results.flatMap((r) => r.roundLog.flatMap((l) => l.lanes));
  const capped = clashes.filter((c) => c.capped).length;
  console.log('');
  console.log(`battles ${n} · ended ${results.filter((r) => r.winner).length} · player wins ${wins('player')} (${pct(wins('player'), n)}) · enemy wins ${wins('enemy')} (${pct(wins('enemy'), n)})`);
  console.log(`rounds median ${median(rounds)} · min ${Math.min(...rounds)} · max ${Math.max(...rounds)} · reached round ${maxRounds} ${last} (${pct(last, n)})`);
  console.log(`clashes ${clashes.length} · at the cap ${capped} (${pct(capped, clashes.length)}) · length median ${clashes.length ? fmtTicks(median(clashes.map((c) => c.ticks))) : '-'}`);
  console.log(`mean wall ${(results.reduce((a, r) => a + r.wallMs, 0) / n).toFixed(0)} ms · rejected commands ${results.reduce((a, r) => a + r.rejectedCommands, 0)}`);
  // the player's Puppet Bloom (R2-Q7): the trios a 3-tile circle could merge in each clash, and the auto policy's uses
  const blooms = results.flatMap((r) => r.bloom ?? []);
  if (blooms.length) {
    const atMuster = blooms.map((b) => b.atMuster), best = blooms.map((b) => b.best);
    const some = (xs: number[]) => `${median(xs)} (mean ${(xs.reduce((a, x) => a + x, 0) / xs.length).toFixed(2)}, ≥1 in ${pct(xs.filter((x) => x >= 1).length, xs.length)})`;
    console.log(`Puppet Bloom's lift a clash, in units: after the muster ${some(atMuster)} · best before use ${some(best)} · fired in ${blooms.filter((b) => b.fired).length} of ${blooms.length} clashes, ${blooms.reduce((a, b) => a + b.lifted, 0)} units lifted`);
  }
  for (const l of paceLines(results)) console.log(l);
}

// ---- whole runs (SPEC §15.2 --run) ----


function mainRun(args: Args, content: ReturnType<typeof nodeContent>): number {
  if (args.scenario || args.replay || args.map || args.enemy) throw new Error('--run picks maps and generals itself; drop --map, --enemy, --scenario and --replay');
  const policies = {
    route: args.autoRoute ?? 'random', draft: args.autoDraft ?? 'greedy', player: args.player ?? 'bot:balanced', power: args.powerPolicy ?? 'none',
  } as const;
  const results: (RunResult & { wallMs: number })[] = [];
  for (const seed of args.seeds) {
    const t0 = performance.now();
    const r = simulateRun(content, seed, { ...policies }, {
      ...(args.hashEvery ? { hashEvery: args.hashEvery } : {}), ...(args.flags ? { flags: args.flags } : {}), ...(args.commander ? { commander: args.commander } : {}),
    });
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
    console.log(JSON.stringify({ ...brief, intel: results[0]!.run.intel ?? null, battles: battles.map((b) => `${b.index} ${b.kind} ${b.map} ${b.general} ${b.winner} by ${b.by} in round ${b.rounds.length}` +
      `${b.lifeLost ? ', a life lost' : ''}${b.opening ? ` opening ${b.opening.dual ? 'dual ' : ''}${b.opening.kinds.join('+')}` : ''}${b.counters?.length ? ` counters ${b.counters.map((c) => `${c.kind}@r${c.round}`).join(',')}` : ''}`) }, null, 2));
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
  const KIND = { swarm: 'S', line: 'L', armor: 'A', elite: 'E', ranged: 'R' } as const;
  const opening = (b: RunResult['battles'][number]) => (b.opening ? `${b.opening.dual ? '2:' : ''}${b.opening.kinds.map((k) => KIND[k]).join('')}` : '-');
  const rows = results.map((r) => [
    String(r.seed), r.outcome, String(r.battleCount), fmtTicks(r.totalBattleTicks), r.reachedBoss ? 'yes' : 'no',
    `${r.lives.left}/${r.lives.max}`, r.battles.map(mark).join(' '), r.battles.map((b) => b.general.split('-').map((w) => w[0]).join('')).join(' '),
    r.battles.map(opening).join(' '), String(r.cards.length), String(r.spores), `${r.wallMs}ms`,
  ]);
  const head = ['seed', 'outcome', 'battles', 'clash time', 'boss', 'lives', 'results', 'generals', 'opening', 'cards', 'spores', 'wall'];
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
  const bossRuns = results.filter((r) => r.reachedBoss);
  // a life is lost only in a lost battle (§8.5)
  const wrongLife = results.flatMap((r) => r.battles.filter((b) => b.lifeLost !== (b.winner !== 'player')).map((b) => `seed ${r.seed} battle ${b.index}`));
  const lives = results.map((r) => r.lives.left);
  const livesAtBoss = bossRuns.map((r) => r.lives.left + (r.battles.find((b) => b.kind === 'boss')?.lifeLost ? 1 : 0));
  console.log('');
  console.log(`runs ${n} · victories ${wins} (${pct(wins, n)}) · reached the boss ${boss} (${pct(boss, n)})`);
  console.log(`battles per run: median ${median(counts)} · min ${Math.min(...counts)} · max ${Math.max(...counts)} · ${inCount}/${n} runs fought 4–5`);
  console.log(`lives left at the end: mean ${(lives.reduce((a, b) => a + b, 0) / n).toFixed(1)} · runs that lost one ${results.filter((r) => r.battles.some((b) => b.lifeLost)).length}/${n}` +
    `${livesAtBoss.length ? ` · at the boss: mean ${(livesAtBoss.reduce((a, b) => a + b, 0) / livesAtBoss.length).toFixed(1)}` : ''}`);
  console.log(`clash time per run (planning untimed): median ${median(mins).toFixed(1)} min · min ${Math.min(...mins).toFixed(1)} · max ${Math.max(...mins).toFixed(1)}`);
  console.log(`mean wall ${(results.reduce((a, r) => a + r.wallMs, 0) / n).toFixed(0)} ms per run`);
  console.log('');
  const expect = (ok: boolean, text: string) => console.log(`${ok ? 'PASS' : 'FAIL'}  expect ${text}`);
  expect(done === n, `every run completes (${done}/${n})`);
  expect(inCount === n, `4–5 battles per run (${inCount}/${n})`);
  expect(wrongLife.length === 0, `a life is lost only in a lost battle${wrongLife.length ? ` (not ${wrongLife.join(', ')})` : ''}`);
  // SPEC §16 Milestone 4, verification 4: the intel file
  const later = results.filter((r) => r.battles.some((b) => b.index >= 2 && b.kind !== 'boss'));
  if (!results.some((r) => r.run.flags.adaptiveGeneral)) return;
  const top = (r: RunResult) => r.battles.filter((b) => b.index >= 2 && b.kind !== 'boss');
  const kinds = new Map<string, number>();
  for (const r of later) for (const b of top(r)) { const k = b.opening?.kinds[0] ?? 'none'; kinds.set(k, (kinds.get(k) ?? 0) + 1); }
  const swarmRuns = later.filter((r) => top(r).every((b) => b.opening?.kinds[0] === 'swarm')).length;
  const dual = bossRuns.filter((r) => r.battles.some((b) => b.kind === 'boss' && b.opening?.dual && b.opening.kinds.length === 2)).length;
  console.log(`battle-2+ opening doctrines (non-boss): ${[...kinds.entries()].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`(the expectations below apply to a mono-Swarm player, as in SPEC §16 Milestone 4 verification 4)`);
  expect(later.length > 0 && swarmRuns / later.length >= 0.8, `battle-2+ opening doctrine is Swarm in ≥80% of runs (${swarmRuns}/${later.length} runs)`);
  expect(bossRuns.length > 0 && dual === bossRuns.length, `the boss runs a dual doctrine (${dual}/${bossRuns.length} boss battles)`);
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
