// The browser loop for a battle in rounds (SPEC §13.5), by phase: planning steps only to run queued commands,
// a clash steps at 20 Hz from an accumulator scaled by speed, the aftermath steps once when it's done, and an
// ended battle doesn't step. Each phase's part is its own module (`phases/`). `openRoundBattle` puts a battle on
// the page with its view, loop, input and play clock, for a single battle (`src/app/main.ts`) and for a run's
// battles (`src/app/run.ts`). A battle feeds the play clock (`playTime.ts`), whose planning seconds by round the
// report shows and the console logs (X6, T128), and a run's battle feeds the run's clock beside it (T109).
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import type { Reveal } from '../render/preview.ts';
import { step } from '../sim/index.ts';
import type { BattleState } from '../sim/index.ts';
import { playTimeText } from '../ui/report.ts';
import { RoundsView } from './battleView.ts';
import type { RoundViewActions } from './battleView.ts';
import { bindRoundInput } from './input.ts';
import { AftermathPhase } from './phases/aftermath.ts';
import { ClashPhase } from './phases/clash.ts';
import { planningFrame } from './phases/planning.ts';
import { PlayClock, readoutOf } from './playTime.ts';
import { RoundSession } from './session.ts';

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

/**
 * Feeds the play clock (RB-Q3): the battle's phase each frame, the player's keys, pointer and wheel, and the
 * tab's visibility. At the battle's end it logs the readout to the console. It returns the frame's feed and
 * the listeners' removal.
 */
function feedPlayClock(clock: PlayClock, state: BattleState, runClock?: PlayClock): { frame: () => void; stop: () => void } {
  const clocks = runClock ? [clock, runClock] : [clock];
  const input = () => { for (const c of clocks) c.input(); };
  const types = ['keydown', 'pointerdown', 'pointermove', 'wheel'];
  for (const type of types) addEventListener(type, input, { capture: true, passive: true });
  const shown = () => { for (const c of clocks) c.setVisible(document.visibilityState === 'visible'); };
  document.addEventListener('visibilitychange', shown);
  shown();
  // the run's clock may last have counted another battle, or a run screen without input: this one starts now
  runClock?.input();
  let at = '';
  const frame = () => {
    if (`${state.round}:${state.phase}` === at) return;
    at = `${state.round}:${state.phase}`;
    for (const c of clocks) c.phase(state.round, state.phase);
    if (state.phase === 'ended') {
      const readout = readoutOf(clock);
      console.info(`[play time] ${playTimeText(readout)}`, readout);
    }
  };
  const stop = () => {
    for (const type of types) removeEventListener(type, input, { capture: true });
    document.removeEventListener('visibilitychange', shown);
    // a battle taken down before its end stops counting on the run's clock
    runClock?.phase(state.round, 'ended');
  };
  return { frame, stop };
}

export interface RoundBattleOptions {
  /** What the report and the Begin button do; Begin is the session's own. */
  actions: Omit<RoundViewActions, 'begin' | 'playTime'>;
  /** Ambient motion holds still (`?test=1`). */
  still: boolean;
  debug: boolean;
  reveal?: Reveal;
  /** `phase=` in a test holds the aftermath, so a capture can read it. */
  holdAftermath?: boolean;
  measure?: boolean;
  /** Each frame, after the battle has drawn. */
  onFrame?: () => void;
  /** A run's battle: the run's lives, under your Heartcap (§8.5, T106); a single battle has none. */
  lives?: { left: number; max: number };
  /** A run's battle: the run's play clock (T109), fed the battle's phases and input beside the battle's own. */
  runClock?: PlayClock;
}

/** A battle on screen, and how to take it down. */
export interface RoundBattle {
  state: BattleState;
  session: RoundSession;
  view: RoundsView;
  loop: RoundLoop;
  stop(): void;
}

/**
 * Opens a battle in rounds on the page (§10.2): its view, loop, input and play clock. A single battle and a run's
 * battles both open through it; `stop()` takes it down, as a run does between battles.
 */
export function openRoundBattle(content: Content, atlas: Atlas, state: BattleState, o: RoundBattleOptions): RoundBattle {
  const session = new RoundSession(state, content);
  const clock = new PlayClock(() => performance.now());
  const view = new RoundsView(session, content, atlas, { ...o.actions, begin: () => { session.begin(); }, playTime: () => readoutOf(clock) }, o.still, o.reveal ?? 'full', o.lives ?? null);
  document.getElementById('app')!.replaceChildren(view.root);
  view.fit();
  const loop = new RoundLoop(session, view, { holdAftermath: o.holdAftermath ?? false, measure: o.measure ?? false });
  const played = feedPlayClock(clock, state, o.runClock);
  const unbind = bindRoundInput(session, view, {
    begin: () => { session.begin(); },
    skip: () => loop.aftermath.skip(),
    toggleDebug: () => { if (o.debug) loop.debugOverlay = !loop.debugOverlay; },
  });
  loop.debugOverlay = o.debug;
  loop.onFrame = () => {
    played.frame();
    o.onFrame?.();
  };
  loop.start();
  return {
    state, session, view, loop,
    stop: () => {
      loop.stop();
      unbind();
      played.stop();
      view.dispose();
    },
  };
}
