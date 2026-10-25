// The battle screen (SPEC §10.2): top band, callout lane, the pixel-scaled battlefield with Heartcap
// HP pinned at each end, and the bottom band (speed/pause, building tray, inspect panel).
import type { Content } from '../data/registry.ts';
import { Renderer, TILE } from '../render/renderer.ts';
import type { Atlas } from '../render/atlas.ts';
import { Callouts } from '../ui/callouts.ts';
import { endScreen } from '../ui/endScreen.ts';
import { h, setText, toggleClass } from '../ui/h.ts';
import { TopBand } from '../ui/hud/top.ts';
import { Tray } from '../ui/hud/tray.ts';
import { CombatLog, InspectPanel } from '../ui/inspect.ts';
import type { BattleState } from '../sim/index.ts';
import type { Session } from './session.ts';

export interface ViewActions {
  begin(): void;
  again(): void;
  rematch(): void;
}

export class BattleView {
  readonly root: HTMLElement;
  readonly renderer: Renderer;
  readonly canvas: HTMLCanvasElement;
  readonly callouts = new Callouts();
  readonly log = new CombatLog();
  readonly inspect: InspectPanel;
  private top: TopBand;
  private tray: Tray;
  private fieldWrap: HTMLElement;
  private field: HTMLElement;
  private hpP = h('div', { class: 'hp player', id: 'hud-hp-player' });
  private hpE = h('div', { class: 'hp enemy', id: 'hud-hp-enemy' });
  private tip = h('div', { class: 'ghost-tip', id: 'ghost-tip', hidden: true });
  private pauseBadge = h('div', { class: 'pausebadge', hidden: true }, '❚❚ PAUSED');
  private beginBox: HTMLElement;
  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn: HTMLButtonElement;
  private ended = false;
  scale = 1;

  constructor(private session: Session, content: Content, atlas: Atlas, private actions: ViewActions, debug: boolean) {
    const state = session.state;
    this.canvas = h('canvas', { id: 'battlefield', 'aria-label': 'Battlefield' });
    this.renderer = new Renderer(this.canvas, content, atlas, state);
    this.top = new TopBand(content, atlas, state);
    this.tray = new Tray(content, atlas, state, (id) => this.pick(id));
    this.inspect = new InspectPanel(content, this.log, (id) => session.issue({ type: 'sell', entityId: id }));
    this.fieldWrap = h('div', { class: 'fieldwrap' }, this.canvas, this.hpP, this.hpE, this.tip, this.pauseBadge);
    this.beginBox = h('div', { class: 'begin', id: 'begin-box' },
      h('button', { class: 'btn', id: 'begin-btn', onclick: () => actions.begin() }, 'Begin'),
      h('div', { class: 'hint' }, `Deploy phase: place your opener with ${state.sides.player.gold} gold, then press Begin (Enter).`),
    );
    this.field = h('main', { class: 'field' }, this.fieldWrap, this.beginBox);
    for (const s of [1, 2, 3]) {
      this.speedBtns.push(h('button', { class: 'btn', 'data-speed': s, onclick: () => { session.speed = s; } }, `${s}×`));
    }
    this.pauseBtn = h('button', { class: 'btn', id: 'pause-btn', onclick: () => { session.paused = !session.paused; } }, '❚❚');
    const controls = h('div', { class: 'controls' },
      h('div', { class: 'speed' }, ...this.speedBtns, this.pauseBtn),
      h('div', { class: 'hint' }, 'Space pause · [ ] speed'),
      h('div', { class: 'hint' }, 'Right-click / Esc cancel'),
      debug ? h('div', { class: 'hint' }, 'F3 debug overlay') : null,
    );
    this.root = h('div', { id: 'battle', style: 'display:contents' },
      this.top.el,
      this.callouts.el,
      this.field,
      h('footer', { class: 'bottom' }, controls, this.tray.el, this.inspect.el),
    );
    window.addEventListener('resize', () => this.fit());
  }

  pick(id: string): void {
    if (this.session.state.phase === 'ended') return;
    this.session.placing = this.session.placing === id ? null : id;
    this.session.selected = null;
  }

