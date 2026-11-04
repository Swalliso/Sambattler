// The battle screen for a battle in rounds (SPEC §10.2): the layout of v1's screen with the field drawn by
// `src/render/renderer.ts` inside its frame of roots and soil, the callout lane, and the bands and panels
// in their mounts, each filled with one line: S13's top band, tally and Intent panel, and S14's tray and inspect
// (`src/ui/hud/`, `src/ui/inspect.ts`). One layout serves the three views, which switch their chrome on and off by phase (T097):
// planning shows Begin, the one primary button, and pins the planning hint; a clash puts the speed control and
// pause in Begin's place, locks the tray and calls out a Twin Roots lane's end; the aftermath keeps the speed
// control without pause and pins the round's result banner once the bars have drained (A071). The commander
// power's button leads the controls, lit only in a clash (§6.6, §10.2, T109): Ready, Aiming, Next tick and Used
// this clash, with its reticle and aim callout while aiming. Help and the settings screen hold a clash and the
// aftermath while they're open (A078). A draft in planning opens today's centred dialog over the field until
// S10 docks it (T153, T116): its cards, reroll and skip send draft commands, and Begin stays unlit while it's
// open (§8.3). At the battle's end the report by round arrives behind the spore wipe.
// Its sounds come from each step's events (`battleSound.ts`), and the speaker button sits beside the cog.
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { FieldFrame } from '../render/frame.ts';
import type { Reveal } from '../render/preview.ts';
import { RoundRenderer, STRIP, TILE } from '../render/renderer.ts';
import type { BattleState, CommandBody, SimEvent } from '../sim/index.ts';
import { h, setText, toggleClass } from '../ui/h.ts';
import { DraftOverlay } from '../ui/draftOverlay.ts';
import { helpOverlay } from '../ui/help.ts';
import { uiIcon } from '../ui/icons.ts';
import { sporeWipe } from '../ui/motion.ts';
import { uiScale } from '../ui/scale.ts';
import { closeSettings, openSettings, settingsButton, settingsOpen } from '../ui/settingsScreen.ts';
import { AnchoredTip } from '../ui/tooltip.ts';
import { RoundCallouts } from '../ui/callouts.ts';
import type { RoundCalloutKind } from '../ui/callouts.ts';
import { hudContext, IntentPanel, TopBand } from '../ui/hud/top.ts';
import type { Lives } from '../ui/hud/top.ts';
import type { HudContext, HudPart } from '../ui/hud/top.ts';
import { RoundTally } from '../ui/hud/tally.ts';
import { RoundTray } from '../ui/hud/tray.ts';
import { RoundCombatLog, RoundInspect } from '../ui/inspect.ts';
import { roundsReport } from '../ui/report.ts';
import type { RunLines } from '../ui/report.ts';
import type { PlayTimeReadout } from '../ui/report.ts';
import { loadSettings, onSettings, settingsStore } from './settings.ts';
import { BattleSound } from './battleSound.ts';
import { sfx, soundDim, soundPrefs, soundSpeed, soundToggle } from './sound.ts';
import { resultBanner } from './phases/aftermath.ts';
import { aimText, laneCallout, powerButton, powerNews, powerRefusal, powerText, powerUse } from './phases/clash.ts';
import { generalNews, planningHint } from './phases/planning.ts';
import type { RoundSession } from './session.ts';

/** The mounts the bands and panels fill (T077): S13's T088, T089 and T091, S14's T093 and T094. */
export interface RoundMounts {
  top: HTMLElement;
  tally: HTMLElement;
  intent: HTMLElement;
  tray: HTMLElement;
  inspect: HTMLElement;
  callouts: HTMLElement;
}

export interface RoundViewActions {
  begin(): void;
  /** A single battle's report buttons: the same seed, or a new one, on the same parameters (§10.4). */
  again?(): void;
  rematch?(): void;
  /** A run's battle: the report's Continue (R2b). */
  continueRun?(): void;
  /** In a run: what the battle paid and cost, from the record its end wrote (T098). */
  runLines?(): RunLines | null;
  /** The play clock's readout, which the report shows (X6, T128). */
  playTime?(): PlayTimeReadout;
}

