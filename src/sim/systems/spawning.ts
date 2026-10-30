// Building timers and spawns (SPEC §4.4): first spawn at half the interval, holding at the supply
// cap, and half-speed timers while besieged. Timers count in half-ticks.
import { noteSpawn } from '../ai/counter.ts';
import { addUnit } from '../create.ts';
import { positionalValue } from '../effects.ts';
import { nextSigned } from '../rng.ts';
import { buildingDef, isSuppressed } from '../world.ts';
import type { BattleState, BuildingState } from '../state.ts';

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
      b.timer -= isSuppressed(state, b) ? r.besiegedHalfTicks : r.normalHalfTicks;
    }
    if (b.timer > 0) continue;
    const ss = state.sides[b.side];
    const unit = state.compiled[b.side].units[sp.unit]!;
    const need = sp.count * unit.tiers[0].supply;
    if (ss.supplyUsed + need > ss.supplyCap) {
      b.holding = true;
      b.timer = 0;
      continue;
    }
    b.holding = false;
    b.hasProduced = true;
    // a positional modifier (e.g. Mycorrhizal Link's adjacency) re-resolves the interval for this building
    b.timer += sp.positional
      ? Math.round(positionalValue(state, b, sp.positional, 'building.spawnInterval') * r.tickRate) * 2
      : sp.intervalHalfTicks;
    emerge(state, b, sp.unit, sp.count);
  }
}

/**
 * `count` units of `unitId` come out of spawner `b` just in front of its front edge (SPEC §4.4),
 * each at the building's centre ± the seeded jitter. A `burrow` unit (the combat rework's
 * Rhizomorph) comes out underground.
 */
export function emerge(state: BattleState, b: BuildingState, unitId: string, count: number): void {
  const r = state.rules;
  const def = buildingDef(state, b);
  const burrow = state.compiled[b.side].units[unitId]!.tags.includes('burrow');
  const x = b.side === 'player' ? b.col + def.w + r.spawnOffset : b.col - r.spawnOffset;
  const cy = b.row + def.h / 2;
  const stats = state.stats[b.side];
  const firstId = state.nextId;
  for (let k = 0; k < count; k++) {
    const y = cy + nextSigned(state.rng.combat) * r.spawnJitter;
    const u = addUnit(state, b.side, unitId, b.lane, x, y, b.id);
    u.mergeOn = b.mergeOn;
    if (burrow) u.burrowed = true;
    stats.spawned[unitId] = (stats.spawned[unitId] ?? 0) + 1;
    state.events.push({ t: 'spawned', id: u.id });
  }
  noteSpawn(state, b, firstId, count);
}
