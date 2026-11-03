// The preview of a battle in rounds, `scene=rounds` (SPEC §15.6, R2a; plan Call 2): one battle, with no run,
// drafts, lives or saves. `src/app/main.ts` loads this module with a dynamic `import()` on every build, so the
// round battle is its own chunk, and the title's button opens it on the dev site only. It never saves a battle
// and touches no storage key (§13.8). It feeds the play clock (`playTime.ts`), whose planning seconds by round
// the report shows and the console logs (X6, T128), and `reveal=last` draws the general as it fielded last
// round (R2-Q1, T127). R2b deletes the entry, once the battle scenes play rounds.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import type { BattleState } from '../../sim/rounds/index.ts';
import { h } from '../../ui/h.ts';
import { playTimeText } from '../../ui/rounds/report.ts';
import { RoundsView } from './battleView.ts';
import { installRoundsBridge } from './bridge.ts';
import { bindRoundInput } from './input.ts';
import { RoundLoop } from './loop.ts';
import { PlayClock, readoutOf } from './playTime.ts';
import { RoundSession } from './session.ts';
import { PreviewRefusal, parseRoundParams, previewState } from './urlParams.ts';

/**
 * Feeds the play clock (RB-Q3): the battle's phase each frame, the player's keys, pointer and wheel, and the
 * tab's visibility. At the battle's end it logs the readout to the console. It returns the frame's feed.
 */
function feedPlayClock(clock: PlayClock, state: BattleState): () => void {
  for (const type of ['keydown', 'pointerdown', 'pointermove', 'wheel']) addEventListener(type, () => clock.input(), { capture: true, passive: true });
  const shown = () => clock.setVisible(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', shown);
  shown();
  let at = '';
  return () => {
    if (`${state.round}:${state.phase}` === at) return;
    at = `${state.round}:${state.phase}`;
    clock.phase(state.round, state.phase);
    if (state.phase === 'ended') {
      const readout = readoutOf(clock);
      console.info(`[play time] ${playTimeText(readout)}`, readout);
    }
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
  let view: RoundsView | null = null;
  let loop: RoundLoop | null = null;
  const bridge = params.debug || params.test
    ? installRoundsBridge({ battle: () => state, preview: () => view?.renderer.preview.drawn ?? null, frames: params.measure ? () => [...(loop?.frameTimes ?? [])] : null }, errors)
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
  const session = new RoundSession(state, content);
  // a pause or `phase=planning` holds planning until input, and a pause never carries into a clash (plan Call 14)
  if (state.phase === 'planning') session.hold = params.phase === 'planning' || params.paused;
  else session.paused = params.paused;
  // the report's Again and Rematch reopen the preview on the same parameters, from round 1's planning
  const reopen = (next: number) => {
    const q = new URLSearchParams(location.search);
    for (const k of ['round', 'phase', 'ticks', 'paused']) q.delete(k);
    q.set('seed', String(next));
    location.search = `?${q.toString()}`;
  };
  const clock = new PlayClock(() => performance.now());
  const actions = { begin: () => { session.begin(); }, again: () => reopen(seed), rematch: () => reopen(randomSeed()), playTime: () => readoutOf(clock) };
  view = new RoundsView(session, content, atlas, actions, params.test, params.reveal ?? 'full');
  document.getElementById('app')!.replaceChildren(view.root);
  view.fit();
  loop = new RoundLoop(session, view, { holdAftermath: params.test && params.phase !== null, measure: params.measure === 'frames' });
  const played = feedPlayClock(clock, state);
  bindRoundInput(session, view, {
    begin: () => { session.begin(); },
    skip: () => loop!.aftermath.skip(),
    toggleDebug: () => { if (params.debug) loop!.debugOverlay = !loop!.debugOverlay; },
  });
  loop.debugOverlay = params.debug;
  loop.onFrame = () => {
    played();
    if (bridge) bridge.ready = true;
  };
  loop.start();
}