export class RoundsView {
  readonly root: HTMLElement;
  readonly renderer: RoundRenderer;
  readonly canvas: HTMLCanvasElement;
  /** The roots ceiling, soil bed and ambient spores around the field. */
  readonly frameArt: FieldFrame;
  readonly callouts = new RoundCallouts();
  readonly mounts: RoundMounts;
  /**
   * Counts colony changes: a planted, sold or toggled building, and each round's opening, when the general
   * plans. The formation preview (T083) recomputes only when it moves (§13.5, §13.6).
   */
  colonyVersion = 0;
  /** Each unit's damage and kills in the clash, for inspect (§10.4). */
  readonly log = new RoundCombatLog();
  /** The bands and panels in their mounts, each drawn every frame. */
  private bands: HudPart[] = [];
  private hud: HudContext;
  private topBand: TopBand;
  private top: HTMLElement;
  private field: HTMLElement;
  private tip = h('div', { class: 'ghost-tip', id: 'ghost-tip', hidden: true });
  private beginBtn: HTMLButtonElement;
  private beginLabel = h('span', null, 'Begin');
  private speedSeg: HTMLElement;
  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  /** The commander power's button, absent in a battle without one (§6.6). */
  private powerBtn: HTMLButtonElement | null = null;
  private powerState = h('small', { class: 'power-state', id: 'power-state' });
  private powerTip = new AnchoredTip('power-tip', 'above');
  /** What a click does while aiming, pinned in the callout lane (§10.2). */
  private aimCallout = h('div', { class: 'callout aim', id: 'aim-callout', role: 'status' });
  private pausedCallout: HTMLElement;
  /** The planning hint, pinned through planning (§10.2). */
  private hintText = h('span');
  private hint = h('div', { class: 'callout planning', id: 'planning-hint', role: 'status' }, this.hintText, h('kbd', null, 'Space'));
  /** The empty-lane warning, pinned while it stands (§10.2). */
  private warningText = h('span');
  private warning = h('div', { class: 'callout bad', id: 'empty-lane-warning', role: 'status' }, this.warningText, h('kbd', null, 'Esc'));
  /** The round's result banner, pinned through the aftermath once the bars have drained (A071). */
  private banner = h('div', { class: 'callout banner-callout', id: 'round-banner', role: 'status' });
  private bannerFor = 0;
  private help: HTMLElement | null = null;
  /** The battle's sounds, from each step's events (§13.9). */
  private sound: BattleSound;
  private settingsShown = false;
  private report: HTMLElement | null = null;
  /** The player's draft in planning, today's centred dialog (§8.3, T153). */
  private draft: DraftOverlay;
  private onResize = () => this.fit();
  private unsubscribe: () => void;
  scale = 1;

