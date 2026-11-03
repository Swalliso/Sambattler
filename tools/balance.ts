// npm run balance -- duel [--seeds n] [--supply n] | tournament [--seeds n] [--commanders all|a,b] | guardrails
// Writes reports/balance/<timestamp>.{md,json} and prints the guardrail verdicts (SPEC §12.2, §15.3).
// `--supply 60` re-runs the supply duels at army scale (G2 itself stays at its data value).
// `tournament --commanders all` plays whole runs per commander instead of the bot tournament (SPEC §16 M5).
// `--rounds` (R2a, temporary; §15.3, T116, T123) plays `duel` and `tournament` on single battles in rounds: squad
// duels as one round clash, supply duels with placed units, and the four bots against the scripted general by
// rounds. `guardrails --rounds` plays the round guardrails (G1–G8, G12, G13, G16) on the pool and prints their
// verdicts against the `rounds` targets. R2b removes the option.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeContent, protoContent, ROOT } from './lib/content.ts';
import {
  commanderTournament, counterBotSpec, evaluateG1, evaluateG2, evaluateG3, evaluateG4, evaluateG5, evaluateG6, evaluateG7, matchup, spawnerIds, supplyDuel,
} from './lib/balance.ts';
import type { DuelOutcome, Verdict } from './lib/balance.ts';
import { defaultWorkers, inProcessRounds, roundPool } from './lib/pool.ts';
import {
  duelLines, duels, evaluateG1 as roundG1, evaluateG2 as roundG2, evaluateG3 as roundG3, evaluateG4 as roundG4, evaluateG5 as roundG5,
  evaluateG6 as roundG6, evaluateG7 as roundG7, evaluateG8 as roundG8, evaluateG12 as roundG12, evaluateG13 as roundG13, evaluateG16 as roundG16,
  g4Battles, rowLine, tournament,
} from './lib/rounds/balance.ts';
import { fmtTicks, median } from './lib/run.ts';

const args = process.argv.slice(2);
const mode = args[0] ?? 'duel';
const seedsArg = args.indexOf('--seeds');
const content = nodeContent();
if (seedsArg >= 0) {
  const n = Number(args[seedsArg + 1]);
  if (mode === 'duel') { content.targets.G1.seeds = n; content.targets.G2.seeds = n; }
  else { content.targets.G3.seeds = n; content.targets.G4.seeds = n; content.targets.G5.seeds = n; content.targets.G7.seeds = n; }
}
const commandersArg = args.indexOf('--commanders');
const commanderList = commandersArg < 0 ? null
  : args[commandersArg + 1] === 'all' ? Object.keys(content.commanders) : (args[commandersArg + 1] ?? '').split(',').filter(Boolean);
for (const id of commanderList ?? []) if (!content.commanders[id]) throw new Error(`--commanders: unknown commander "${id}"`);
const supplyArg = args.indexOf('--supply');
const armySupply = supplyArg >= 0 ? Number(args[supplyArg + 1]) : 0;
const rounds = args.includes('--rounds');

const md: string[] = [`# Balance report: ${mode}`, '', `Generated ${new Date().toISOString()}`, ''];
const json: Record<string, unknown> = { mode };
const verdicts: Verdict[] = [];

function matrix(title: string, outcomes: DuelOutcome[], ids: string[], value: (o: DuelOutcome) => number): void {
  md.push(`## ${title}`, '', `| A \\ B | ${ids.join(' | ')} |`, `|---|${ids.map(() => '---').join('|')}|`);
  for (const a of ids) {
    const cells = ids.map((b) => {
      if (a === b) return '—';
      const games = outcomes.filter((o) => o.a === a && o.b === b);
      const wins = games.filter((o) => o.winner === 'a').length;
      const v = games.reduce((s, o) => s + value(o), 0) / Math.max(1, games.length);
      return `${wins}/${games.length} (${v.toFixed(2)})`;
    });
    md.push(`| **${a}** | ${cells.join(' | ')} |`);
  }
  md.push('', 'Cells: A\'s wins / games (mean remaining-value ratio A:B).', '');
}

