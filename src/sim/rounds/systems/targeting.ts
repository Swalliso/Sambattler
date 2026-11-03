// Staggered target selection in a clash (SPEC §5.2, §13.4): v1's `systems/targeting.ts`, typed on rounds'
// state, without buildings or Heartcaps as targets, call for help, the diver prototype or siege's
// preference. A unit takes its preferred class first (a slayer's Bloomed and Elder units, a surfaced
// tunneler's ranged ones), then the nearest by edge distance, ties to the lowest id, and sticks within
// aggro × leash. An emplacement fires as a tower did, from its centre within its firing band, and a cloud
// Mortar aims each shell at the densest knot (§5.3, §6.7). It stands beside v1's file until R2b moves it there.
import { other } from '../state.ts';
import type { BattleState, UnitState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { clashTick, findUnit, frozen, tierDef, unitDef, unitRadius } from '../world.ts';

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
  // the stagger runs on the clash's clock, phased by each unit's arrival (§5.2, T149)
  const ct = clashTick(state);
  const cloud = state.rules.cloud;
  for (const u of state.units) {
    if (frozen(state, u.lane)) continue; // an ended lane holds still (§6.7)
    if (u.knit) { u.targetId = 0; continue; } // knitting units stop retargeting (SPEC §5.6)
    if (u.burrowed) { u.targetId = 0; continue; } // a tunnelling unit has no target (§5.2)
    const em = unitDef(state, u).emplacement;
    if (em) {
      // a cloud Mortar aims each shell as it fires (attack runs after this)
      if (cloud && em.clouds && u.cooldown <= 1 && aimCloud(state, u, cloud.radius)) continue;
      const valid = u.targetId !== 0 && emplacementTargetValid(state, u);
      if (valid && (ct + u.arrival) % every !== 0) continue;
      if (!valid) u.targetId = 0;
      retargetEmplacement(state, u, valid);
      continue;
    }
    const enemy = other(u.side);
    const r = unitRadius(state, u);
    const curD = u.targetId !== 0 ? edgeDistance(state, u.x, u.y, r, u.targetId, enemy, u.lane) : -1;
    if (curD >= 0 && (ct + u.arrival) % every !== 0) continue;
    if (curD < 0) u.targetId = 0;
    retargetUnit(state, u, r, curD);
  }
}

// The enemy units near a cloud Mortar or a Burster, copied out of the shared spatial buffer.
let aimX = new Float64Array(64), aimY = new Float64Array(64), aimR = new Float64Array(64);
let aimId = new Int32Array(64);

/**
 * A burst unit (§5.3) picks, among the enemy units of its lane in its aggro range, the one with the most
 * enemy units whose bodies are within its splash radius of it (the Mortar's cluster rule); ties go to the
 * nearer, then the lower id. With none in range it keeps a live target within its leash, else it has none.
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
 * Points a cloud Mortar at the enemy unit in its firing band with the most enemy units of its lane inside a
 * cloud centred on it (bodies inside, as a cloud counts them); ties go to the nearer, then the lower id
 * (§5.3). Returns false, leaving the emplacement to its usual choice, when no enemy unit stands in the band.
 */
function aimCloud(state: BattleState, u: UnitState, radius: number): boolean {
  const t = bandOf(state, u);
  const enemy = other(u.side);
  const n = queryNear(u.x, u.y, t.max + radius + 2 * MAX_RADIUS);
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
  u.targetId = best;
  return true;
}

/** Is this a living unit with the `ranged` tag? */
function isRangedUnit(state: BattleState, id: number): boolean {
  const v = id > 0 ? findUnit(state, id) : undefined;
  return !!v && unitDef(state, v).tags.includes('ranged');
}

function retargetUnit(state: BattleState, u: UnitState, r: number, curD: number): void {
  const def = unitDef(state, u);
  if (state.rules.burst && def.tags.includes('burst')) { aimBurst(state, u, r, curD); return; }
  const aggro = def.aggroRange;
  const enemy = other(u.side);
  // siege units have no preference (SPEC §5.2): a slayer prefers Bloomed and Elder units, a surfaced tunneler ranged ones
  const prefElite = def.slayer;
  const tunneler = def.tags.includes('burrow');
  bestId = 0; bestD = 0; bestPref = false;

  const n = queryNear(u.x, u.y, aggro + r + MAX_RADIUS);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    let d = Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, v);
    if (d < 0) d = 0;
    if (d <= aggro) consider(v.id, d, (prefElite && v.tier >= 2) || (tunneler && unitDef(state, v).tags.includes('ranged')));
  }

  // stickiness: keep a live current target within leash unless a preferred-class candidate appears
  if (u.targetId !== 0 && curD >= 0 && curD <= aggro * state.rules.leashMult) {
    edgeDistance(state, u.x, u.y, r, u.targetId, enemy, u.lane);
    const curPref = (prefElite && tp.tier >= 2) || (tunneler && isRangedUnit(state, u.targetId));
    if (!(bestPref && !curPref)) return;
  }
  u.targetId = bestId;
}

const band = { min: 0, max: 0 };

/** An emplacement's firing band, from its centre (§6.7): no nearer than its `minRange`, up to its range. */
function bandOf(state: BattleState, u: UnitState): typeof band {
  band.min = unitDef(state, u).emplacement!.minRange;
  band.max = tierDef(state, u).range;
  return band;
}

function emplacementTargetValid(state: BattleState, u: UnitState): boolean {
  const t = bandOf(state, u);
  const d = edgeDistance(state, u.x, u.y, 0, u.targetId, other(u.side), u.lane);
  return d >= 0 && d >= t.min && d <= t.max;
}

function retargetEmplacement(state: BattleState, u: UnitState, keep: boolean): void {
  if (keep) return; // an emplacement sticks to a target while it stays in its firing band
  const t = bandOf(state, u);
  const enemy = other(u.side);
  bestId = 0; bestD = 0; bestPref = false;
  const n = queryNear(u.x, u.y, t.max + MAX_RADIUS);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    let d = Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v);
    if (d < 0) d = 0;
    if (d >= t.min && d <= t.max) consider(v.id, d, false);
  }
  u.targetId = bestId;
}