  /**
   * @param still ambient motion holds still (`?test=1`), so captures and browser tests are stable
   * @param reveal how the general shows from round 2 (`reveal=`, §7.5, T127)
   * @param lives a run's lives, under your Heartcap (§8.5, T106); null in a single battle
   */
  constructor(private session: RoundSession, private content: Content, private atlas: Atlas, private actions: RoundViewActions, still = false, reveal: Reveal = 'full', lives: Lives | null = null) {
    const state = session.state;
    this.sound = new BattleSound(content.audio.enemyGain, sfx);
    this.canvas = h('canvas', { id: 'battlefield', 'aria-label': 'Battlefield' });
    this.renderer = new RoundRenderer(this.canvas, content, atlas, state);
    this.renderer.still = still;
    this.renderer.preview.reveal = reveal;
    this.frameArt = new FieldFrame(content, atlas, this.renderer.width, this.renderer.height, still);
    const settings = loadSettings();
    this.renderer.damageNumbers = settings.damageNumbers;
    this.renderer.colorAssist = settings.colorAssist;
    this.unsubscribe = onSettings((next) => {
      this.renderer.damageNumbers = next.damageNumbers;
      this.renderer.colorAssist = next.colorAssist;
    });
    const mount = (id: string) => h('div', { class: 'rounds-mount', id: `mount-${id}` });
    this.mounts = {
      top: mount('top'), tally: mount('tally'), intent: mount('intent'), tray: mount('tray'), inspect: mount('inspect'), callouts: mount('callouts'),
    };
    this.mounts.callouts.style.display = 'contents';
    this.mounts.callouts.append(this.callouts.el);
    // the aftermath's drain holds while Help or the settings screen is open, as the loop's aftermath does
    const hud = this.hud = hudContext(content, atlas, () => (session.overlayOpen ? 0 : session.speed), still, reveal, lives);
    this.topBand = new TopBand(this.mounts.top, hud, state);
    this.bands.push(this.topBand);
    this.bands.push(new RoundTally(this.mounts.tally, hud, state));
    this.bands.push(new IntentPanel(this.mounts.intent, hud, state));
    this.bands.push(new RoundTray(this.mounts.tray, hud, state, { available: () => session.available(), placing: () => session.placing, pick: (id) => session.pick(id) }));
    this.bands.push(new RoundInspect(this.mounts.inspect, hud, this.log, {
      selected: () => session.selected, sellArmed: () => session.sellArmed, mergeShown: (id) => session.mergeShown(id), sell: () => this.sell(), toggleMerge: () => { session.toggleMerge(); },
    }));
    this.top = h('header', { class: 'top rounds-top' }, this.mounts.top, this.mounts.tally, this.mounts.intent);
    this.field = h('main', { class: 'field' }, this.frameArt.el, h('div', { class: 'fieldwrap' }, this.canvas, this.tip));
    this.beginBtn = h('button', { class: 'btn primary', id: 'begin-btn', title: 'Start the clash (Space or Enter)', onclick: () => actions.begin() },
      this.beginLabel, h('kbd', null, 'Space'));
    for (const s of [1, 2, 3]) {
      this.speedBtns.push(h('button', { class: 'btn', 'data-speed': s, title: `Speed ${s}× ([ and ] change it)`, 'aria-pressed': 'false', onclick: () => { session.speed = s; } }, `${s}×`));
    }
    this.pauseBtn = h('button', {
      class: 'btn has-ico', id: 'pause-btn', title: 'Pause (Space)', 'aria-label': 'Pause', 'aria-pressed': 'false', onclick: () => { session.paused = !session.paused; },
    }, uiIcon(atlas, 'i-pause'));
    this.speedSeg = h('div', { class: 'seg speed', id: 'speed-seg', role: 'group', 'aria-label': 'Speed and pause' }, ...this.speedBtns, this.pauseBtn);
    this.pausedCallout = h('div', { class: 'callout paused', id: 'paused-callout' }, uiIcon(atlas, 'i-pause'), 'Paused', h('kbd', null, 'Space'));
    this.settingsBtn = settingsButton(atlas, () => this.toggleSettings());
    this.draft = new DraftOverlay(content, atlas, {
      pick: (cardId) => this.draftCommand({ type: 'draftPick', cardId }), reroll: () => this.draftCommand({ type: 'draftReroll' }), skip: () => this.draftCommand({ type: 'draftSkip' }),
    });
    const power = session.power();
    if (power) {
      this.powerBtn = h('button', {
        class: 'btn power-btn', id: 'power-btn', 'aria-pressed': 'false', 'aria-label': `${power.name} (Q)`, onclick: () => this.togglePower(),
      },
      h('span', { class: 'power-ring', 'aria-hidden': 'true' }, uiIcon(atlas, 'i-power')),
      h('span', { class: 'power-label' }, h('b', null, power.name), this.powerState),
      h('kbd', null, 'Q'));
      this.powerTip.attach(this.powerBtn, {
        key: () => this.powerState.textContent ?? '',
        build: () => [
          h('div', { class: 'tip-head' }, h('b', null, power.name), h('span', { class: 'tip-num lit' }, this.powerState.textContent ?? '')),
          h('span', null, powerText(power)),
          h('span', { class: 'muted' }, powerUse(power)),
        ],
      });
    }
    const controls = h('div', { class: 'controls' },
      this.powerBtn,
      h('div', { class: 'begin', id: 'begin-box' }, this.beginBtn),
      this.speedSeg,
      h('div', { class: 'row' },
        soundToggle(atlas, 'up'),
        this.settingsBtn,
        h('button', { class: 'btn', id: 'help-btn', title: 'Help: the matrix, merging, the general and every hotkey', onclick: () => this.toggleHelp() }, 'Help', h('kbd', null, 'H')),
      ),
      this.powerTip.el,
    );
    this.root = h('div', { id: 'battle', class: 'rounds', style: 'display:contents' },
      this.top,
      this.mounts.callouts,
      this.field,
      h('footer', { class: 'bottom' }, controls, this.mounts.tray, this.mounts.inspect),
      this.draft.el,
    );
    window.addEventListener('resize', this.onResize);
    // the self-hosted fonts change the bands' heights when they swap in
    void document.fonts.ready.then(this.onResize);
    // the opening's news, such as round 1's intel, came before the view, so its first callout is said here
    const news = session.state.phase === 'planning' ? generalNews(content, session.state) : null;
    if (news) this.say('counter', news);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    soundSpeed(1);
    soundDim(false);
    this.unsubscribe();
    for (const b of this.bands) b.dispose();
    this.powerTip.dispose();
    if (this.settingsShown) closeSettings();
    this.help?.remove();
    this.report?.remove();
  }

