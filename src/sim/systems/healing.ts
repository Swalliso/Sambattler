// Healing (SPEC §14.6 step 11). Support units (the Tender, §11.3) heal the ally missing the most HP
// within their range every heal interval (ties go to the lower id; an Elder Tender heals two).
// Units with `regenPct` (Elder's Patience) regenerate once a second while out of combat, i.e. after
// the same quiet window merging uses. Heals never raise HP above the maximum.
import { nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS } from '../targets.ts';
import type { BattleState, CompiledTier, UnitState } from '../state.ts';
import { tierDef, unitRadius } from '../world.ts';

const picked: UnitState[] = [];

export function healingSystem(state: BattleState): void {
  const tick = state.tick;
  const r = state.rules;
  for (const u of state.units) {
    if (u.hp <= 0) continue;
    const t = tierDef(state, u);
    if (t.healAmount > 0 && !u.knit && (tick + u.id) % t.healTicks === 0) heal(state, u, t);
    if (t.regenPct > 0 && tick % r.tickRate === 0 && u.hp < u.maxHp && tick - u.lastCombatTick >= r.merge.cooldownTicks) {
      u.hp = Math.min(u.maxHp, u.hp + Math.max(1, Math.floor(u.maxHp * t.regenPct)));
    }
  }
}

function heal(state: BattleState, healer: UnitState, t: CompiledTier): void {
  picked.length = 0;
  const reach = t.range + unitRadius(state, healer);
  const n = queryNear(healer.x, healer.y, reach + MAX_RADIUS + 1);
  const near = nearBuffer();
  for (let pass = 0; pass < t.healTargets; pass++) {
    let best: UnitState | undefined;
    for (let k = 0; k < n; k++) {
      const v = state.units[near[k]!];
      if (!v || v === healer || v.side !== healer.side || v.lane !== healer.lane || v.hp <= 0 || v.hp >= v.maxHp) continue;
      if (picked.includes(v)) continue;
      const dx = v.x - healer.x, dy = v.y - healer.y;
      if (Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v) > reach) continue;
      const missing = v.maxHp - v.hp;
      if (!best || missing > best.maxHp - best.hp || (missing === best.maxHp - best.hp && v.id < best.id)) best = v;
    }
    if (!best) break;
    picked.push(best);
    const amount = Math.min(t.healAmount, best.maxHp - best.hp);
    best.hp += amount;
    state.stats[healer.side].healingDone += amount;
    state.events.push({ t: 'healed', target: best.id, src: healer.id, amount, x: best.x, y: best.y });
  }
}
