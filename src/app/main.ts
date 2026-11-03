// Entry point: reads URL parameters, loads and validates content, and opens a scene. Milestone 3
// adds the run (route, drafts, spoils, events, Grove, summary) alongside the single-battle scenes:
// battle opens one battle in rounds, and report plays it to its end headlessly and opens on its report.
// With no scene (and no battle parameters) the page opens on the title, the front door to the run;
// New run goes through the Underroot (`scene=underroot`), where the commander and bans are chosen.
// `scene=sounds` is the sound board, a tool for auditioning data/sounds.json. Any other scene, v1's `deploy`
// and R2a's `rounds` among them, is refused with a visible message (R2b plan Call 15).
import '../ui/styles.css';
import { PROTO_PRESETS, unknownPresets } from '../data/proto.ts';
import { loadRecords, runItBackSetup, setLastSetup, updateRecords } from '../meta/index.ts';
import { bakeAtlas } from '../render/atlas.ts';
import { createRun, currentRow, loadRun, MemoryStorage, runForScene } from '../run/index.ts';
import type { RunState } from '../run/index.ts';
import { DEFAULT_COMMANDER, MILESTONE } from '../sim/index.ts';
import { createBattle, makeRoundConfig } from '../sim/index.ts';
import type { BattleState, Content } from '../sim/index.ts';
import { h } from '../ui/h.ts';
import { helpOverlay } from '../ui/help.ts';
import { applyMotion, sporeWipe } from '../ui/motion.ts';
import { installUiScale, setUiScale } from '../ui/scale.ts';
import { titleScreen } from '../ui/screens/title.ts';
import { underrootScreen } from '../ui/screens/underroot.ts';
import type { UnderrootTab } from '../ui/screens/underroot.ts';
import { sporeLayer } from '../render/spores.ts';
import { closeSettings, openSettings, settingsButton, settingsOpen } from '../ui/settingsScreen.ts';
import { regrowths } from '../ui/words.ts';
import { BUILD_SHA, DEV_SITE, protoSpace } from './channel.ts';
import { browserContent } from './content.ts';
import { installBridge } from './debugBridge.ts';
import { openRoundBattle } from './loop.ts';
import type { RoundBattle } from './loop.ts';
import { BattleRefusal, battleForParams, forwardBattle, parseParams, parseRoundParams, runCheckpoint } from './urlParams.ts';
import type { Params } from './urlParams.ts';
import { BrowserStorage, RunController } from './run.ts';
import { loadSettings, markTipShown, onSettings, settingsStore, tipsShown } from './settings.ts';
import { installSound, soundEnabled, soundPrefs } from './sound.ts';
import { soundBoard } from './soundBoard.ts';

const BATTLE_SCENES = new Set(['battle', 'report']);
const RUN_SCENES = new Set(['run', 'route', 'draft', 'summary']);
const UNDERROOT = 'underroot';
/** Tools that aren't part of the game: `sounds` is the sound board for auditioning the sound set. */
const TOOL_SCENES = new Set(['sounds']);
const TITLE = 'title';
/** The Underroot's first-time tip, remembered with the battle tips (spore-sprawl/tips/v1). */
const UNDERROOT_TIP = 'underroot';
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

/** The settings that shape the whole page (UI scale, reduced motion, color-blind assist), now and as they change. */
function installDisplaySettings(): void {
  const s = loadSettings();
  installUiScale(s.uiScale);
  applyMotion(s.reducedMotion);
  document.documentElement.classList.toggle('assist', s.colorAssist);
  onSettings((next, patch) => {
    if ('uiScale' in patch) setUiScale(next.uiScale);
    if ('reducedMotion' in patch) applyMotion(next.reducedMotion);
    if ('colorAssist' in patch) document.documentElement.classList.toggle('assist', next.colorAssist);
  });
}

