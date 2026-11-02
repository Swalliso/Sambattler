// Entity lookup and geometry helpers shared by a clash's systems (SPEC §5.2, §5.3, §13.4): v1's
// `src/sim/world.ts`, typed on rounds' state, without buildings and Heartcaps as targets, besieged spawners,
// suppression, `columnsOwned` and `supplyCapOf`. Units live in an array sorted by id, so lookups are binary
// searches (no Maps, no allocation). It stands beside v1's file until R2b moves it there.
import type { BattleState, CompiledTier, CompiledUnit, UnitState } from './state.ts';

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

/** A unit's stats at its current merge tier. */
export function tierDef(state: BattleState, u: UnitState): CompiledTier {
  return (state.compiled[u.side].units[u.unitId] as CompiledUnit).tiers[u.tier - 1]!;
}

/** Unit body radius at its tier (SPEC §5.6). */
export function unitRadius(state: BattleState, u: UnitState): number {
  return tierDef(state, u).radius;
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
