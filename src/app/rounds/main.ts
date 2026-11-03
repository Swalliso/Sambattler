// A battle in rounds on screen (SPEC §15.6, R2a; plan Call 2): `openRoundBattle` opens one, for the preview and
// for a run's battles (R2b's S1), and `startRounds` is the preview, `scene=rounds`: one battle, with no run,
// drafts, lives or saves. `src/app/main.ts` loads the preview with a dynamic `import()` on every build, and the
// title's button opens it on the dev site only. The preview never saves a battle and touches no storage key
// (§13.8). A battle feeds the play clock (`playTime.ts`), whose planning seconds by round the report shows and
// the console logs (X6, T128), and `reveal=last` draws the general as it fielded last round (R2-Q1, T127). R2b
// deletes the preview's entry, once the battle scenes play rounds.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import type { BattleState } from '../../sim/rounds/index.ts';
import { h } from '../../ui/h.ts';
import { playTimeText } from '../../ui/rounds/report.ts';
import { RoundsView } from './battleView.ts';
import type { RoundViewActions } from './battleView.ts';
import type { Reveal } from '../../render/rounds/preview.ts';
import { installRoundsBridge } from './bridge.ts';
import { bindRoundInput } from './input.ts';
import { RoundLoop } from './loop.ts';
import { PlayClock, readoutOf } from './playTime.ts';
import { RoundSession } from './session.ts';
import { PreviewRefusal, parseRoundParams, previewState } from './urlParams.ts';

/**
 * Feeds the play clock (RB-Q3): the battle's phase each frame, the player's keys, pointer and wheel, and the
 * tab's visibility. At the battle's end it logs the readout to the console. It returns the frame's feed and
 * the listeners' removal.
 */
function feedPlayClock(clock: PlayClock, state: BattleState): { frame: () => void; stop: () => void } {
  const input = () => clock.input();
  const types = ['keydown', 'pointerdown', 'pointermove', 'wheel'];
  for (const type of types) addEventListener(type, input, { capture: true, passive: true });
  const shown = () => clock.setVisible(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', shown);
  shown();
  let at = '';
  const frame = () => {
    if (`${state.round}:${state.phase}` === at) return;
    at = `${state.round}:${state.phase}`;
    clock.phase(state.round, state.phase);
    if (state.phase === 'ended') {
      const readout = readoutOf(clock);
      console.info(`[play time] ${playTimeText(readout)}`, readout);
    }
  };
  const stop = () => {
    for (const type of types) removeEventListener(type, input, { capture: true });
    document.removeEventListener('visibilitychange', shown);
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
 * Opens a battle in rounds on the page (§10.2): its view, loop, input and play clock. The preview and a run's
 * battles both open through it; `stop()` takes it down, as a run does between battles.
 */
export function openRoundBattle(content: Content, atlas: Atlas, state: BattleState, o: RoundBattleOptions): RoundBattle {
  const session = new RoundSession(state, content);
  const clock = new PlayClock(() => performance.now());
  const view = new RoundsView(session, content, atlas, { ...o.actions, begin: () => { session.begin(); }, playTime: () => readoutOf(clock) }, o.still, o.reveal ?? 'full');
  document.getElementById('app')!.replaceChildren(view.root);
  view.fit();
  const loop = new RoundLoop(session, view, { holdAftermath: o.holdAftermath ?? false, measure: o.measure ?? false });
  const played = feedPlayClock(clock, state);
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

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! % 1_000_000;
}

/**
 * Opens the preview from the page's URL: the battle its parameters ask for, at its checkpoint (plan Call 14),
 * held there by `phase=` or `paused=1` until input. A seed it chose is written into the URL. Parameters it
 * can't open show their reason in place of the battle, and fail a capture through the bridge's errors.
 */
export function startRounds(content: Content, atlas: Atlas, errors: string[]): void {
  const params = parseRoundParams(location.search);
  const seed = params.seed ?? randomSeed();
  if (params.seed === null) {
    const q = new URLSearchParams(location.search);
    q.set('seed', String(seed));
    history.replaceState(null, '', `?${q.toString()}`);
  }
  let state: BattleState | null = null;
  let battle: RoundBattle | null = null;
  const bridge = params.debug || params.test
    ? installRoundsBridge({
      battle: () => state, preview: () => battle?.view.renderer.preview.drawn ?? null, frames: params.measure ? () => [...(battle?.loop.frameTimes ?? [])] : null,
    }, errors)
    : null;
  try {
    state = previewState(content, params, seed);
  } catch (e) {
    if (!(e instanceof PreviewRefusal)) throw e;
    errors.push(`scene=rounds: ${e.message}`);
    document.getElementById('app')!.replaceChildren(h('pre', { class: 'fatal', id: 'rounds-refused' }, `A battle in rounds (preview) can't open this: ${e.message}.`));
    if (bridge) bridge.ready = true;
    return;
  }
  // the report's Again and Rematch reopen the preview on the same parameters, from round 1's planning
  const reopen = (next: number) => {
    const q = new URLSearchParams(location.search);
    for (const k of ['round', 'phase', 'ticks', 'paused']) q.delete(k);
    q.set('seed', String(next));
    location.search = `?${q.toString()}`;
  };
  battle = openRoundBattle(content, atlas, state, {
    actions: { again: () => reopen(seed), rematch: () => reopen(randomSeed()) },
    still: params.test, debug: params.debug, reveal: params.reveal ?? 'full',
    holdAftermath: params.test && params.phase !== null, measure: params.measure === 'frames',
    onFrame: () => { if (bridge) bridge.ready = true; },
  });
  // a pause or `phase=planning` holds planning until input, and a pause never carries into a clash (plan Call 14)
  if (state.phase === 'planning') battle.session.hold = params.phase === 'planning' || params.paused;
  else battle.session.paused = params.paused;
}
