// G3 and G12 in round form (SPEC §12.3; R2a/T122): every mono bot against bot:balanced on the run's maps, then the
// strict counter bar for the builds G3 reads above 40%, every game a battle of rounds on the pool. The content and
// the workers hold the counter matrix's answer bots (`counterBotSpec`). G3 and G12 stay on fixed weights (X7). G3 is a
// known miss until R3's copies (R2b/T168): it asserts as an expected fail, and fails once it passes.
import { beforeAll, describe, it } from 'vitest';
import { counterBotSpec } from '../../tools/lib/balance.ts';
import { nodeContent, protoContent } from '../../tools/lib/content.ts';
import { evaluateG3, evaluateG12 } from '../../tools/lib/balance.ts';
import type { RoundG3Verdict } from '../../tools/lib/balance.ts';
import { assertVerdict, filePool, R3_COPIES } from './verdict.ts';

const spec = counterBotSpec(nodeContent());
const content = protoContent(spec);
const pool = filePool(spec);
let g3: RoundG3Verdict;

describe('the counter bars in rounds (§12.3)', () => {
  beforeAll(async () => { g3 = await evaluateG3(content, pool.run); }, 120_000);
  it("G3 no mono bot beats bot:balanced on the run's maps: mean ≤55%, worst map ≤60% (a known miss until R3's copies)", () => assertVerdict(g3, { owner: R3_COPIES }));
  it('G12 the strict counter bar: every mono build above 40% in G3 has an answer winning ≥60% on every map', async () => assertVerdict(await evaluateG12(content, pool.run, { g3 })), 600_000);
});
