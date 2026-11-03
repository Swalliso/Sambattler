// Movement and separation in a clash (SPEC §5.2, §13.4): v1's `systems/movement.ts`, typed on rounds' state,
// without Hold, waves, rush, fall-back, dive, surfacing at spawners or the turret checks, and so without its
// imports from `spawning.ts` and `stance.ts`. No pathfinding: units walk straight at their target; with
// none, at the nearest enemy they could target (R1's `idleSeek`, now the rule); with no such enemy they
// advance along the lane while drifting back to their slot's y. Each unit moves at its own speed (no pace
// rule, #12). Knitting trios walk to their centroid (§5.6). A unit steers by where other units stood at the
// tick's start (`px`, `py`), so one earlier in the list never steers one later (T147). Overlapping units are
// pushed apart by half their overlap each, for a fixed number of passes, using the spatial hash; an
// emplacement never moves, so the other unit takes the whole overlap (§6.7, A029).
import { SIDES, other } from '../state.ts';
import type { BattleState, CompiledTier, Side, UnitState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS } from '../targets.ts';
import { clampToLane, findUnit, frozen, isEmplacement, tierDef, unitDef, unitRadius } from '../world.ts';

/** A unit's speed this tick: × its opening multiplier until its first attack in the clash (Quick Roots, §11.7). */
const speedOf = (u: UnitState, t: CompiledTier): number => (u.lastAttackTick < 0 ? t.speedPerTick * t.openingSpeedMult : t.speedPerTick);

