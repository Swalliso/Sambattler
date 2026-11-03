// Matchup classes (SPEC §5.3, §10.4, §14.6; plan Call 6, A060): `matchupClass` is the one classifier behind the
// planning screen's marks (T084) and the answer bot (T098), so no UI copies the rule. It follows a hit's class
// in `systems/combat.ts` (`classify`) on the matrix and the tag multipliers, with `balance.effectiveness`'s
// thresholds, and leaves out merge-perk resistances, which change what a hit deals but never its class (§5.3).
// A rule that changes a hit after the matrix would show the class of what it deals (§10.4): rounds has none
// yet, since a ground unit's melee on a flyer comes with flyers (§1.3 #11), and it lands here then. It reads
// the compiled sides and writes nothing, and the battle never calls it while it runs. R4b extends this module.
import { tagMult } from './systems/combat.ts';
import type { BattleState, CompiledUnit, Effectiveness, Rules, Side } from './state.ts';

/** What a class reads: each side's compiled units and the matrix's thresholds. A battle's state is one; a planning view makes another (the answer bot, T121). */
export interface ClassSource {
  compiled: Record<Side, { units: Record<string, CompiledUnit> }>;
  rules: Pick<Rules, 'matrix' | 'strongAt' | 'weakAt'>;
}

/**
 * The class of `side`'s `unitId` hits at `tier` on `targetSide`'s `targetUnitId` at `targetTier` (§5.3, §14.6):
 * strong at ×`strongAt` (1.5) or more of matrix × tag, weak at ×`weakAt` (0.75) or less, normal between.
 * Either unit may be a tower's emplacement, under its tower's id.
 */
export function matchupClass(
  state: BattleState | ClassSource, side: Side, unitId: string, tier: 1 | 2 | 3,
  targetSide: Side, targetUnitId: string, targetTier: 1 | 2 | 3,
): Effectiveness {
  const unit = state.compiled[side].units[unitId];
  if (!unit) throw new Error(`matchupClass: ${side} has no unit ${unitId}`);
  const target = state.compiled[targetSide].units[targetUnitId];
  if (!target) throw new Error(`matchupClass: ${targetSide} has no unit ${targetUnitId}`);
  const t = unit.tiers[tier - 1]!;
  const m = state.rules.matrix[unit.damageType][target.armor] * tagMult(t.siegeMult, t.slayerMult, target.armor, targetTier);
  return m >= state.rules.strongAt ? 'strong' : m <= state.rules.weakAt ? 'weak' : 'normal';
}