  /** Integer scaling when it wastes ≤30% of the area, else fractional (SPEC §10.1). */
  fit(): void {
    const r = this.field.getBoundingClientRect();
    const availW = Math.max(100, r.width - 16), availH = Math.max(100, r.height - 40);
    const nw = this.renderer.width, nh = this.renderer.height;
    const frac = Math.min(availW / nw, availH / nh);
    const int = Math.floor(frac);
    this.scale = int >= 1 && (int * int) / (frac * frac) >= 0.7 ? int : frac;
    this.canvas.style.width = `${Math.round(nw * this.scale)}px`;
    this.canvas.style.height = `${Math.round(nh * this.scale)}px`;
  }

  /** Converts a mouse event to world tile coordinates. */
  tileAt(ev: MouseEvent): { x: number; y: number; col: number; row: number } {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * this.renderer.width;
    const py = ((ev.clientY - rect.top) / rect.height) * this.renderer.height;
    const x = px / TILE - 2, y = py / TILE;
    return { x, y, col: Math.floor(x), row: Math.floor(y) };
  }

  /** Per-tick feed: effects, callouts, combat log. */
  onTick(state: BattleState, now: number): void {
    this.renderer.onTick(state, now);
    this.log.onTick(state);
    for (const e of state.events) {
      if (e.t === 'columnFlipped') {
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
      }
    }
  }

  frame(state: BattleState, alpha: number, now: number, debugOverlay: boolean): void {
    const s = this.session;
    const ghost = s.ghost();
    this.renderer.draw(state, alpha, {
      ghost: ghost ? { buildingId: ghost.buildingId, col: ghost.col, row: ghost.row, legal: ghost.legal } : null,
      selected: s.selected,
      pending: s.pending(),
      debug: debugOverlay,
      timeMs: now,
    });
    this.top.update(state);
    this.tray.update(s.available(), s.placing);
    this.inspect.update(state, s.selected);
    this.callouts.update(now);
    setText(this.hpP, `♥ ${state.sides.player.heartcapHp}/${state.sides.player.heartcapMaxHp}`);
    setText(this.hpE, `♥ ${state.sides.enemy.heartcapHp}/${state.sides.enemy.heartcapMaxHp}`);
    this.speedBtns.forEach((b, i) => toggleClass(b, 'on', s.speed === i + 1));
    toggleClass(this.pauseBtn, 'on', s.paused);
    this.pauseBadge.hidden = !(s.paused && state.phase === 'live');
    this.beginBox.hidden = state.phase !== 'deploy';
    if (ghost && s.hover) {
      this.tip.hidden = false;
      const name = s.content.buildings[ghost.buildingId]!.name;
      const surcharge = ghost.depth > 0 ? ` (+${Math.round(ghost.depth * s.content.balance.supplyLinePerColumn * 100)}% depth ${ghost.depth})` : ' (home)';
      const def = s.content.buildings[ghost.buildingId]!;
      const loam = def.economy && ghost.loam ? ` · Rich Loam +${Math.round(s.content.balance.loamBonus * 100)}%` : '';
      this.tip.replaceChildren(
        h('div', null, `${name} · `, h('b', null, `◆ ${ghost.price}`), h('span', { class: 'muted' }, surcharge + loam)),
        ghost.legal ? h('div', { class: 'good' }, 'Click to place' + (s.shift ? ' (Shift: keep placing)' : '')) : h('div', { class: 'bad' }, ghost.reason ?? 'illegal'),
      );
      const rect = this.canvas.getBoundingClientRect();
      const wrap = this.fieldWrap.getBoundingClientRect();
      const cx = ((ghost.col + 2 + 1) * TILE * rect.width) / this.renderer.width;
      const cy = (ghost.row * TILE * rect.height) / this.renderer.height;
      this.tip.style.left = `${rect.left - wrap.left + cx}px`;
      this.tip.style.top = `${rect.top - wrap.top + cy}px`;
    } else {
      this.tip.hidden = true;
    }
    if (state.phase === 'ended' && !this.ended) {
      this.ended = true;
      s.placing = null;
      document.body.append(endScreen(state, { again: this.actions.again, rematch: this.actions.rematch }));
    }
  }
}
