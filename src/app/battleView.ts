// The battle screen (SPEC §10.2): the top band (both Heartcaps, the territory tug, stat chips and the
// General's Intent), the callout lane, the pixel-scaled battlefield inside its frame of roots and soil,
// and the bottom band (Begin in deploy, then speed and pause; Hold / Advance; sound, settings and help;
// the building tray; the inspect panel).
import type { Content } from '../data/registry.ts';
import { Renderer, TILE } from '../render/renderer.ts';
import type { Atlas } from '../render/atlas.ts';
import { FieldFrame } from '../render/frame.ts';
import { Callouts } from '../ui/callouts.ts';
import { h, setText, toggleClass } from '../ui/h.ts';
import { helpOverlay } from '../ui/help.ts';
import { uiIcon } from '../ui/icons.ts';
import { uiScale } from '../ui/scale.ts';
import { settingsControl } from '../ui/settingsControl.ts';
import type { SettingsControl } from '../ui/settingsControl.ts';
import { battleReport } from '../ui/report.ts';
import { activeText, generalName, intentOf, rememberText, warningText } from '../ui/doctrine.ts';
import { DraftOverlay } from '../ui/draftOverlay.ts';
import { TopBand } from '../ui/hud/top.ts';
import { Tray } from '../ui/hud/tray.ts';
import { trayOrder } from '../ui/buildingInfo.ts';
import { CombatLog, InspectPanel } from '../ui/inspect.ts';
import type { BattleState } from '../sim/index.ts';
import { BattleSound } from './battleSound.ts';
import type { Session } from './session.ts';
import { loadSettings, saveSettings } from './settings.ts';
import { sfx, soundDim, soundSpeed, soundToggle } from './sound.ts';

/** The ghost tip's gap from the footprint, and its margin inside the field (layout px). */
const TIP_GAP = 14;
const TIP_MARGIN = 4;
/** Battle 1's economy tip (playtest 2026-10-28): when it fires, and how long the economy cards pulse. */
const NUDGE_AT_SECONDS = 30;
const NUDGE_PULSE_MS = 12000;

export interface ViewActions {
  begin(): void;
  again(): void;
  rematch(): void;
  /** In a run, the report offers only Continue (back to the run). */
  continueRun?: () => void;
}

export class BattleView {
  readonly root: HTMLElement;
  readonly renderer: Renderer;
  readonly canvas: HTMLCanvasElement;
  /** The roots ceiling, soil bed and ambient spores around the field. */
  readonly frameArt: FieldFrame;
  readonly callouts = new Callouts();
  readonly log = new CombatLog();
  readonly inspect: InspectPanel;
  readonly draft: DraftOverlay;
  private sound: BattleSound;
  private top: TopBand;
  private tray: Tray;
  private trayKit = '';
  private onResize = () => this.fit();
  private report: HTMLElement | null = null;
  private fieldWrap: HTMLElement;
  private field: HTMLElement;
  private tip = h('div', { class: 'ghost-tip', id: 'ghost-tip', hidden: true });
  /** Pinned in the callout lane: the deploy hint and "Paused". */
  private deployCallout: HTMLElement;
  private pausedCallout: HTMLElement;
  /** One gold icon, moved into each frame's ghost tip. */
  private tipGold: HTMLCanvasElement;
  private beginBox: HTMLElement;
  private speedSeg: HTMLElement;
  private speedBtns: HTMLButtonElement[] = [];
  private stanceRows: { hold: HTMLButtonElement; advance: HTMLButtonElement; status: HTMLElement }[] = [];
  private pauseBtn: HTMLButtonElement;
  private settings: SettingsControl;
  private help: HTMLElement | null = null;
  private pausedBeforeHelp = false;
  private ended = false;
  private nudged = false;
  private nudgeUntil = 0;
  scale = 1;