  /** A notice pinned in the callout lane, such as a battle that restarted because its save couldn't be restored (§8.9). */
  notice(id: string, text: string): void {
    this.callouts.pin(id, h('div', { class: 'callout bad notice', id, role: 'status' }, text));
  }

  /** `I`: keyboard focus on the gold chip, whose tip opens; Tab then moves along the band (§10.2). */
  focusChips(): void { this.topBand.focusChips(); }

  /** A callout in the lane: a refused key, a sell's refund, news. */
  say(kind: RoundCalloutKind, text: string, tone: 'good' | 'bad' | '' = ''): void {
    this.callouts.push(kind, text, tone, performance.now());
  }

  /** True while the player's draft is open: it takes the number keys, and Begin waits on it (§8.3). */
  get drafting(): boolean { return this.draft.open; }

  /** A number key while the draft is open picks that card (§8.3). */
  draftKey(key: string): void {
    const id = this.draft.cardForKey(this.session.state, key);
    if (id) this.draftCommand({ type: 'draftPick', cardId: id });
  }

  /** A pick, reroll or skip, queued like any planning command, once nothing else of the draft's is waiting to run. */
  private draftCommand(body: Extract<CommandBody, { type: 'draftPick' | 'draftReroll' | 'draftSkip' }>): void {
    const s = this.session;
    if (s.state.phase !== 'planning' || !s.state.sides.player.draft || this.draftPending(s.state)) return;
    s.hold = false;
    s.issue(body);
  }

  private draftPending(state: BattleState): boolean {
    return state.queue.some((c) => c.side === 'player' && (c.type === 'draftPick' || c.type === 'draftReroll' || c.type === 'draftSkip'));
  }

  /** X, Delete or the inspector's sell button: the first press shows the refund, the second sells (§10.3). */
  sell(): void {
    const s = this.session;
    const name = this.content.buildings[s.state.buildings.find((b) => b.id === s.selected)?.buildingId ?? '']?.name;
    const r = s.sell();
    if (r && !r.sold) this.say('info', `Sell ${name ?? 'it'} for ${r.refund} gold? Press X again`);
  }

  /** `Q` or the power button: starts or stops aiming, or a callout says why it can't (§6.6, §10.3). */
  togglePower(): void {
    const s = this.session, def = s.power();
    if (!def) { this.say('refused', 'No commander power in this battle'); return; }
    if (s.state.phase === 'ended' || s.toggleTargeting()) return;
    this.say('refused', powerRefusal(def.name, s.aimProblem() ?? 'wrongPhase'));
  }

  /** A click while aiming: the power fires on the next tick, or a callout says why it can't fire there. */
  firePower(): void {
    const def = this.session.power();
    const why = this.session.firePower();
    if (def && why) this.say('refused', powerRefusal(def.name, why));
  }

