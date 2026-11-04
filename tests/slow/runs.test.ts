// G14 and G15 (SPEC §12.3; R2b/T119): whole runs for each commander, the run bot (`bot:balanced` on fixed weights,
// greedy drafts, a random route, the auto power policy) with X7's `bot:answer` beside it, played once on the run pool
// (R2-Q9) and read by both checks. The bands are the user's, set at S12 (T131, 2026-11-04) in
// `data/balance-targets.json`; a policy without a band is reported. S12's retune (B: "B, the boss too") brought
// Vesper and Armilla into G14's band, but Cordis wins 100% of battle 1s and 96% of boss fights, which holds G15's
// pooled reach at 96% and its boss wins at 71%. Both stay known misses until S14's rework of Cordis (R2b/T168, T169):
// they assert as expected fails, and fail once they pass.
import { beforeAll, describe, it } from 'vitest';
import { nodeContent } from '../../tools/lib/content.ts';
import { commanderRuns, evaluateG14, evaluateG15 } from '../../tools/lib/balance.ts';
import type { RunRecord } from '../../tools/lib/balance.ts';
import { assertVerdict, runFilePool, S14 } from './verdict.ts';

const content = nodeContent();
const pool = runFilePool();
let runs: RunRecord[];

describe('the run guardrails (§12.3)', () => {
  beforeAll(async () => { runs = await commanderRuns(content, pool.run); }, 180_000);
  it('G14 battle 1: bot:balanced wins 70–90% of battle 1s for each commander over 100 runs; bot:answer reported (a known miss until S14: Cordis)', () => assertVerdict(evaluateG14(content, runs), { owner: S14 }));
  it('G15 the boss: in the same runs, 40–95% reach it and bot:balanced wins 40–70% of its boss fights; bot:answer reported (a known miss until S14)', () => assertVerdict(evaluateG15(content, runs), { owner: S14 }));
});
