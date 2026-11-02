// Movement and separation in a clash (SPEC §5.2, §13.4): v1's `systems/movement.ts`, typed on rounds' state,
// without Hold, waves, rush, fall-back, dive, surfacing at spawners or the turret checks, and so without
// its imports from `spawning.ts` and `stance.ts`. No pathfinding: units walk straight at their target;
// with none, at the nearest enemy they could target (R1's `idleSeek`, now the rule); with no such enemy
// they advance along the lane while drifting back to their slot's y. Each unit moves at its own speed
// (no pace rule, #12). Knitting trios walk to their centroid (§5.6). Overlapping units are pushed apart by
// half their overlap each, for a fixed number of passes, using the spatial hash; an emplacement never
// moves, so the other unit takes the whole overlap (§6.7, A029). It stands beside v1's file until R2b
// moves it there.
import { SIDES, other } from '../state.ts';
import type { BattleState, CompiledTier, Side, UnitState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { clampToLane, isEmplacement, tierDef, unitDef, unitRadius } from '../world.ts';

export function movementSystem(state: BattleState): void {
  const r = state.rules;
  prepareSeek(state);
  for (const u of state.units) {
    const def = unitDef(state, u);
    if (def.emplacement) continue; // it never moves (§6.7)
    const t = def.tiers[u.tier - 1]!;
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
        if (d > t.range) {
          const dx = tp.x - u.x, dy = tp.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const step = Math.min(speed, d - t.range);
          if (dist > 1e-9) {
            u.x += (dx / dist) * step;
            u.y += (dy / dist) * step;
          }
        }
        clampToLane(state, u, rad);
        continue;
      }
    }
    if (seekPoint(state, u, rad)) {
      // an idle unit steps at the nearest enemy it could target, capped as the advance is (SPEC §5.2)
      const dx = seekAt.x - u.x, dy = seekAt.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1e-9) {
        const s = Math.min(speed, dist);
        u.x += (dx / dist) * s;
        u.y += (dy / dist) * s;
      }
      clampToLane(state, u, rad);
      continue;
    }
    u.x += u.side === 'player' ? speed : -speed;
    const dy = u.slotY - u.y;
    if (dy > 0) u.y += dy < r.driftPerTick ? dy : r.driftPerTick;
    else if (dy < 0) u.y -= -dy < r.driftPerTick ? -dy : r.driftPerTick;
    clampToLane(state, u, rad);
  }
  separationSystem(state);
}

// Rebuilt each tick: per side and lane, the indices in `state.units` of the living units that aren't
// burrowed, emplacements among them. Positions are read as units move, as a target's are.
const seekUnits: Record<Side, number[][]> = { player: [], enemy: [] };
const seekAt = { x: 0, y: 0 };

function prepareSeek(state: BattleState): void {
  for (const side of SIDES) {
    for (let li = 0; li < state.lanes.length; li++) (seekUnits[side][li] ??= []).length = 0;
  }
  for (let i = 0; i < state.units.length; i++) {
    const v = state.units[i]!;
    if (v.hp > 0 && !v.burrowed) seekUnits[v.side][v.lane]!.push(i);
  }
}

/**
 * Is there an enemy in `u`'s lane that it could target (SPEC §5.2)? If so, `seekAt` is the nearest one's
 * centre, by edge distance, ties to the lower id. The candidates are the living units that aren't
 * burrowed, emplacements among them, which a burst unit aims at too. A support unit seeks nothing.
 */
function seekPoint(state: BattleState, u: UnitState, r: number): boolean {
  if (unitDef(state, u).support) return false;
  const enemy = other(u.side);
  let best = 0, bestD = Infinity;
  for (const i of seekUnits[enemy][u.lane]!) {
    const v = state.units[i]!;
    const dx = v.x - u.x, dy = v.y - u.y;
    const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, v));
    if (d < bestD || (d === bestD && v.id < best)) { best = v.id; bestD = d; seekAt.x = v.x; seekAt.y = v.y; }
  }
  return best !== 0;
}

