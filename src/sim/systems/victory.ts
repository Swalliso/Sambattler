// Scoring a round in integers (SPEC §6.4, §6.5, §6.7, §13.3 rule 5): pure helpers, no state. A round's
// Heartcap damage goes in §6.7's order: per lane 25 × the margin, × the round's storm, × each of the
// loser's damage-taken modifiers, each product floored in basis points; then each Heartcap's sum over the
// lanes it lost is capped. The round goes to the side that dealt more, and a Decision after the last round
// compares shares by cross-multiplication, never dividing. `scoreRound` and the end check in `round.ts`
// use them.
import type { Rules, Side } from '../state.ts';

const BP = 10000;

/** §6.7 step 1: a lane's raw Heartcap damage, `perSupply` × its margin (the winner's damage supply, less the loser's at the cap). */
export const laneDamage = (margin: number, perSupply: number): number => margin * perSupply;

/** §6.7 step 2: × the round's storm in basis points, floored. */
export const stormed = (raw: number, stormBp: number): number => Math.floor((raw * stormBp) / BP);

/** §6.7 step 3: × each of the loser's damage-taken modifiers in basis points, such as Rot Ward's 8500, in turn, each product floored. */
export function takenMods(x: number, bps: readonly number[]): number {
  for (const bp of bps) x = Math.floor((x * bp) / BP);
  return x;
}

/**
 * §6.7 step 4: the most a Heartcap of `loserMaxHp` takes in a round. A cap names one base (X5): `maxHpBp` of
 * its max HP, floored, or a `flat` amount; with `stormScales`, × the round's storm too (A208).
 */
export function capFor(def: Rules['roundDamageCap'], loserMaxHp: number, stormBp: number): number {
  const base = def.maxHpBp !== undefined ? Math.floor((loserMaxHp * def.maxHpBp) / BP) : def.flat;
  if (base === undefined) throw new Error('a round damage cap names one base: maxHpBp or flat');
  return def.stormScales ? stormed(base, stormBp) : base;
}

/** The round's storm in basis points (§6.4): 10000 before its first round, then `stepBp` more each round from it, at most `maxBp`. */
export function stormBpFor(storm: Rules['storm'], round: number): number {
  return round < storm.startRound ? BP : Math.min(storm.maxBp, BP + storm.stepBp * (round - storm.startRound + 1));
}

/** The round's storm step (§6.4, §14.4), which `sporestormGte` reads: 0 before its first round, then 1 in it, 2 in the next, and on. */
export const stormStep = (storm: Rules['storm'], round: number): number => Math.max(0, round - storm.startRound + 1);

/** The round's result (§6.7): the side that dealt more wins it, and its loser gets the comeback gold (§6.2). Equal damage, none included, draws. */
export function roundOutcome(damage: Record<Side, number>): { winner: Side | null; loser: Side | null } {
  if (damage.player === damage.enemy) return { winner: null, loser: null };
  return damage.player > damage.enemy ? { winner: 'player', loser: 'enemy' } : { winner: 'enemy', loser: 'player' };
}

/** A side in a Decision: the Heartcap damage it dealt in the battle, as recorded each round, and its own Heartcap. */
export interface DecisionSide { dealt: number; hp: number; maxHp: number }

/**
 * A Decision after the last round (§6.5, X5). By `shareOfMaxHp`, the side that dealt the larger share of the
 * other Heartcap's max HP wins: p.dealt / e.maxHp against e.dealt / p.maxHp, so p.dealt × p.maxHp against
 * e.dealt × e.maxHp. By `damage`, the side that dealt more. Then the higher HP fraction, cross-multiplied
 * the same way, and otherwise the general.
 */
export function decisionWinner(by: Rules['decisionBy'], sides: Record<Side, DecisionSide>): Side {
  const p = sides.player, e = sides.enemy;
  const lead = by === 'damage' ? p.dealt - e.dealt : p.dealt * p.maxHp - e.dealt * e.maxHp;
  if (lead !== 0) return lead > 0 ? 'player' : 'enemy';
  const fraction = p.hp * e.maxHp - e.hp * p.maxHp;
  if (fraction !== 0) return fraction > 0 ? 'player' : 'enemy';
  return 'enemy';
}
