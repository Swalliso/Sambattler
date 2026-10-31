// Movement and separation (SPEC §5.2). No pathfinding: units walk straight at their target, or
// advance along the lane while drifting back to their spawn row; knitting trios walk to their
// centroid (SPEC §5.6). Overlapping units are pushed apart by half their overlap each, for a fixed
// number of passes, using the spatial hash.
import { SIDES, other } from '../state.ts';
import type { BattleState, CompiledTier, Side, UnitState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { buildingDef, clampToLane, rectDistance, tierDef, unitDef, unitRadius } from '../world.ts';
import { turretPos } from './combat.ts';
import { layWaves } from './spawning.ts';
import { holdsLane, rallyX } from './stance.ts';
import { isRangedUnit } from './targeting.ts';

export function movementSystem(state: BattleState): void {
  const r = state.rules;
  if (r.waves) prepareWaves(state);
  for (const u of state.units) {
    const t = tierDef(state, u);
    const rad = t.radius;
    const speed = t.speedPerTick;
    if (u.burrowed) { tunnel(state, u, t); continue; }
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
    if (r.stance && !r.waves && holdsLane(state, u.side, u.lane) && state.tick - u.lastCombatTick > r.merge.cooldownTicks) {
      // a held lane (prototype E1): idle units walk to the rally line and wait there
      const dx = rallyX(state, u.side, u.lane) - u.x;
      u.x += dx > speed ? speed : dx < -speed ? -speed : dx;
    } else {
      const step = r.waves ? waveStep(state, u, speed) : speed;
      u.x += u.side === 'player' ? step : -step;
    }
    const dy = u.spawnY - u.y;
    if (dy > 0) u.y += dy < r.driftPerTick ? dy : r.driftPerTick;
    else if (dy < 0) u.y -= -dy < r.driftPerTick ? -dy : r.driftPerTick;
    clampToLane(state, u, rad);
  }
  separationSystem(state);
}

// Combat rework `waves`, rebuilt each tick: the slowest idle unit's speed per (wave, lane, side), and
// each side's frontmost melee unit's x per lane (NaN: none). With `matchPace`, a unit that left
// before its wave's beat also marches at the slowest speed its lane's spawners make (`lanePace`),
// the pace its spawner's early release was timed for.
const pace = new Map<number, number>();
let meleeFront = { player: new Float64Array(4), enemy: new Float64Array(4) };
let lanePace = { player: new Float64Array(4), enemy: new Float64Array(4) };
const paceKey = (u: UnitState): number => ((u.wave! * 4 + u.lane) * 2) + (u.side === 'player' ? 0 : 1);

function prepareWaves(state: BattleState): void {
  pace.clear();
  const n = state.lanes.length;
  if (meleeFront.player.length < n) {
    meleeFront = { player: new Float64Array(n), enemy: new Float64Array(n) };
    lanePace = { player: new Float64Array(n), enemy: new Float64Array(n) };
  }
  meleeFront.player.fill(NaN);
  meleeFront.enemy.fill(NaN);
  const matchPace = state.rules.waves!.matchPace;
  if (matchPace) for (const side of SIDES) lanePace[side].set(layWaves(state, side).pace.subarray(0, n));
  for (const u of state.units) {
    if (u.hp <= 0 || u.burrowed) continue;
    const def = unitDef(state, u);
    if (!def.support && !def.tags.includes('ranged')) {
      const f = meleeFront[u.side][u.lane]!;
      if (Number.isNaN(f) || (u.side === 'player' ? u.x > f : u.x < f)) meleeFront[u.side][u.lane] = u.x;
    }
    if (u.wave !== undefined && u.targetId === 0 && !u.knit) {
      const k = paceKey(u);
      let speed = def.tiers[u.tier - 1]!.speedPerTick;
      if (matchPace && state.tick < u.wave * state.compiled[u.side].waveBeatTicks!) speed = Math.min(speed, lanePace[u.side][u.lane]!);
      const cur = pace.get(k);
      if (cur === undefined || speed < cur) pace.set(k, speed);
    }
  }
}

/**
 * Combat rework `waves`: an idle unit's step along the lane. A unit a beat released marches at the
 * pace of its wave's slowest idle unit in the lane (with `matchPace`), and an idle ranged unit stops
 * `rangedGap` tiles behind its side's frontmost melee unit in the lane (it never walks back).
 */
function waveStep(state: BattleState, u: UnitState, speed: number): number {
  const w = state.rules.waves!;
  let step = speed;
  if (w.matchPace && u.wave !== undefined) step = Math.min(step, pace.get(paceKey(u)) ?? step);
  if (unitDef(state, u).tags.includes('ranged')) {
    const f = meleeFront[u.side][u.lane]!;
    if (!Number.isNaN(f)) step = Math.max(0, Math.min(step, u.side === 'player' ? f - w.rangedGap - u.x : u.x - f - w.rangedGap));
  }
  return step;
}

/**
 * Combat rework (the Rhizomorph's `burrow` tag): a burrowed unit tunnels straight at its surfacing
 * point at its speed, passing under every unit, and surfaces once its attack range reaches it. The
 * point is the nearest enemy ranged unit in the lane; else the nearest enemy spawner in the lane at
 * or behind the enemy's frontmost unit (by edge distance, ties to the lower id). Either is skipped
 * while an enemy tower or Heartcap turret could shoot a unit beside it (`underFire`). Else the point
 * is that frontmost unit, under fire or not; else the enemy's border.
 */
function tunnel(state: BattleState, u: UnitState, t: CompiledTier): void {
  const enemy = other(u.side);
  const dir = u.side === 'player' ? 1 : -1;
  let front: UnitState | undefined;
  for (const v of state.units) {
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    if (!front || v.x * dir < front.x * dir) front = v;
  }
  const L = state.lanes[u.lane]!;
  const frontX = front ? front.x : u.side === 'player' ? L.eBorder : L.pBorder + 1;
  let best = 0, bestD = Infinity, px = 0, py = 0;
  for (const v of state.units) {
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed || !unitDef(state, v).tags.includes('ranged')) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    const d = Math.sqrt(dx * dx + dy * dy) - t.radius - unitRadius(state, v);
    if ((d < bestD || (d === bestD && v.id < best)) && !underFire(state, enemy, u.lane, v.x, v.y, t.radius)) { best = v.id; bestD = d; px = v.x; py = v.y; }
  }
  if (!best) {
    for (const b of state.buildings) {
      if (b.side !== enemy || b.lane !== u.lane || b.hp <= 0) continue;
      const bd = buildingDef(state, b);
      if (!bd.spawn || (b.col + bd.w / 2 - frontX) * dir < 0) continue;
      const d = rectDistance(u.x, u.y, b.col, b.row, bd.w, bd.h) - t.radius;
      if (d > bestD || (d === bestD && b.id > best)) continue;
      const bx = u.x < b.col ? b.col : u.x > b.col + bd.w ? b.col + bd.w : u.x;
      const by = u.y < b.row ? b.row : u.y > b.row + bd.h ? b.row + bd.h : u.y;
      if (underFire(state, enemy, u.lane, bx, by, t.radius)) continue;
      best = b.id; bestD = d; px = bx; py = by;
    }
  }
  if (!best && front) {
    const dx = front.x - u.x, dy = front.y - u.y;
    bestD = Math.sqrt(dx * dx + dy * dy) - t.radius - unitRadius(state, front); px = front.x; py = front.y;
  } else if (!best) {
    bestD = (frontX - u.x) * dir; px = frontX; py = u.y;
  }
  if (bestD <= t.range + 1e-6) { u.burrowed = false; return; } // the attack check's tolerance
  const dx = px - u.x, dy = py - u.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const step = Math.min(t.speedPerTick, bestD - t.range);
  if (dist > 1e-9) { u.x += (dx / dist) * step; u.y += (dy / dist) * step; }
  clampToLane(state, u, t.radius);
}

