// G1 and G2 in round form (SPEC §12.3; R2a/T122): the squad duels, equal gold on one building a side fought as one
// round clash, and the supply duels, placed units fought to the end of one clash. Both are played once, on the pool,
// and read by both checks. Thresholds: `rounds.G1`, and v1's `G2`, kept.
import { beforeAll, describe, it } from 'vitest';
import { nodeContent } from '../../tools/lib/content.ts';
import { duels, evaluateG1, evaluateG2 } from '../../tools/lib/balance.ts';
import type { Duels } from '../../tools/lib/balance.ts';
import { assertVerdict, filePool } from './verdict.ts';

const content = nodeContent();
const pool = filePool();
let d: Duels;

describe('the duels in rounds (§12.3)', () => {
  beforeAll(async () => { d = await duels(content, pool.run); }, 60_000);
  it('G1 squad duels: no building wins more than 80% of its pairings, each wins one and loses one clearly', () => assertVerdict(evaluateG1(content, d)));
  it('G2 supply duels form a healthy counter graph, with the asserted edges', () => assertVerdict(evaluateG2(content, d)));
});
