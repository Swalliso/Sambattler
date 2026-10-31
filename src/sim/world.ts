// Entity lookup and geometry helpers shared by the systems. Entities live in arrays sorted by id,
// so lookups are binary searches (no Maps, no allocation).
import { HEARTCAP_ID } from './state.ts';
import type { BattleState, BuildingState, CompiledBuilding, CompiledTier, CompiledUnit, Side, UnitState } from './state.ts';

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

export function findBuilding(state: BattleState, id: number): BuildingState | undefined {
  const a = state.buildings;
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = a[mid] as BuildingState;
    if (b.id === id) return b;
    if (b.id < id) lo = mid + 1; else hi = mid - 1;
  }
  return undefined;
}

export function unitDef(state: BattleState, u: UnitState): CompiledUnit {
  return state.compiled[u.side].units[u.unitId] as CompiledUnit;
}

export function buildingDef(state: BattleState, b: BuildingState): CompiledBuilding {
  return state.compiled[b.side].buildings[b.buildingId] as CompiledBuilding;
}

/** A unit's stats at its current merge tier. */
export function tierDef(state: BattleState, u: UnitState): CompiledTier {
  return (state.compiled[u.side].units[u.unitId] as CompiledUnit).tiers[u.tier - 1]!;
}

/** Unit body radius (grows with the merge tier, SPEC §5.6). */
export function unitRadius(state: BattleState, u: UnitState): number {
  return tierDef(state, u).radius;
}

/**
 * Combat rework `mixedWave`: `u`'s shield soaks `damage` first, and breaks once spent. Returns the
 * damage left for its HP.
 */
export function soakShield(u: UnitState, damage: number): number {
  const shield = u.shield;
  if (!shield) return damage;
  if (damage < shield) { u.shield = shield - damage; return 0; }
  u.shield = undefined;
  return damage - shield;
}

/** x of a side's attackable Heartcap edge. */
export function heartcapEdgeX(state: BattleState, side: Side): number {
  return side === 'player' ? 0 : state.map.width;
}

export function heartcapSideOf(id: number): Side | undefined {
  return id === HEARTCAP_ID.player ? 'player' : id === HEARTCAP_ID.enemy ? 'enemy' : undefined;
}

/** Distance from a point to a building's footprint rectangle (0 inside). */
export function rectDistance(x: number, y: number, col: number, row: number, w: number, h: number): number {
  const dx = x < col ? col - x : x > col + w ? x - (col + w) : 0;
  const dy = y < row ? row - y : y > row + h ? y - (row + h) : 0;
  if (dx === 0) return dy;
  if (dy === 0) return dx;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isBesieged(state: BattleState, b: BuildingState): boolean {
  return state.tick - b.lastDamagedTick < state.rules.besiegedTicks;
}

/** Is the building's production (spawn timer, income) halved by siege? Depends on `rules.suppressBy`. */
export function isSuppressed(state: BattleState, b: BuildingState): boolean {
  const by = state.rules.suppressBy;
  if (!by) return isBesieged(state, b);
  if (by === 'none') return false;
  return b.lastMeleeDamagedTick !== undefined && state.tick - b.lastMeleeDamagedTick < state.rules.besiegedTicks;
}

export const laneTop = (state: BattleState, lane: number): number => (state.lanes[lane] as { rowStart: number }).rowStart;
export const laneBottom = (state: BattleState, lane: number): number => (state.lanes[lane] as { rowEnd: number }).rowEnd + 1;

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

export function columnsOwned(state: BattleState, side: Side): number {
  let n = 0;
  const W = state.map.width;
  for (const l of state.lanes) n += side === 'player' ? l.pBorder + 1 : W - l.eBorder;
  return n;
}

/**
 * A side's supply cap: its compiled cap plus standing utility buildings (Rhizome Vault: each type
 * counts for at most `maxCount` buildings).
 */
export function supplyCapOf(state: BattleState, side: Side): number {
  const cs = state.compiled[side];
  let cap = cs.supplyCap;
  const counted: Record<string, number> = {};
  for (const b of state.buildings) {
    if (b.side !== side || b.hp <= 0) continue;
    const u = cs.buildings[b.buildingId]?.utility;
    if (!u) continue;
    const n = counted[b.buildingId] ?? 0;
    if (n >= u.maxCount) continue;
    counted[b.buildingId] = n + 1;
    cap += u.supplyCapAdd;
  }
  return cap;
}

/** A side's interest cap: its compiled cap plus standing economy buildings that raise it (Spore Exchange). */
export function interestCapOf(state: BattleState, side: Side): number {
  const cs = state.compiled[side];
  let cap = cs.interestCap;
  for (const b of state.buildings) {
    if (b.side !== side || b.hp <= 0) continue;
    cap += cs.buildings[b.buildingId]?.economy?.interestCapAdd ?? 0;
  }
  return cap;
}
