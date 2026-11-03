// How AI-controlled sides answer drafts (`--auto-draft first | random | greedy`, SPEC §15.2): `random`
// draws from the stream it's given. Greedy prefers blueprints the profile actually builds, then upgrades
// for those buildings, then relics by rarity, with ties going to the earlier card. The run layer's
// spoils use it, and an AI side answers its draft in planning with it, before it plans (§14.6).
import { parseCard } from '../draft.ts';
import { nextInt } from '../rng.ts';
import type { BattleState, DraftCard, DraftPolicy, Rng4, Side } from '../state.ts';
import { runAtOnce } from './controller.ts';

const RELIC_SCORE = { common: 7, uncommon: 9, rare: 12 } as const;

/** Greedy value of a card for a profile whose building weights are `weightOf`. */
export function greedyScore(card: DraftCard, weightOf: (building: string) => number): number {
  const c = parseCard(card.id)!;
  if (c.type === 'relic') return RELIC_SCORE[card.rarity];
  const w = weightOf(c.id);
  if (c.type === 'blueprint') return w > 0 ? 10 + 4 * w : 0;
  return w > 0 ? 6 + 2 * w : 1;
}

/** The card a policy takes from an offer (never empty). */
export function choosePick(offer: readonly DraftCard[], policy: Exclude<DraftPolicy, 'none'>, weightOf: (b: string) => number, rng: Rng4): DraftCard {
  if (policy === 'first') return offer[0]!;
  if (policy === 'random') return offer[nextInt(rng, offer.length)]!;
  let best = offer[0]!, bestScore = -Infinity;
  for (const c of offer) {
    const s = greedyScore(c, weightOf);
    if (s > bestScore) { best = c; bestScore = s; }
  }
  return best;
}

/**
 * An AI side answers its open draft at once (§14.6 opening step 6), before it plans: its `autoDraft` policy's
 * pick, greedy unless set, by its buying weights and its pool's, run as a logged command so a replay runs it
 * again. A random pick draws from the side's own AI stream. `none` leaves the draft to the player.
 */
export function aiDraft(state: BattleState, side: Side): void {
  const ss = state.sides[side], ai = ss.ai, policy = state.config[side].autoDraft ?? 'greedy';
  if (!ai || !ss.draft || policy === 'none') return;
  const weightOf = (b: string) => (ai.weights.find((w) => w.building === b) ?? ai.pool?.find((w) => w.building === b))?.weight ?? 0;
  runAtOnce(state, side, { type: 'draftPick', cardId: choosePick(ss.draft.offer, policy, weightOf, state.rng.ai[side]).id });
}
