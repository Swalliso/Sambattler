// npm run balance -- duel [--seeds n] [--supply n] | tournament [--seeds n] | guardrails
// Writes reports/balance/<timestamp>.{md,json} and prints the guardrail verdicts (SPEC §12.2, §15.3).
// `--supply 60` re-runs the supply duels at army scale (G2 itself stays at its data value).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeContent, ROOT } from './lib/content.ts';
import {
  evaluateG1, evaluateG2, evaluateG3, evaluateG4, evaluateG5, evaluateG6, evaluateG7, matchup, spawnerIds, supplyDuel,
} from './lib/balance.ts';
import type { DuelOutcome, Verdict } from './lib/balance.ts';
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

if (mode === 'duel') {
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
  console.error('usage: npm run balance -- duel [--supply n] | tournament | guardrails [--seeds n]');
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
