// Entry point: reads URL parameters, loads and validates content, and opens a scene. Milestone 3
// adds the run (route, drafts, spoils, events, Grove, summary) alongside the single-battle scenes:
// battle and deploy play one battle, report plays it out headlessly and opens on its report.
// With no scene (and no battle parameters) the page opens on the title, the front door to the run.
// `scene=sounds` is the sound board, a tool for auditioning data/sounds.json.
import '../ui/styles.css';
import { bakeAtlas } from '../render/atlas.ts';
import { createRun, currentRow, loadRun, MemoryStorage, runForScene } from '../run/index.ts';
import type { RunState } from '../run/index.ts';
import {
  MILESTONE, createBattle, createFromScenario, makeConfig, parseController, queueCommand, runHeadless,
} from '../sim/index.ts';
import type { BattleState, Content } from '../sim/index.ts';
import { h } from '../ui/h.ts';
import { helpOverlay } from '../ui/help.ts';
import { installUiScale } from '../ui/scale.ts';
import { titleScreen } from '../ui/screens/title.ts';
import { settingsControl } from '../ui/settingsControl.ts';
import { soundPanel } from '../ui/soundControls.ts';
import { BattleView } from './battleView.ts';
import { BUILD_SHA, DEV_SITE } from './channel.ts';
import { browserContent } from './content.ts';
import { installBridge } from './debugBridge.ts';
import { bindInput } from './input.ts';
import { GameLoop } from './loop.ts';
import { parseParams } from './urlParams.ts';
import type { Params } from './urlParams.ts';
import { BrowserStorage, RunController } from './run.ts';
import { Session } from './session.ts';
import { loadSettings, saveSettings } from './settings.ts';
import { installSound, sfx, soundEnabled, soundPrefs } from './sound.ts';
import { soundBoard } from './soundBoard.ts';

const BATTLE_SCENES = new Set(['battle', 'deploy', 'report']);
const RUN_SCENES = new Set(['run', 'route', 'draft', 'summary']);
/** Tools that aren't part of the game: `sounds` is the sound board for auditioning the sound set. */
const TOOL_SCENES = new Set(['sounds']);
const TITLE = 'title';
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
  installUiScale();
  const params = parseParams(location.search);
  if (params.scene !== TITLE && !BATTLE_SCENES.has(params.scene) && !RUN_SCENES.has(params.scene) && !TOOL_SCENES.has(params.scene)) {
    fatal(`scene=${params.scene} is not part of Milestone ${MILESTONE} (only ${[TITLE, ...BATTLE_SCENES, ...RUN_SCENES, ...TOOL_SCENES].join(', ')} exist yet).`);
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
  // ?test=1 holds every screen still (no deal-in, reveal or twinkle), so screenshots are stable
  if (params.test) document.documentElement.classList.add('still');
  if (params.proto) {
    console.info(`prototype rules: ${params.proto} (runs are not saved)`);
    document.title = `[proto ${params.proto}] ${document.title}`;
  }
  if (DEV_SITE) {
    // the dev site says so, with its commit, so playtest notes can name the build
    document.body.append(h('div', { class: 'dev-badge', title: 'Dev site: the develop branch, ahead of the game' }, `DEV BUILD${BUILD_SHA ? ` · ${BUILD_SHA}` : ''}`));
  }
  const atlas = bakeAtlas(content);
  const engine = installSound(content, soundEnabled({ test: params.test, force: params.sound }));
  if (params.scene === 'sounds') soundBoard(content, atlas, engine);
  else if (params.scene === TITLE) openTitle(content, atlas, params);
  else if (RUN_SCENES.has(params.scene)) startRun(content, atlas, params);
  else start(content, atlas, params, params.seed ?? randomSeed());
}

/** Where a run is kept: normal play saves; seeded, test and prototype runs never touch storage. */
function runStorage(params: Params): { persist: boolean; storage: BrowserStorage | MemoryStorage } {
  const persist = params.seed === null && !params.test && !params.proto; // a prototype run never overwrites the real save
  return { persist, storage: persist ? new BrowserStorage() : new MemoryStorage() };
}

