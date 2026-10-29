// Building tray (SPEC §10.2): cards grouped by role (economy first), each with its hotkey, sprite,
// base price, a role tag and a one-line summary, greyed out when unaffordable. Hovering or focusing a
// card shows a tooltip with the full stats and matchups.
import type { Content } from '../../data/registry.ts';
import type { BattleState } from '../../sim/index.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { h, toggleClass } from '../h.ts';
import { priceEl } from '../icons.ts';
import { uiScale } from '../scale.ts';
import { ROLE_LABEL, buildingTip, cardLine, trayOrder } from '../buildingInfo.ts';

export class Tray {
  readonly el = h('div', { class: 'tray', id: 'tray' });
  private tip = h('div', { class: 'card-tip', id: 'card-tip', role: 'tooltip', hidden: true });
  private cards: { id: string; el: HTMLElement; cost: number; economy: boolean }[] = [];

  constructor(private content: Content, private atlas: Atlas, private state: BattleState, onPick: (id: string) => void) {
    trayOrder(content, state.sides.player.kit).forEach((id, i) => {
      const b = content.buildings[id]!;
      const key = i < 9 ? `[${i + 1}]` : '';
      const sprite = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
      const el: HTMLElement = h('button', {
        class: `card ${b.kind}`, 'data-building': id, 'aria-describedby': 'card-tip', onclick: () => onPick(id),
        onmouseenter: () => this.show(id, key, el), onmouseleave: () => this.hide(),
        // keyboard focus only: a mouse click also focuses the card, and the tip shouldn't linger while placing
        onfocus: () => { if (el.matches(':focus-visible')) this.show(id, key, el); }, onblur: () => this.hide(),
      },
        h('div', { class: 'head' }, h('span', { class: 'key' }, key), priceEl(atlas, b.cost)),
        sprite,
        h('div', { class: 'name' }, b.name),
        h('div', { class: `role ${b.kind}` }, ROLE_LABEL[b.kind]),
        h('div', { class: 'out' }, cardLine(content, state, id)),
      );
      this.cards.push({ id, el, cost: b.cost, economy: b.kind === 'economy' });
      this.el.append(el);
    });
    this.el.append(this.tip);
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

  /** `nudge` pulses the economy cards (the battle-1 tip). */
  update(state: BattleState, available: number, selected: string | null, nudge = false): void {
    this.state = state;
    for (const c of this.cards) {
      toggleClass(c.el, 'poor', available < c.cost);
      toggleClass(c.el, 'sel', c.id === selected);
      toggleClass(c.el, 'nudge', nudge && c.economy);
    }
  }
}
