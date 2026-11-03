// Target resolution shared by targeting, movement and attacks in a clash (SPEC §5.2, §13.4): v1's
// `src/sim/targets.ts`, typed on rounds' state, with units its only targets, since buildings and Heartcaps
// take no part in a clash. `edgeDistance` returns the edge-to-edge distance from a body (x, y, radius) to a
// target and leaves the target's centre and tier in the module-level `tp` scratch (no allocation).
import type { BattleState, Side } from './state.ts';
import { findUnit, unitRadius } from './world.ts';

export const tp = { x: 0, y: 0, tier: 1 };

/** Largest body in the data, an emplacement's (SPEC §6.7); used to pad spatial queries. */
export const MAX_RADIUS = 0.8;

/**
 * Edge distance from a body to a living unit of `enemy` in the lane, or -1 if the target is gone or
 * invalid. Distances are clamped at 0 (overlap counts as touching). A body of radius 0 measures from its
 * centre, as an emplacement's range does (§6.7).
 */
export function edgeDistance(state: BattleState, x: number, y: number, r: number, targetId: number, enemy: Side, lane: number): number {
  const u = targetId > 0 ? findUnit(state, targetId) : undefined;
  if (!u || u.hp <= 0 || u.side !== enemy || u.lane !== lane) return -1;
  const dx = u.x - x, dy = u.y - y;
  const d = Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, u);
  tp.x = u.x; tp.y = u.y; tp.tier = u.tier;
  return d > 0 ? d : 0;
}
