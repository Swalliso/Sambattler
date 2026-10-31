// Column tug-of-war (SPEC §4.3): each side can only capture its frontier column; forts block it;
// presence is the summed supply of living units whose centre lies in the column.
import { SIDES, other } from '../state.ts';
import type { BattleState, Side } from '../state.ts';
import { buildingDef } from '../world.ts';

let presence = { player: new Int32Array(64), enemy: new Int32Array(64) };
let forts = { player: new Uint8Array(64), enemy: new Uint8Array(64) };

/** Presence per column for one lane, into reusable scratch arrays (also used by the AI and debug overlay). */
export function lanePresence(state: BattleState, lane: number): { player: Int32Array; enemy: Int32Array } {
  const W = state.map.width;
  if (presence.player.length < W) presence = { player: new Int32Array(W), enemy: new Int32Array(W) };
  presence.player.fill(0, 0, W);
  presence.enemy.fill(0, 0, W);
  for (const u of state.units) {
    if (u.lane !== lane || u.hp <= 0 || u.burrowed) continue; // a tunnelling unit holds no ground
    if (u.flying && !state.rules.flying!.holdsGround) continue; // nor does a flyer (combat rework `flyers`)
    const c = Math.floor(u.x);
    if (c >= 0 && c < W) presence[u.side][c]! += u.supply;
  }
  return presence;
}

function laneForts(state: BattleState, lane: number): { player: Uint8Array; enemy: Uint8Array } {
  const W = state.map.width;
  if (forts.player.length < W) forts = { player: new Uint8Array(W), enemy: new Uint8Array(W) };
  forts.player.fill(0, 0, W);
  forts.enemy.fill(0, 0, W);
  for (const b of state.buildings) {
    if (b.lane !== lane || b.hp <= 0) continue;
    const def = buildingDef(state, b);
    for (let c = b.col; c < b.col + def.w; c++) forts[b.side][c] = 1;
  }
  return forts;
}

export function frontier(state: BattleState, lane: number, side: Side): number {
  const L = state.lanes[lane]!;
  return side === 'player' ? L.pBorder + 1 : L.eBorder - 1;
}

/** True if `col` is a legal frontier column for `side` (never an opposing home column). */
export function frontierValid(state: BattleState, side: Side, col: number): boolean {
  const W = state.map.width, home = state.map.homeCols;
  return side === 'player' ? col < W - home : col >= home;
}

/** True if the frontier column holds an opposing building (a fort), so it cannot flip. */
export function frontierBlocked(state: BattleState, lane: number, side: Side): boolean {
  const F = frontier(state, lane, side);
  const opp = other(side);
  for (const b of state.buildings) {
    if (b.side !== opp || b.lane !== lane || b.hp <= 0) continue;
    const def = buildingDef(state, b);
    if (F >= b.col && F < b.col + def.w) return true;
  }
  return false;
}

export function territorySystem(state: BattleState): void {
  if (!state.rules.test.territory) return;
  const r = state.rules;
  for (let li = 0; li < state.lanes.length; li++) {
    const L = state.lanes[li]!;
    const pres = lanePresence(state, li);
    const fort = laneForts(state, li);
    for (const side of SIDES) {
      const F = side === 'player' ? L.pBorder + 1 : L.eBorder - 1;
      const cap = L.capture[side];
      if (cap.column !== F) { cap.column = F; cap.progress = 0; }
      if (!frontierValid(state, side, F)) { cap.progress = 0; continue; }
      const opp = other(side);
      if (fort[opp][F]) {
        cap.progress = Math.max(0, cap.progress - r.captureDecay);
        continue;
      }
      const A = pres[side][F]!;
      const D = pres[opp][F]!;
      if (A > 0 && A >= r.captureRatio * D) {
        cap.progress += Math.floor(r.captureStep * state.compiled[side].captureSpeed);
      } else {
        cap.progress = Math.max(0, cap.progress - r.captureDecay);
      }
      if (cap.progress >= r.captureThreshold) captureFrontier(state, li, side);
    }
  }
}

/** Flips `side`'s frontier column in a lane to it and moves the frontier on (a capture, or Rhizome Surge). */
export function captureFrontier(state: BattleState, li: number, side: Side): void {
  const L = state.lanes[li]!;
  const F = frontier(state, li, side);
  const cap = L.capture[side];
  const wasOwner = L.owner[F];
  if (side === 'player') {
    L.owner[F] = 1;
    if (L.eBorder === F) L.eBorder = F + 1;
    L.pBorder = F;
  } else {
    L.owner[F] = 2;
    if (L.pBorder === F) L.pBorder = F - 1;
    L.eBorder = F;
  }
  if (wasOwner === (side === 'player' ? 2 : 1)) state.stats[other(side)].columnsLost++;
  cap.progress = 0;
  cap.column = side === 'player' ? F + 1 : F - 1;
  state.events.push({ t: 'columnFlipped', lane: li, column: F, to: side });
}
