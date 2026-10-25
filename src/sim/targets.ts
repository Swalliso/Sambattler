// Target resolution shared by targeting, movement and attacks. `edgeDistance` returns the
// edge-to-edge distance from a body (x, y, radius) to a target id and leaves the closest target
// point and the target's centre in the module-level `tp` scratch (no allocation).
import { HEARTCAP_ID } from './state.ts';
import type { BattleState, Side } from './state.ts';
import { buildingDef, findBuilding, findUnit, heartcapEdgeX, rectDistance, unitRadius } from './world.ts';

export const tp = { x: 0, y: 0, cx: 0, cy: 0, preferredBuilding: false, tier: 1 };

/** Largest unit radius in v1 data (Elder Rootbreaker ≈ 0.7); used to pad spatial queries. */
export const MAX_RADIUS = 0.8;

/**
 * Edge distance from a body to a living target of `enemy`, or -1 if the target is gone/invalid.
 * Distances are clamped at 0 (overlap counts as touching).
 */
export function edgeDistance(state: BattleState, x: number, y: number, r: number, targetId: number, enemy: Side, lane: number): number {
  if (targetId > 0) {
    const u = findUnit(state, targetId);
    if (u) {
      if (u.hp <= 0 || u.side !== enemy || u.lane !== lane) return -1;
      const dx = u.x - x, dy = u.y - y;
      const d = Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, u);
      tp.x = u.x; tp.y = u.y; tp.cx = u.x; tp.cy = u.y; tp.preferredBuilding = false; tp.tier = u.tier;
      return d > 0 ? d : 0;
    }
    const b = findBuilding(state, targetId);
    if (!b || b.hp <= 0 || b.side !== enemy || b.lane !== lane) return -1;
    const def = buildingDef(state, b);
    const px = x < b.col ? b.col : x > b.col + def.w ? b.col + def.w : x;
    const py = y < b.row ? b.row : y > b.row + def.h ? b.row + def.h : y;
    tp.x = px; tp.y = py; tp.cx = b.col + def.w / 2; tp.cy = b.row + def.h / 2; tp.preferredBuilding = true; tp.tier = 1;
    const d = rectDistance(x, y, b.col, b.row, def.w, def.h) - r;
    return d > 0 ? d : 0;
  }
  if (targetId === HEARTCAP_ID[enemy]) {
    if (!state.rules.test.heartcapTargets || state.sides[enemy].heartcapHp <= 0) return -1;
    const ex = heartcapEdgeX(state, enemy);
    tp.x = ex; tp.y = y; tp.cx = ex; tp.cy = y; tp.preferredBuilding = true; tp.tier = 1;
    const d = (ex > x ? ex - x : x - ex) - r;
    return d > 0 ? d : 0;
  }
  return -1;
}
