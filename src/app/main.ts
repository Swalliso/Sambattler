// Entry point: reads URL parameters, loads and validates content, and opens a scene. Milestone 3
// adds the run (route, drafts, spoils, events, Grove, summary) alongside the single-battle scenes:
// battle and deploy play one battle, report plays it out headlessly and opens on its report.
import '../ui/styles.css';
import { bakeAtlas } from '../render/atlas.ts';
import { loadRun, MemoryStorage, runForScene } from '../run/index.ts';
import {
  MILESTONE, createBattle, createFromScenario, makeConfig, parseController, queueCommand, runHeadless,
} from '../sim/index.ts';
import type { BattleState, Content } from '../sim/index.ts';
import { h } from '../ui/h.ts';
import { BattleView } from './battleView.ts';
import { BUILD, DEV_SITE } from './channel.ts';
import { browserContent } from './content.ts';
import { installBridge } from './debugBridge.ts';
import { bindInput } from './input.ts';
import { GameLoop } from './loop.ts';
import { parseParams } from './urlParams.ts';
import type { Params } from './urlParams.ts';
import { BrowserStorage, RunController } from './run.ts';
import { Session } from './session.ts';

const BATTLE_SCENES = new Set(['battle', 'deploy', 'report']);
const RUN_SCENES = new Set(['run', 'route', 'draft', 'summary']);
const errors: string[] = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! % 1_000_000;
}

function fatal(message: string): void {
  const app = document.getElementById('app')!;
  app.replaceChildren(h('pre', { class: 'fatal' }, message));
}

function buildState(content: Content, p: Params, seed: number): BattleState {
  if (p.scenario) {
    return createFromScenario(content, p.scenario, {
      seed,
      ...(p.player !== 'human' ? { player: p.player } : {}),
      ...(p.enemy !== null ? { enemy: p.enemy } : {}),
      ...(p.flags ? { flags: p.flags } : {}),
    });
  }
  return createBattle(content, makeConfig(content, {
    seed, mapId: p.map, battleIndex: p.battleIndex,
    player: parseController(p.player), enemy: parseController(p.enemy ?? 'general:scripted'),
    ...(p.flags ? { flags: p.flags } : {}),
  }));
}

function boot(): void {
  const params = parseParams(location.search);
  if (!BATTLE_SCENES.has(params.scene) && !RUN_SCENES.has(params.scene)) {
    fatal(`scene=${params.scene} is not part of Milestone ${MILESTONE} (only ${[...BATTLE_SCENES, ...RUN_SCENES].join(', ')} exist yet).`);
    return;
  }
  for (const problem of params.flagProblems) console.warn(`${problem}; ignored`);
  if (params.scene === 'report') params.ticks = 'end';
  let content: Content;
  try {
    content = browserContent(params.proto);
  } catch (e) {
    fatal(`Content failed validation:\n${(e as Error).message}`);
    throw e;
  }
  if (params.proto) {
    console.info(`prototype rules: ${params.proto} (runs are not saved)`);
    document.title = `[proto ${params.proto}] ${document.title}`;
  }
  if (DEV_SITE) {
    // the dev site says so, with its commit, so playtest notes can name the build
    document.title = `[dev] ${document.title}`;
    document.body.append(h('div', { class: 'dev-badge', title: 'Dev site: the develop branch, ahead of the main game' }, `DEV${BUILD ? ` · ${BUILD}` : ''}`));
  }
  const atlas = bakeAtlas(content);
  if (RUN_SCENES.has(params.scene)) startRun(content, atlas, params);
  else start(content, atlas, params, params.seed ?? randomSeed());
}

/**
 * A run. Without a seed (normal play) the saved run resumes, or a new one starts; seeded, test and
 * prototype runs never touch storage (seeded and test runs are deterministic, so screenshots match Node).
 */
function startRun(content: Content, atlas: ReturnType<typeof bakeAtlas>, params: Params): void {
  const persist = params.seed === null && !params.test && !params.proto; // a prototype run never overwrites the real save
  const storage = persist ? new BrowserStorage() : new MemoryStorage();
  const seed = params.seed ?? randomSeed();
  const run = (persist ? loadRun(storage) : null) ?? runForScene(content, { scene: params.scene, seed, player: params.player, autoplay: params.autoplay });
  const ctl = new RunController({ content, atlas, storage, persist, debug: params.debug, newSeed: randomSeed }, run);
  if (params.debug || params.test) {
    const bridge = installBridge({ scene: params.scene, battle: () => ctl.battleState, run: () => ctl.run }, errors);
    ctl.onFrame = () => { bridge.ready = true; };
  }
  ctl.pendingTicks = params.ticks;
  ctl.show();
}

function start(content: Content, atlas: ReturnType<typeof bakeAtlas>, params: Params, seed: number): void {
  const state = buildState(content, params, seed);
  const session = new Session(state, content);
  const humanPlayer = state.config.player.controller.kind === 'human';
  const restart = (nextSeed: number) => {
    loop.stop();
    unbind();
    view.dispose();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const q = new URLSearchParams(location.search);
    q.set('seed', String(nextSeed));
    q.delete('ticks');
    q.delete('paused');
    history.replaceState(null, '', `?${q.toString()}`);
    start(content, atlas, { ...params, seed: nextSeed, ticks: null, paused: false }, nextSeed);
  };
  const view = new BattleView(session, content, atlas, {
    begin: () => { if (state.phase === 'deploy' && !state.queue.some((c) => c.type === 'begin')) session.issue({ type: 'begin' }); },
    again: () => restart(randomSeed()),
    rematch: () => restart(seed),
  }, params.debug);
  const app = document.getElementById('app')!;
  app.replaceChildren(view.root);

  // Bots play the player side automatically; `ticks` fast-forwards headlessly before the first frame.
  if (state.phase === 'deploy' && (!humanPlayer || params.ticks !== null)) {
    queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
  }
  if (params.ticks !== null) {
    runHeadless(state, { until: params.ticks, onTick: (s) => view.log.onTick(s) });
  }
  session.paused = params.paused;
  view.fit();
  const loop = new GameLoop(session, view);
  const unbind = bindInput(session, view, {
    begin: () => { if (state.phase === 'deploy' && !state.queue.some((c) => c.type === 'begin')) session.issue({ type: 'begin' }); },
    toggleDebug: () => { if (params.debug) loop.debugOverlay = !loop.debugOverlay; },
  });
  loop.debugOverlay = params.debug;
  if (params.debug || params.test) {
    const bridge = installBridge({ scene: params.scene, battle: () => session.state, run: () => null }, errors);
    loop.onFrame = () => { bridge.ready = true; };
  }
  loop.start();
}

boot();
