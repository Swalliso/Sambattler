// Building timers and spawns (SPEC §4.4): first spawn at half the interval, holding at the supply
// cap, and half-speed timers while besieged. Timers count in half-ticks.
import { addUnit } from '../create.ts';
import { nextSigned } from '../rng.ts';
import { buildingDef, isBesieged } from '../world.ts';
import type { BattleState } from '../state.ts';

export function spawningSystem(state: BattleState): void {
  const r = state.rules;
  // iterate by index: spawns append units, never buildings
  const n = state.buildings.length;
  for (let i = 0; i < n; i++) {
    const b = state.buildings[i]!;
    const def = buildingDef(state, b);
    const sp = def.spawn;
    if (!sp) continue;
    if (b.placedTick !== state.tick && b.timer > 0) {
      b.timer -= isBesieged(state, b) ? r.besiegedHalfTicks : r.normalHalfTicks;
    }
    if (b.timer > 0) continue;
    const ss = state.sides[b.side];
    const unit = state.compiled[b.side].units[sp.unit]!;
    const need = sp.count * unit.supply;
    if (ss.supplyUsed + need > ss.supplyCap) {
      b.holding = true;
      b.timer = 0;
      continue;
    }
    b.holding = false;
    b.timer += sp.intervalHalfTicks;
    const x = b.side === 'player' ? b.col + def.w + r.spawnOffset : b.col - r.spawnOffset;
    const cy = b.row + def.h / 2;
    const stats = state.stats[b.side];
    for (let k = 0; k < sp.count; k++) {
      const y = cy + nextSigned(state.rng.combat) * r.spawnJitter;
      const u = addUnit(state, b.side, sp.unit, b.lane, x, y, b.id);
      u.mergeOn = b.mergeOn;
      stats.spawned[sp.unit] = (stats.spawned[sp.unit] ?? 0) + 1;
      state.events.push({ t: 'spawned', id: u.id });
    }
  }
}
