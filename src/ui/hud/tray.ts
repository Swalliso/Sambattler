// Building tray (SPEC §10.2): cards grouped by role (economy first), each under a cap-shaped band in its
// role's colour, with its hotkey, price chip, the building at 2× (64 px), its name, a role tag and a
// one-line summary. A card you can't afford is unlit: the sprite desaturates, the price turns red and a
// "need N" bar fills toward the price. When the cards don't fit one row at full size (a big kit at
// 1280 px), the tray turns compact: two rows of smaller cards, never a sideways scroll. Hovering or
// focusing a card shows a tooltip with the full stats and matchups.
import type { Content } from '../../data/registry.ts';
import type { BattleState } from '../../sim/index.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { h, setText, toggleClass } from '../h.ts';
import { priceEl } from '../icons.ts';
import { uiScale } from '../scale.ts';
import { ROLE_LABEL, buildingTip, cardLine, trayOrder } from '../buildingInfo.ts';

/** Full-size cards: the narrowest a card gets in one row, and the gap between cards (layout px). */
const CARD_MIN = 86;
const GAP = 6;

interface Card { id: string; name: string; el: HTMLElement; cost: number; economy: boolean; fill: HTMLElement; need: HTMLElement; poor: boolean | null; short: number }

export class Tray {
  readonly el = h('div', { class: 'tray', id: 'tray' });
  private tip = h('div', { class: 'card-tip', id: 'card-tip', role: 'tooltip', hidden: true });
  private cards: Card[] = [];

  constructor(private content: Content, private atlas: Atlas, private state: BattleState, onPick: (id: string) => void) {
    trayOrder(content, state.sides.player.kit).forEach((id, i) => {
      const b = content.buildings[id]!;
      const key = i < 9 ? `[${i + 1}]` : '';
      const sprite = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
      sprite.className = 'art';
      sprite.setAttribute('aria-hidden', 'true');
      const fill = h('i');
      const need = h('span', { class: 'need-label' });
      const el: HTMLElement = h('button', {
        class: `card ${b.kind}`, 'data-building': id, 'aria-describedby': 'card-tip', onclick: () => onPick(id),
        onmouseenter: () => this.show(id, key, el), onmouseleave: () => this.hide(),
        // keyboard focus only: a mouse click also focuses the card, and the tip shouldn't linger while placing
        onfocus: () => { if (el.matches(':focus-visible')) this.show(id, key, el); }, onblur: () => this.hide(),
      },
        h('div', { class: 'head' }, h('span', { class: 'key' }, i < 9 ? String(i + 1) : ''), priceEl(atlas, b.cost)),
        sprite,
        h('div', { class: 'name' }, b.name),
        h('div', { class: `role ${b.kind}` }, ROLE_LABEL[b.kind]),
        h('div', { class: 'out' }, cardLine(content, state, id)),
        h('div', { class: 'need' }, h('span', { class: 'needbar', 'aria-hidden': 'true' }, fill), need),
      );
      this.cards.push({ id, name: b.name, el, cost: b.cost, economy: b.kind === 'economy', fill, need, poor: null, short: -1 });
      this.el.append(el);
    });
    this.el.style.setProperty('--n', String(this.cards.length));
    this.el.style.setProperty('--cols', String(Math.ceil(this.cards.length / 2)));
    this.el.append(this.tip);
  }

  /** Full-size cards in one row if they fit the tray's width, else the compact two-row tray. */
  fit(): void {
    const n = this.cards.length;
    toggleClass(this.el, 'compact', n * CARD_MIN + (n - 1) * GAP > this.el.clientWidth);
  }

  /** Shows the tooltip above a card, kept inside the window. */
  private show(id: string, key: string, card: HTMLElement): void {
    this.tip.replaceChildren(...buildingTip(this.content, this.atlas, this.state, id, key));
    this.tip.hidden = false;
    // the tip is fixed inside the scaled body, so it is placed in layout pixels (src/ui/scale.ts)
    const r = card.getBoundingClientRect(), s = uiScale();
    this.tip.style.left = `${Math.max(8, Math.min(r.left / s, window.innerWidth / s - this.tip.offsetWidth - 8))}px`;
    this.tip.style.bottom = `${(window.innerHeight - r.top) / s + 6}px`;
  }

  private hide(): void { this.tip.hidden = true; }

  /** `available` is gold left after pending placements; `nudge` pulses the economy cards (the battle-1 tip). */
  update(state: BattleState, available: number, selected: string | null, nudge = false): void {
    this.state = state;
    for (const c of this.cards) {
      const poor = available < c.cost;
      if (poor !== c.poor) {
        c.poor = poor;
        toggleClass(c.el, 'poor', poor);
        c.el.setAttribute('aria-label', `${c.name}, ${c.cost} gold${poor ? ', not enough gold' : ''}`);
      }
      if (poor) {
        const short = c.cost - Math.max(0, available);
        if (short !== c.short) {
          c.short = short;
          setText(c.need, `need ${short}`);
          c.fill.style.width = `${Math.round((100 * Math.max(0, available)) / c.cost)}%`;
        }
      }
      toggleClass(c.el, 'sel', c.id === selected);
      toggleClass(c.el, 'nudge', nudge && c.economy);
    }
  }
}