/**
 * Combat rework (the Rhizomorph): could one of `side`'s towers or Heartcap turrets shoot a unit of
 * radius `r` standing at (x, y) in `lane`? A tower counts within its firing band (a Mortar can't hit
 * a unit hugging it); a turret within its range.
 */
function underFire(state: BattleState, side: Side, lane: number, x: number, y: number, r: number): boolean {
  for (const b of state.buildings) {
    if (b.side !== side || b.lane !== lane || b.hp <= 0) continue;
    const def = buildingDef(state, b);
    const a = def.attack;
    if (!a) continue;
    const dx = x - (b.col + def.w / 2), dy = y - (b.row + def.h / 2);
    const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - r);
    if (d >= a.minRange && d <= a.range) return true;
  }
  if (!state.rules.test.turrets) return false;
  const turret = state.compiled[side].turret;
  for (let i = 0; i < state.sides[side].turretCooldowns.length; i++) {
    turretPos(state, side, i, turretAt);
    if (turretAt.lane !== lane) continue;
    const dx = x - turretAt.x, dy = y - turretAt.y;
    if (Math.sqrt(dx * dx + dy * dy) - r <= turret.range) return true;
  }
  return false;
}

const turretAt = { x: 0, y: 0, lane: 0 };

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
        if (b.lane !== a.lane || a.burrowed || b.burrowed) continue; // a tunnelling unit passes under everyone
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
