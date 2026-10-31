// Staggered target selection for units and towers (SPEC §5.2): preferred class first, then the
// nearest by edge distance, ties to the lowest id; sticky within aggro × leash. The diver prototype
// (balance `diveRanged`) adds ranged units as a preferred class for the listed units.
import { HEARTCAP_ID, other } from '../state.ts';
import type { BattleState, BuildingState, UnitState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { buildingDef, findBuilding, findUnit, heartcapEdgeX, rectDistance, tierDef, unitDef, unitRadius } from '../world.ts';

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
    if (u.knit) { u.targetId = 0; continue; } // knitting units stop retargeting (SPEC §5.6)
    if (u.burrowed) { u.targetId = 0; continue; } // combat rework: a tunnelling unit has no target
    const enemy = other(u.side);
    const r = unitRadius(state, u);
    const curD = u.targetId !== 0 ? edgeDistance(state, u.x, u.y, r, u.targetId, enemy, u.lane) : -1;
    if (curD >= 0 && (tick + u.id) % every !== 0) continue;
    if (curD < 0) u.targetId = 0;
    retargetUnit(state, u, r, curD);
  }
  const cloud = state.rules.cloud;
  for (const b of state.buildings) {
    const def = buildingDef(state, b);
    if (!def.attack) continue;
    // combat rework `sporeCloud`: a cloud tower aims each shell as it fires (attack runs after this)
    if (cloud && b.cooldown <= 1 && cloud.buildings.includes(b.buildingId) && aimCloud(state, b, cloud.radius)) continue;
    const valid = b.targetId !== 0 && towerTargetValid(state, b);
    if (valid && (tick + b.id) % every !== 0) continue;
    if (!valid) b.targetId = 0;
    retargetTower(state, b, valid);
  }
}

// Combat rework `sporeCloud` and `burster`: the enemy units near a cloud tower or a Burster, copied out of the shared spatial buffer.
let aimX = new Float64Array(64), aimY = new Float64Array(64), aimR = new Float64Array(64);
let aimId = new Int32Array(64);

/**
 * Combat rework `burster`: a burst unit picks, among the enemy units of its lane in its aggro range,
 * the one with the most enemy units whose bodies are within its splash radius of it (the Mortar's
 * cluster rule); ties go to the nearer, then the lower id. With none in range it keeps a live target
 * within its leash (a call for help may have given it one), else it has none and marches with its
 * wave. It never picks a building or a Heartcap.
 */
function aimBurst(state: BattleState, u: UnitState, r: number, curD: number): void {
  const aggro = unitDef(state, u).aggroRange;
  const radius = tierDef(state, u).splashRadius;
  const enemy = other(u.side);
  const n = queryNear(u.x, u.y, aggro + r + radius + 2 * MAX_RADIUS);
  const near = nearBuffer();
  if (aimId.length < n) { aimX = new Float64Array(n); aimY = new Float64Array(n); aimR = new Float64Array(n); aimId = new Int32Array(n); }
  let m = 0;
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    aimX[m] = v.x; aimY[m] = v.y; aimR[m] = unitRadius(state, v); aimId[m] = v.id; m++;
  }
  let best = 0, bestCount = 0, bestD = 0;
  for (let i = 0; i < m; i++) {
    const dx = aimX[i]! - u.x, dy = aimY[i]! - u.y;
    const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - r - aimR[i]!);
    if (d > aggro) continue;
    let count = 0;
    for (let j = 0; j < m; j++) {
      const ex = aimX[j]! - aimX[i]!, ey = aimY[j]! - aimY[i]!, reach = radius + aimR[j]!;
      if (ex * ex + ey * ey <= reach * reach) count++;
    }
    if (count > bestCount || (count === bestCount && (d < bestD || (d === bestD && aimId[i]! < best)))) { best = aimId[i]!; bestCount = count; bestD = d; }
  }
  if (best === 0 && u.targetId !== 0 && curD >= 0 && curD <= aggro * state.rules.leashMult) return;
  u.targetId = best;
}

/**
 * Combat rework `sporeCloud`: points a cloud tower at the enemy unit in its firing band with the most
 * enemy units of its lane inside a cloud centred on it (bodies inside, as a cloud counts them); ties
 * go to the nearer, then the lower id. Returns false, leaving the tower to its usual choice, when no
 * enemy unit stands in the band.
 */
