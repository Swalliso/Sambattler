// The v3 prototype's rules (docs/v3-proto-plan.md; docs/spec-v3-concept.md, section 3). They run only when the
// battle's config says `rules: 'v3'`, and only then does the battle carry the `v3` block of data/balance.json
// (`buildRoundLibrary`). It's a temporary switch, which the prototype's S10 removes (CLAUDE.md, "Prototypes").
// Under v2 nothing here applies, and no v3 field enters the state, so v2's goldens stand.
import type { V3Def } from '../data/schema.ts';
import type { BattleConfig, BattleState, BuildingState } from './state.ts';

/** Does the battle play by v3's rules? v2's unless its config says v3. */
export const isV3 = (config: Pick<BattleConfig, 'rules'>): boolean => config.rules === 'v3';

/** The battle's v3 block, under v3 only. */
export function v3Of(state: BattleState): V3Def | undefined {
  return isV3(state.config) ? state.library.balance.v3 : undefined;
}

/**
 * Is the building a sprout (C3.2)? Under v3, what's planted from `fruitFromRound` fields nothing until the next
 * clash: it's a sprout through the planning and the clash of the round it was planted in, and fruits in the next.
 * With `fruitFromRound` 1, the user's call on Plan-Q1 (2026-11-04), the opener sprouts too, so round 1's clash is
 * empty; with 2, round 1's opener fields at once.
 */
export function isSprout(state: BattleState, b: Pick<BuildingState, 'plantedRound'>): boolean {
  const v3 = v3Of(state);
  return v3 !== undefined && b.plantedRound >= state.round && b.plantedRound >= v3.fruitFromRound;
}

/**
 * Is the building hidden from the other side (C3.1)? Under v3, a planting from `hideFromRound` that Begin hasn't
 * marked fielded yet: this round's, while the round plans. It appears at Begin, as a sprout. Round 1's opener
 * stays in view.
 */
export function isHidden(state: BattleState, b: Pick<BuildingState, 'plantedRound' | 'fielded'>): boolean {
  const v3 = v3Of(state);
  return v3 !== undefined && !b.fielded && b.plantedRound >= v3.hideFromRound;
}