if (rounds) {
  // battles in rounds (§15.3, T116): played in process; `npm run experiment -- --rounds` plays them on the pool (T117)
  const run = inProcessRounds(content);
  const maxRounds = content.balance.rounds.maxRounds;
  if (mode === 'duel') {
    const d = await duels(content, run, armySupply ? { supply: armySupply } : {});
    const ids = spawnerIds(content);
    matrix('Squad duels in rounds (equal gold on one building, one round clash)', d.squad, ids, (o) => (o.valueA + 1) / (o.valueB + 1));
    matrix(`Supply duels in rounds (${armySupply || content.targets.G2.supply} supply each, one round clash)`, d.supply,
      ids.map((id) => content.buildings[id]!.spawn!.unit), (o) => (o.valueA + 0.01) / (o.valueB + 0.01));
    const lines = duelLines(content, d);
    md.push('## Readings', '', ...lines.map((l) => `- ${l}`), '', "The round G1 and G2 verdicts come with R2a's S18 (T123).", '');
    for (const l of lines) console.log(l);
    json.squad = d.squad;
    json.supply = d.supply;
    json.edges = d.edges;
  } else if (mode === 'tournament' && !commanderList) {
    const seeds = content.targets.G4.seeds;
    const rows = await tournament(content, run, { seeds });
    md.push(`## Bots vs the scripted general, battles in rounds (${seeds} seeds, Bogwater Hollow)`, '',
      `| bot | win % | median rounds | reached round ${maxRounds} | clashes at the cap | median clash | lead changes | rejected |`, '|---|---|---|---|---|---|---|---|');
    const pct = (n: number, d: number) => `${Math.round((100 * n) / Math.max(1, d))}%`;
    for (const r of rows) {
      md.push(`| ${r.player} | ${pct(r.wins, r.games)} | ${r.medianRounds} | ${pct(r.lastRound, r.games)} | ${pct(r.capped, r.clashes)} | ${((r.medianClashTicks ?? 0) / 20).toFixed(1)} s | ${r.leadChanges} in ${r.changedBattles} battles | ${r.rejected} |`);
      console.log(rowLine(r, maxRounds));
    }
    md.push('');
    json.vsGeneral = rows;
  } else if (mode === 'guardrails') {
    // the round guardrails (§12.3, T123) on the pool, with the counter matrix's bots for G12's answers and G16's armies
    const spec = counterBotSpec(content);
    const rc = protoContent(spec);
    const pool = roundPool(spec, defaultWorkers());
    try {
      const d = await duels(rc, pool.run), g3 = await roundG3(rc, pool.run), g4 = await g4Battles(rc, pool.run);
      verdicts.push(roundG1(rc, d), roundG2(rc, d), g3, roundG4(rc, g4), await roundG5(rc, pool.run), await roundG6(rc, pool.run, g4), await roundG7(rc, pool.run));
      verdicts.push(await roundG8(rc, pool.run), await roundG12(rc, pool.run, { g3 }), roundG13(rc, g4), await roundG16(rc, pool.run));
    } finally {
      await pool.close();
    }
  } else {
    console.error('usage: npm run balance -- duel [--supply n] | tournament [--seeds n] | guardrails --rounds (--commanders plays runs, R2b\'s)');
    process.exit(2);
  }
} else if (mode === 'duel') {
  const g1 = evaluateG1(content);
  const ids = spawnerIds(content);
  matrix('Production duels (equal gold, 3 minutes)', g1.outcomes, ids, (o) => (o.valueA + 1) / (o.valueB + 1));
  const g2 = evaluateG2(content);
  const units = ids.map((id) => content.buildings[id]!.spawn!.unit);
  matrix('Supply duels (12 supply each, to the death)', g2.outcomes, units, (o) => (o.valueA + 0.01) / (o.valueB + 0.01));
  verdicts.push(g1.verdict, g2.verdict);
  json.production = g1.outcomes;
  json.supply = g2.outcomes;
  json.edges = g2.edges;
  if (armySupply) {
    // army-scale duels: Lanchester effects make narrow 12-supply edges into blowouts (or reverse them)
    const army = [];
    for (const a of units) for (const b of units) {
      if (a === b) continue;
      for (let seed = 1; seed <= content.targets.G2.seeds; seed++) army.push(supplyDuel(content, a, b, seed, armySupply));
    }
    matrix(`Supply duels at army scale (${armySupply} supply each)`, army, units, (o) => (o.valueA + 0.01) / (o.valueB + 0.01));
    md.push('Margins (mean remaining supply, A − B):', '');
    for (const a of units) for (const b of units) {
      if (a >= b) continue;
      const games = army.filter((o) => o.a === a && o.b === b);
      const m = games.reduce((x, o) => x + o.valueA - o.valueB, 0) / games.length;
      md.push(`- ${m >= 0 ? `${a} > ${b}` : `${b} > ${a}`}: ${Math.abs(m).toFixed(1)}`);
      console.log(`army ${armySupply}: ${m >= 0 ? `${a} > ${b}` : `${b} > ${a}`} by ${Math.abs(m).toFixed(1)} supply`);
    }
    md.push('');
    json.army = army;
  }
} else if (mode === 'tournament' && commanderList) {
  const seeds = seedsArg >= 0 ? Number(args[seedsArg + 1]) : 30;
  const t = commanderTournament(content, commanderList, seeds);
  md.push(`## Commanders: whole runs (${seeds} seeds each, bot:balanced, greedy drafts, random route, power policy auto)`, '',
    '| commander | runs won | boss reached | battles won | lives left a run | power uses | power damage | trios |', '|---|---|---|---|---|---|---|---|');
  for (const r of t.rows) {
    md.push(`| ${r.commander} | ${((100 * r.victories) / r.runs).toFixed(0)}% (${r.victories}/${r.runs}) | ${r.reachedBoss}/${r.runs} | ${r.battlesWon}/${r.battles} | ${(r.livesLeft / Math.max(1, r.runs)).toFixed(1)} | ${r.powerUses} | ${r.powerDamage} | ${r.powerMerges} |`);
  }
  md.push('');
  json.commanders = t.rows;
  verdicts.push(t.verdict);
} else if (mode === 'tournament') {
  const seeds = content.targets.G4.seeds;
  const bots = ['bot:balanced', 'bot:rush', 'bot:turtle', 'bot:greedy'];
  md.push(`## Bots vs the scripted general (${seeds} seeds, Bogwater Hollow)`, '', '| bot | win % | median length | decisions | rejected |', '|---|---|---|---|---|');
  const rows: Record<string, unknown>[] = [];
  for (const bot of bots) {
    const m = matchup(content, bot, 'general:scripted', seeds, false);
    rows.push({ bot, ...m });
    md.push(`| ${bot} | ${((100 * m.winsA) / m.games).toFixed(0)}% | ${fmtTicks(median(m.lengths))} | ${((100 * m.decisions) / m.games).toFixed(0)}% | ${m.rejected} |`);
  }
  md.push('');
  json.vsGeneral = rows;
  verdicts.push(evaluateG3(content), evaluateG4(content), evaluateG5(content), evaluateG7(content));
} else if (mode === 'guardrails') {
  verdicts.push(evaluateG1(content).verdict, evaluateG2(content).verdict, evaluateG3(content), evaluateG4(content), evaluateG5(content), evaluateG6(content), evaluateG7(content));
} else {
  console.error('usage: npm run balance -- duel [--supply n] | tournament [--commanders all|a,b] | guardrails [--seeds n]');
  process.exit(2);
}

md.push('## Guardrail verdicts', '');
for (const v of verdicts) {
  md.push(`### ${v.id} ${v.pass ? 'PASS' : 'FAIL'}: ${v.summary}`, '', ...v.details.map((d) => `- ${d}`), '');
  console.log(`${v.pass ? 'PASS' : 'FAIL'}  ${v.id}: ${v.summary}`);
  for (const d of v.details) console.log(`        ${d}`);
}
json.verdicts = verdicts;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join(ROOT, 'reports', 'balance');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${stamp}-${mode}.md`), md.join('\n'));
writeFileSync(join(dir, `${stamp}-${mode}.json`), JSON.stringify(json, null, 2));
console.log(`\nreport: reports/balance/${stamp}-${mode}.md`);
process.exitCode = verdicts.every((v) => v.pass) ? 0 : 1;
