// G16 in round form (SPEC §12.3, R2-Q10; R2a/T122): a pair's army planted by the formation rule against the same
// army with its front and back ranks traded, one round clash a seat on the one-lane field, pooled over role-split
// pairs. The armies come from the counter matrix's even pair bots, built here; the clashes play on the pool.
import { describe, it } from 'vitest';
import { counterBotSpec } from '../../tools/lib/balance.ts';
import { nodeContent, protoContent } from '../../tools/lib/content.ts';
import { evaluateG16 } from '../../tools/lib/balance.ts';
import { assertVerdict, filePool } from './verdict.ts';

const content = protoContent(counterBotSpec(nodeContent()));
const pool = filePool();

describe('formation in rounds (§12.3)', () => {
  it('G16 the formation rule beats its front and back ranks traded in ≥60% of clashes, pooled over role-split pairs', async () => assertVerdict(await evaluateG16(content, pool.run)), 120_000);
});