export function movementSystem(state: BattleState): void {
  const r = state.rules;
  prepareSeek(state);
  for (const u of state.units) {
    const def = unitDef(state, u);
    if (def.emplacement || frozen(state, u.lane)) continue; // it never moves, nor does an ended lane (§6.7)
    const t = tierDef(state, u);
    const rad = t.radius;
    const speed = speedOf(u, t);
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
      const d = targetSeen(state, u, rad);
      if (d >= 0) {
        if (d > t.range) {
          const dx = seen.x - u.x, dy = seen.y - u.y;
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
      const dx = seen.x - u.x, dy = seen.y - u.y;
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
// burrowed, emplacements among them, read where they stood at the tick's start.
const seekUnits: Record<Side, number[][]> = { player: [], enemy: [] };
// Where the unit moving now steers: its target's or the seek's point at the tick's start.
const seen = { x: 0, y: 0 };

/**
 * The edge distance from `u` to its target where the target stood at the tick's start, which it leaves in
 * `seen`, or -1 if the target is gone. It's `edgeDistance` at the start-of-tick position (T147).
 */
function targetSeen(state: BattleState, u: UnitState, r: number): number {
  const v = findUnit(state, u.targetId);
  if (!v || v.hp <= 0 || v.side === u.side || v.lane !== u.lane) return -1;
  seen.x = v.px; seen.y = v.py;
  const dx = v.px - u.x, dy = v.py - u.y;
  const d = Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, v);
  return d > 0 ? d : 0;
}

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
 * Is there an enemy in `u`'s lane that it could target (SPEC §5.2)? If so, `seen` is the nearest one's
 * centre at the tick's start, by edge distance, ties to the lower id. The candidates are the living units
 * that aren't burrowed, emplacements among them, which a burst unit aims at too. A support unit seeks nothing.
 */
function seekPoint(state: BattleState, u: UnitState, r: number): boolean {
  if (unitDef(state, u).support) return false;
  const enemy = other(u.side);
  let best = 0, bestD = Infinity;
  for (const i of seekUnits[enemy][u.lane]!) {
    const v = state.units[i]!;
    const dx = v.px - u.x, dy = v.py - u.y;
    const d = Math.max(0, Math.sqrt(dx * dx + dy * dy) - r - unitRadius(state, v));
    if (d < bestD || (d === bestD && v.id < best)) { best = v.id; bestD = d; seen.x = v.px; seen.y = v.py; }
  }
  return best !== 0;
}

/**
 * The tunneler (the `burrow` tag, SPEC §5.2): a burrowed unit tunnels straight at its surfacing point at its
 * speed, passing under every unit, and surfaces once its attack range reaches it. The point is the nearest
 * enemy ranged unit in the lane (by edge distance, ties to the lower id), skipping any an enemy emplacement
 * could hit (`underFire`); else the enemy's frontmost unit; else, with no enemy left in the lane, the far edge.
 * It reads the enemy where it stood at the tick's start.
 */
function tunnel(state: BattleState, u: UnitState, t: CompiledTier): void {
  const enemy = other(u.side);
  const dir = u.side === 'player' ? 1 : -1;
  let front: UnitState | undefined;
  for (const v of state.units) {
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    if (!front || v.px * dir < front.px * dir) front = v;
  }
  let best = 0, bestD = Infinity, px = 0, py = 0;
  for (const v of state.units) {
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed || !unitDef(state, v).tags.includes('ranged')) continue;
    const dx = v.px - u.x, dy = v.py - u.y;
    const d = Math.sqrt(dx * dx + dy * dy) - t.radius - unitRadius(state, v);
    if ((d < bestD || (d === bestD && v.id < best)) && !underFire(state, enemy, u.lane, v.px, v.py, t.radius)) { best = v.id; bestD = d; px = v.px; py = v.py; }
  }
  if (!best && front) {
    const dx = front.px - u.x, dy = front.py - u.y;
    bestD = Math.sqrt(dx * dx + dy * dy) - t.radius - unitRadius(state, front); px = front.px; py = front.py;
  } else if (!best) {
    const edge = u.side === 'player' ? state.map.width : 0;
    bestD = (edge - u.x) * dir; px = edge; py = u.y;
  }
  if (bestD <= t.range + 1e-6) { u.burrowed = false; return; } // the attack check's tolerance
  const dx = px - u.x, dy = py - u.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const step = Math.min(speedOf(u, t), bestD - t.range);
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

// Each unit's summed push in a separation pass, by its index in `state.units`, in fixed point: 2^44 to a
// tile, so a sum stays an exact integer, far below 2^53 even for a unit in a crowd. Integer sums don't
// depend on the order they're added in (T147).
const FIX = 17592186044416; // 2^44
let pushX = new Float64Array(64), pushY = new Float64Array(64);

/**
 * Separation (§5.2): overlapping units are pushed apart by half their overlap each, for a fixed number of
 * passes. Each pass works out every pair's push from the positions at its start, then applies them all
 * together, so the order units are listed in never decides who moves (T147). An emplacement never moves, so
 * the other unit takes the whole overlap (§6.7, A029). An exact stack splits by a mirror-image rule: across
 * sides, each toward its own side; on one side, each toward its slot's y, and two with the same slot are
 * alike, so neither moves.
 */
function separationSystem(state: BattleState): void {
  const units = state.units;
  const n = units.length;
  if (pushX.length < n) { pushX = new Float64Array(n * 2); pushY = new Float64Array(n * 2); }
  for (let pass = 0; pass < state.rules.separationPasses; pass++) {
    buildGrid(state);
    pushX.fill(0, 0, n);
    pushY.fill(0, 0, n);
    for (let i = 0; i < n; i++) {
      const a = units[i]!;
      if (frozen(state, a.lane) || a.burrowed) continue; // pairs share a lane, and a tunnelling unit passes under everyone
      const ra = unitRadius(state, a);
      const fixedA = isEmplacement(state, a);
      const m = queryNear(a.x, a.y, ra + MAX_RADIUS + 0.5);
      const near = nearBuffer();
      for (let k = 0; k < m; k++) {
        const j = near[k]!;
        if (j <= i) continue;
        const b = units[j]!;
        if (b.lane !== a.lane || b.burrowed) continue;
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
          if (a.side !== b.side) { nx = a.side === 'player' ? 1 : -1; ny = 0; } else { nx = 0; ny = Math.sign(b.slotY - a.slotY); }
        }
        // half the overlap each, unless one is an emplacement, which never moves: then the other takes it all
        const push = fixedA || fixedB ? minD - d : (minD - d) / 2;
        // truncated toward 0, so a mirror-image pair's pushes stay mirror images
        const px = Math.trunc(nx * push * FIX), py = Math.trunc(ny * push * FIX);
        if (!fixedA) { pushX[i] = pushX[i]! - px; pushY[i] = pushY[i]! - py; }
        if (!fixedB) { pushX[j] = pushX[j]! + px; pushY[j] = pushY[j]! + py; }
      }
    }
    for (let i = 0; i < n; i++) {
      const u = units[i]!;
      u.x += pushX[i]! / FIX;
      u.y += pushY[i]! / FIX;
    }
  }
  for (const u of units) if (!isEmplacement(state, u)) clampToLane(state, u, unitRadius(state, u));
}
