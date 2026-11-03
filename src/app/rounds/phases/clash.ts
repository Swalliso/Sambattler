// A clash's part of the loop (SPEC §13.5): 20 Hz with interpolation. Each frame adds the real time (at most
// 250 ms) times the speed to an accumulator, and steps while it holds 50 ms and the clash isn't paused, at most
// 12 steps a frame (past that, the accumulator resets). Pause and speed apply only here and in the aftermath,
// and a pause never carries into the next clash (the session drops it as the clash opens). Help and the
// settings screen hold it while they're open, as a pause does. Its chrome (§10.2, T095) is the speed control
// in Begin's place, which the view shows, and on Twin Roots a callout as a lane ends first, worded here.
import type { BattleState, SimEvent } from '../../../sim/rounds/index.ts';
import type { RoundSession } from '../session.ts';

export const STEP_MS = 50;
const MAX_STEPS = 12;

export class ClashPhase {
  private acc = 0;

  /** As a clash opens. */
  reset(): void { this.acc = 0; }

  /** One frame of the clash; returns the alpha to render at, `accumulator / 50 ms`, or 1 when paused or over. */
  frame(session: RoundSession, dt: number, advance: () => void): number {
    if (session.paused || session.overlayOpen) return 1;
    this.acc += dt * session.speed;
    let n = 0;
    while (this.acc >= STEP_MS && session.state.phase === 'clash') {
      if (n++ === MAX_STEPS) { this.acc = 0; break; }
      advance();
      this.acc -= STEP_MS;
    }
    return session.state.phase === 'clash' ? Math.min(1, this.acc / STEP_MS) : 1;
  }
}

/**
 * A lane that ends while another fights on, on Twin Roots (§10.2): "Lane won · 9 supply left", "Lane lost" or
 * "Lane drawn", naming the lane. The last lane's end is the round's, which the result banner names instead.
 */
export function laneCallout(state: BattleState, e: Extract<SimEvent, { t: 'laneWon' }>): { text: string; tone: 'good' | 'bad' | '' } | null {
  if (state.lanes.length < 2 || state.phase !== 'clash') return null;
  const lane = `Lane ${e.lane + 1}`;
  if (e.winner === 'player') return { text: `${lane} won · ${e.survivors.player} supply left`, tone: 'good' };
  if (e.winner === 'enemy') return { text: `${lane} lost`, tone: 'bad' };
  return { text: `${lane} drawn`, tone: '' };
}
