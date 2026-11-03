// The preview of a battle in rounds, `scene=rounds` (SPEC §15.6, R2a; plan Call 2): one battle, with no run,
// drafts, lives or saves. `src/app/main.ts` loads this module with a dynamic `import()` on every build, so the
// round battle is its own chunk, and the title's button opens it on the dev site only. It never saves a battle
// and touches no storage key (§13.8). R2b deletes the entry, once the battle scenes play rounds.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import type { BattleState } from '../../sim/rounds/index.ts';
import { h } from '../../ui/h.ts';
import { RoundsView } from './battleView.ts';
import { installRoundsBridge } from './bridge.ts';
import { bindRoundInput } from './input.ts';
import { RoundLoop } from './loop.ts';
import { RoundSession } from './session.ts';
import { PreviewRefusal, parseRoundParams, previewState } from './urlParams.ts';

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
  let loop: RoundLoop | null = null;
  const bridge = params.debug || params.test
    ? installRoundsBridge({ battle: () => state, preview: () => null, frames: params.measure ? () => [...(loop?.frameTimes ?? [])] : null }, errors)
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
  const view = new RoundsView(session, content, atlas, { begin: () => { session.begin(); } }, params.test);
  document.getElementById('app')!.replaceChildren(view.root);
  view.fit();
  loop = new RoundLoop(session, view, { holdAftermath: params.test && params.phase !== null, measure: params.measure === 'frames' });
  bindRoundInput(session, view, {
    begin: () => { session.begin(); },
    skip: () => loop!.aftermath.skip(),
    toggleDebug: () => { if (params.debug) loop!.debugOverlay = !loop!.debugOverlay; },
  });
  loop.debugOverlay = params.debug;
  if (bridge) loop.onFrame = () => { bridge.ready = true; };
  loop.start();
}
