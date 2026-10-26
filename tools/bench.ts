// npm run bench [-- --quick]: the bench-300 scenario plus one full headless battle, checked against
// the §13.7 budgets in data/balance-targets.json (G11). Exits 1 if a budget is exceeded.
import { nodeContent } from './lib/content.ts';
import { runBench } from './lib/bench.ts';

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