  /** @param still ambient motion holds still (`?test=1`), so screenshots and browser tests are stable */
  constructor(private session: Session, content: Content, private atlas: Atlas, private actions: ViewActions, debug: boolean, still = false) {
    const state = session.state;
    this.canvas = h('canvas', { id: 'battlefield', 'aria-label': 'Battlefield' });
    this.renderer = new Renderer(this.canvas, content, atlas, state);
    this.frameArt = new FieldFrame(content, atlas, this.renderer.width, this.renderer.height, still);
    this.sound = new BattleSound(state, content.audio.enemyGain, sfx);
    this.top = new TopBand(content, atlas, state);
    this.tray = new Tray(content, atlas, state, (id) => this.pick(id));
    this.trayKit = state.sides.player.kit.join();
    this.draft = new DraftOverlay(content, atlas, {
      pick: (cardId) => session.issue({ type: 'draftPick', cardId }),
      reroll: () => session.issue({ type: 'draftReroll' }),
      skip: () => session.issue({ type: 'draftSkip' }),
    });
    this.inspect = new InspectPanel(content, this.log, (id) => session.issue({ type: 'sell', entityId: id }),
      (id) => session.toggleMerge(id), (_state, id) => session.mergeShown(id));
    this.tipGold = uiIcon(atlas, 'i-gold');
    this.fieldWrap = h('div', { class: 'fieldwrap' }, this.canvas, this.tip);
    this.field = h('main', { class: 'field' }, this.frameArt.el, this.fieldWrap);
    this.deployCallout = h('div', { class: 'callout deploy', id: 'deploy-hint' },
      `Deploy phase: place your opener with ${state.sides.player.gold} gold, then press Begin`, h('kbd', null, 'Enter'));
    this.pausedCallout = h('div', { class: 'callout paused', id: 'paused-callout' }, uiIcon(atlas, 'i-pause'), 'Paused', h('kbd', null, 'Space'));
    // deploy: Begin is the one primary button; once the battle is live, speed and pause take its place
    this.beginBox = h('div', { class: 'begin', id: 'begin-box' },
      h('button', { class: 'btn primary', id: 'begin-btn', title: 'Start the battle (Enter)', onclick: () => actions.begin() }, 'Begin', h('kbd', null, 'Enter')),
    );
    for (const s of [1, 2, 3]) {
      this.speedBtns.push(h('button', { class: 'btn', 'data-speed': s, title: `Speed ${s}× ([ and ] change it)`, 'aria-pressed': 'false', onclick: () => { session.speed = s; } }, `${s}×`));
    }
    this.pauseBtn = h('button', {
      class: 'btn has-ico', id: 'pause-btn', title: 'Pause (Space)', 'aria-label': 'Pause', 'aria-pressed': 'false', onclick: () => { session.paused = !session.paused; },
    }, uiIcon(atlas, 'i-pause'));
    this.speedSeg = h('div', { class: 'seg speed', role: 'group', 'aria-label': 'Speed and pause' }, ...this.speedBtns, this.pauseBtn);
    this.renderer.damageNumbers = loadSettings().damageNumbers;
    this.settings = settingsControl(atlas, (v) => {
      this.renderer.damageNumbers = v;
      saveSettings({ damageNumbers: v });
    });
    // E1: a Hold / Advance switch per lane, with what the lane is doing (and any timer) beside it
    const lanes = state.lanes.length;
    const stance = state.rules.stance ? h('div', { class: 'stance', id: 'stance' },
      ...state.lanes.map((_, i) => {
        const which = lanes > 1 ? `lane ${i + 1}` : 'the lane';
        const hold = h('button', { class: 'btn has-ico', 'data-stance': 'hold', 'data-lane': i, 'aria-pressed': 'false', title: `Hold ${which}: units gather at the rally line (F: every lane)`, 'aria-label': `Hold ${which}`, onclick: () => { if (!session.stanceShown(i)) session.toggleStance(i); } }, uiIcon(atlas, 'i-hold'));
        const advance = h('button', { class: 'btn has-ico', 'data-stance': 'advance', 'data-lane': i, 'aria-pressed': 'true', title: `Advance ${which} (F: every lane)`, 'aria-label': `Advance ${which}`, onclick: () => { if (session.stanceShown(i)) session.toggleStance(i); } }, uiIcon(atlas, 'i-advance'));
        const status = h('span', { class: 'status' });
        this.stanceRows.push({ hold, advance, status });
        return h('div', { class: 'stance-row' },
          lanes > 1 ? h('span', { class: 'lane', title: `Lane ${i + 1}` }, String(i + 1)) : null,
          h('div', { class: 'seg', role: 'group', 'aria-label': `Stance, ${which}` }, hold, advance), status);
      }),
    ) : null;
    const controls = h('div', { class: 'controls' },
      this.beginBox,
      this.speedSeg,
      stance,
      h('div', { class: 'row' },
        soundToggle(atlas, 'up'),
        this.settings.el,
        h('button', { class: 'btn', id: 'help-btn', title: 'Help: the matrix, merging, the general and every hotkey', onclick: () => this.toggleHelp() }, 'Help', h('kbd', null, 'H')),
      ),
      debug ? h('div', { class: 'hint' }, 'F3 debug overlay') : null,
    );
    this.root = h('div', { id: 'battle', style: 'display:contents' },
      this.top.el,
      this.callouts.el,
      this.field,
      h('footer', { class: 'bottom' }, controls, this.tray.el, this.inspect.el),
      this.draft.el,
    );
    window.addEventListener('resize', this.onResize);
    // the self-hosted fonts change the bands' heights when they swap in
    void document.fonts.ready.then(this.onResize);
  }

