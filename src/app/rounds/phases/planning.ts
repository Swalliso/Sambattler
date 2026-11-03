// Planning's part of the loop (SPEC §13.5): no ticks. Commands from input run as soon as they're queued, with
// one step, unless the hold keeps them (`phase=planning` or `paused=1`, plan Call 14), so a bot player's
// queued Begin waits for input. The frame renders at alpha 1. S14's chrome (T095) adds the planning view here.
import type { RoundSession } from '../session.ts';

/** One frame of planning: a step when the queue isn't empty and nothing holds it. Returns the alpha to render at. */
export function planningFrame(session: RoundSession, advance: () => void): number {
  if (!session.hold && session.state.queue.length) advance();
  return 1;
}