function boot(): void {
  installDisplaySettings();
  const params = parseParams(location.search);
  const known = params.scene === TITLE || params.scene === UNDERROOT || BATTLE_SCENES.has(params.scene) || RUN_SCENES.has(params.scene) || TOOL_SCENES.has(params.scene);
  if (!known) {
    fatal(`scene=${params.scene} is not part of Milestone ${MILESTONE} (only ${[TITLE, UNDERROOT, ...BATTLE_SCENES, ...RUN_SCENES, ...TOOL_SCENES].join(', ')} exist yet).`);
    return;
  }
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
    console.info(`prototype rules: ${params.proto} (${protoSpace(params.proto) !== null ? 'runs save apart from the real save' : 'runs are not saved'})`);
    document.title = `[proto ${params.proto}] ${document.title}`;
    // a preset that doesn't exist, such as a retired one, is said on the page, not only in the console (A117)
    const unknown = unknownPresets(params.proto);
    if (unknown.length) document.body.append(h('div', { class: 'proto-notice', id: 'proto-notice', role: 'status' }, unknownPresetNotice(unknown)));
  }
  if (DEV_SITE) {
    // the dev site says so, with its commit, so playtest notes can name the build
    document.body.append(h('div', { class: 'dev-badge', title: 'Dev site: the develop branch, ahead of the game' }, `DEV BUILD${BUILD_SHA ? ` · ${BUILD_SHA}` : ''}`));
  }
  const atlas = bakeAtlas(content);
  const engine = installSound(content, soundEnabled({ test: params.test, force: params.sound }));
  if (params.scene === 'sounds') soundBoard(content, atlas, engine);
  else if (params.scene === TITLE || params.scene === UNDERROOT) openTitle(content, atlas, params);
  else if (RUN_SCENES.has(params.scene)) startRun(content, atlas, params);
  else startBattle(content, atlas, params.scene);
}

/** The page's notice for a `?proto=` spec naming presets that don't exist (A117): they're ignored, and the run is saved nowhere. */
function unknownPresetNotice(names: readonly string[]): string {
  const list = names.map((n) => `"${n}"`).join(', ');
  return `?proto= names no preset ${list} (known: ${Object.keys(PROTO_PRESETS).join(', ')}), so ${names.length === 1 ? "it's" : "they're"} ignored, and this run isn't saved.`;
}

/**
 * Where a run and the profile are kept: normal play saves both, and seeded and test runs never touch
 * storage. A prototype run saves only on the dev site, apart from the real save (`protoSpace`), and never
 * writes the profile (RB-Q2); one whose spec names a preset that doesn't exist saves nowhere (A117).
 */
function runStorage(params: Params): { persist: boolean; storage: BrowserStorage | MemoryStorage; records: BrowserStorage | null } {
  const space = params.proto ? protoSpace(params.proto) : '';
  if (params.seed !== null || params.test || space === null) return { persist: false, storage: new MemoryStorage(), records: null };
  return { persist: true, storage: new BrowserStorage(space), records: params.proto ? null : new BrowserStorage('') };
}

/** A rules-only battle for Help outside a battle (the title): the default map, kit and rules. */
function rulesState(content: Content): BattleState {
  return createBattle(content, makeRoundConfig(content, { seed: 1, mapId: 'bogwater-hollow', battleIndex: 1, player: 'human', enemy: 'general:scripted' }));
}

/**
 * The title (SPEC §10.5): Continue resumes the saved run, New run starts one (after a confirm if a run is
 * saved), How to play opens Help, Settings opens the settings screen. The run's screens offer a way back
 * here, behind a spore wipe.
 */
