// Building tray (SPEC §10.2): hotkey, sprite, base price, spawn summary and a matrix hint per card;
// greyed out when unaffordable.
import type { Content } from '../../data/registry.ts';
import type { BattleState } from '../../sim/index.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { h, toggleClass } from '../h.ts';
import { strongVs } from '../matrixHints.ts';

export class Tray {
  readonly el = h('div', { class: 'tray', id: 'tray' });
  private cards: { id: string; el: HTMLElement; cost: number }[] = [];

  constructor(content: Content, atlas: Atlas, state: BattleState, onPick: (id: string) => void) {
    state.sides.player.kit.forEach((id, i) => {
      const b = content.buildings[id]!;
      const unit = b.spawn ? content.units[b.spawn.unit] : undefined;
      const out = b.spawn && unit ? `${b.spawn.count} × ${unit.name} / ${b.spawn.interval}s`
        : b.attack ? `${b.attack.damageType} ${b.attack.damage} / ${b.attack.interval}s · r${b.attack.range}`
        : b.economy ? `+${b.economy.goldPerTick} gold / ${content.balance.incomeTickSeconds}s` : b.kind;
      const mx = unit ? `strong vs ${strongVs(state, unit.damageType)} · ${unit.armor}`
        : b.attack ? `splash ${b.attack.splashRadius ?? 0} · strong vs ${strongVs(state, b.attack.damageType)}`
        : b.economy ? `+${Math.round(content.balance.loamBonus * 100)}% on Rich Loam` : '';
      const sprite = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
      const el = h('button', { class: 'card', title: b.description, 'data-building': id, onclick: () => onPick(id) },
        h('div', { class: 'head' }, h('span', { class: 'key' }, `[${i + 1}]`), h('span', { class: 'price' }, `◆ ${b.cost}`)),
        sprite,
        h('div', { class: 'name' }, b.name),
        h('div', { class: 'out' }, out),
        h('div', { class: 'mx' }, mx),
      );
      this.cards.push({ id, el, cost: b.cost });
      this.el.append(el);
    });
  }

  update(available: number, selected: string | null): void {
    for (const c of this.cards) {
      toggleClass(c.el, 'poor', available < c.cost);
      toggleClass(c.el, 'sel', c.id === selected);
    }
  }
}
