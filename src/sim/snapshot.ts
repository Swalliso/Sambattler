// hashState / snapshot / restore (SPEC §13.3 rule 9, §14.6).
import { hashValue } from './hash.ts';
import type { BattleState } from './state.ts';

export function hashState(state: BattleState): string {
  return hashValue(state);
}

export function snapshot(state: BattleState): string {
  return JSON.stringify(state);
}

export function restore(json: string): BattleState {
  const s = JSON.parse(json) as BattleState;
  if (s.v !== 1) throw new Error(`unsupported battle state version ${String(s.v)}`);
  return s;
}
