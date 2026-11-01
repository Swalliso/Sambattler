// Building tray (SPEC §10.2): cards grouped by role (economy first), each under a cap-shaped band in its
// role's colour, with its hotkey, price chip, the building at 2× (64 px), its name, a role tag and a
// one-line summary. A card you can't afford is unlit: the sprite desaturates, the price turns red and a
// "need N" bar fills toward the price. The price is the cheapest you can build it for right now: once
// no home plot is free, the nearest forward plot's (the supply line, SPEC §6.3), and the summary reads
// "home full, from N", so a lit card never fails on gold. When the cards don't fit one row at full size
// (a big kit at 1280 px), the tray turns compact: two rows of smaller cards, never a sideways scroll; the
// narrowest drop the price chip's coin so the price stays readable (styles.css).
// Hovering or focusing a card shows a tooltip with the full stats and matchups.
import type { Content } from '../../data/registry.ts';
import { legalPlacements } from '../../sim/index.ts';
import type { BattleState, Command } from '../../sim/index.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { h, setText, toggleClass } from '../h.ts';
import { priceEl } from '../icons.ts';
import { uiScale } from '../scale.ts';
import { ROLE_LABEL, buildingTip, cardLine, trayOrder } from '../buildingInfo.ts';

/** Full-size cards: the narrowest a card gets in one row, and the gap between cards (layout px). */
const CARD_MIN = 86;
const GAP = 6;

type Placing = Extract<Command, { type: 'place' }>;

/** The player's placements still queued: they run on the next tick (at once in deploy). */
const queued = (state: BattleState): Placing[] => state.queue.filter((c): c is Placing => c.side === 'player' && c.type === 'place');

/**
 * The cheapest price the player can build `id` for right now, gold aside: its own price while a home
 * plot is free, else the nearest forward plot's with the supply line (SPEC §6.3). A plot a queued
 * placement will take doesn't count. Null if it fits nowhere.
 */
export function cheapestPrice(state: BattleState, id: string): number | null {
  const def = state.compiled.player.buildings[id];
  if (!def) return null;
  const taken = queued(state);
  let best: number | null = null;
  for (const p of legalPlacements(state, 'player', id)) {
    if (best !== null && p.price >= best) continue;
    const clash = taken.some((c) => {
      const q = state.compiled.player.buildings[c.buildingId];
      return !!q && c.col < p.col + def.w && p.col < c.col + q.w && c.row < p.row + def.h && p.row < c.row + q.h;
    });
    if (!clash) best = p.price;
  }
  return best;
}

interface Card {
  id: string; name: string; el: HTMLElement; nameEl: HTMLElement; cost: number; economy: boolean; fill: HTMLElement; need: HTMLElement;
  /** The price chip's number, and the summary line with its usual text. */
  amount: ChildNode; out: HTMLElement; line: string;
  /** The cheapest price now (`cost` while a home plot is free, or with nowhere to build), and the one shown. */
  price: number; shown: number;
  poor: boolean | null; short: number;
}

export class Tray {
  readonly el = h('div', { class: 'tray', id: 'tray' });
  private tip = h('div', { class: 'card-tip', id: 'card-tip', role: 'tooltip', hidden: true });
  private cards: Card[] = [];
  /** The board the prices were last worked out for: they change only when it does, not every frame. */
  private pricedFor: BattleState | null = null;
  private priceKey = '';

  constructor(private content: Content, private atlas: Atlas, private state: BattleState, onPick: (id: string) => void) {
    trayOrder(content, state.sides.player.kit).forEach((id, i) => {
      const b = content.buildings[id]!;
      const key = i < 9 ? `[${i + 1}]` : '';
      const sprite = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
      sprite.className = 'art';
      sprite.setAttribute('aria-hidden', 'true');
      const fill = h('i');
      const need = h('span', { class: 'need-label' });
      const nameEl = h('div', { class: 'name' }, b.name);
      const price = priceEl(atlas, b.cost);
      const line = cardLine(content, state, id);
      const out = h('div', { class: 'out' }, line);
      const el: HTMLElement = h('button', {
        class: `card ${b.kind}`, 'data-building': id, 'aria-describedby': 'card-tip', onclick: () => onPick(id),
        onmouseenter: () => this.show(id, key, el), onmouseleave: () => this.hide(),
        // keyboard focus only: a mouse click also focuses the card, and the tip shouldn't linger while placing
        onfocus: () => { if (el.matches(':focus-visible')) this.show(id, key, el); }, onblur: () => this.hide(),
      },
        h('div', { class: 'head' }, h('span', { class: 'key' }, i < 9 ? String(i + 1) : ''), price),
        sprite,
        nameEl,
        h('div', { class: `role ${b.kind}` }, ROLE_LABEL[b.kind]),
        out,
        h('div', { class: 'need' }, h('span', { class: 'needbar', 'aria-hidden': 'true' }, fill), need),
      );
      this.cards.push({
        id, name: b.name, el, nameEl, cost: b.cost, economy: b.kind === 'economy', fill, need,
        amount: price.lastChild!, out, line, price: b.cost, shown: b.cost, poor: null, short: -1,
      });
      this.el.append(el);
    });
    this.el.style.setProperty('--n', String(this.cards.length));
    this.el.style.setProperty('--cols', String(Math.ceil(this.cards.length / 2)));
    this.el.append(this.tip);
  }

