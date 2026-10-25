// Placement legality (SPEC §4.3) and supply-line pricing (SPEC §6.3).
import type { BattleState, Side } from './state.ts';

export interface Placement { lane: number; col: number; row: number; price: number; depth: number; loam: boolean }

/** Supply-line depth of a footprint whose columns are [col, col + w). Negative inside the home zone. */
export function depthOf(state: BattleState, side: Side, col: number, w: number): number {
  const home = state.map.homeCols;
  return side === 'player' ? col + w - 1 - (home - 1) : state.map.width - home - col;
}

/** Price including the supply-line surcharge, in integer arithmetic (basis points). */
export function priceAt(state: BattleState, side: Side, buildingId: string, col: number): number {
  const def = state.compiled[side].buildings[buildingId];
  if (!def) return Number.MAX_SAFE_INTEGER;
  const depth = Math.max(0, depthOf(state, side, col, def.w));
  const bp = 10000 + state.compiled[side].supplyLineBp * depth;
  return Math.floor((def.cost * bp + 9999) / 10000);
}

export function footprintOnLoam(state: BattleState, col: number, row: number, w: number, h: number): boolean {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) if (state.map.tiles[r]?.[c] === '$') return true;
  }
  return false;
}

/** Why a placement is illegal (ignoring gold), or null if it is legal. */
export function placementProblem(state: BattleState, side: Side, buildingId: string, lane: number, col: number, row: number): string | null {
  const def = state.compiled[side].buildings[buildingId];
  if (!def) return 'not in your kit';
  const L = state.lanes[lane];
  if (!L) return 'no such lane';
  if (row < L.rowStart || row + def.h - 1 > L.rowEnd) return 'must fit inside one lane';
  if (col < 0 || col + def.w > state.map.width) return 'off the map';
  const mine = side === 'player' ? 1 : 2;
  for (let c = col; c < col + def.w; c++) if (L.owner[c] !== mine) return 'not your territory';
  for (let r = row; r < row + def.h; r++) {
    const line = state.map.tiles[r] ?? '';
    for (let c = col; c < col + def.w; c++) {
      const t = line[c];
      if (t !== '.' && t !== '$') return t === 'o' ? 'a stump is in the way' : 'not buildable';
    }
  }
  for (const b of state.buildings) {
    const bd = state.compiled[b.side].buildings[b.buildingId];
    if (!bd) continue;
    if (b.col < col + def.w && col < b.col + bd.w && b.row < row + def.h && row < b.row + bd.h) return 'occupied';
  }
  return null;
}

/** Every legal top-left position for a building (gold not considered), ordered by column then row. */
export function legalPlacements(state: BattleState, side: Side, buildingId: string): Placement[] {
  const def = state.compiled[side].buildings[buildingId];
  const out: Placement[] = [];
  if (!def) return out;
  for (let col = 0; col + def.w <= state.map.width; col++) {
    for (let lane = 0; lane < state.lanes.length; lane++) {
      const L = state.lanes[lane]!;
      for (let row = L.rowStart; row + def.h - 1 <= L.rowEnd; row++) {
        if (placementProblem(state, side, buildingId, lane, col, row) === null) {
          out.push({
            lane, col, row,
            price: priceAt(state, side, buildingId, col),
            depth: depthOf(state, side, col, def.w),
            loam: footprintOnLoam(state, col, row, def.w, def.h),
          });
        }
      }
    }
  }
  return out;
}
