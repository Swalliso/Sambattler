// Building timers and spawns (SPEC §4.4): first spawn at half the interval, holding at the supply
// cap, and half-speed timers while besieged. Timers count in half-ticks. With the combat rework's
// `waves`, a spawn waits inside its building for the side's next beat instead of walking out.
import { noteSpawn } from '../ai/counter.ts';
import { addUnit } from '../create.ts';
import { positionalValue } from '../effects.ts';
import { nextSigned } from '../rng.ts';
import { SIDES } from '../state.ts';
import type { BattleState, BuildingState } from '../state.ts';
import { buildingDef, isSuppressed } from '../world.ts';
import { holdsLane, setStance } from './stance.ts';

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
    if (r.waves) {
      // combat rework `waves`: the batch waits inside for the next beat, already counting toward supply
      b.stored = (b.stored ?? 0) + sp.count;
      ss.supplyUsed += need;
      continue;
    }
    emerge(state, b, sp.unit, sp.count);
  }
}

/**
 * `count` units of `unitId` come out of spawner `b` just in front of its front edge (SPEC §4.4),
 * each at the building's centre ± the seeded jitter. A `burrow` unit (the combat rework's
 * Rhizomorph) comes out underground; a beat's release tags its units with the wave.
 */
export function emerge(state: BattleState, b: BuildingState, unitId: string, count: number, wave?: number): void {
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
    if (wave !== undefined) u.wave = wave;
    stats.spawned[unitId] = (stats.spawned[unitId] ?? 0) + 1;
    state.events.push({ t: 'spawned', id: u.id });
  }
  noteSpawn(state, b, firstId, count);
}

/**
 * Combat rework `waves`: the units waiting in `b` come out now. On a beat they are the wave's
 * (× the side's wave size, rounded; extra units need free supply); a building sold or destroyed
 * lets its waiting units out with no wave.
 */
export function releaseStored(state: BattleState, b: BuildingState, wave?: number): number {
  const n = b.stored ?? 0;
  if (n <= 0) return 0;
  const sp = buildingDef(state, b).spawn!;
  const supply = state.compiled[b.side].units[sp.unit]!.tiers[0].supply;
  const ss = state.sides[b.side];
  b.stored = 0;
  ss.supplyUsed -= n * supply; // emerge counts them again as units
  let count = n;
  const size = wave === undefined ? 1 : state.compiled[b.side].waveSize ?? 1;
  if (size !== 1) {
    count = Math.max(0, Math.round(n * size));
    while (count > n && ss.supplyUsed + count * supply > ss.supplyCap) count--;
  }
  if (count > 0) emerge(state, b, sp.unit, count, wave);
  return count;
}

/**
 * Combat rework `waves`: on each side's beat (the same tick for both sides unless a modifier
 * changes one's `side.waveBeat`), every spawner in a lane the side doesn't hold releases its
 * waiting units, in building order. A held lane keeps its wave home for this beat, and the beat
 * spends the hold: the lane advances, so the next beat releases both waves.
 */
export function waveSystem(state: BattleState): void {
  for (const side of SIDES) {
    const beat = state.compiled[side].waveBeatTicks!;
    if (state.tick % beat !== 0) continue;
    const wave = state.tick / beat;
    let units = 0;
    for (const b of state.buildings) {
      if (b.side !== side || !b.stored || holdsLane(state, side, b.lane)) continue;
      units += releaseStored(state, b, wave);
    }
    const held: number[] = [];
    state.lanes.forEach((_, li) => { if (holdsLane(state, side, li)) held.push(li); });
    for (const li of held) setStance(state, side, li, false, true);
    state.events.push({ t: 'release', side, units, held });
  }
}
