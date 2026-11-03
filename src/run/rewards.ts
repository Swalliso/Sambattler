// Battle outcomes and rewards (SPEC §6.5, §8.5–8.6), as plain tables the run applies.
import type { Side } from '../sim/index.ts';
import type { NodeKind } from './route.ts';

export interface SpoilsSpec { label: string; cards: number; rareBonus: number; freeRerolls: number; relicsOnly: boolean }

export interface BattleRewards {
  spores: number;
  /** Amber granted outright (the boss). */
  amber: number;
  /** Chance of +1 Amber (an elite win), rolled on the `meta` stream. */
  amberChance: number;
  spoils: SpoilsSpec[];
}

export interface RewardRules { rarityBiasStep: number; eliteRareBonus: number }

/**
 * | Result                        | Spoils                                        | Spores | Amber   |
 * |-------------------------------|-----------------------------------------------|--------|---------|
 * | Win by Rout                   | 1 of 3, +1 rarity bias, 1 free reroll         | 20     |         |
 * | Win by Decision               | a pick of 1 from 2 (#17)                      | 10     |         |
 * | Elite win, also               | +10 rare on spoils; a relic-only pick, 1 of 3 | +15    | 25%: +1 |
 * | Boss win, by Rout or Decision | — (the run is won; R2-Q14)                    | 60     | +2      |
 * | A loss                        | — (it costs a life, §8.5)                     | 0      |         |
 */
export function battleRewards(kind: NodeKind, winner: Side, by: 'rout' | 'decision', r: RewardRules): BattleRewards {
  const out: BattleRewards = { spores: 0, amber: 0, amberChance: 0, spoils: [] };
  if (winner !== 'player') return out;
  if (kind === 'boss') {
    out.spores = 60;
    out.amber = 2;
    return out;
  }
  out.spores = by === 'rout' ? 20 : 10;
  out.spoils.push(by === 'rout'
    ? { label: 'Spoils', cards: 3, rareBonus: r.rarityBiasStep, freeRerolls: 1, relicsOnly: false }
    : { label: 'Spoils', cards: 2, rareBonus: 0, freeRerolls: 0, relicsOnly: false });
  if (kind === 'elite') {
    // every spoils draft after an elite gets +10 rare (SPEC §8.3)
    out.spoils[0]!.rareBonus += r.eliteRareBonus;
    out.spores += 15;
    out.amberChance = 0.25;
    out.spoils.push({ label: 'Elite relic', cards: 3, rareBonus: r.eliteRareBonus, freeRerolls: 0, relicsOnly: true });
  }
  return out;
}
