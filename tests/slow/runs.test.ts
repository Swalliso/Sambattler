// G14 and G15 (SPEC §12.3; R2b/T119): whole runs for each commander, the run bot (`bot:balanced` on fixed weights,
// greedy drafts, a random route, the auto power policy) with X7's `bot:answer` beside it, played once on the run pool
// (R2-Q9) and read by both checks. The bands are §12.3's first guesses, in `data/balance-targets.json`'s `rounds`
// block, until S12 sets them from S11's measurement (T131); a policy without a band is reported. S11 read both outside
// them the easy way, so both are known misses until S12's T131 retunes (R2b/T168; the user, 2026-11-04: "Yes, retune at
// S12"): they assert as expected fails, and fail once they pass.
import { beforeAll, describe, it } from 'vitest';
import { nodeContent } from '../../tools/lib/content.ts';
import { commanderRuns, evaluateG14, evaluateG15 } from '../../tools/lib/balance.ts';
import type { RunRecord } from '../../tools/lib/balance.ts';
import { assertVerdict, runFilePool, S12 } from './verdict.ts';

const content = nodeContent();
const pool = runFilePool();
let runs: RunRecord[];

describe('the run guardrails (§12.3)', () => {
  beforeAll(async () => { runs = await commanderRuns(content, pool.run); }, 180_000);
  it('G14 battle 1: bot:balanced wins 70–90% of battle 1s for each commander over 100 runs; bot:answer reported (a known miss until S12)', () => assertVerdict(evaluateG14(content, runs), { owner: S12 }));
  it('G15 the boss: in the same runs, 40–85% reach it and bot:balanced wins 40–70% of its boss fights; bot:answer reported (a known miss until S12)', () => assertVerdict(evaluateG15(content, runs), { owner: S12 }));
});