function openTitle(content: Content, atlas: ReturnType<typeof bakeAtlas>, params: Params): void {
  const { persist, storage, records } = runStorage(params);
  let ctl: RunController | null = null;
  let where = params.scene === UNDERROOT ? UNDERROOT : TITLE;
  const bridge = params.debug || params.test
    ? installBridge({ get scene() { return ctl ? 'run' : where; }, battle: () => ctl?.battleState ?? null, run: () => ctl?.run ?? null }, errors)
    : null;
  const ready = () => { if (bridge) bridge.ready = true; };
  /** Opens a run: the saved one, with a migrated save's notice, or (`fresh`) a new one from the Underroot, saved at once. */
  const play = (run: RunState, fresh = false, notice?: string) => {
    closeHelp();
    ctl?.stop();
    ctl = new RunController({
      content, atlas, storage, persist, records, debug: params.debug, still: params.test, newSeed: randomSeed, toTitle: show, setup: () => openSetup(),
    }, run, notice);
    ctl.onFrame = ready;
    if (fresh) ctl.start(run);
    else ctl.show();
  };
  /**
   * The Underroot (SPEC §8.1): choose a commander and bans, then Begin run; Back returns to the title. Normal
   * play opens it on the setup last begun and remembers the new one (Run it back's records-1); seeded, test
   * and prototype pages open it on the default.
   */
  const openSetup = (tab: UnderrootTab = 'commanders') => sporeWipe(() => {
    ctl?.stop();
    ctl = null;
    where = UNDERROOT;
    closeHelp();
    closeSettings();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const settings = loadSettings();
    const tip = settings.tips && !tipsShown().has(UNDERROOT_TIP);
    if (tip) markTipShown(UNDERROOT_TIP);
    const screen = underrootScreen(content, atlas, {
      tab, tip, choice: records ? runItBackSetup(content, loadRecords(records).lastSetup) : { commander: DEFAULT_COMMANDER, bans: [] },
      begin: (choice) => {
        const seed = params.seed ?? randomSeed();
        const run = createRun(content, { seed, commander: choice.commander, bans: choice.bans });
        if (records) updateRecords(records, (rec) => setLastSetup(rec, choice));
        play(run, true);
      },
      back: show,
    });
    screen.prepend(h('div', { class: 'run-sky', 'aria-hidden': 'true' }));
    document.getElementById('app')!.replaceChildren(screen);
    requestAnimationFrame(() => sporeLayer(screen.querySelector<HTMLElement>('.run-sky')!, { scale: 3, density: 1.2, still: params.test }));
    screen.querySelector<HTMLElement>('.commander-card.on')?.focus({ preventScroll: true });
    requestAnimationFrame(ready);
  });
  let help: HTMLElement | null = null;
  const closeHelp = () => { help?.remove(); help = null; };
  const openHelp = () => {
    closeHelp();
    help = helpOverlay(content, rulesState(content), closeHelp);
    document.body.append(help);
    help.querySelector<HTMLElement>('button')?.focus();
  };
  const openSettingsScreen = () => openSettings(content, atlas, settingsStore, soundPrefs, { onClose: () => {} });
  /** Back from a run, the title arrives behind a spore wipe (the page's first screen appears at once). */
  function show(): void { sporeWipe(render); }
  function render(): void {
    ctl?.stop();
    ctl = null;
    where = TITLE;
    closeSettings();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    // a save from before R2 loads migrated with its notice; one that can't be read says so, and is kept until replaced (§8.9)
    const loaded = persist ? loadRun(storage, content) : { kind: 'none' as const };
    const saved = loaded.kind === 'run' && !loaded.run.outcome ? loaded.run : null;
    const notice = loaded.kind === 'none' ? undefined : loaded.notice;
    const screen = titleScreen(atlas, {
      ...(saved ? {
        continueRun: () => play(saved, false, notice),
        saved: `Row ${Math.min(currentRow(saved) + 1, saved.route.length)} of ${saved.route.length} · ${regrowths(saved.lives.left)}`,
      } : {}),
      ...(notice && (saved || loaded.kind === 'unreadable') ? { notice } : {}),
      newRun: () => {
        if (saved && !window.confirm('Start a new run? Your saved run will be lost.')) return;
        if (loaded.kind === 'unreadable' && !window.confirm('Start a new run? Your saved run can\'t be read, and starting one replaces it.')) return;
        openSetup();
      },
      help: openHelp,
      settings: settingsButton(atlas, openSettingsScreen, 'Settings'),
    }, params.test, `Milestone ${MILESTONE}${DEV_SITE ? ` · dev build${BUILD_SHA ? ` ${BUILD_SHA}` : ''}` : ''}`);
    document.getElementById('app')!.replaceChildren(screen);
    screen.querySelector<HTMLElement>('.title-menu .primary')?.focus({ preventScroll: true });
    requestAnimationFrame(ready);
  }
  window.addEventListener('keydown', (e) => {
    if (ctl || settingsOpen()) return;
    if (help && (e.key === 'Escape' || e.key === 'h' || e.key === 'H')) { e.preventDefault(); closeHelp(); }
  });
  if (params.scene === UNDERROOT) openSetup(params.tab);
  else show();
}

