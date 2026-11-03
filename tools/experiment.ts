// npm run experiment -- [--proto <spec>] [--label name] [--checks duels,g4,…] [--workers n]
// Measures a prototype (src/data/proto.ts) or the shipped rules against the guardrails, on battles in rounds
// (§15.3, T117, T123): every battle, clash and duel is a round job, played on `--workers n` threads (default
// half the machine's; 1 plays them in process, with the same results), each read against the `rounds` targets.
// The default checks are `duels` (G1's squad duels as one round clash each and G2's supply duels with placed
// units, with the intended triangle, Sporeling > Gill Archer > Capguard > Sporeling, as squad duels and as
// supply duels at 12, 30 and 60 supply) and `g4` (bot:balanced against the scripted general by rounds on
// `--maps`, `--g4seeds n` battles, with G13 over the same battles). It also takes `g3` (`--maps`, `--g3seeds`),
// `g5`–`g8` (G6 with G4's battles for its second clause, G8 under both planning policies), `g11` (the round
// bench), `counters` (G12, the strict bar, after G3) and `formation` (G16); `boss` and `runs` (how runs end,
// `--runs n` a commander, default 80, with `--commander <id|all>` and `--power-policy none|auto`); and the
// clash check and battle 1's pairings below. Writes reports/experiments/<label>.json and prints a summary.
//
// The clash check (clash, SPEC §12.2 and §16 R1, tools/lib/clash.ts and the clash bars in tools/lib/balance.ts,
// opt-in): R1's whole armies at equal gold, meeting at once in formation, each clash one round on the round sim
// (`playRoundClash`, R2b/T158). A clash's winner is R1-Q3's: more lanes won, then more uncapped Heartcap damage,
// else a draw worth half a win. Every army is built here and each distinct clash is played once, on `--workers
// n` threads. The check plays, at each of `--budgets` (default 300,600,900,1200,1500) on each of `--fields`
// (default one,twin; `three` is the three-lane screen, a lead outside the means):
// - clash G3: every mono army against bot:balanced's, both seats, `--g3seeds n` a seat (default G3's 50).
//   The mean counts the one-lane field twice;
// - G12, the strict counter matrix: the monos with a clash G3 mean above 40% (every mono G3 played with
//   `--matrix all`, or the `--mono a,b` builds whatever their mean; G3 still plays every mono, so every
//   mono answer is tested) against every answer the counter check tries but the economy and utility monos
//   (or `--answers a,b`). A screen on `--screen-seeds n` a seat (default 20) ranks them by the worst field,
//   and the best `--top n` answers that count (default 3) are confirmed on `--confirm-seeds n` more
//   (default 50). A mono answer that fails clash G3 doesn't count;
// - the clash matrix (#14, #15): each build's best 3 answers per budget, beside §7.4's counter sets in rounds,
//   and how many of the answers that count tied for the best against mono Gill Nest field only swarm spawners;
// - the G4 row: bot:balanced against general:scripted on the one-lane field, `--g4seeds n` a seat (default
//   50 here), and against itself on fresh seeds, for the race model;
// - G13: the share of every clash that reached the 45 s cap, and the median length, over the counted fields
//   (the three-lane screen is reported beside it);
// - the race section (X5, tools/lib/roundRace.ts): per budget and field, the share of clashes whose loser's
//   damage passes the 500 cap, at storm ×1.0 and at the budget's round storm, and the share of drawn rounds;
//   then the race model, which chains the G4 row's clashes (first) and G3's into battles of up to 9 rounds
//   under the 500 cap and its alternatives. It's crude, and not a guardrail;
// - the full colony (§13.7, R1-Q5): the most units and supply a colony fields a side on 12 and 16 plots,
//   against 150 live units a side, with the levers when it's over and A200's sensitivity rows; and the
//   overflow table (#11): each squad and +1 and +2, flagged when it overflows its slot.
// The variants (T031), each in the report's options and its default label: `--merging off` (no knits, at
// the muster or after); `--copies N` (no card more than N times, a capped mono's other plots and gold by
// bot:balanced's weights, #51); `--core6 <id>` (the core-six check: builds, answers and the G3 reference,
// bot:core6, limited to the five core spawners and the candidate, with §11.4's graph on clashes); `--mirror`
// (each G3 build and the reference against its own merge-off twin, 20 seeds a seat: G7's round form);
// `--extra-plots n` (n more plots a side from 1,200 gold, R1-Q4); `--lanes-rule general` (§7.3's round-1 rule on
// Twin Roots). The squad table (§11.4's value per gold) prints first. `--jitter j` moves each unit up to ±j tiles
// per axis after the muster (default 0, no jitter). It prints the bars per budget beside the pooled result, then
// the clashes played and the wall time. The report, labelled `clash` (or `clash-<proto>`), holds the options,
// each mono's and bot:balanced's armies, the bars, the matrix and a `timing` block; `--records` adds every
// clash's record. On the round sim the record has no reading with the cap after the muster, no lane cases,
// damage supply, arrival or parked units, and R1's `--v1-movement`, `--v1-targeting` and squad variants on v1's
// timers (`--squad-seconds`, `--squad-scale`, `--squad`) are gone: squads are the data's. `--proto` refuses
// a preset that doesn't exist, v1's `rework` among them (R2b S4).
//
// `--checks clash --pair a,b` plays one matchup instead (any bot the counter check knows, or a general):
// both armies at each budget on each field for seeds 1 to `--seeds n` (default 3), with `a` in each
// seat. A mirror (a = b) builds its second army on seed 1,000 + s. It prints one line per clash: each lane's
// winner, whether the cap decided it, the surviving supply a–b and when; each Heartcap's damage, capped and
// uncapped; the length; the clash winner and §6.7's round result; and the merges at the muster (to Bloomed +
// to Elder). Then a's score per field and budget, draws worth half. Every record goes in the report, whose
// label defaults to `clash-pair-<a>-<b>`, with `-<proto>` when `--proto` is set.
//
// Battle 1's pairings (pairings, SPEC §16 R1, §12.3 G14, R2-Q13, opt-in): each commander's starter
// candidates (the monos and even pairs of its army cards) against each battle-1 general's army (its opener
// and weights on its battle-1 kit, §7.8), the general in the enemy seat, at `--budgets` (default
// 300,600,900) on `--fields` (default one,twin), `--seeds n` (default 20), `--jitter j` as given, on
// `--workers n`. Passives are off: a clash plays both sides as human. It prints each pairing's best
// candidate and its win %, and the share of pairings with no answer at 60% or more.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { protoContent, ROOT } from './lib/content.ts';
import {
  CLASH_CHECK, CORE_SPAWNERS, clashCache, clashG13, clashRace, core6Answers, core6Ids, core6Spec, counterBotSpec, duelLines, duels, evaluateClashCounters,
  evaluateClashG3, evaluateClashG4Row, evaluateCore6Graph, evaluateG1, evaluateG2, evaluateG3, evaluateG4, evaluateG5, evaluateG6, evaluateG7, evaluateG8,
  evaluateG12, evaluateG13, evaluateG16, evaluateMergeMirror, evaluatePairings, g4Battles, g4Lines, pairingBotSpec, squadLines, squadTable,
  tournamentRow, uniqueCells,
} from './lib/balance.ts';
import type { DuelOutcome, RoundBattleRecord, RoundG3Verdict, Verdict } from './lib/balance.ts';
import { roundBenchChecks, runRoundBench } from './lib/bench.ts';
import { clashArmyIds, clashOpts, fullColony, overflowTable, pairLine, pairScore, playPair } from './lib/clash.ts';
import type { ArmyOpts, ClashOpts, FieldId, LanesRule } from './lib/clash.ts';
import { runEndingLines, runEndings } from './lib/engagement.ts';
import { clashPool, defaultWorkers, inProcessClashes, inProcessRounds, roundPool } from './lib/pool.ts';
import { simulateRun } from '../src/run/index.ts';
import type { PowerPolicy } from '../src/sim/index.ts';

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const proto = opt('--proto') ?? '';
/** The checks on battles in rounds (T117, T123), and the ones played unless `--checks` names others. */
const ROUND_CHECKS = ['duels', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g11', 'counters', 'formation'];
const ALL_CHECKS = [...ROUND_CHECKS, 'boss', 'runs', 'clash', 'pairings'];
const DEFAULT_CHECKS = ['duels', 'g4'];
const checks = new Set((opt('--checks') ?? DEFAULT_CHECKS.join(',')).split(','));
const unknown = [...checks].filter((c) => !ALL_CHECKS.includes(c));
if (unknown.length) throw new Error(`--checks takes ${ALL_CHECKS.join(', ')}, not ${unknown.join(', ')}`);
const roundChecks = new Set([...checks].filter((c) => ROUND_CHECKS.includes(c)));
/** The clash check's one matchup (`--pair a,b`). */
const pair = opt('--pair')?.split(',');
/** The clash check's variant options (T031) and which of them are flags; each one set names the default label. */
const CLASH_VARIANTS = ['--merging', '--copies', '--core6', '--extra-plots', '--lanes-rule', '--mirror'];
const CLASH_FLAGS = ['--mirror'];
const variantLabel = CLASH_VARIANTS.filter((k) => args.includes(k)).map((k) => `-${k.slice(2)}${CLASH_FLAGS.includes(k) ? '' : opt(k) ?? ''}`).join('');
const defaultLabel = checks.has('clash') ? `clash${pair ? `-pair-${pair.join('-')}` : ''}${proto ? `-${proto}` : ''}${variantLabel}`
  : checks.has('pairings') ? `pairings${proto ? `-${proto}` : ''}` : proto || 'baseline';
const label = opt('--label') ?? defaultLabel.replace(/[^a-zA-Z0-9.=-]+/g, '_');
const mapsOpt = opt('--maps')?.split(',');
/** Maps for g4 (default Bogwater Hollow). */
const maps = mapsOpt ?? ['bogwater-hollow'];
/** Seeds per seat for g3 and the clash check's G3 (default G3's own). */
const g3SeedsOpt = Number(opt('--g3seeds') ?? 0);
/** Mono bots for the clash check's G12 builds. */
const monoIds = opt('--mono')?.split(',');
const content = protoContent(proto);
const g3Seeds = g3SeedsOpt || content.targets.G3.seeds;
/** Threads for the round jobs and the clash check (1 plays them in process). */
const workers = Number(opt('--workers') ?? defaultWorkers());
/** Commanders for the runs check: one id, `all`, or none (the run default, Vesper). */
const commanderOpt = opt('--commander');
const commanders: (string | undefined)[] = commanderOpt === 'all' ? Object.keys(content.commanders) : [commanderOpt];
/** How the bot uses the commander power in runs (default none, as before M5). */
const power = (opt('--power-policy') ?? 'none') as PowerPolicy;
if (power !== 'none' && power !== 'auto') throw new Error(`--power-policy must be none or auto, not ${String(power)}`);
if (checks.has('clash') || checks.has('pairings')) {
  // the clash checks refuse a bad number before any check runs (protoContent refused a bad spec above), so they throw away no other check's work (T055)
  const counts = [...(checks.has('clash') ? ['--top', '--screen-seeds', '--g3seeds', '--confirm-seeds', '--g4seeds'] : []), ...(pair || checks.has('pairings') ? ['--seeds'] : [])];
  for (const k of counts) {
    const v = opt(k);
    if (v !== undefined && !(Number.isInteger(Number(v)) && Number(v) >= 1)) throw new Error(`${k} must be a whole number of at least 1, not ${v}`);
  }
  const j = opt('--jitter');
  if (j !== undefined && !(Number(j) >= 0)) throw new Error(`--jitter must be at least 0, not ${j}`);
  if (pair && CLASH_VARIANTS.some((k) => args.includes(k))) throw new Error('the variant options apply to the whole clash check, not to --pair');
}
/** The clash check's variant (T031): the armies' copies, the clashes' options and the core-six candidate, checked before any check runs. */
const clashVariant = checks.has('clash') && !pair ? (() => {
  const whole = (k: string, least: number): number | undefined => {
    const v = opt(k);
    if (v === undefined) return undefined;
    if (!(Number.isInteger(Number(v)) && Number(v) >= least)) throw new Error(`${k} must be a whole number of at least ${least}, not ${v}`);
    return Number(v);
  };
  const cards = clashArmyIds(content);
  const merging = opt('--merging');
  if (merging !== undefined && merging !== 'on' && merging !== 'off') throw new Error(`--merging takes on or off, not ${merging}`);
  const lanesRule = opt('--lanes-rule');
  if (lanesRule !== undefined && lanesRule !== 'line' && lanesRule !== 'general') throw new Error(`--lanes-rule takes line or general, not ${lanesRule}`);
  const core6 = opt('--core6');
  if (core6 !== undefined && (!cards.includes(core6) || (CORE_SPAWNERS as readonly string[]).includes(core6))) {
    throw new Error(`--core6 takes the sixth archetype's candidate, an army card outside the five core spawners, not ${core6}`);
  }
  if (core6 && opt('--answers')) throw new Error('--core6 sets the answers: leave out --answers');
  const copies = whole('--copies', 1), extraPlots = whole('--extra-plots', 0);
  const army: ArmyOpts = copies !== undefined ? { copies } : {};
  const opts: ClashOpts = {
    ...(merging === 'off' ? { merging: false } : {}), ...(extraPlots !== undefined ? { extraPlots } : {}),
    ...(lanesRule ? { lanesRule: lanesRule as LanesRule } : {}),
  };
  return { army, opts, core6, mirror: args.includes('--mirror') };
})() : undefined;
const out: Record<string, unknown> = { proto, label };
const lines: string[] = [`experiment ${label} (proto: ${proto || 'none'})`];
const pct = (x: number) => `${Math.round(x * 100)}%`;
/** A clash bar's verdict, in the report's lines and as the report keeps it. */
const verdict = (v: Verdict) => {
  lines.push(`${v.pass ? 'PASS' : 'FAIL'} ${v.id}: ${v.summary}`, ...v.details.map((d) => `    ${d}`));
  return { pass: v.pass, details: v.details };
};

// The intended triangle (backlog B1): Sporeling > Gill Archer > Capguard > Sporeling, as units and as their buildings.
const TRIANGLE: [string, string, string, string][] = [
  ['sporeling', 'gillArcher', 'sporelingBurrow', 'gillNest'],
  ['gillArcher', 'capguard', 'gillNest', 'capguardHall'],
  ['capguard', 'sporeling', 'capguardHall', 'sporelingBurrow'],
];

if (roundChecks.size) {
  // every battle, clash and duel is a round job, played on the pool. G12's answers and G16's armies come from the
  // counter matrix's bots, which the content and the workers then hold.
  const needsBots = roundChecks.has('counters') || roundChecks.has('formation');
  const spec = needsBots ? [proto, counterBotSpec(content)].filter(Boolean).join(',') : proto;
  const rc = needsBots ? protoContent(spec) : content;
  const pool = workers > 1 ? roundPool(spec, workers) : undefined;
  const run = pool?.run ?? inProcessRounds(rc);
  const maxRounds = rc.balance.rounds.maxRounds;
  // G4's battles in rounds: the `rounds` target's 200 unless `--g4seeds` says otherwise
  const roundG4Seeds = Number(opt('--g4seeds') ?? 0) || rc.targets.rounds.G4.seeds;
  const verdict = (v: Verdict): Verdict => {
    lines.push(`${v.pass ? 'PASS' : 'FAIL'}  ${v.id}: ${v.summary}`, ...v.details.map((d) => `        ${d}`));
    return v;
  };
  const timed = async <T>(name: string, f: () => Promise<T>): Promise<T> => {
    const t0 = Date.now();
    const x = await f();
    lines.push(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s on ${workers} worker${workers > 1 ? 's' : ''}`);
    return x;
  };
  let g4: RoundBattleRecord[] | undefined, g3: RoundG3Verdict | undefined;
  try {
    if (roundChecks.has('duels')) {
      const d = await timed('duels', () => duels(rc, run));
      lines.push(...duelLines(rc, d));
      out.duels = d;
      out.G1 = verdict(evaluateG1(rc, d));
      out.G2 = verdict(evaluateG2(rc, d));
      // the triangle: each edge as squad duels of its buildings, and as supply duels of its units at 12, 30 and 60 supply
      const tri: Record<string, unknown>[] = [];
      for (const [a, b, ba, bb] of TRIANGLE) {
        const games = d.squad.filter((o) => (o.a === ba && o.b === bb) || (o.a === bb && o.b === ba));
        const wins = games.filter((o) => (o.a === ba ? o.valueA > o.valueB : o.valueB > o.valueA)).length;
        const ratio = games.reduce((n, o) => n + (o.a === ba ? (o.valueA + 1) / (o.valueB + 1) : (o.valueB + 1) / (o.valueA + 1)), 0) / Math.max(1, games.length);
        tri.push({ a: ba, b: bb, squad: true, wins, n: games.length, ratio });
        lines.push(`edge ${ba} > ${bb} (squad duels): ${wins}/${games.length}, value ratio ${ratio.toFixed(2)}`);
        for (const supply of [12, 30, 60]) {
          const n = 5;
          const duel = await run(Array.from({ length: n }, (_, i) => ({ kind: 'supply' as const, job: { a, b, seed: i + 1, supply } }))) as (DuelOutcome & { seconds: number })[];
          const won = duel.filter((o) => o.winner === 'a').length;
          const margin = duel.reduce((x, o) => x + (o.valueA - o.valueB) / n, 0), bLeft = duel.reduce((x, o) => x + o.valueB / n, 0), secs = duel.reduce((x, o) => x + o.seconds / n, 0);
          tri.push({ a, b, supply, wins: won, n, margin, bLeft, secs });
          lines.push(`edge ${a} > ${b} @${supply}: ${won}/${n}, margin ${margin >= 0 ? '+' : ''}${margin.toFixed(1)} supply, ${b} left ${bLeft.toFixed(1)}/${supply}, ${secs.toFixed(0)} s`);
        }
      }
      out.triangle = tri;
    }
    if (roundChecks.has('g4')) {
      const rows = [];
      for (const map of maps) {
        const records = await timed(`g4 on ${map}`, () => g4Battles(rc, run, { map, seeds: roundG4Seeds }));
        g4 ??= records;
        const row = tournamentRow(records, maxRounds);
        lines.push(...g4Lines(rc, row));
        verdict(evaluateG4(rc, records));
        verdict(evaluateG13(rc, records));
        rows.push(row);
      }
      out.G4 = rows.length === 1 ? rows[0] : rows;
    }
    if (roundChecks.has('g3') || roundChecks.has('counters')) {
      g3 = await timed('g3', () => evaluateG3(rc, run, { ...(mapsOpt ? { maps: mapsOpt } : {}), ...(g3SeedsOpt ? { seeds: g3SeedsOpt } : {}) }));
      out.G3 = verdict(g3);
    }
    if (roundChecks.has('g5')) out.G5 = verdict(await timed('g5', () => evaluateG5(rc, run)));
    if (roundChecks.has('g6')) {
      g4 ??= await g4Battles(rc, run, { seeds: roundG4Seeds });
      out.G6 = verdict(await timed('g6', () => evaluateG6(rc, run, g4!)));
    }
    if (roundChecks.has('g7')) out.G7 = verdict(await timed('g7', () => evaluateG7(rc, run)));
    if (roundChecks.has('g8')) out.G8 = verdict(await timed('g8', () => evaluateG8(rc, run)));
    if (roundChecks.has('counters')) out.G12 = verdict(await timed('counters', () => evaluateG12(rc, run, { g3: g3! })));
    if (roundChecks.has('formation')) out.G16 = verdict(await timed('formation', () => evaluateG16(rc, run)));
    if (roundChecks.has('g11')) {
      const checks = roundBenchChecks(rc, runRoundBench(rc, { quick: false }));
      lines.push(...checks.map(([name, pass, detail]) => `${pass ? 'PASS' : 'FAIL'}  G11 ${name}: ${detail}`));
      out.G11 = checks;
    }
  } finally {
    await pool?.close();
  }
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
if (checks.has('runs')) {
  const rows = commanders.map((commander) => runEndings(content, Number(opt('--runs') ?? 80), { power, ...(commander ? { commander } : {}) }));
  for (const r of rows) lines.push(...runEndingLines(r));
  out.runs = rows.length === 1 ? rows[0] : rows;
}

if (checks.has('clash')) {
  // R1's clash check (SPEC §12.2, §16 R1): the bars on clashes, or one matchup with --pair
  const budgets = (opt('--budgets')?.split(',') ?? CLASH_CHECK.budgets).map(Number);
  if (budgets.some((n) => !Number.isFinite(n) || n <= 0)) throw new Error(`--budgets must be gold amounts, not ${opt('--budgets')}`);
  const fields = (opt('--fields')?.split(',') ?? CLASH_CHECK.fields) as FieldId[];
  for (const f of fields) if (!['one', 'twin', 'three'].includes(f)) throw new Error(`--fields takes one, twin and three, not ${f}`);
  const jitter = Number(opt('--jitter') ?? 0);
  // the counter check's pair and counter bots join the content, so any answer it knows can play, and so does bot:core6
  const spec = [proto, counterBotSpec(content), clashVariant?.core6 ? core6Spec(clashVariant.core6) : ''].filter(Boolean).join(',');
  const cc = protoContent(spec);
  if (pair) {
    if (pair.length !== 2 || !pair[0] || !pair[1]) throw new Error('--pair takes two controllers, a,b');
    const [a, b] = pair as [string, string];
    const seeds = Number(opt('--seeds') ?? 3);
    const t0 = Date.now();
    const records = playPair(cc, { a, b, budgets, fields, seeds, jitter });
    const ms = Date.now() - t0;
    lines.push(`clash: a = ${a}, b = ${b}; ${seeds} seed${seeds > 1 ? 's' : ''} a seat, jitter ${jitter ? `±${jitter}` : 'off'}`);
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
    const v = clashVariant!;
    const options = {
      budgets, fields, jitter, g3Seeds,
      screenSeeds: num('--screen-seeds') ?? CLASH_CHECK.screenSeeds, confirmSeeds: num('--confirm-seeds') ?? CLASH_CHECK.confirmSeeds, top: num('--top') ?? CLASH_CHECK.top,
      mono: monoIds ?? null, answers: answers ?? null, matrix: matrix ?? null, records: args.includes('--records'), workers,
      g4Seeds: num('--g4seeds') || 50,
      // the variant (T031): the clashes' options with their first guesses filled in, and the armies' copies
      ...clashOpts(v.opts), extraPlotsFrom: CLASH_CHECK.extraPlotsFrom, copies: v.army.copies ?? null, core6: v.core6 ?? null, mirror: v.mirror,
    };
    const variant = [
      proto ? `proto ${proto}` : '', ...CLASH_VARIANTS.filter((k) => args.includes(k)).map((k) => `${k.slice(2)}${CLASH_FLAGS.includes(k) ? '' : ` ${opt(k)}`}`),
      v.opts.extraPlots ? `the extra plots from ${CLASH_CHECK.extraPlotsFrom} gold` : '',
    ].filter(Boolean).join(', ');
    const pool = workers > 1 ? clashPool(spec, workers) : undefined;
    try {
      const t0 = Date.now();
      const cache = clashCache(cc, pool?.run ?? inProcessClashes(cc), { jitter, keep: options.records, opts: v.opts, extraPlotsFrom: CLASH_CHECK.extraPlotsFrom, army: v.army });
      lines.push(`clash check: ${budgets.join(', ')} gold on ${fields.join(', ')}, jitter ${jitter ? `±${jitter}` : 'off'}; a draw is half a win`);
      lines.push(`clash variant: ${variant || 'none (the baseline)'}`);
      lines.push(...squadLines(cc));
      // G3 plays every mono, so G12 can count every mono answer; --mono picks only G12's builds, as in v1 (T054).
      // The core-six check limits both to the six, against bot:core6 (R1-Q6)
      const g3 = await evaluateClashG3(cc, { cache, budgets, fields, seeds: g3Seeds, ...(v.core6 ? { ids: core6Ids(v.core6), defender: 'bot:core6' } : {}) });
      const g12 = await evaluateClashCounters(cc, {
        cache, g3, screenSeeds: options.screenSeeds, confirmSeeds: options.confirmSeeds, top: options.top,
        ...(matrix ? { matrix: 'all' as const } : {}), ...(v.core6 ? { answers: core6Answers(cc, v.core6) } : answers ? { answers } : {}), ...(monoIds ? { builds: monoIds } : {}),
      });
      const graph = v.core6 ? await evaluateCore6Graph(cc, { cache, candidate: v.core6, budgets, fields, seeds: options.screenSeeds }) : undefined;
      const mirror = v.mirror ? await evaluateMergeMirror(cc, { cache, g3 }) : undefined;
      const g4row = await evaluateClashG4Row(cc, { cache, budgets, seeds: options.g4Seeds });
      // G13 and the cap-binding share read every cell the check played, each once (plan calls 15, 17)
      const all = uniqueCells(g3.records, g12.records, g4row.records, graph?.records ?? [], mirror?.records ?? []);
      const g13 = clashG13(all, g3.records);
      const race = clashRace(all, [...g4row.records, ...g3.records]);
      const ms = Date.now() - t0;
      const { cells, played } = cache.stats();
      const descriptions = Object.fromEntries([...new Set(Object.values(g12.answers).flat())].map((a) => [a, cc.bots[a.slice(4)]?.description ?? '']));
      const g3Lines = verdict(g3), g12Lines = verdict(g12);
      lines.push(...g12.matrixLines, ...(graph?.lines ?? []), ...(mirror?.lines ?? []));
      const g13Lines = verdict(g13);
      lines.push(...g4row.details, ...race.details);
      const colony = fullColony(cc), overflow = overflowTable(cc);
      lines.push(...colony.lines, ...overflow.lines);
      lines.push(`clash check: ${played} clashes played for ${cells} cells in ${(ms / 1000).toFixed(1)} s on ${workers} worker${workers > 1 ? 's' : ''}`);
      out.clash = {
        options,
        squads: squadTable(cc),
        armies: g3.armies,
        G3: { ...g3Lines, seeds: g3.seeds, budgets: g3.budgets, fields: g3.fields, defender: g3.defender, bots: g3.bots },
        G12: {
          ...g12Lines, screenSeeds: g12.screenSeeds, confirmSeeds: g12.confirmSeeds, top: g12.top, sets: g12.sets,
          builds: g12.builds.map(({ matrix: _matrix, ...b }) => b), answers: g12.answers, bots: descriptions,
        },
        matrix: g12.builds.map((b) => ({ build: b.build, rows: b.matrix })),
        ...(graph ? { core6: { candidate: v.core6, edges: graph.edges } } : {}),
        ...(mirror ? { mirror: mirror.rows } : {}),
        G13: { ...g13Lines, all: g13.all, g3: g13.g3, ...(g13.three ? { three: g13.three } : {}), cells: g13.cells },
        G4row: { budgets: g4row.budgets, seeds: g4row.seeds, scores: g4row.scores },
        race: { cells: race.cells, all: race.all, groups: race.race.groups },
        colony: { squads: colony.squads, fields: colony.fields, sensitivity: colony.sensitivity },
        overflow: overflow.rows,
        timing: { ms, clashes: played, cells },
        ...(options.records ? { records: cache.records() } : {}),
      };
    } finally {
      await pool?.close();
    }
  }
}

if (checks.has('pairings')) {
  // battle 1's pairings (SPEC §16 R1, R2-Q13): the counter check's pairs and the generals' battle-1 armies join the content.
  // Its refusals and number checks run with the clash check's, before any check
  const spec = [proto, counterBotSpec(content), pairingBotSpec(content)].filter(Boolean).join(',');
  const pc = protoContent(spec);
  const budgets = (opt('--budgets')?.split(',') ?? ['300', '600', '900']).map(Number);
  const fields = (opt('--fields')?.split(',') ?? CLASH_CHECK.fields) as FieldId[];
  const options = { budgets, fields, seeds: Number(opt('--seeds') ?? 20), jitter: Number(opt('--jitter') ?? 0), workers };
  const pool = workers > 1 ? clashPool(spec, workers) : undefined;
  try {
    const t0 = Date.now();
    const cache = clashCache(pc, pool?.run ?? inProcessClashes(pc), { jitter: options.jitter });
    const v = await evaluatePairings(pc, { cache, budgets, fields, seeds: options.seeds });
    const ms = Date.now() - t0;
    lines.push(...v.details, `pairings: ${cache.stats().played} clashes played for ${cache.stats().cells} cells in ${(ms / 1000).toFixed(1)} s`);
    out.pairings = { options, rows: v.rows, unanswered: v.unanswered, budgets: v.budgets, timing: { ms, ...cache.stats() } };
  } finally {
    await pool?.close();
  }
}

const dir = join(ROOT, 'reports', 'experiments');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${label}.json`), JSON.stringify(out, null, 2));
console.log(lines.join('\n'));
console.log(`\nreport: reports/experiments/${label}.json`);
