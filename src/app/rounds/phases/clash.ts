// A clash's part of the loop (SPEC §13.5): 20 Hz with interpolation. Each frame adds the real time (at most
// 250 ms) times the speed to an accumulator, and steps while it holds 50 ms and the clash isn't paused, at most
// 12 steps a frame (past that, the accumulator resets). Pause and speed apply only here and in the aftermath,
// and a pause never carries into the next clash (the session drops it as the clash opens). S14's chrome
// (T095) adds the clash view here.
import type { RoundSession } from '../session.ts';

export const STEP_MS = 50;
const MAX_STEPS = 12;

export class ClashPhase {
  private acc = 0;

  /** As a clash opens. */
  reset(): void { this.acc = 0; }

  /** One frame of the clash; returns the alpha to render at, `accumulator / 50 ms`, or 1 when paused or over. */
  frame(session: RoundSession, dt: number, advance: () => void): number {
    if (session.paused) return 1;
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
