// Entity lookup and geometry helpers shared by a clash's systems (SPEC §5.2, §5.3, §13.4): v1's
// `src/sim/world.ts`, typed on rounds' state, without buildings and Heartcaps as targets, besieged spawners,
// suppression, `columnsOwned` and `supplyCapOf`. Units live in an array sorted by id, so lookups are binary
// searches (no Maps, no allocation).
import type { Place } from './effects.ts';
import type { BattleState, CompiledTier, CompiledUnit, SquadState, UnitState } from './state.ts';

export function findUnit(state: BattleState, id: number): UnitState | undefined {
  const a = state.units;
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const u = a[mid] as UnitState;
    if (u.id === id) return u;
    if (u.id < id) lo = mid + 1; else hi = mid - 1;
  }
  return undefined;
}

export function unitDef(state: BattleState, u: UnitState): CompiledUnit {
  return state.compiled[u.side].units[u.unitId] as CompiledUnit;
}

/** This clash's squad fielded by a building (`squads` is sorted by building id), if any. */
export function squadOf(state: BattleState, buildingId: number): SquadState | undefined {
  const a = state.squads;
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const q = a[mid] as SquadState;
    if (q.building === buildingId) return q;
    if (q.building < buildingId) lo = mid + 1; else hi = mid - 1;
  }
  return undefined;
}

/**
 * A unit's stats at its current merge tier: its squad's own, through `sourceBuildingId`, where something
 * reaches that squad alone (T046), else its side's. A merged unit has its lowest-id parent's building, and
 * so that parent's squad's stats (R2-Q11).
 */
export function tierDef(state: BattleState, u: UnitState): CompiledTier {
  const own = squadOf(state, u.sourceBuildingId)?.stats;
  return (own ?? (state.compiled[u.side].units[u.unitId] as CompiledUnit)).tiers[u.tier - 1]!;
}

/** Unit body radius at its tier (SPEC §5.6). No modifier reaches a radius, so the side's unit holds it. */
export function unitRadius(state: BattleState, u: UnitState): number {
  return (state.compiled[u.side].units[u.unitId] as CompiledUnit).tiers[u.tier - 1]!.radius;
}

/** Where a unit's squad stands, which a trigger's `rank` and `onLoam` read (T046), or undefined for a unit no squad fielded. */
export function placeOf(state: BattleState, u: UnitState): Place | undefined {
  const q = squadOf(state, u.sourceBuildingId);
  const b = q && state.buildings.find((x) => x.id === q.building);
  return b && { rank: q.rank, terrain: state.sides[q.side].plots[b.plot]!.terrain };
}

/**
 * Has a lane's clash ended? It then holds still while the others fight (§6.7, R2-Q11, A030): the clash's
 * systems skip its units, and its hits in flight and clouds were dropped with its lock.
 */
export function frozen(state: BattleState, lane: number): boolean {
  return state.clash?.lanes[lane]?.ended === true;
}

/**
 * The clash's own clock: ticks since Begin, 1 on its first. Staggered and periodic checks count on it, and
 * phase a unit by its `arrival`, so a clash of unchanged colonies replays the last one exactly (§5.2, §13.3, T149).
 */
export function clashTick(state: BattleState): number {
  return state.tick - (state.clash?.startTick ?? 0);
}

/** A tower fielding itself (SPEC §6.7): it never moves, merges or pins, and is never healed. */
export function isEmplacement(state: BattleState, u: UnitState): boolean {
  return !!unitDef(state, u).emplacement;
}

/**
 * The arrival shield (SPEC §5.3, #8): `u`'s shield soaks `damage` first, and breaks once spent. Returns the
 * damage left for its HP.
 */
export function soakShield(u: UnitState, damage: number): number {
  const shield = u.shield;
  if (!shield) return damage;
  if (damage < shield) { u.shield = shield - damage; return 0; }
  u.shield = undefined;
  return damage - shield;
}

export const laneTop = (state: BattleState, lane: number): number => (state.lanes[lane] as { rowStart: number }).rowStart;
export const laneBottom = (state: BattleState, lane: number): number => (state.lanes[lane] as { rowEnd: number }).rowEnd + 1;

/** Holds a body inside its lane and between the two Heartcap edges, x = 0 to W (SPEC §5.2). */
export function clampToLane(state: BattleState, u: UnitState, radius: number): void {
  const top = laneTop(state, u.lane) + radius;
  const bottom = laneBottom(state, u.lane) - radius;
  if (u.y < top) u.y = top; else if (u.y > bottom) u.y = bottom;
  const W = state.map.width;
  if (u.x < radius) u.x = radius; else if (u.x > W - radius) u.x = W - radius;
}

/** Lane index containing a tile row, or -1 for walls/outside. */
export function laneOfRow(state: BattleState, row: number): number {
  for (let i = 0; i < state.lanes.length; i++) {
    const l = state.lanes[i] as { rowStart: number; rowEnd: number };
    if (row >= l.rowStart && row <= l.rowEnd) return i;
  }
  return -1;
}
