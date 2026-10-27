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
  /** Heartcap change as a fraction of max HP: +10% for a Rout win, −25% for a Decision loss. */
  heartcapPct: number;
  /** A Rout loss sets the Heartcap to 0. */
  heartcapZero: boolean;
  spoils: SpoilsSpec[];
}

export interface RewardRules { routRepair: number; decisionLossDamage: number; rarityBiasStep: number; eliteRareBonus: number }

/**
 * | Result          | Spoils                                   | Spores | Heartcap |
 * |-----------------|------------------------------------------|--------|----------|
 * | Win by Rout     | 1 of 3, +1 rarity bias, 1 free reroll    | 20     | +10%     |
 * | Win by Decision | 1 of 2                                   | 10     |          |
 * | Elite win, also | +10 rare on spoils; a relic-only pick, 1 of 3 | +15 | 25%: +1 Amber |
 * | Boss win        | — (the run is won)                       | 60     | +2 Amber |
 * | Loss by Decision| —                                        | 0      | −25%     |
 * | Loss by Rout    | —                                        | 0      | → 0      |
 */
export function battleRewards(kind: NodeKind, winner: Side, by: 'rout' | 'decision', r: RewardRules): BattleRewards {
  const out: BattleRewards = { spores: 0, amber: 0, amberChance: 0, heartcapPct: 0, heartcapZero: false, spoils: [] };
  if (winner !== 'player') {
    if (by === 'rout') out.heartcapZero = true;
    else out.heartcapPct = -r.decisionLossDamage;
    return out;
  }
  if (by === 'rout') out.heartcapPct = r.routRepair;
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