/**
 * A run (`scene=run`). Without a seed (normal play) the saved run resumes, or a new one starts; seeded
 * and test runs never touch storage (they're deterministic, so screenshots match Node), and a prototype
 * run saves only on the dev site, apart from the real save. `round=` and `phase=` open the run's current
 * battle at that checkpoint, held there as a single battle is (T157); one it can't reach shows its reason.
 */
function startRun(content: Content, atlas: ReturnType<typeof bakeAtlas>, params: Params): void {
  const { persist, storage, records } = runStorage(params);
  const loaded = persist ? loadRun(storage, content) : { kind: 'none' as const };
  // a save that can't be read goes to the title, which says so and asks before replacing it (§8.9, A084)
  if (loaded.kind === 'unreadable') { openTitle(content, atlas, { ...params, scene: TITLE }); return; }
  const seed = params.seed ?? randomSeed();
  const at = runCheckpoint(location.search);
  const run = loaded.kind === 'run' ? loaded.run
    : runForScene(content, { scene: params.scene, seed, player: params.player, autoplay: params.autoplay, enterBattle: at !== null });
  const notice = loaded.kind === 'run' ? loaded.notice : undefined;
  let ctl: RunController | null = null;
  const bridge = params.debug || params.test
    ? installBridge({ scene: params.scene, battle: () => ctl?.battleState ?? null, run: () => ctl?.run ?? run, playTime: () => ctl?.playTime() ?? null }, errors)
    : null;
  let opening: { state: BattleState; hold: boolean; holdAftermath: boolean } | undefined;
  if (at && run.screen.kind === 'battle') {
    try {
      const state = forwardBattle(createBattle(content, run.screen.config), at);
      opening = { state, hold: state.phase === 'planning' ? at.phase === 'planning' || at.paused : at.paused, holdAftermath: params.test && at.phase !== null };
    } catch (e) {
      if (!(e instanceof BattleRefusal)) throw e;
      refuseBattle(e.message);
      if (bridge) bridge.ready = true;
      return;
    }
  }
  ctl = new RunController({
    content, atlas, storage, persist, records, debug: params.debug, still: params.test, newSeed: randomSeed, ...(opening ? { opening } : {}),
  }, run, notice);
  if (bridge) ctl.onFrame = () => { bridge.ready = true; };
  ctl.show();
}

/** A battle its parameters can't open shows the reason in its place, and fails a capture through the bridge's errors (§15.6). */
function refuseBattle(message: string): void {
  errors.push(`battle: ${message}`);
  document.getElementById('app')!.replaceChildren(h('pre', { class: 'fatal', id: 'battle-refused' }, `This battle can't open: ${message}.`));
}

/**
 * A single battle in rounds (`scene=battle`, `scene=report`, or battle parameters without a scene): the battle its
 * parameters ask for, at its checkpoint (R2a plan Call 14), held there by `phase=` or `paused=1` until input. A
 * seed it chose is written into the URL. Parameters it can't open show their reason in place of the battle, and
 * fail a capture through the bridge's errors. Again replays the seed and Rematch draws a new one, from round 1's
 * planning on the same parameters. A single battle never saves and touches no storage key (§13.8).
 */
function startBattle(content: Content, atlas: ReturnType<typeof bakeAtlas>, scene: string): void {
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
    ? installBridge({
      scene, battle: () => state, run: () => null,
      preview: () => battle?.view.renderer.preview.drawn ?? null, frames: params.measure ? () => [...(battle?.loop.frameTimes ?? [])] : null,
    }, errors)
    : null;
  try {
    state = battleForParams(content, params, seed);
  } catch (e) {
    if (!(e instanceof BattleRefusal)) throw e;
    refuseBattle(e.message);
    if (bridge) bridge.ready = true;
    return;
  }
  // the report's Again and Rematch reopen the battle on the same parameters, from round 1's planning
  const reopen = (next: number) => {
    const q = new URLSearchParams(location.search);
    for (const k of ['round', 'phase', 'ticks', 'paused']) q.delete(k);
    if (q.get('scene') === 'report') q.set('scene', 'battle');
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
  // `targeting=1` (screenshots): in a clash, aim the power at the middle of the field
  if (params.targeting && state.phase === 'clash' && battle.session.toggleTargeting()) battle.session.aim = { x: state.map.width / 2, y: state.map.height / 2 };
}

boot();
