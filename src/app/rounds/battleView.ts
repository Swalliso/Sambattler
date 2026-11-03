// The battle screen for a battle in rounds (SPEC §10.2), as S11 leaves it: the layout of v1's screen with the
// field drawn by `src/render/rounds/renderer.ts` inside its frame of roots and soil, Begin in planning, then
// speed and pause, and the callout lane. The bands and panels are empty mounts, each filled by a later UI task
// with one line, so S12, S13 and S14 each end green and S12 and S13 don't collide: the top band, the tally and
// the Intent panel (S13), the tray and inspect (S14). The callout lane holds v1's `Callouts` until S14's own
// (T095). It stands beside v1's `src/app/battleView.ts`.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import { FieldFrame } from '../../render/frame.ts';
import { RoundRenderer, STRIP, TILE } from '../../render/rounds/renderer.ts';
import type { BattleState } from '../../sim/rounds/index.ts';
import { Callouts } from '../../ui/callouts.ts';
import type { CalloutKind } from '../../ui/callouts.ts';
import { h, setText, toggleClass } from '../../ui/h.ts';
import { uiIcon } from '../../ui/icons.ts';
import { uiScale } from '../../ui/scale.ts';
import { hudContext, TopBand } from '../../ui/rounds/hud/top.ts';
import type { HudPart } from '../../ui/rounds/hud/top.ts';
import { loadSettings, onSettings } from '../settings.ts';
import type { RoundSession } from './session.ts';

/** The empty mounts later UI tasks fill (T077): S13's T088, T089 and T091, S14's T093 and T094. */
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
}

export class RoundsView {
  readonly root: HTMLElement;
  readonly renderer: RoundRenderer;
  readonly canvas: HTMLCanvasElement;
  /** The roots ceiling, soil bed and ambient spores around the field. */
  readonly frameArt: FieldFrame;
  readonly callouts = new Callouts();
  readonly mounts: RoundMounts;
  /**
   * Counts colony changes: a planted, sold or toggled building, and each round's opening, when the general
   * plans. The formation preview (T083) recomputes only when it moves (§13.5, §13.6).
   */
  colonyVersion = 0;
  /** The bands and panels in their mounts, each drawn every frame (S13: the top band, the tally, the Intent panel). */
  private bands: HudPart[] = [];
  private topBand: TopBand;
  private top: HTMLElement;
  private field: HTMLElement;
  private tip = h('div', { class: 'ghost-tip', id: 'ghost-tip', hidden: true });
  private beginBtn: HTMLButtonElement;
  private beginLabel = h('span', null, 'Begin');
  private speedSeg: HTMLElement;
  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn: HTMLButtonElement;
  private pausedCallout: HTMLElement;
  /** The empty-lane warning, pinned while it stands (§10.2). */
  private warningText = h('span');
  private warning = h('div', { class: 'callout bad', id: 'empty-lane-warning', role: 'status' }, this.warningText, h('kbd', null, 'Esc'));
  private onResize = () => this.fit();
  private unsubscribe: () => void;
  scale = 1;

  /** @param still ambient motion holds still (`?test=1`), so captures and browser tests are stable */
  constructor(private session: RoundSession, content: Content, atlas: Atlas, actions: RoundViewActions, still = false) {
    const state = session.state;
    this.canvas = h('canvas', { id: 'battlefield', 'aria-label': 'Battlefield' });
    this.renderer = new RoundRenderer(this.canvas, content, atlas, state);
    this.renderer.still = still;
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
    const hud = hudContext(content, atlas, () => session.speed, still);
    this.topBand = new TopBand(this.mounts.top, hud, state);
    this.bands.push(this.topBand);
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
    this.speedSeg = h('div', { class: 'seg speed', role: 'group', 'aria-label': 'Speed and pause' }, ...this.speedBtns, this.pauseBtn);
    this.pausedCallout = h('div', { class: 'callout paused', id: 'paused-callout' }, uiIcon(atlas, 'i-pause'), 'Paused', h('kbd', null, 'Space'));
    const controls = h('div', { class: 'controls' }, h('div', { class: 'begin', id: 'begin-box' }, this.beginBtn), this.speedSeg);
    this.root = h('div', { id: 'battle', class: 'rounds', style: 'display:contents' },
      this.top,
      this.mounts.callouts,
      this.field,
      h('footer', { class: 'bottom' }, controls, this.mounts.tray, this.mounts.inspect),
    );
    window.addEventListener('resize', this.onResize);
    // the self-hosted fonts change the bands' heights when they swap in
    void document.fonts.ready.then(this.onResize);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.unsubscribe();
    for (const b of this.bands) b.dispose();
  }

