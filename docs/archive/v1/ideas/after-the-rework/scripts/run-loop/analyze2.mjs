// node docs/archive/v1/ideas/after-the-rework/scripts/run-loop/analyze2.mjs <files...>: decisions per run and how often build-defining cards show up.
import { readFileSync } from 'node:fs';
const RULE = new Set(['relic:sporeCloud', 'relic:martyrsBloom', 'relic:sporeTithe', 'relic:rotEater']);
const RARE = new Set(['relic:mycorrhizalLink', 'relic:sporeCloud', 'relic:eldersPatience', 'relic:sporestormSigil', 'relic:rotEater', 'relic:martyrsBloom']);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const agg = { runs: 0, win: [], all: [], sawRare: 0, sawRule: 0, endRule: 0, winSawRule: 0, wins: 0, offersPerRun: [], firstRule: [] };
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  for (const r of d.runs) {
    agg.runs++;
    const bs = d.battles.filter((b) => b.seed === r.seed);
    const sp = d.spoils.filter((s) => s.seed === r.seed);
    const nodes = d.nodes.filter((n) => n.seed === r.seed);
    const offers = [...bs.flatMap((b) => b.offers.map((o) => ({ o, at: b.index }))), ...sp.map((s) => ({ o: s.offer, at: 99 }))];
    const ids = (o) => o.map((c) => c.split('|')[0]);
    const sawRare = offers.some(({ o }) => ids(o).some((c) => RARE.has(c)));
    const ruleOffer = offers.find(({ o }) => ids(o).some((c) => RULE.has(c)));
    if (sawRare) agg.sawRare++;
    if (ruleOffer) { agg.sawRule++; agg.firstRule.push(ruleOffer.at); }
    if (r.relics.some((x) => RULE.has(`relic:${x}`))) agg.endRule++;
    // decisions: in-battle draft picks, spoils picks, route rows with a real choice (rows 2-5 reached), events and groves
    const routeChoices = nodes.filter((n) => ['battle', 'elite', 'event', 'grove', 'boss'].includes(n.kind) && n.row >= 1 && n.row <= 4).length;
    const dec = { drafts: bs.reduce((n, b) => n + b.draftsOpened, 0), spoils: sp.length, route: routeChoices, events: nodes.filter((n) => n.kind === 'event-choice').length, groves: nodes.filter((n) => n.kind === 'grove-choice').length, battles: bs.length };
    agg.all.push(dec);
    agg.offersPerRun.push(offers.length);
    if (r.outcome === 'victory') { agg.wins++; agg.win.push(dec); if (ruleOffer) agg.winSawRule++; }
  }
}
const m = (arr, k) => mean(arr.map((x) => x[k])).toFixed(2);
console.log(`runs ${agg.runs}, wins ${agg.wins}`);
console.log(`all runs: battles ${m(agg.all, 'battles')}, in-battle drafts ${m(agg.all, 'drafts')}, spoils ${m(agg.all, 'spoils')}, route choices ${m(agg.all, 'route')}, events ${m(agg.all, 'events')}, groves ${m(agg.all, 'groves')}; offers seen ${mean(agg.offersPerRun).toFixed(1)}`);
console.log(`winning runs: battles ${m(agg.win, 'battles')}, in-battle drafts ${m(agg.win, 'drafts')}, spoils ${m(agg.win, 'spoils')}, route choices ${m(agg.win, 'route')}, events ${m(agg.win, 'events')}, groves ${m(agg.win, 'groves')}`);
console.log(`runs offered any rare relic: ${agg.sawRare}/${agg.runs}; offered a rule-changing relic (Spore Cloud, Martyr's Bloom, Spore Tithe, Rot-Eater): ${agg.sawRule}/${agg.runs} (winning runs ${agg.winSawRule}/${agg.wins}); ended owning one: ${agg.endRule}/${agg.runs}`);
const hist = {}; for (const a of agg.firstRule) hist[a] = (hist[a] ?? 0) + 1;
console.log(`first rule-changing offer by battle (99 = spoils): ${JSON.stringify(hist)}`);
