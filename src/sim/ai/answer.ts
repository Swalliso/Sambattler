// The answer policy (SPEC §12.2, X7, §18.2 #34; R2a/T121, A198): "buy the answer to what you saw". A bot with
// `policy: "answer"` plans after the general, as every player-side bot does, and reads the general's colony as
// it stands this round through `planningView`'s `general`, never the record of what it fielded before. It
// scores each card it may buy by the class of its unit's hits (`matchupClass`) on the general's planned squads,
// weighted by their supply, and leans × `ANSWER_LEAN` toward the best. Its weights are otherwise its profile's,
// so beside a fixed-weight bot with the same weights the lean is the only difference (G8).
import { matchupClass } from '../matchups.ts';
import type { ClassSource } from '../matchups.ts';
import { other } from '../state.ts';
import type { AiWeight, Effectiveness } from '../state.ts';
import type { PlanningView } from './view.ts';

/** The weight on the best answer (§12.2): × 3. */
export const ANSWER_LEAN = 3;

const value: Record<Effectiveness, number> = { strong: 1, normal: 0, weak: -1 };

/** The unit a card fields: a spawner's squad's, or a tower's emplacement, under the tower's id; none for economy or utility. */
function unitOf(view: PlanningView, buildingId: string): string | null {
  const card = view.cards[buildingId];
  if (card?.squad) return card.squad.unit;
  return card?.kind === 'tower' && view.units[buildingId] ? buildingId : null;
}

/**
 * The card among `listed` that best answers the general's planned squads, or null with none to read (a planner
 * off the player's side, or a general fielding no squads). Each card's score is the class of its unit's hits on
 * each squad, strong 1, normal 0 and weak −1, weighted by the squad's supply (an emplacement has none, §6.7's
 * first guess). A tie goes to the card the squads' own hits are weakest on, by the same sum, then the heavier
 * weight, then by building id, so mono Sporelings are answered by a Capguard Hall, not by more Sporelings.
 */
export function bestAnswer(view: PlanningView, listed: readonly AiWeight[]): string | null {
  const squads = (view.general?.formation ?? [])
    .filter((p) => !p.emplacement)
    .map((p) => ({ unitId: p.unitId, supply: p.units.length * view.theirUnits[p.unitId]!.tiers[0]!.supply }));
  if (!squads.length) return null;
  const them = other(view.side);
  const source: ClassSource = {
    compiled: { [view.side]: { units: view.units }, [them]: { units: view.theirUnits } } as ClassSource['compiled'],
    rules: { matrix: view.matrix, strongAt: view.strongAt, weakAt: view.weakAt },
  };
  const scored = listed.flatMap((w) => {
    const unit = unitOf(view, w.building);
    if (!unit) return [];
    let hits = 0, taken = 0;
    for (const s of squads) {
      hits += s.supply * value[matchupClass(source, view.side, unit, 1, them, s.unitId, 1)];
      taken += s.supply * value[matchupClass(source, them, s.unitId, 1, view.side, unit, 1)];
    }
    return [{ building: w.building, weight: w.weight, hits, taken }];
  });
  scored.sort((a, b) => b.hits - a.hits || a.taken - b.taken || b.weight - a.weight || (a.building < b.building ? -1 : a.building > b.building ? 1 : 0));
  return scored[0]?.building ?? null;
}
