// Movement and separation (SPEC §5.2). No pathfinding: units walk straight at their target, or
// advance along the lane while drifting back to their spawn row. Overlapping units are pushed
// apart by half their overlap each, for a fixed number of passes, using the spatial hash.
import { other } from '../state.ts';
import type { BattleState } from '../state.ts';
import { buildGrid, nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { clampToLane, unitDef, unitRadius } from '../world.ts';

export function movementSystem(state: BattleState): void {
  const r = state.rules;
  for (const u of state.units) {
    const def = unitDef(state, u);
    const rad = unitRadius(state, u);
    const speed = def.speedPerTick;
    if (u.targetId !== 0) {
      const d = edgeDistance(state, u.x, u.y, rad, u.targetId, other(u.side), u.lane);
      if (d >= 0) {
        if (d > def.range) {
          const dx = tp.x - u.x, dy = tp.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const step = Math.min(speed, d - def.range);
          if (dist > 1e-9) {
            u.x += (dx / dist) * step;
            u.y += (dy / dist) * step;
          }
        }
        clampToLane(state, u, rad);
        continue;
      }
    }
    u.x += u.side === 'player' ? speed : -speed;
    const dy = u.spawnY - u.y;
    if (dy > 0) u.y += dy < r.driftPerTick ? dy : r.driftPerTick;
    else if (dy < 0) u.y -= -dy < r.driftPerTick ? -dy : r.driftPerTick;
    clampToLane(state, u, rad);
  }
  separationSystem(state);
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
