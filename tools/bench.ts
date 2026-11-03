// npm run bench [-- --quick] [--rounds]: the bench-300 scenario plus one full headless battle, checked against
// the §13.7 budgets in data/balance-targets.json (G11). Exits 1 if a budget is exceeded. Without --quick
// it then times R1's full-colony clash (§15.4), report only until R2 adds it to G11. `--rounds` (R2a, temporary)
// runs the cases in round form instead, each checked (§15.4, R2a plan Call 24): bench-300's clash, the full
// colonies' arrival, the general's planning turn, the sim part of a planning command and one full battle. Under
// `process.env.CI` its timings are held to a guard of 3× each budget, since CI's shared runner ticks slower.
import { nodeContent } from './lib/content.ts';
import { runBench, runClashBench } from './lib/bench.ts';
import { TURN_GENERALS, roundBenchChecks, runRoundBench } from './lib/rounds/bench.ts';

const quick = process.argv.includes('--quick');
const content = nodeContent();
const g = content.targets.G11;
if (process.argv.includes('--rounds')) roundBench();
else v1Bench();

/** The cases in round form (§13.7, §15.4); R2b makes them the bench and removes `--rounds`. */
function roundBench(): void {
  const g = content.targets.rounds.G11;
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
  const checks = roundBenchChecks(content, r);
  for (const [name, ok, detail] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
  process.exitCode = checks.every((c) => c[1]) ? 0 : 1;
}

/** v1's bench (§15.4): bench-300 and one battle, then R1's full-colony clash, report only. */
function v1Bench(): void {
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
}