/**
 * The tunneler (the `burrow` tag, SPEC §5.2): a burrowed unit tunnels straight at its surfacing point at its
 * speed, passing under every unit, and surfaces once its attack range reaches it. The point is the nearest
 * enemy ranged unit in the lane (by edge distance, ties to the lower id), skipping any an enemy emplacement
 * could hit (`underFire`); else the enemy's frontmost unit; else, with no enemy left in the lane, the far edge.
 */
function tunnel(state: BattleState, u: UnitState, t: CompiledTier): void {
  const enemy = other(u.side);
  const dir = u.side === 'player' ? 1 : -1;
  let front: UnitState | undefined;
  for (const v of state.units) {
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    if (!front || v.x * dir < front.x * dir) front = v;
  }
  let best = 0, bestD = Infinity, px = 0, py = 0;
  for (const v of state.units) {
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed || !unitDef(state, v).tags.includes('ranged')) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    const d = Math.sqrt(dx * dx + dy * dy) - t.radius - unitRadius(state, v);
    if ((d < bestD || (d === bestD && v.id < best)) && !underFire(state, enemy, u.lane, v.x, v.y, t.radius)) { best = v.id; bestD = d; px = v.x; py = v.y; }
  }
  if (!best && front) {
    const dx = front.x - u.x, dy = front.y - u.y;
    bestD = Math.sqrt(dx * dx + dy * dy) - t.radius - unitRadius(state, front); px = front.x; py = front.y;
  } else if (!best) {
    const edge = u.side === 'player' ? state.map.width : 0;
    bestD = (edge - u.x) * dir; px = edge; py = u.y;
  }
  if (bestD <= t.range + 1e-6) { u.burrowed = false; return; } // the attack check's tolerance
  const dx = px - u.x, dy = py - u.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const step = Math.min(t.speedPerTick, bestD - t.range);
  if (dist > 1e-9) { u.x += (dx / dist) * step; u.y += (dy / dist) * step; }
  clampToLane(state, u, t.radius);
}

/**
 * Could one of `side`'s emplacements hit a unit of radius `r` standing at (x, y) in `lane`? Within its
 * firing band, from its centre (§6.7): a Mortar can't hit a unit hugging it.
 */
function underFire(state: BattleState, side: Side, lane: number, x: number, y: number, r: number): boolean {
  for (const e of state.units) {
    if (e.side !== side || e.lane !== lane || e.hp <= 0) continue;
    const em = unitDef(state, e).emplacement;
    if (!em) continue;
    const dx = x - e.x, dy = y - e.y;
    const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - r);
    if (d >= em.minRange && d <= tierDef(state, e).range) return true;
  }
  return false;
}

function separationSystem(state: BattleState): void {
  const units = state.units;
  const passes = state.rules.separationPasses;
  buildGrid(state);
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < units.length; i++) {
      const a = units[i]!;
      const ra = unitRadius(state, a);
      const fixedA = isEmplacement(state, a);
      const n = queryNear(a.x, a.y, ra + MAX_RADIUS + 0.5);
      const near = nearBuffer();
      for (let k = 0; k < n; k++) {
        const j = near[k]!;
        if (j <= i) continue;
        const b = units[j]!;
        if (b.lane !== a.lane || a.burrowed || b.burrowed) continue; // a tunnelling unit passes under everyone
        const fixedB = isEmplacement(state, b);
        if (fixedA && fixedB) continue;
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
        // half the overlap each, unless one is an emplacement, which never moves: then the other takes it all
        const push = fixedA || fixedB ? minD - d : (minD - d) / 2;
        if (!fixedA) { a.x -= nx * push; a.y -= ny * push; }
        if (!fixedB) { b.x += nx * push; b.y += ny * push; }
      }
    }
  }
  for (const u of units) if (!isEmplacement(state, u)) clampToLane(state, u, unitRadius(state, u));
}