/** A rules-only battle for Help outside a battle (the title): the default map, kit and rules. */
function rulesState(content: Content): BattleState {
  return createBattle(content, makeConfig(content, {
    seed: 1, mapId: 'bogwater-hollow', battleIndex: 1, player: parseController('human'), enemy: parseController('general:scripted'),
  }));
}

/**
 * The title (SPEC §10.5): Continue resumes the saved run, New run starts one (after a confirm if a run is
 * saved), How to play opens Help, Settings opens sound and damage numbers. The run's screens offer a way
 * back here.
 */
function openTitle(content: Content, atlas: ReturnType<typeof bakeAtlas>, params: Params): void {
  const { persist, storage } = runStorage(params);
  let ctl: RunController | null = null;
  const bridge = params.debug || params.test
    ? installBridge({ get scene() { return ctl ? 'run' : TITLE; }, battle: () => ctl?.battleState ?? null, run: () => ctl?.run ?? null }, errors)
    : null;
  const ready = () => { if (bridge) bridge.ready = true; };
  /** Opens a run: the saved one, or (with `freshSeed`) a new one, saved at once. */
  const play = (run: RunState, freshSeed?: number) => {
    closeHelp();
    ctl = new RunController({ content, atlas, storage, persist, debug: params.debug, still: params.test, newSeed: randomSeed, toTitle: show }, run);
    ctl.onFrame = ready;
    ctl.pendingTicks = params.ticks;
    if (freshSeed !== undefined) ctl.newRun(freshSeed);
    else ctl.show();
  };
  let help: HTMLElement | null = null;
  const closeHelp = () => { help?.remove(); help = null; };
  const openHelp = () => {
    closeHelp();
    help = helpOverlay(content, rulesState(content), closeHelp);
    document.body.append(help);
    help.querySelector<HTMLElement>('button')?.focus();
  };
  function show(): void {
    ctl = null;
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const saved = persist ? loadRun(storage) : null;
    const settings = settingsControl(atlas, (v) => { saveSettings({ damageNumbers: v }); settings.sync(v); sfx('ui-toggle'); },
      { label: 'Settings', opens: 'side', before: soundPanel(atlas, soundPrefs) });
    settings.sync(loadSettings().damageNumbers);
    const screen = titleScreen(atlas, {
      ...(saved && !saved.outcome ? {
        continueRun: () => play(saved),
        saved: `Row ${Math.min(currentRow(saved) + 1, saved.route.length)} of ${saved.route.length} · Heartcap ${saved.heartcap.hp}/${saved.heartcap.max}`,
      } : {}),
      newRun: () => {
        if (saved && !saved.outcome && !window.confirm('Start a new run? Your saved run will be lost.')) return;
        const seed = params.seed ?? randomSeed();
        play(createRun(content, { seed }), seed);
      },
      help: openHelp,
      settings: settings.el,
    }, params.test, `Milestone ${MILESTONE}${DEV_SITE ? ` · dev build${BUILD_SHA ? ` ${BUILD_SHA}` : ''}` : ''}`);
    document.getElementById('app')!.replaceChildren(screen);
    screen.querySelector<HTMLElement>('.title-menu .primary')?.focus({ preventScroll: true });
    requestAnimationFrame(ready);
  }
  window.addEventListener('keydown', (e) => {
    if (ctl) return;
    if (help && (e.key === 'Escape' || e.key === 'h' || e.key === 'H')) { e.preventDefault(); closeHelp(); }
  });
  show();
}

/**
 * A run (`scene=run`). Without a seed (normal play) the saved run resumes, or a new one starts; seeded,
 * test and prototype runs never touch storage (seeded and test runs are deterministic, so screenshots
 * match Node).
 */
function startRun(content: Content, atlas: ReturnType<typeof bakeAtlas>, params: Params): void {
  const { persist, storage } = runStorage(params);
  const seed = params.seed ?? randomSeed();
  const run = (persist ? loadRun(storage) : null) ?? runForScene(content, { scene: params.scene, seed, player: params.player, autoplay: params.autoplay });
  const ctl = new RunController({ content, atlas, storage, persist, debug: params.debug, still: params.test, newSeed: randomSeed }, run);
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
  }, params.debug, params.test);
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