  /** Removes window listeners and overlays this view added (a run plays several battles). */
  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    soundSpeed(1);
    soundDim(false);
    this.help?.remove();
    this.report?.remove();
  }

  /** Opens or closes the help overlay; the battle pauses while it is open. */
  toggleHelp(): void {
    if (this.help) {
      this.help.remove();
      this.help = null;
      this.session.paused = this.pausedBeforeHelp;
      return;
    }
    this.pausedBeforeHelp = this.session.paused;
    this.session.paused = true;
    this.help = helpOverlay(this.session.content, this.session.state, () => this.toggleHelp());
    document.body.append(this.help);
  }

  get helpOpen(): boolean { return this.help !== null; }

  /** A notice pinned in the callout lane while the battle is in deploy (e.g. a save that couldn't be restored). */
  notice(id: string, text: string): void {
    this.callouts.pin(id, h('div', { class: 'callout bad notice', id, role: 'status' }, text));
  }

  pick(id: string): void {
    if (this.session.state.phase === 'ended') return;
    this.session.placing = this.session.placing === id ? null : id;
    this.session.selected = null;
  }

  /**
   * Integer scaling when it wastes ≤30% of the area, else fractional (SPEC §10.1). The scale is in
   * screen pixels, so under UI scale (src/ui/scale.ts) the field still lands on whole screen pixels.
   * Nothing sits on the field's edges any more (Heartcap HP lives in the top band), so it keeps 8 px
   * of margin on each side.
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
    // the frame fills everything between the bands: from the top band down, past the callout lane
    this.frameArt.el.style.top = `${(this.top.el.getBoundingClientRect().bottom - r.top) / ui}px`;
    this.frameArt.layout(this.canvas.getBoundingClientRect(), this.frameArt.el.getBoundingClientRect(), ui);
    this.tray.fit();
  }

  /** Converts a mouse event to world tile coordinates. */
  tileAt(ev: MouseEvent): { x: number; y: number; col: number; row: number } {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * this.renderer.width;
    const py = ((ev.clientY - rect.top) / rect.height) * this.renderer.height;
    const x = px / TILE - 2, y = py / TILE;
    return { x, y, col: Math.floor(x), row: Math.floor(y) };
  }

  /** Per-tick feed: effects, sounds, callouts, combat log. */
  onTick(state: BattleState, now: number): void {
    this.renderer.onTick(state, now);
    this.sound.onTick(state);
    this.log.onTick(state);
    this.economyNudge(state, now);
    for (const e of state.events) {
      if (e.t === 'income' && e.side === 'player') {
        this.top.bump();
      } else if (e.t === 'columnFlipped') {
        this.callouts.push('column', e.to === 'player' ? `Column ${e.column} claimed` : `Column ${e.column} lost`, e.to === 'player' ? 'good' : 'bad', now);
      } else if (e.t === 'buildingDestroyed') {
        const name = this.session.content.buildings[e.buildingId]?.name ?? e.buildingId;
        this.callouts.push('buildingLost', e.side === 'player' ? `${name} lost` : `Enemy ${name} destroyed`, e.side === 'player' ? 'bad' : 'good', now);
      } else if (e.t === 'hit' && e.target === -1) {
        this.callouts.push('heartcap', 'Your Heartcap is under attack!', 'bad', now);
      } else if (e.t === 'sporestorm') {
        this.callouts.push('info', `The Sporestorm thickens (${e.stacks})`, '', now);
      } else if (e.t === 'begin') {
        this.callouts.push('info', 'The battle begins', '', now);
        const opening = intentOf(state).opening;
        if (opening.length) this.callouts.push('counter', rememberText(opening), 'bad', now);
      } else if (e.t === 'counterWarned' && e.side === 'enemy') {
        const waves = Math.max(1, Math.ceil((e.activatesAtTick - state.tick) / state.rules.waveTicks));
        this.callouts.push('counter', warningText(generalName(this.session.content, state), e.kind, waves), 'bad', now);
      } else if (e.t === 'counterActive' && e.side === 'enemy') {
        this.callouts.push('counter', activeText(generalName(this.session.content, state), e.kind), 'bad', now);
      } else if (e.t === 'stance' && (e.side === 'enemy' || e.auto) && !e.hold) {
        const lane = state.lanes.length > 1 ? ` in lane ${e.lane + 1}` : '';
        this.callouts.push('info', e.side === 'player' ? `Hold time is up: advancing${lane}` : `The Gray Rot advances${lane}`, e.side === 'player' ? '' : 'bad', now);
      } else if (e.t === 'merged' && (e.side === 'player' || e.tier === 3)) {
        const name = this.session.content.units[e.unitId]?.name ?? e.unitId;
        const tier = e.tier === 3 ? 'Elder' : 'Bloomed';
        this.callouts.push('merge', e.side === 'player' ? `${tier} ${name}!` : `Enemy ${tier} ${name}`, e.side === 'player' ? 'good' : 'bad', now);
      }
    }
  }

  /** Does the player have, or are they placing, an economy building? */
  private hasEconomy(state: BattleState): boolean {
    const s = this.session;
    const eco = (id: string | null | undefined) => !!id && s.content.buildings[id]?.kind === 'economy';
    return eco(s.placing) || state.buildings.some((b) => b.side === 'player' && eco(b.buildingId))
      || s.pending().some((c) => c.type === 'place' && eco(c.buildingId));
  }

  /** Battle 1 only, once: a tip and a pulse on the economy cards if none is built 30 s in. */
  private economyNudge(state: BattleState, now: number): void {
    if (this.nudged || state.phase !== 'live' || state.tick < NUDGE_AT_SECONDS * state.rules.tickRate) return;
    this.nudged = true;
    if (state.config.battleIndex !== 1 || this.hasEconomy(state)) return;
    const content = this.session.content;
    const order = trayOrder(content, state.sides.player.kit);
    const i = order.findIndex((id) => content.buildings[id]!.kind === 'economy');
    if (i < 0) return;
    const b = content.buildings[order[i]!]!;
    const key = i < 9 ? ` [${i + 1}]` : '';
    this.callouts.push('tip', `Tip: a ${b.name}${key} earns gold every ${content.balance.incomeTickSeconds} s all battle. Build one early!`, '', now);
    this.nudgeUntil = now + NUDGE_PULSE_MS;
  }

  frame(state: BattleState, alpha: number, now: number, debugOverlay: boolean): void {
    const s = this.session;
    const ghost = s.ghost();
    this.renderer.draw(state, alpha, {
      ghost: ghost ? { buildingId: ghost.buildingId, col: ghost.col, row: ghost.row, legal: ghost.legal } : null,
      selected: s.selected,
      pending: s.pending(),
      placeable: s.legalTiles(),
      debug: debugOverlay,
      timeMs: now,
    });
    // spores drift at the game's speed, and stop while it is paused, held for a draft or over
    const running = state.phase === 'deploy' || (state.phase === 'live' && !s.paused && !state.held);
    this.frameArt.frame(state.sporestorm, now, running ? (state.phase === 'live' ? s.speed : 1) : 0);
    this.top.update(state);
    const kit = state.sides.player.kit.join();
    if (kit !== this.trayKit) {
      // a drafted blueprint joins the tray
      const next = new Tray(s.content, this.atlas, state, (id) => this.pick(id));
      this.tray.el.replaceWith(next.el);
      this.tray = next;
      this.trayKit = kit;
      next.fit();
    }
    if (this.nudgeUntil > now && this.hasEconomy(state)) this.nudgeUntil = 0;
    this.tray.update(state, s.available(), s.placing, this.nudgeUntil > now);
    this.draft.update(state, s.pending().some((c) => c.type === 'draftPick' || c.type === 'draftReroll' || c.type === 'draftSkip'));
    this.inspect.update(state, s.selected);
    this.callouts.update(now);
    this.speedBtns.forEach((b, i) => this.lit(b, s.speed === i + 1));
    this.stanceRows.forEach((row, i) => {
      const st = state.sides.player.stance![i]!;
      const held = s.stanceShown(i);
      const secs = (ticks: number) => `${Math.max(0, Math.ceil(ticks / state.rules.tickRate))} s`;
      const text = held
        ? st.hold ? `Hold · ${secs(state.rules.stance!.maxHoldTicks - (state.tick - st.since))}` : 'Holding'
        : s.canHold(i) ? 'Advancing' : `Hold in ${secs(st.readyAt - state.tick)}`;
      this.lit(row.hold, held);
      this.lit(row.advance, !held);
      // a hold on cooldown is unlit (src/app/session.ts refuses it); advancing back is always open
      row.hold.disabled = !held && !s.canHold(i);
      setText(row.status, text);
    });
    this.settings.sync(this.renderer.damageNumbers);
    this.lit(this.pauseBtn, s.paused);
    soundSpeed(s.speed);
    soundDim(s.paused && state.phase === 'live');
    if (s.paused && state.phase === 'live') this.callouts.pin('paused', this.pausedCallout);
    else this.callouts.unpin('paused');
    const deploy = state.phase === 'deploy';
    if (deploy) this.callouts.pin('deploy', this.deployCallout);
    else { this.callouts.unpin('deploy'); this.callouts.unpin('save-recovery'); }
    this.beginBox.hidden = !deploy;
    this.speedSeg.hidden = deploy;
    if (ghost && s.hover) {
      this.tip.hidden = false;
      const name = s.content.buildings[ghost.buildingId]!.name;
      const surcharge = ghost.depth > 0 ? ` (+${Math.round(ghost.depth * s.content.balance.supplyLinePerColumn * 100)}% depth ${ghost.depth})` : ' (home)';
      const def = s.content.buildings[ghost.buildingId]!;
      const loam = def.economy && ghost.loam ? ` · Rich Loam +${Math.round(s.content.balance.loamBonus * 100)}%` : '';
      this.tip.replaceChildren(
        h('div', null, `${name} · `, h('b', { class: 'gold' }, this.tipGold, String(ghost.price)), h('span', { class: 'muted' }, surcharge + loam)),
        ghost.legal ? h('div', { class: 'good' }, 'Click to place' + (s.shift ? ' (Shift: keep placing)' : '')) : h('div', { class: 'bad' }, ghost.reason ?? 'illegal'),
      );
      this.placeTip(ghost.col, ghost.row, s.state.compiled.player.buildings[ghost.buildingId]!);
    } else {
      this.tip.hidden = true;
    }
    if (state.phase === 'ended' && !this.ended) {
      this.ended = true;
      s.placing = null;
      if (this.help) this.toggleHelp();
      this.report = battleReport(s.content, state, { again: this.actions.again, rematch: this.actions.rematch, ...(this.actions.continueRun ? { continueRun: this.actions.continueRun } : {}) });
      document.body.append(this.report);
    }
  }

  /** Sets a toggle's lit state and its aria-pressed. */
  private lit(b: HTMLButtonElement, on: boolean): void {
    if (b.classList.contains('on') === on) return;
    toggleClass(b, 'on', on);
    b.setAttribute('aria-pressed', String(on));
  }

  /**
   * Puts the ghost tip beside the footprint, inside the field, so it never covers the ghost, the
   * bands or the callout lane: to the right, or to the left when the right has no room, vertically
   * centred on the footprint and clamped to the field.
   */
  private placeTip(col: number, row: number, def: { w: number; h: number }): void {
    const rect = this.canvas.getBoundingClientRect();
    const wrap = this.fieldWrap.getBoundingClientRect();
    // screen pixels back to layout pixels under UI scale
    const ui = uiScale();
    const px = rect.width / this.renderer.width / ui;
    const fieldL = (rect.left - wrap.left) / ui, fieldT = (rect.top - wrap.top) / ui;
    const fieldR = fieldL + rect.width / ui, fieldB = fieldT + rect.height / ui;
    const left = fieldL + (col + 2) * TILE * px, right = left + def.w * TILE * px;
    const top = fieldT + row * TILE * px, bottom = top + def.h * TILE * px;
    const w = this.tip.offsetWidth, hgt = this.tip.offsetHeight;
    const x = right + TIP_GAP + w <= fieldR - TIP_MARGIN ? right + TIP_GAP : Math.max(fieldL + TIP_MARGIN, left - TIP_GAP - w);
    const y = Math.min(Math.max(fieldT + TIP_MARGIN, (top + bottom - hgt) / 2), fieldB - TIP_MARGIN - hgt);
    this.tip.style.left = `${x}px`;
    this.tip.style.top = `${y}px`;
  }
}
