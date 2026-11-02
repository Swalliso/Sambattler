// npm run bench [-- --quick]: the bench-300 scenario plus one full headless battle, checked against
// the §13.7 budgets in data/balance-targets.json (G11). Exits 1 if a budget is exceeded. Without --quick
// it then times R1's full-colony clash (§15.4), report only until R2 adds it to G11.
import { nodeContent } from './lib/content.ts';
import { runBench, runClashBench } from './lib/bench.ts';

const quick = process.argv.includes('--quick');
const content = nodeContent();
const g = content.targets.G11;
const r = runBench(content, quick ? g.quickTicks : g.benchTicks);

const checks: [string, boolean, string][] = [
  ['tick mean', r.meanMs <= g.tickMeanMs, `${r.meanMs.toFixed(3)} ms (budget ${g.tickMeanMs} ms)`],
  ['tick p99', r.p99Ms <= g.tickP99Ms, `${r.p99Ms.toFixed(3)} ms (budget ${g.tickP99Ms} ms)`],
  ['full battle', r.battleWallMs <= g.battleWallMs, `${r.battleWallMs} ms wall (budget ${g.battleWallMs} ms)`],
];
console.log(`bench-300 · ${r.ticks} ticks${quick ? ' (quick)' : ''} · units ${r.startUnits} at start, peak ${r.peakUnits}`);
console.log(`  mean ${r.meanMs.toFixed(3)} ms · p95 ${r.p95Ms.toFixed(3)} ms · p99 ${r.p99Ms.toFixed(3)} ms · max ${r.maxMs.toFixed(3)} ms · heap growth ${r.heapGrowthKb} KB`);
for (const [name, ok, detail] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
process.exitCode = checks.every((c) => c[1]) ? 0 : 1;

if (!quick) {
  // R1's full-colony clash (SPEC §13.7, §15.4, R1-Q5): report only, so it never changes the exit code
  const ARRIVAL_MS = 5;
  const ms = (x: number) => `${x.toFixed(3)} ms`;
  const within = (ok: boolean) => (ok ? 'within' : 'over');
  console.log('\nfull-colony clash · two full colonies, every plot the biggest squad, merging off · report only until R2 adds it to G11');
  for (const c of runClashBench(content)) {
    console.log(`${c.field} · ${c.plots} plots of ${c.buildingId} × ${c.squad} · ${c.units} units and ${c.supply} supply a side`
      + ` (${within(c.fits)} the 150 live units a side)${c.levers.length ? ` · levers: ${c.levers.join('; ')}` : ''}`);
    console.log(`  arrival ${ms(c.arrivalMs)} (${within(c.arrivalMs <= ARRIVAL_MS)} ${ARRIVAL_MS} ms) · ${c.ticks} ticks to its end at tick ${c.endTick} · units peak ${c.peakUnits}`);
    console.log(`  mean ${ms(c.meanMs)} · p95 ${ms(c.p95Ms)} · p99 ${ms(c.p99Ms)} · max ${ms(c.maxMs)} · heap growth ${c.heapGrowthKb} KB`
      + ` · ${within(c.meanMs <= g.tickMeanMs)} G11's ${g.tickMeanMs} ms mean, ${within(c.p99Ms <= g.tickP99Ms)} its ${g.tickP99Ms} ms p99`);
  }
}
