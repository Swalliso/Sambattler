// Plain-language matrix hints derived from the data (SPEC §10.4 "strong vs Light · weak vs Heavy").
import type { Armor, BattleState, CompiledUnit, DamageType } from '../sim/index.ts';
import { typeReachesAir } from '../sim/world.ts';

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

/** Who can hit a flyer under the combat rework's `flyers` setting (a prototype). */
export function flyerHitters(state: BattleState): string {
  const f = state.rules.flying!;
  const melee = f.meleeMult === 1 ? '' : `melee hits it for ×${f.meleeMult}`;
  if (f.reachSupply > 1) return `only units of ${f.reachSupply}+ supply, archers, turrets, other flyers${f.cloudsReach ? ', spore clouds' : ''} and powers can hit it${melee && `; ${melee}`}`;
  const miss = `lobbed shells${f.cloudsReach ? '' : ', spore clouds'} and bursts can't hit it`;
  return melee ? `${melee}, and ${miss}` : miss;
}

/** Whether a unit type can hit flyers under the `flyers` setting, and how hard. */
export function versusFlyers(state: BattleState, def: CompiledUnit, tier = 1): string {
  const f = state.rules.flying!;
  if (state.rules.burst && def.tags.includes('burst')) return `its burst can't hit them${f.cloudsReach ? ', its cloud can' : ''}`;
  if (!typeReachesAir(state, def, tier)) return "can't reach them";
  return f.meleeMult !== 1 && def.projectileSpeed === 0 && !def.tags.includes('flying') ? `hits them for ×${f.meleeMult}` : 'can hit them';
}
