// The aftermath's part of the loop (SPEC §13.5, §10.2): render only, since the clash's last tick scored the
// round. No step runs until the aftermath is done or skipped, then one step opens the next round, or ends the
// battle after its last. It lasts about 3 s at 1×, at the clash's speed, which stays live here with no pause.
// Under `?test=1` with a `phase=` hold it waits for Space, Enter or a click instead (plan Call 15). S12's view
// (T085) draws it; until then it's this timer alone.
import type { RoundSession } from '../session.ts';

/** About 3 s at 1× (§10.2). */
export const AFTERMATH_MS = 3000;

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

  /** One frame: true once the aftermath is skipped or its time at the speed is up, when the loop steps once. */
  frame(session: RoundSession, dt: number): boolean {
    this.elapsed += dt * session.speed;
    return this.skipped || (!this.held && this.elapsed >= AFTERMATH_MS);
  }
}
