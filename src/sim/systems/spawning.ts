// Building timers and spawns (SPEC §4.4): first spawn at half the interval, holding at the supply
// cap, and half-speed timers while besieged. Timers count in half-ticks. With the combat rework's
// `waves`, a spawn waits inside its building for its side's next wave instead of walking out.
import { noteSpawn } from '../ai/counter.ts';
import { addUnit } from '../create.ts';
import { positionalValue } from '../effects.ts';
import { nextSigned } from '../rng.ts';
import { SIDES } from '../state.ts';
import type { BattleState, BuildingState, Side } from '../state.ts';
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

/** The x a spawner's units come out at: just in front of its front edge (SPEC §4.4). */
export function doorX(state: BattleState, b: BuildingState): number {
  const def = buildingDef(state, b);
  return b.side === 'player' ? b.col + def.w + state.rules.spawnOffset : b.col - state.rules.spawnOffset;
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
  const x = doorX(state, b);
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
 * lets its waiting units out with no wave. With `stormWaves`, each storm stack grows the wave too,
 * and the spawner carries the fraction to its next release (in thousandths, so it stays exact).
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
  const storm = wave !== undefined && state.rules.stormWaves && state.sporestorm > 0 ? 1 + state.rules.stormWaves.perStack * state.sporestorm : 1;
  if (size !== 1 || storm !== 1) {
    let want: number;
    if (storm !== 1) {
      const owed = n * Math.round(size * storm * 1000) + (b.waveCarry ?? 0);
      want = Math.floor(owed / 1000);
      b.waveCarry = owed % 1000;
    } else {
      want = Math.round(n * size);
    }
    count = Math.max(0, want);
    while (count > n && ss.supplyUsed + count * supply > ss.supplyCap) count--;
    if (storm !== 1 && count < want) state.events.push({ t: 'waveCapped', side: b.side, units: want - count });
  }
  if (count > 0) emerge(state, b, sp.unit, count, wave);
  return count;
}

/**
 * Combat rework `waves`, rebuilt for a side when asked: for each lane, the door of its frontmost
 * spawner (`front`, NaN: none) and the speed (tiles a tick) of the slowest unit its spawners make
 * (`pace`). A Rhizomorph tunnel (a `burrow` unit) is left out: its units tunnel instead of marching.
 */
export const waveLayout = { front: new Float64Array(4), pace: new Float64Array(4) };

export function layWaves(state: BattleState, side: Side): typeof waveLayout {
  const n = state.lanes.length;
  if (waveLayout.front.length < n) { waveLayout.front = new Float64Array(n); waveLayout.pace = new Float64Array(n); }
  waveLayout.front.fill(NaN);
  waveLayout.pace.fill(Infinity);
  const units = state.compiled[side].units;
  for (const b of state.buildings) {
    if (b.side !== side || b.hp <= 0) continue;
    const sp = buildingDef(state, b).spawn;
    const unit = sp ? units[sp.unit]! : undefined;
    if (!unit || unit.tags.includes('burrow')) continue;
    const x = doorX(state, b), f = waveLayout.front[b.lane]!;
    if (Number.isNaN(f) || (side === 'player' ? x > f : x < f)) waveLayout.front[b.lane] = x;
    const v = unit.tiers[0].speedPerTick;
    if (v < waveLayout.pace[b.lane]!) waveLayout.pace[b.lane] = v;
  }
  return waveLayout;
}

/**
 * Combat rework `waves`: how many ticks before the beat spawner `b` lets its units out, so they reach
 * its lane's front spawner's door on the beat: the walk there at the wave's pace (its slowest unit's
 * speed with `matchPace`, else at their own). At most a beat less one tick; 0 for the front spawner
 * and for a Rhizomorph tunnel, which leaves on the beat.
 */
function releaseLead(state: BattleState, b: BuildingState, layout: typeof waveLayout, beat: number): number {
  const unit = state.compiled[b.side].units[buildingDef(state, b).spawn!.unit]!;
  const front = layout.front[b.lane]!;
  if (unit.tags.includes('burrow') || Number.isNaN(front)) return 0;
  const speed = state.rules.waves!.matchPace ? layout.pace[b.lane]! : unit.tiers[0].speedPerTick;
  const walk = Math.abs(front - doorX(state, b));
  return speed > 0 ? Math.min(beat - 1, Math.round(walk / speed)) : 0;
}

/**
 * Combat rework `waves`: each side's waves set out on its beat (the same tick for both sides unless
 * a modifier changes one's `side.waveBeat`). A lane's frontmost spawner releases its waiting units on
 * the beat and each spawner behind it `releaseLead` ticks before, so the wave passes the front door
 * together; a spawner makes one release a beat, and units that spawn after it wait for the next.
 * A held lane releases nothing. On the beat, the beat spends its holds, and a held lane can't hold
 * again until the next beat has sent both waves; with `mixedWave`, a lane's wave of enough unit types
 * gets its shields.
 */
export function waveSystem(state: BattleState): void {
  const tick = state.tick;
  for (const side of SIDES) {
    const beat = state.compiled[side].waveBeatTicks!;
    const wave = Math.ceil(tick / beat);
    const due = wave * beat - tick;
    const layout = layWaves(state, side);
    for (const b of state.buildings) {
      if (b.side !== side || b.lastWave === wave || !buildingDef(state, b).spawn) continue;
      if (due > releaseLead(state, b, layout, beat) || holdsLane(state, side, b.lane)) continue;
      b.lastWave = wave;
      releaseStored(state, b, wave);
    }
    if (due !== 0) continue;
    const held: number[] = [];
    state.lanes.forEach((_, li) => { if (holdsLane(state, side, li)) held.push(li); });
    for (const li of held) {
      setStance(state, side, li, false, true);
      const st = state.sides[side].stance![li]!;
      st.readyAt = Math.max(st.readyAt, tick + beat + 1);
    }
    let units = 0;
    for (const u of state.units) if (u.side === side && u.wave === wave && u.hp > 0) units++;
    const shielded = state.rules.mixed ? shieldMixedWaves(state, side, wave) : [];
    state.events.push({ t: 'release', side, units, held, shielded });
  }
}

/**
 * Combat rework `mixedWave`: each lane whose wave (its living units, burrowed or not) holds enough
 * unit types (a merged form counts as its base type) gives each of them a shield of `shieldFrac` ×
 * its max HP. Returns those lanes.
 */
function shieldMixedWaves(state: BattleState, side: Side, wave: number): number[] {
  const mx = state.rules.mixed!;
  const types: string[][] = state.lanes.map(() => []);
  for (const u of state.units) {
    if (u.side !== side || u.wave !== wave || u.hp <= 0) continue;
    const seen = types[u.lane]!;
    if (!seen.includes(u.unitId)) seen.push(u.unitId);
  }
  const lanes: number[] = [];
  types.forEach((t, li) => { if (t.length >= mx.minTypes) lanes.push(li); });
  if (!lanes.length) return lanes;
  for (const u of state.units) {
    if (u.side !== side || u.wave !== wave || u.hp <= 0 || !lanes.includes(u.lane)) continue;
    u.shield = Math.max(u.shield ?? 0, Math.round(u.maxHp * mx.shieldFrac));
  }
  return lanes;
}
