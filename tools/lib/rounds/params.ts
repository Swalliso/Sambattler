// Rebuilds, in Node, the state a battle scene (`scene=battle`, `scene=report`) opens for a URL query, so the
// screenshot check can compare state hashes at the same round, phase and tick (SPEC §15.6, R2a plan Calls 14 and
// 16). It opens it through the page's own `battleForParams`, so the checkpoints match `src/app/main.ts`'s
// exactly, with the seed the page would have written into its URL. R2b's S3 moves it beside the run scenes'
// `tools/lib/params.ts`.
import { battleForParams, parseRoundParams } from '../../../src/app/urlParams.ts';
import type { BattleState, Content } from '../../../src/sim/rounds/index.ts';

/** A battle scene's state for the query, seed 1 unless it names one; throws a `BattleRefusal` with the page's message for one it can't open. */
export function roundStateForParams(content: Content, q: URLSearchParams): BattleState {
  const p = parseRoundParams(q);
  return battleForParams(content, p, p.seed ?? 1);
}
