// Guardrails G1–G8 and G11 (SPEC §12.3), asserted. Thresholds live in data/balance-targets.json.
import { describe, expect, it } from 'vitest';
import { nodeContent } from '../../tools/lib/content.ts';
import {
  evaluateG1, evaluateG2, evaluateG3, evaluateG4, evaluateG5, evaluateG6, evaluateG7, evaluateG8,
} from '../../tools/lib/balance.ts';
import type { Verdict } from '../../tools/lib/balance.ts';
import { runBench } from '../../tools/lib/bench.ts';

const content = nodeContent();

function assertVerdict(v: Verdict): void {
  console.log(`${v.pass ? 'PASS' : 'FAIL'} ${v.id}: ${v.summary}\n  ${v.details.join('\n  ')}`);
  expect(v.pass, `${v.id} failed:\n${v.details.join('\n')}`).toBe(true);
}

describe('guardrails', () => {
  it('G1 production duels', () => assertVerdict(evaluateG1(content).verdict));
  it('G2 supply duels form a healthy counter graph, with the M4 edges', () => assertVerdict(evaluateG2(content).verdict));
  it('G3 no mono bot beats bot:balanced more than 55%', () => assertVerdict(evaluateG3(content)));
  it('G4 balanced vs scripted: length band and Decision share', () => assertVerdict(evaluateG4(content)));
  it('G5 snowball: +150 starting gold wins 55–75%', () => assertVerdict(evaluateG5(content)));
  it('G6 comeback: 6 columns behind at 3:00 still wins ≥20%', () => assertVerdict(evaluateG6(content)));
  it('G7 merging: a real edge in the mirror, none against Slayers', () => assertVerdict(evaluateG7(content)));
  it('G8 adaptation: mono bots drop ≥20 points against the adaptive general', () => assertVerdict(evaluateG8(content)));
  it('G11 performance budgets', () => {
    const g = content.targets.G11;
    const r = runBench(content, g.benchTicks);
    console.log(`G11 bench mean ${r.meanMs.toFixed(3)} ms, p99 ${r.p99Ms.toFixed(3)} ms, peak ${r.peakUnits} units, battle ${r.battleWallMs} ms, heap +${r.heapGrowthKb} KB`);
    expect(r.peakUnits).toBeGreaterThanOrEqual(300);
    expect(r.meanMs).toBeLessThanOrEqual(g.tickMeanMs);
    expect(r.p99Ms).toBeLessThanOrEqual(g.tickP99Ms);
    expect(r.battleWallMs).toBeLessThanOrEqual(g.battleWallMs);
  });
});