  get helpOpen(): boolean { return this.help !== null; }

  /** H or the Help button: v1's Help, which holds a clash and the aftermath while it's open. */
  toggleHelp(): void {
    if (this.help) {
      this.help.remove();
      this.help = null;
      this.session.overlayOpen = this.settingsShown;
      return;
    }
    if (this.session.state.phase === 'ended') return;
    this.help = helpOverlay(this.content, this.session.state, () => this.toggleHelp());
    this.session.overlayOpen = true;
    document.body.append(this.help);
  }

  /** The settings cog: the settings screen, which holds a clash and the aftermath while it's open. */
  toggleSettings(): void {
    if (this.settingsShown) { closeSettings(); return; }
    if (settingsOpen() || this.session.state.phase === 'ended') return;
    this.settingsShown = true;
    this.session.overlayOpen = true;
    this.settingsBtn.setAttribute('aria-expanded', 'true');
    openSettings(this.content, this.atlas, settingsStore, soundPrefs, {
      paused: this.session.state.phase === 'clash',
      onClose: () => {
        this.settingsShown = false;
        this.session.overlayOpen = this.help !== null;
        this.settingsBtn.setAttribute('aria-expanded', 'false');
      },
    });
  }

  /**
   * Integer scaling when it wastes ≤30% of the area, else fractional (SPEC §10.1), in screen pixels, so
   * under UI scale the field still lands on whole screen pixels; 8 px of margin on each side, as v1's.
   */
  fit(): void {
    const r = this.field.getBoundingClientRect(), ui = uiScale();
    const availW = Math.max(100, r.width - 16 * ui), availH = Math.max(100, r.height - 16 * ui);
    const nw = this.renderer.width, nh = this.renderer.height;
    const frac = Math.min(availW / nw, availH / nh);
    const int = Math.floor(frac);
    this.scale = int >= 1 && (int * int) / (frac * frac) >= 0.7 ? int : frac;
    this.canvas.style.width = `${Math.round(nw * this.scale) / ui}px`;
    this.canvas.style.height = `${Math.round(nh * this.scale) / ui}px`;
    this.frameArt.el.style.top = `${(this.top.getBoundingClientRect().bottom - r.top) / ui}px`;
    this.frameArt.layout(this.canvas.getBoundingClientRect(), this.frameArt.el.getBoundingClientRect(), ui);
    for (const b of this.bands) b.fit?.();
  }

  /** A mouse event in world tiles. */
  tileAt(ev: MouseEvent): { x: number; y: number; col: number; row: number } {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * this.renderer.width;
    const py = ((ev.clientY - rect.top) / rect.height) * this.renderer.height;
    const x = px / TILE - STRIP, y = py / TILE;
    return { x, y, col: Math.floor(x), row: Math.floor(y) };
  }

  /**
   * Each step's feed: the field's effects, the colony's changes, the combat log, and the lane's news by §10.2's
   * priority: a counter the general brings into the round, a Twin Roots lane's end, and an Elder on either side.
   */
  onTick(state: BattleState, now: number): void {
    this.renderer.onTick(state, now);
    this.log.onTick(state);
    this.sound.onTick(state);
    for (const e of state.events) {
      if (e.t === 'buildingPlanted' || e.t === 'buildingSold' || e.t === 'mergeToggled' || e.t === 'roundStarted') this.colonyVersion++;
      if (e.t === 'generalPlanned') {
        const news = e.side === 'enemy' ? generalNews(this.content, state) : null;
        if (news) this.say('counter', news);
      } else if (e.t === 'laneWon') {
        const c = laneCallout(state, e);
        if (c) this.callouts.push('lane', c.text, c.tone, now);
      } else if (e.t === 'merged' && e.tier === 3) {
        const unit = this.content.units[e.unitId]?.name ?? e.unitId;
        this.say('elder', e.side === 'player' ? `Your ${unit}s knit an Elder` : `The Gray Rot's ${unit}s knit an Elder`, e.side === 'player' ? 'good' : '');
      } else if ((e.t === 'power' || e.t === 'commandRejected' || e.t === 'commandDropped') && e.side === 'player') {
        this.powerNews(state, e);
      }
    }
  }