  /**
   * Full-size cards in one row if they fit the tray's width, else the compact two-row tray. A compact
   * name that still overflows (text sets wider on some platforms) is squeezed a little rather than cut.
   */
  fit(): void {
    const n = this.cards.length;
    const compact = n * CARD_MIN + (n - 1) * GAP > this.el.clientWidth;
    toggleClass(this.el, 'compact', compact);
    for (const c of this.cards) {
      c.nameEl.classList.remove('squeeze');
      if (compact && c.nameEl.scrollWidth > c.nameEl.clientWidth) c.nameEl.classList.add('squeeze');
    }
  }

  /** Shows the tooltip above a card, kept inside the window. */
  private show(id: string, key: string, card: HTMLElement): void {
    this.tip.replaceChildren(...buildingTip(this.content, this.atlas, this.state, id, key, this.cards.find((c) => c.id === id)?.price));
    this.tip.hidden = false;
    // the tip is fixed inside the scaled body, so it is placed in layout pixels (src/ui/scale.ts)
    const r = card.getBoundingClientRect(), s = uiScale();
    this.tip.style.left = `${Math.max(8, Math.min(r.left / s, window.innerWidth / s - this.tip.offsetWidth - 8))}px`;
    this.tip.style.bottom = `${(window.innerHeight - r.top) / s + 6}px`;
  }

  private hide(): void { this.tip.hidden = true; }

  /** Works the cards' prices out again when the board changes: territory, buildings, queued placements or the supply line. */
  private reprice(state: BattleState): void {
    const key = `${state.compiled.player.supplyLineBp}|${state.lanes.map((l) => `${l.pBorder},${l.eBorder}`).join(';')}|${state.buildings.map((b) => b.id).join(',')}|${queued(state).map((c) => `${c.buildingId}@${c.col},${c.row}`).join(';')}`;
    if (state === this.pricedFor && key === this.priceKey) return;
    this.pricedFor = state;
    this.priceKey = key;
    for (const c of this.cards) c.price = cheapestPrice(state, c.id) ?? c.cost;
  }

  /** `available` is gold left after pending placements; `nudge` pulses the economy cards (the battle-1 tip). */
  update(state: BattleState, available: number, selected: string | null, nudge = false): void {
    this.state = state;
    this.reprice(state);
    const gold = Math.max(0, available);
    for (const c of this.cards) {
      const forward = c.price > c.cost;
      if (c.price !== c.shown) {
        c.shown = c.price;
        c.amount.textContent = String(c.price);
        // the reason first: on a narrow card the line cuts off, and the price chip already says the number
        setText(c.out, forward ? `home\u00a0full, from\u00a0${c.price}` : c.line);
        c.poor = null;
        c.short = -1;
      }
      const poor = available < c.price;
      if (poor !== c.poor) {
        c.poor = poor;
        toggleClass(c.el, 'poor', poor);
        c.el.setAttribute('aria-label', `${c.name}, ${forward ? `from ${c.price} gold, home full` : `${c.price} gold`}${poor ? ', not enough gold' : ''}`);
      }
      if (poor) {
        const short = c.price - gold;
        if (short !== c.short) {
          c.short = short;
          setText(c.need, `need ${short}`);
          c.fill.style.width = `${Math.round((100 * gold) / c.price)}%`;
        }
      }
      toggleClass(c.el, 'sel', c.id === selected);
      toggleClass(c.el, 'nudge', nudge && c.economy);
    }
  }
}
