// Rebuilds, in Node, the state the preview of a battle in rounds (`scene=rounds`) opens for a URL query, so the
// screenshot check can compare state hashes at the same round, phase and tick (SPEC §15.6, plan Calls 14 and
// 16). It opens it through the page's own `previewState`, so the checkpoints match `src/app/rounds/main.ts`'s
// exactly, with the seed the page would have written into its URL. It stands beside v1's
// `tools/lib/params.ts` until R2b folds the two.
import { parseRoundParams, previewState } from '../../../src/app/rounds/urlParams.ts';
import type { BattleState, Content } from '../../../src/sim/rounds/index.ts';

/** The preview's state for the query, seed 1 unless it names one; throws a `PreviewRefusal` with the page's message for one it can't open. */
export function roundStateForParams(content: Content, q: URLSearchParams): BattleState {
  const p = parseRoundParams(q);
  return previewState(content, p, p.seed ?? 1);
}
