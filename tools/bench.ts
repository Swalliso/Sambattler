// npm run bench [-- --quick]: the round cases, each checked against the §13.7 budgets in data/balance-targets.json
// (G11, §15.4, R2a plan Call 24): bench-300's clash, the full colonies' arrival, the general's planning turn, the
// sim part of a planning command and one full battle, and the resume's replay against about a second, which is
// report-only (§8.9, A088). Exits 1 if a budget is exceeded. Under `process.env.CI` its timings are held to a
// guard of 3× each budget, since CI's shared runner ticks slower.
import { nodeContent } from './lib/content.ts';
import { RESUME_ABOUT_MS, TURN_GENERALS, roundBenchChecks, runRoundBench } from './lib/bench.ts';

const quick = process.argv.includes('--quick');
const content = nodeContent();
const g = content.targets.G11;
const r = runRoundBench(content, { quick });
const ms = (x: number) => `${x.toFixed(3)} ms`;
const within = (ok: boolean) => (ok ? 'within' : 'over');
const b = r.bench;
console.log(`bench-300 in rounds · ${b.ticks} ticks${quick ? ' (quick)' : ''} over ${b.clashes} fresh clashes · units ${b.startUnits} at the start, peak ${b.peakUnits}, ${b.meanUnits.toFixed(0)} live on average`);
console.log(`  weighted by live units: mean ${ms(b.meanMs)} · p95 ${ms(b.p95Ms)} · p99 ${ms(b.p99Ms)} · max ${ms(b.maxMs)} · heap growth ${b.heapGrowthKb} KB`);
for (const c of r.colonies) {
  console.log(`full-colony clash · ${c.field} (${c.mapId}) · ${c.plots} plots of ${c.buildingId} × ${c.squad} · ${c.units} units and ${c.supply} supply a side`
    + ` (${within(c.fits)} the 150 live units a side)${c.levers.length ? ` · levers: ${c.levers.join('; ')}` : ''} · merging off`);
  console.log(`  arrival ${ms(c.arrivalMs)} · ${c.ticks} ticks after the muster, to its end at clash tick ${c.endTick} · units peak ${c.peakUnits}`);
  console.log(`  mean ${ms(c.meanMs)} · p95 ${ms(c.p95Ms)} · p99 ${ms(c.p99Ms)} · max ${ms(c.maxMs)} · heap growth ${c.heapGrowthKb} KB`
    + ` · ${within(c.meanMs <= g.tickMeanMs)} G11's ${g.tickMeanMs} ms mean, ${within(c.p99Ms <= g.tickP99Ms)} its ${g.tickP99Ms} ms p99`);
}
console.log(`the general's planning turn · ${r.turns.turns} turns, rounds 2 on, bot:balanced against ${TURN_GENERALS.join(', ')} · mean ${ms(r.turns.meanMs)} · max ${ms(r.turns.maxMs)}`);
console.log(`a planning command's sim part · ${r.plans.map((p) => `${p.field}, the ${p.plots}th plot (${p.units} units): mean ${ms(p.meanMs)}, max ${ms(p.maxMs)} over ${p.runs}`).join(' · ')}`);
console.log(`full battle · bot:balanced against general:scripted, seed 1 · ${r.battle.rounds} rounds in ${r.battle.wallMs} ms`);
const rs = r.resume;
console.log(`resume replay · a round-9 planning save (seed ${rs.seed}, ${(rs.bytes / 1024).toFixed(1)} KB): ${rs.rounds} rounds and ${rs.ticks} clash ticks`
  + ` replayed and hash-checked in ${ms(rs.ms)} · ${within(rs.ms <= RESUME_ABOUT_MS)} about ${RESUME_ABOUT_MS / 1000} s (report-only)`);
const checks = roundBenchChecks(content, r);
for (const [name, ok, detail] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
process.exitCode = checks.every((c) => c[1]) ? 0 : 1;
