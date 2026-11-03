// npm run balance -- duel [--supply n] | tournament [--seeds n] [--commanders all|a,b] | guardrails
// Writes reports/balance/<timestamp>.{md,json} and prints the guardrail verdicts (SPEC §12.2, §15.3), on battles
// in rounds: `duel` plays the squad duels as one round clash each and the supply duels with placed units (`--supply
// 60` re-runs them at army scale); `tournament` plays the four bots against the scripted general by rounds, or with
// `--commanders` whole runs per commander (SPEC §16 M5); `guardrails` plays the round guardrails (G1–G8, G12, G13,
// G16) on the pool and prints their verdicts against the `rounds` targets.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeContent, protoContent, ROOT } from './lib/content.ts';
import {
  commanderTournament, counterBotSpec, duelLines, duels, evaluateG1, evaluateG2, evaluateG3, evaluateG4, evaluateG5, evaluateG6, evaluateG7, evaluateG8,
  evaluateG12, evaluateG13, evaluateG16, g4Battles, rowLine, spawnerIds, tournament,
} from './lib/balance.ts';
import type { DuelOutcome, Verdict } from './lib/balance.ts';
import { defaultWorkers, inProcessRounds, roundPool } from './lib/pool.ts';

const args = process.argv.slice(2);
const mode = args[0] ?? 'duel';
const seedsArg = args.indexOf('--seeds');
const content = nodeContent();
const commandersArg = args.indexOf('--commanders');
const commanderList = commandersArg < 0 ? null
  : args[commandersArg + 1] === 'all' ? Object.keys(content.commanders) : (args[commandersArg + 1] ?? '').split(',').filter(Boolean);
for (const id of commanderList ?? []) if (!content.commanders[id]) throw new Error(`--commanders: unknown commander "${id}"`);
const supplyArg = args.indexOf('--supply');
const armySupply = supplyArg >= 0 ? Number(args[supplyArg + 1]) : 0;

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

// played in process; `npm run experiment` plays them on the pool (T117)
const run = inProcessRounds(content);
const maxRounds = content.balance.rounds.maxRounds;
if (mode === 'duel') {
  const d = await duels(content, run, armySupply ? { supply: armySupply } : {});
  const ids = spawnerIds(content);
  matrix('Squad duels (equal gold on one building, one round clash)', d.squad, ids, (o) => (o.valueA + 1) / (o.valueB + 1));
  matrix(`Supply duels (${armySupply || content.targets.G2.supply} supply each, one round clash)`, d.supply,
    ids.map((id) => content.buildings[id]!.squad!.unit), (o) => (o.valueA + 0.01) / (o.valueB + 0.01));
  const lines = duelLines(content, d);
  md.push('## Readings', '', ...lines.map((l) => `- ${l}`), '');
  for (const l of lines) console.log(l);
  json.squad = d.squad;
  json.supply = d.supply;
  json.edges = d.edges;
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
  const seeds = seedsArg >= 0 ? Number(args[seedsArg + 1]) : content.targets.G4.seeds;
  const rows = await tournament(content, run, { seeds });
  md.push(`## Bots vs the scripted general (${seeds} seeds, Bogwater Hollow)`, '',
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
    const d = await duels(rc, pool.run), g3 = await evaluateG3(rc, pool.run), g4 = await g4Battles(rc, pool.run);
    verdicts.push(evaluateG1(rc, d), evaluateG2(rc, d), g3, evaluateG4(rc, g4), await evaluateG5(rc, pool.run), await evaluateG6(rc, pool.run, g4), await evaluateG7(rc, pool.run));
    verdicts.push(await evaluateG8(rc, pool.run), await evaluateG12(rc, pool.run, { g3 }), evaluateG13(rc, g4), await evaluateG16(rc, pool.run));
  } finally {
    await pool.close();
  }
} else {
  console.error('usage: npm run balance -- duel [--supply n] | tournament [--seeds n] [--commanders all|a,b] | guardrails');
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
