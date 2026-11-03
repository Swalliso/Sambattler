// The browser loop for a battle in rounds (SPEC §13.5), by phase: planning steps only to run queued commands,
// a clash steps at 20 Hz from an accumulator scaled by speed, the aftermath steps once when it's done, and an
// ended battle doesn't step. Each phase's part is its own module (`phases/`), so the UI sessions after S11 don't
// collide. It stands beside v1's `src/app/loop.ts`.
import { step } from '../../sim/rounds/index.ts';
import type { RoundsView } from './battleView.ts';
import { AftermathPhase } from './phases/aftermath.ts';
import { ClashPhase } from './phases/clash.ts';
import { planningFrame } from './phases/planning.ts';
import type { RoundSession } from './session.ts';

/** How many frame times `measure=frames` keeps (T115). */
const FRAMES_KEPT = 240;

export class RoundLoop {
  private last = 0;
  private raf = 0;
  readonly clash = new ClashPhase();
  readonly aftermath: AftermathPhase;
  debugOverlay = false;
  onFrame: (() => void) | null = null;
  /** With `measure=frames`: each frame's work in ms, the last `FRAMES_KEPT` (T115). */
  readonly frameTimes: number[] | null;

  constructor(private session: RoundSession, private view: RoundsView, opts: { holdAftermath: boolean; measure: boolean }) {
    this.aftermath = new AftermathPhase(opts.holdAftermath);
    this.frameTimes = opts.measure ? [] : null;
    if (session.state.phase === 'aftermath') this.aftermath.enter();
  }

  start(): void {
    this.last = performance.now();
    this.session.planningSince = this.last;
    const tick = (now: number) => {
      this.frame(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void { cancelAnimationFrame(this.raf); }

  /** One step: the view takes its events, and a new phase resets what the last one left. */
  private advance(now: number): void {
    const state = this.session.state;
    const was = state.phase;
    step(state);
    this.view.onTick(state, now);
    if (state.phase === was) return;
    this.session.phaseOpened(now);
    if (state.phase === 'clash') this.clash.reset();
    if (state.phase === 'aftermath') this.aftermath.enter();
  }

  private frame(now: number): void {
    const t0 = performance.now();
    const s = this.session;
    const dt = Math.min(now - this.last, 250);
    this.last = now;
    const advance = () => this.advance(now);
    let alpha = 1;
    switch (s.state.phase) {
      case 'planning': alpha = planningFrame(s, advance); break;
      case 'clash': alpha = this.clash.frame(s, dt, advance); break;
      case 'aftermath': if (this.aftermath.frame(s, dt)) advance(); break;
      case 'ended': break;
    }
    this.view.frame(s.state, alpha, now, this.debugOverlay);
    this.onFrame?.();
    if (this.frameTimes) {
      this.frameTimes.push(performance.now() - t0);
      if (this.frameTimes.length > FRAMES_KEPT) this.frameTimes.shift();
    }
  }
}
