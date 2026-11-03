// The aftermath's part of the loop (SPEC §13.5, §10.2): render only, since the clash's last tick scored the
// round. No step runs until the aftermath is done or skipped, then one step opens the next round, or ends the
// battle after its last. Its clock runs at the clash's speed, which stays live here with no pause, and the
// session carries it to the view, which draws the aftermath from it (`src/render/rounds/aftermath.ts`). The
// view's `aftermathLength` says when it's done: about 3 s at 1×, and a second more on the fallen Heartcap at a
// battle's end. Under `?test=1` with a `phase=` hold it waits for Space, Enter or a click instead (plan Call 15).
import { aftermathLength } from '../../../render/rounds/aftermath.ts';
import type { RoundSession } from '../session.ts';

export { AFTERMATH_MS } from '../../../render/rounds/aftermath.ts';

export class AftermathPhase {
  private elapsed = 0;
  private skipped = false;

  /** @param held under `?test=1` with a `phase=` hold, the aftermath waits for input (plan Call 15) */
  constructor(private held: boolean) {}

  /** As the aftermath opens. */
  enter(): void {
    this.elapsed = 0;
    this.skipped = false;
  }

  /** Space, Enter or a click. */
  skip(): void { this.skipped = true; }

  /** One frame: true once the aftermath is skipped or its view has played out at the speed, when the loop steps once. */
  frame(session: RoundSession, dt: number): boolean {
    this.elapsed += dt * session.speed;
    session.aftermathMs = this.elapsed;
    return this.skipped || (!this.held && this.elapsed >= aftermathLength(session.state));
  }
}