  /** Your power going off, or refused when it ran, or dropped as its clash ended (§6.6, §14.5). */
  private powerNews(state: BattleState, e: Extract<SimEvent, { t: 'power' | 'commandRejected' | 'commandDropped' }>): void {
    const def = this.session.power();
    if (!def) return;
    if (e.t === 'power') { this.say('info', powerNews(def.name, e, def.kind), 'good'); return; }
    if (e.t === 'commandDropped') { this.say('refused', `${def.name}: the clash ended first`); return; }
    // a rejection names its command by seq, and only the power's are news here
    if (state.log.find((c) => c.side === 'player' && c.seq === e.seq)?.type === 'power') this.say('refused', powerRefusal(def.name, e.reason));
  }

  /** Draws a frame, and switches each phase's chrome on and off (T097). */
  frame(state: BattleState, alpha: number, now: number, debug: boolean): void {
    const s = this.session;
    const ghost = s.ghost();
    // aiming stops once it can't fire: the clash ended, or the use is queued
    if (s.targeting && s.aimProblem()) s.targeting = false;
    const preview = s.powerPreview();
    const def = s.power();
    const radius = s.powerRadius();
    const reticle = preview && def?.target === 'point' && s.aim ? { x: s.aim.x, y: s.aim.y, radius, valid: preview.valid } : null;
    this.renderer.draw(state, alpha, {
      ghost: ghost ? { buildingId: ghost.buildingId, plot: ghost.plot, legal: ghost.legal } : null,
      lit: s.lit(),
      selected: s.selected,
      debug,
      timeMs: now,
      hover: s.hover,
      placing: s.placing,
      colony: this.colonyVersion,
      aftermathMs: s.aftermathMs,
      power: def ? {
        reticle,
        marks: preview?.reach.map((u) => ({ x: u.x, y: u.y, r: state.compiled[u.side].units[u.unitId]!.tiers[u.tier - 1]!.radius })) ?? [],
        pending: def.target === 'point' ? state.queue.flatMap((c) => (c.side === 'player' && c.type === 'power' && c.x !== undefined && c.y !== undefined ? [{ x: c.x, y: c.y, radius }] : [])) : [],
      } : null,
    });
    toggleClass(this.canvas, 'aiming', s.targeting);
    if (reticle) this.canvas.dataset.reticle = `${reticle.x.toFixed(2)},${reticle.y.toFixed(2)},${reticle.radius}`;
    else delete this.canvas.dataset.reticle;
    this.updatePower(state, preview);
    this.ghostTip(state, ghost);
    const phase = state.phase;
    const clash = phase === 'clash', planning = phase === 'planning', aftermath = phase === 'aftermath';
    const held = s.overlayOpen || (clash && s.paused);
    this.frameArt.frame(state.sporestorm, now, held ? 0 : clash || aftermath ? s.speed : planning ? 1 : 0);
    // sound: the Heartcap hits land with the aftermath's drain, and the ambience dims while a clash is paused (§13.9)
    this.sound.frame(state, s.aftermathMs);
    soundSpeed(clash || aftermath ? s.speed : 1);
    soundDim(clash && s.paused);
    // planning: the draft first, then Begin, the hint, and the empty-lane warning while it stands
    this.draft.update(state, this.draftPending(state));
    this.beginBtn.hidden = !planning;
    this.beginBtn.disabled = state.queue.some((c) => c.type === 'beginClash') || !!state.sides.player.draft;
    setText(this.beginLabel, s.warned ? 'Begin anyway' : 'Begin');
    if (planning) {
      setText(this.hintText, planningHint(state));
      this.callouts.pin('planning-hint', this.hint);
    } else this.callouts.unpin('planning-hint');
    if (s.warned && planning) {
      const where = state.lanes.length > 1 ? ` lane ${s.warnedLanes.map((l) => l + 1).join(' and ')}` : ' this lane';
      setText(this.warningText, `The general takes${where} unopposed`);
      this.callouts.pin('empty-lane', this.warning);
    } else this.callouts.unpin('empty-lane');
    // a clash and the aftermath: the speed control in Begin's place, with pause only in a clash
    this.speedSeg.hidden = !clash && !aftermath;
    this.pauseBtn.hidden = !clash;
    this.speedBtns.forEach((b, i) => { toggleClass(b, 'on', s.speed === i + 1); b.setAttribute('aria-pressed', String(s.speed === i + 1)); });
    this.pauseBtn.setAttribute('aria-pressed', String(s.paused));
    if (clash && s.paused) this.callouts.pin('paused', this.pausedCallout);
    else this.callouts.unpin('paused');
    // the aftermath: the result banner once the bars have drained, as the tally takes the round's pip (§10.2)
    if (aftermath && this.hud.aftermath.drained(state, now) >= 1) {
      if (this.bannerFor !== state.round) {
        this.bannerFor = state.round;
        const b = resultBanner(this.content, state);
        setText(this.banner, b.text);
        this.banner.className = `callout banner-callout ${b.tone}`.trim();
      }
      this.callouts.pin('round-banner', this.banner);
    } else this.callouts.unpin('round-banner');
    this.callouts.update(now);
    for (const b of this.bands) b.update(state, now);
    if (phase === 'ended' && !this.report) this.openReport(state);
  }