function aimCloud(state: BattleState, b: BuildingState, radius: number): boolean {
  const t = towerRange(state, b);
  const enemy = other(b.side);
  const n = queryNear(t.cx, t.cy, t.max + radius + 2 * MAX_RADIUS);
  const near = nearBuffer();
  if (aimId.length < n) { aimX = new Float64Array(n); aimY = new Float64Array(n); aimR = new Float64Array(n); aimId = new Int32Array(n); }
  let m = 0;
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== b.lane || v.hp <= 0 || v.burrowed) continue;
    aimX[m] = v.x; aimY[m] = v.y; aimR[m] = unitRadius(state, v); aimId[m] = v.id; m++;
  }
  let best = 0, bestCount = 0, bestD = 0;
  for (let i = 0; i < m; i++) {
    const dx = aimX[i]! - t.cx, dy = aimY[i]! - t.cy;
    const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - aimR[i]!);
    if (d < t.min || d > t.max) continue;
    let count = 0;
    for (let j = 0; j < m; j++) {
      const ex = aimX[j]! - aimX[i]!, ey = aimY[j]! - aimY[i]!, reach = radius + aimR[j]!;
      if (ex * ex + ey * ey <= reach * reach) count++;
    }
    if (count > bestCount || (count === bestCount && (d < bestD || (d === bestD && aimId[i]! < best)))) { best = aimId[i]!; bestCount = count; bestD = d; }
  }
  if (best === 0) return false;
  b.targetId = best;
  return true;
}

/** Diver prototype (balance `diveRanged`): is this a living enemy unit with the `ranged` tag? */
export function isRangedUnit(state: BattleState, id: number): boolean {
  const v = id > 0 ? findUnit(state, id) : undefined;
  return !!v && unitDef(state, v).tags.includes('ranged');
}

function retargetUnit(state: BattleState, u: UnitState, r: number, curD: number): void {
  const def = unitDef(state, u);
  if (state.rules.burst && def.tags.includes('burst')) { aimBurst(state, u, r, curD); return; }
  const aggro = def.aggroRange;
  const enemy = other(u.side);
  const prefBuildings = def.siege;
  const prefElite = def.slayer;
  // diver prototype: prefers ranged units, and sees them from farther; the combat rework's burrowers
  // (surfaced Rhizomorphs) prefer them too
  const dive = state.rules.dive?.units.includes(u.unitId) ? state.rules.dive : undefined;
  const diver = !!dive || def.tags.includes('burrow');
  const reach = dive ? aggro + dive.aggroAdd : aggro;
  bestId = 0; bestD = 0; bestPref = false;

  const n = queryNear(u.x, u.y, reach + r + MAX_RADIUS);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    let d = Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, v);
    if (d < 0) d = 0;
    if (diver) {
      const ranged = unitDef(state, v).tags.includes('ranged');
      if (d <= (ranged ? reach : aggro)) consider(v.id, d, ranged || (prefElite && v.tier >= 2));
      continue;
    }
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
  // (with call for help, also while the target is still attacking this unit or a friend near it)
  if (u.targetId !== 0 && curD >= 0 && (curD <= reach * state.rules.leashMult || (state.rules.help && answering(state, u)))) {
    edgeDistance(state, u.x, u.y, r, u.targetId, enemy, u.lane);
    const curPref = (prefBuildings && tp.preferredBuilding) || (prefElite && tp.tier >= 2) || (diver && isRangedUnit(state, u.targetId));
    if (!(bestPref && !curPref)) return;
  }
  u.targetId = bestId;
}

/**
 * Combat rework `callForHelp`: is `u`'s target (an enemy unit or tower) still attacking `u`, or a
 * unit or building of `u`'s side in the lane within the call radius of `u`? Such a target stays
 * sticky beyond the usual leash, so a unit answering a call can close on an attacker that shoots
 * from outside its aggro range.
 */
function answering(state: BattleState, u: UnitState): boolean {
  const t = u.targetId;
  const victim = t > 0 ? (findUnit(state, t)?.targetId ?? findBuilding(state, t)?.targetId ?? 0) : 0;
  if (victim <= 0) return false;
  if (victim === u.id) return true;
  const reach = state.rules.help!.radius + unitRadius(state, u);
  const v = findUnit(state, victim);
  if (v) {
    if (v.side !== u.side || v.lane !== u.lane) return false;
    const dx = v.x - u.x, dy = v.y - u.y;
    return Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v) <= reach;
  }
  const b = findBuilding(state, victim);
  if (!b || b.side !== u.side || b.lane !== u.lane) return false;
  const bd = buildingDef(state, b);
  return rectDistance(u.x, u.y, b.col, b.row, bd.w, bd.h) <= reach;
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
    if (v.side !== enemy || v.lane !== b.lane || v.hp <= 0 || v.burrowed) continue;
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
