// Prototype E1 (balance `laneStance`, docs/engagement-review.md): a per-lane Hold / Advance command.
// A held lane's idle units gather at a rally line just inside the side's border column, so spawns
// mass into a wave instead of trickling out; Advance releases them together. The hold times out on
// its own, and a lane that advances can't hold again until its cooldown ends.
import type { BattleState, Side } from '../state.ts';

/** True while `side` holds `lane` (always false without the prototype). */
export function holdsLane(state: BattleState, side: Side, lane: number): boolean {
  return state.sides[side].stance?.[lane]?.hold === true;
}

/** The x a held lane's idle units gather at: `rallyBack` tiles behind the front edge of the border column. */
export function rallyX(state: BattleState, side: Side, lane: number): number {
  const L = state.lanes[lane]!;
  const back = state.rules.stance?.rallyBack ?? 0;
  return side === 'player' ? L.pBorder + 1 - back : L.eBorder + back;
}

/** Sets a lane's stance and emits the event. Advancing starts the cooldown before the next hold. */
export function setStance(state: BattleState, side: Side, lane: number, hold: boolean, auto: boolean): void {
  const st = state.sides[side].stance![lane]!;
  st.hold = hold;
  st.since = state.tick;
  if (!hold) st.readyAt = state.tick + state.rules.stance!.cooldownTicks;
  state.events.push({ t: 'stance', side, lane, hold, auto });
}

/** Releases every hold that has run for `maxHoldTicks`. */
export function stanceSystem(state: BattleState): void {
  const rules = state.rules.stance;
  if (!rules) return;
  for (const side of ['player', 'enemy'] as const) {
    const lanes = state.sides[side].stance!;
    for (let li = 0; li < lanes.length; li++) {
      const st = lanes[li]!;
      if (st.hold && state.tick - st.since >= rules.maxHoldTicks) setStance(state, side, li, false, true);
    }
  }
}