  /** The power button's state and label, lit only in a clash, and while aiming the callout that says what a click does (§10.2). */
  private updatePower(state: BattleState, preview: ReturnType<RoundSession['powerPreview']>): void {
    const def = this.session.power(), btn = this.powerBtn;
    if (!def || !btn) return;
    const b = powerButton(state, this.session);
    setText(this.powerState, b.label);
    btn.dataset.state = b.state;
    btn.style.setProperty('--charge', b.state === 'idle' || b.state === 'used' ? '0' : '1');
    toggleClass(btn, 'on', b.state === 'aiming');
    btn.setAttribute('aria-pressed', String(b.state === 'aiming'));
    this.powerTip.refresh();
    if (this.session.targeting) {
      this.aimCallout.replaceChildren(uiIcon(this.atlas, 'i-power'), h('b', null, def.name), aimText(def, preview), h('kbd', null, 'Esc'));
      toggleClass(this.aimCallout, 'bad', !!preview && !preview.valid);
      this.callouts.pin('aim', this.aimCallout);
    } else this.callouts.unpin('aim');
  }

  /** The report by round, behind the spore wipe (§10.5); Help and the settings screen close first. */
  private openReport(state: BattleState): void {
    if (this.help) this.toggleHelp();
    if (this.settingsShown) closeSettings();
    this.session.placing = null;
    const a = this.actions;
    const run = a.runLines?.();
    const buttons = a.continueRun
      ? { continueRun: a.continueRun, ...(run ? { run } : {}) }
      : { ...(a.again ? { again: a.again } : {}), ...(a.rematch ? { rematch: a.rematch } : {}) };
    const report = roundsReport(this.content, state, buttons, this.atlas, a.playTime?.());
    this.report = report;
    sporeWipe(() => { if (this.report === report) document.body.append(report); });
  }

  /** The ghost's tip beside its plot: the card, its price and the plot's rank and file, or why it can't go there (§10.2). */
  private ghostTip(state: BattleState, ghost: ReturnType<RoundSession['ghost']>): void {
    if (!ghost) { this.tip.hidden = true; return; }
    const p = state.sides.player.plots[ghost.plot]!;
    const name = this.content.buildings[ghost.buildingId]?.name ?? ghost.buildingId;
    const where = `rank ${p.rank + 1}, file ${p.file}`;
    setText(this.tip, ghost.reason ? `${name}: ${ghost.reason}` : `${name} · ${ghost.price} gold · ${where}`);
    toggleClass(this.tip, 'bad', !!ghost.reason);
    const ui = uiScale();
    const k = this.scale / ui;
    this.tip.style.left = `${Math.round((p.col + STRIP + 2) * TILE * k + 6)}px`;
    this.tip.style.top = `${Math.round(p.row * TILE * k)}px`;
    this.tip.hidden = false;
  }
}
