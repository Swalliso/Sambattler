// Staggered target selection for units and towers (SPEC §5.2): preferred class first, then the
// nearest by edge distance, ties to the lowest id; sticky within aggro × leash.
import { HEARTCAP_ID, other } from '../state.ts';
import type { BattleState, BuildingState, UnitState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { buildingDef, heartcapEdgeX, rectDistance, unitDef, unitRadius } from '../world.ts';

let bestId = 0, bestD = 0, bestPref = false;

function consider(id: number, d: number, pref: boolean): void {
  if (bestId !== 0) {
    if (pref !== bestPref) { if (!pref) return; }
    else if (d > bestD || (d === bestD && id > bestId)) return;
  }
  bestId = id; bestD = d; bestPref = pref;
}

export function targetingSystem(state: BattleState): void {
  buildGrid(state);
  const every = state.rules.retargetEvery;
  const tick = state.tick;
  for (const u of state.units) {
    const enemy = other(u.side);
    const r = unitRadius(state, u);
    const curD = u.targetId !== 0 ? edgeDistance(state, u.x, u.y, r, u.targetId, enemy, u.lane) : -1;
    if (curD >= 0 && (tick + u.id) % every !== 0) continue;
    if (curD < 0) u.targetId = 0;
    retargetUnit(state, u, r, curD);
  }
  for (const b of state.buildings) {
    const def = buildingDef(state, b);
    if (!def.attack) continue;
    const valid = b.targetId !== 0 && towerTargetValid(state, b);
    if (valid && (tick + b.id) % every !== 0) continue;
    if (!valid) b.targetId = 0;
    retargetTower(state, b, valid);
  }
}

function retargetUnit(state: BattleState, u: UnitState, r: number, curD: number): void {
  const def = unitDef(state, u);
  const aggro = def.aggroRange;
  const enemy = other(u.side);
  const prefBuildings = def.siege;
  const prefElite = def.slayer;
  bestId = 0; bestD = 0; bestPref = false;

  const n = queryNear(u.x, u.y, aggro + r + MAX_RADIUS);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    let d = Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, v);
    if (d < 0) d = 0;
    if (d <= aggro) consider(v.id, d, prefElite && v.tier >= 2);
  }
  for (const b of state.buildings) {
    if (b.side !== enemy || b.lane !== u.lane || b.hp <= 0) continue;
    const bd = buildingDef(state, b);
    let d = rectDistance(u.x, u.y, b.col, b.row, bd.w, bd.h) - r;
    if (d < 0) d = 0;
    if (d <= aggro) consider(b.id, d, prefBuildings);
  }
  if (state.rules.test.heartcapTargets && state.sides[enemy].heartcapHp > 0) {
    const ex = heartcapEdgeX(state, enemy);
    let d = (ex > u.x ? ex - u.x : u.x - ex) - r;
    if (d < 0) d = 0;
    if (d <= aggro) consider(HEARTCAP_ID[enemy], d, prefBuildings);
  }

  // stickiness: keep a live current target within leash unless a preferred-class candidate appears
  if (u.targetId !== 0 && curD >= 0 && curD <= aggro * state.rules.leashMult) {
    edgeDistance(state, u.x, u.y, r, u.targetId, enemy, u.lane);
    const curPref = (prefBuildings && tp.preferredBuilding) || (prefElite && tp.tier >= 2);
    if (!(bestPref && !curPref)) return;
  }
  u.targetId = bestId;
}

const tr = { cx: 0, cy: 0, min: 0, max: 0 };

function towerRange(state: BattleState, b: BuildingState): typeof tr {
  const def = buildingDef(state, b);
  const a = def.attack!;
  tr.cx = b.col + def.w / 2; tr.cy = b.row + def.h / 2; tr.min = a.minRange; tr.max = a.range;
  return tr;
}

function towerTargetValid(state: BattleState, b: BuildingState): boolean {
  const t = towerRange(state, b);
  const d = edgeDistance(state, t.cx, t.cy, 0, b.targetId, other(b.side), b.lane);
  return d >= 0 && d >= t.min && d <= t.max;
}

function retargetTower(state: BattleState, b: BuildingState, keep: boolean): void {
  if (keep) return; // towers stick to a target while it stays in their firing band
  const t = towerRange(state, b);
  const enemy = other(b.side);
  bestId = 0; bestD = 0; bestPref = false;
  const n = queryNear(t.cx, t.cy, t.max + MAX_RADIUS);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== b.lane || v.hp <= 0) continue;
    const dx = v.x - t.cx, dy = v.y - t.cy;
    let d = Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v);
    if (d < 0) d = 0;
    if (d >= t.min && d <= t.max) consider(v.id, d, false);
  }
  for (const o of state.buildings) {
    if (o.side !== enemy || o.lane !== b.lane || o.hp <= 0) continue;
    const od = buildingDef(state, o);
    const d = rectDistance(t.cx, t.cy, o.col, o.row, od.w, od.h);
    if (d >= t.min && d <= t.max) consider(o.id, d, false);
  }
  if (state.rules.test.heartcapTargets && state.sides[enemy].heartcapHp > 0) {
    const ex = heartcapEdgeX(state, enemy);
    const d = ex > t.cx ? ex - t.cx : t.cx - ex;
    if (d >= t.min && d <= t.max) consider(HEARTCAP_ID[enemy], d, false);
  }
  b.targetId = bestId;
}
