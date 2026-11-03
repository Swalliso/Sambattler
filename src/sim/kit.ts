// The kit in rounds (SPEC §4.4, §7.8, §8.10, §18.1 D45): the building cards a side plants from. A single
// battle's kit is its faction's roster with no copy limit, so plots are R2a's only build limit (D45, plan
// Call 29); R3 adds copies here. The general keeps v1's `limits.*.maxOwned` in their place (§7.8), until R3
// gives it copies by #42.
import type { Content } from '../data/registry.ts';
import type { BattleState, BattleConfig, Controller, KitCard, Side } from './state.ts';

/** A single battle's kit for a side (§18.1 D45): its faction's roster, a general's cards carrying its `maxOwned`. */
export function kitOf(content: Content, side: Side, config: BattleConfig): KitCard[] {
  const sc = config[side];
  return kitCards(content, sc.controller, content.factions[sc.faction]?.buildings ?? []);
}

/** Kit cards for these buildings, in order: a general's carry its `limits.*.maxOwned` until R3's copies (§7.8, D45). */
export function kitCards(content: Content, controller: Controller, buildings: readonly string[]): KitCard[] {
  const limits = controller.kind === 'general' ? content.generals[controller.id]?.limits ?? {} : {};
  return buildings.map((building) => {
    const maxOwned = limits[building]?.maxOwned;
    return maxOwned === undefined ? { building } : { building, maxOwned };
  });
}

/** The side's card for a building, if its kit holds one. */
export function kitCard(state: BattleState, side: Side, buildingId: string): KitCard | undefined {
  return state.sides[side].kit.find((c) => c.building === buildingId);
}

/** True if the side's kit holds the building, which `plant` checks (§4.4). */
export function inKit(state: BattleState, side: Side, buildingId: string): boolean {
  return kitCard(state, side, buildingId) !== undefined;
}

/** True if the side may plant no more of the building now: only a general's card stops, at its `maxOwned` (§7.8, D45). */
export function atMaxOwned(state: BattleState, side: Side, buildingId: string): boolean {
  const max = kitCard(state, side, buildingId)?.maxOwned;
  if (max === undefined) return false;
  let owned = 0;
  for (const b of state.buildings) if (b.side === side && b.buildingId === buildingId) owned++;
  return owned >= max;
}
