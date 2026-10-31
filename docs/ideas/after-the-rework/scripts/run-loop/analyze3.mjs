// node docs/ideas/after-the-rework/scripts/run-loop/analyze3.mjs <files...>: per card, in how many runs it was offered at least once (in battle or spoils), and in how many runs reaching battle 3.
import { readFileSync } from 'node:fs';
const seen = {}, seenDeep = {};
let runs = 0, deep = 0;
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  for (const r of d.runs) {
    runs++;
    const bs = d.battles.filter((b) => b.seed === r.seed);
    const sp = d.spoils.filter((s) => s.seed === r.seed);
    const set = new Set([...bs.flatMap((b) => b.offers.flat()), ...sp.flatMap((s) => s.offer)].map((c) => c.split('|')[0]));
    const isDeep = bs.length >= 3;
    if (isDeep) deep++;
    for (const c of set) { seen[c] = (seen[c] ?? 0) + 1; if (isDeep) seenDeep[c] = (seenDeep[c] ?? 0) + 1; }
  }
}
const pct = (a, b) => `${Math.round((100 * (a ?? 0)) / b)}%`;
for (const t of ['bp', 'relic']) {
  const rows = Object.entries(seen).filter(([k]) => k.startsWith(`${t}:`)).sort((a, b) => b[1] - a[1]);
  console.log(`${t}: (runs ${runs}; runs with 3+ battles ${deep})`);
  console.log(rows.map(([k, v]) => `  ${k.split(':')[1]} ${pct(v, runs)} / ${pct(seenDeep[k], deep)}`).join('\n'));
}
