// Plain-language matrix hints derived from the data (SPEC §10.4 "strong vs Light · weak vs Heavy").
import type { Armor, BattleState, DamageType } from '../sim/index.ts';

const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function strongVs(state: BattleState, t: DamageType): string {
  const m = state.rules.matrix[t];
  const s = ARMORS.filter((a) => m[a] >= state.rules.strongAt).map(cap);
  return s.length ? s.join(' & ') : '—';
}

export function weakVs(state: BattleState, t: DamageType): string {
  const m = state.rules.matrix[t];
  const s = ARMORS.filter((a) => m[a] <= state.rules.weakAt).map(cap);
  return s.length ? s.join(' & ') : '—';
}

export function vulnerableTo(state: BattleState, a: Armor): string {
  const s = TYPES.filter((t) => state.rules.matrix[t][a] >= state.rules.strongAt).map(cap);
  return s.length ? s.join(' & ') : '—';
}
