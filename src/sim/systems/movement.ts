// Movement and separation (SPEC §5.2). No pathfinding: units walk straight at their target, or
// advance along the lane while drifting back to their spawn row; knitting trios walk to their
// centroid (SPEC §5.6). Overlapping units are pushed apart by half their overlap each, for a fixed
// number of passes, using the spatial hash.
import { other } from '../state.ts';
import type { BattleState, UnitState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { clampToLane, tierDef, unitDef, unitRadius } from '../world.ts';
import { holdsLane, rallyX } from './stance.ts';
import { isRangedUnit } from './targeting.ts';

export function movementSystem(state: BattleState): void {
  const r = state.rules;
  for (const u of state.units) {
    const t = tierDef(state, u);
    const rad = t.radius;
    const speed = t.speedPerTick;
    if (u.knit) {
      const dx = u.knit.x - u.x, dy = u.knit.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1e-9) {
        const step = Math.min(speed, dist);
        u.x += (dx / dist) * step;
        u.y += (dy / dist) * step;
      }
      clampToLane(state, u, rad);
      continue;
    }
    if (u.targetId !== 0) {
      const d = edgeDistance(state, u.x, u.y, rad, u.targetId, other(u.side), u.lane);
      if (d >= 0) {
        if (d > t.range && r.fallBack && !tp.preferredBuilding && unitDef(state, u).projectileSpeed === 0 && fallingBack(state, u, tp.cx, tp.cy)) {
          // prototype T2: outnumbered near the target, fall back toward home (hold once home)
          const home = state.map.homeCols;
          const atHome = u.side === 'player' ? u.x < home : u.x > state.map.width - home;
          if (!atHome) u.x += u.side === 'player' ? -speed : speed;
          clampToLane(state, u, rad);
          continue;
        }
        if (d > t.range) {
          const dx = tp.x - u.x, dy = tp.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let move = r.rush && !tp.preferredBuilding ? rushSpeed(state, u, speed) : speed;
          if (r.dive?.burst && !tp.preferredBuilding) move = diveSpeed(state, u, move);
          const step = Math.min(move, d - t.range);
          if (dist > 1e-9) {
            u.x += (dx / dist) * step;
            u.y += (dy / dist) * step;
          }
        }
        clampToLane(state, u, rad);
        continue;
      }
    }
    if (r.stance && holdsLane(state, u.side, u.lane) && state.tick - u.lastCombatTick > r.merge.cooldownTicks) {
      // a held lane (prototype E1): idle units walk to the rally line and wait there
      const dx = rallyX(state, u.side, u.lane) - u.x;
      u.x += dx > speed ? speed : dx < -speed ? -speed : dx;
    } else {
      u.x += u.side === 'player' ? speed : -speed;
    }
    const dy = u.spawnY - u.y;
    if (dy > 0) u.y += dy < r.driftPerTick ? dy : r.driftPerTick;
    else if (dy < 0) u.y -= -dy < r.driftPerTick ? -dy : r.driftPerTick;
    clampToLane(state, u, rad);
  }
  separationSystem(state);
}

/**
 * Prototype B1 (balance `approachRush`): a listed unit closing on an enemy unit sprints for a few
 * ticks, then waits out a cooldown before it can rush again.
 */
function rushSpeed(state: BattleState, u: UnitState, speed: number): number {
  const rush = state.rules.rush!;
  if (!rush.units.includes(u.unitId)) return speed;
  const tick = state.tick;
  if (u.rushUntil !== undefined && tick < u.rushUntil) return speed * rush.speedMult;
  if (u.rushReady !== undefined && tick < u.rushReady) return speed;
  u.rushUntil = tick + rush.ticks;
  u.rushReady = tick + rush.ticks + rush.cooldownTicks;
  return speed * rush.speedMult;
}

/**
 * Diver prototype (balance `diveRanged.burst`): a listed unit closing on a ranged enemy unit
 * sprints for a few ticks, then waits out a cooldown (sharing B1's rush timers).
 */
function diveSpeed(state: BattleState, u: UnitState, speed: number): number {
  const dive = state.rules.dive!;
  const burst = dive.burst!;
  if (!dive.units.includes(u.unitId) || !isRangedUnit(state, u.targetId)) return speed;
  const tick = state.tick;
  if (u.rushUntil !== undefined && tick < u.rushUntil) return speed * burst.speedMult;
  if (u.rushReady !== undefined && tick < u.rushReady) return speed;
  u.rushUntil = tick + burst.ticks;
  u.rushReady = tick + burst.ticks + burst.cooldownTicks;
  return speed * burst.speedMult;
}

/**
 * Prototype T2 (balance `fallBack`): is this melee unit outnumbered near its target (own supply
 * within the radius of it below ratio × enemy supply within the radius of the target)? A unit holds
 * for at most `maxHoldTicks`, and commits once the odds turn or the time runs out.
 */
function fallingBack(state: BattleState, u: UnitState, tx: number, ty: number): boolean {
  const fb = state.rules.fallBack!;
  if (u.holdSince !== undefined && state.tick - u.holdSince >= fb.maxHoldTicks) return false;
  const enemy = other(u.side);
  let own = 0, foe = 0;
  let n = queryNear(u.x, u.y, fb.radius + MAX_RADIUS);
  let near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== u.side || v.lane !== u.lane || v.hp <= 0) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    if (dx * dx + dy * dy <= fb.radius * fb.radius) own += v.supply;
  }
  n = queryNear(tx, ty, fb.radius + MAX_RADIUS);
  near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0) continue;
    const dx = v.x - tx, dy = v.y - ty;
    if (dx * dx + dy * dy <= fb.radius * fb.radius) foe += v.supply;
  }
  if (own >= fb.ratio * foe) {
    if (u.holdSince !== undefined) u.holdSince = state.tick - fb.maxHoldTicks; // the odds turned: commit
    return false;
  }
  u.holdSince ??= state.tick;
  return true;
}

function separationSystem(state: BattleState): void {
  const units = state.units;
  const passes = state.rules.separationPasses;
  buildGrid(state);
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < units.length; i++) {
      const a = units[i]!;
      const ra = unitRadius(state, a);
      const n = queryNear(a.x, a.y, ra + MAX_RADIUS + 0.5);
      const near = nearBuffer();
      for (let k = 0; k < n; k++) {
        const j = near[k]!;
        if (j <= i) continue;
        const b = units[j]!;
        if (b.lane !== a.lane) continue;
        const minD = ra + unitRadius(state, b);
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD) continue;
        let nx: number, ny: number, d: number;
        if (d2 > 1e-12) {
          d = Math.sqrt(d2);
          nx = dx / d; ny = dy / d;
        } else {
          d = 0;
          nx = 0; ny = 1; // stacked exactly: split vertically, lower id upward
        }
        const push = (minD - d) / 2;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }
  for (const u of units) clampToLane(state, u, unitRadius(state, u));
}
