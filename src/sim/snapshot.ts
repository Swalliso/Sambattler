// hashState / snapshot / restore for a battle in rounds (SPEC §13.3 rule 9, §14.6). The hash covers the
// whole `v: 2` state, which holds no display text (R2-Q8).
import { hashValue } from './hash.ts';
import type { BattleState } from './state.ts';

export function hashState(state: BattleState): string {
  return hashValue(state);
}

export function snapshot(state: BattleState): string {
  return JSON.stringify(state);
}

/** A battle in rounds from its snapshot. It refuses any other version, v1's battle among them. */
export function restore(json: string): BattleState {
  const s = JSON.parse(json) as BattleState;
  if (s.v !== 2) throw new Error(`a battle in rounds restores version 2, not version ${String(s.v)}`);
  return s;
}
