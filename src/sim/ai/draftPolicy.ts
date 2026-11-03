// How AI-controlled sides answer drafts (`--auto-draft first | random | greedy`, SPEC §15.2): `random`
// draws from the stream it's given. Greedy prefers blueprints the profile actually builds, then upgrades
// for those buildings, then relics by rarity, with ties going to the earlier card. The run layer's
// spoils use it; R2b's T065 opens drafts in planning.
import { parseCard } from '../draft.ts';
import { nextInt } from '../rng.ts';
import type { DraftCard, DraftPolicy, Rng4 } from '../state.ts';

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
