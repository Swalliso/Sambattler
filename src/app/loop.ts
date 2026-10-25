// Browser game loop (SPEC §13.5): fixed 50 ms sim steps from an accumulator scaled by speed,
// rendering in between with interpolation alpha = accumulator / 50 ms.
import { step } from '../sim/index.ts';
import type { BattleView } from './battleView.ts';
import type { Session } from './session.ts';

const STEP_MS = 50;

export class GameLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  debugOverlay = false;
  onFrame: (() => void) | null = null;

  constructor(private session: Session, private view: BattleView) {}

  start(): void {
    this.last = performance.now();
    const tick = (now: number) => {
      this.frame(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void { cancelAnimationFrame(this.raf); }

  private frame(now: number): void {
    const s = this.session;
    const state = s.state;
    const dt = Math.min(now - this.last, 250);
    this.last = now;
    if (state.phase === 'deploy') {
      // the clock is stopped; deploy commands (and Begin) run as soon as they are queued
      if (state.queue.length) { step(state); this.view.onTick(state, now); }
      this.acc = 0;
    } else if (state.phase === 'live' && !s.paused && !state.held) {
      this.acc += dt * s.speed;
      let guard = 0;
      while (this.acc >= STEP_MS && state.phase === 'live' && guard++ < 12) {
        step(state);
        this.view.onTick(state, now);
        this.acc -= STEP_MS;
      }
      if (guard >= 12) this.acc = 0;
    }
    const alpha = state.phase === 'live' && !s.paused ? Math.min(1, this.acc / STEP_MS) : 1;
    this.view.frame(state, alpha, now, this.debugOverlay);
    this.onFrame?.();
  }
}