  /** `I`: keyboard focus on the gold chip, whose tip opens; Tab then moves along the band (§10.2). */
  focusChips(): void { this.topBand.focusChips(); }

  /** A callout in the lane: a refused key, a sell's refund, news. */
  say(kind: CalloutKind, text: string, tone: 'good' | 'bad' | '' = ''): void {
    this.callouts.push(kind, text, tone, performance.now());
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

  /** Each step's feed: the field's effects, and the colony's changes. */
  onTick(state: BattleState, now: number): void {
    this.renderer.onTick(state, now);
    if (state.events.some((e) => e.t === 'buildingPlanted' || e.t === 'buildingSold' || e.t === 'mergeToggled' || e.t === 'roundStarted')) this.colonyVersion++;
  }

  /** Draws a frame, and lights the controls for the phase. */
  frame(state: BattleState, alpha: number, now: number, debug: boolean): void {
    const s = this.session;
    const ghost = s.ghost();
    this.renderer.draw(state, alpha, {
      ghost: ghost ? { buildingId: ghost.buildingId, plot: ghost.plot, legal: ghost.legal } : null,
      lit: s.lit(),
      selected: s.selected,
      debug,
      timeMs: now,
    });
    this.ghostTip(state, ghost);
    const clash = state.phase === 'clash', planning = state.phase === 'planning';
    this.frameArt.frame(state.sporestorm, now, clash && s.paused ? 0 : clash || state.phase === 'aftermath' ? s.speed : planning ? 1 : 0);
    this.beginBtn.hidden = !planning;
    this.beginBtn.disabled = state.queue.some((c) => c.type === 'beginClash');
    setText(this.beginLabel, s.warned ? 'Begin anyway' : 'Begin');
    this.speedSeg.hidden = planning || state.phase === 'ended';
    this.pauseBtn.hidden = !clash;
    this.speedBtns.forEach((b, i) => { toggleClass(b, 'on', s.speed === i + 1); b.setAttribute('aria-pressed', String(s.speed === i + 1)); });
    this.pauseBtn.setAttribute('aria-pressed', String(s.paused));
    if (s.warned && planning) {
      const where = state.lanes.length > 1 ? ` lane ${s.warnedLanes.map((l) => l + 1).join(' and ')}` : ' this lane';
      setText(this.warningText, `The general takes${where} unopposed`);
      this.callouts.pin('empty-lane', this.warning);
    } else this.callouts.unpin('empty-lane');
    if (clash && s.paused) this.callouts.pin('paused', this.pausedCallout);
    else this.callouts.unpin('paused');
    this.callouts.update(now);
    for (const b of this.bands) b.update(state, now);
  }

  /** The ghost's tip beside its plot: the card, its price and the plot's rank and file, or why it can't go there (§10.2). */
  private ghostTip(state: BattleState, ghost: ReturnType<RoundSession['ghost']>): void {
    if (!ghost) { this.tip.hidden = true; return; }
    const p = state.sides.player.plots[ghost.plot]!;
    const name = this.session.content.buildings[ghost.buildingId]?.name ?? ghost.buildingId;
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
