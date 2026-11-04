// The in-battle draft (SPEC §8.3, §10.2): it opens on the player's open draft in the planning of rounds 3, 5 and 7,
// as a bottom sheet in the bottom band's place, whose tray, inspect panel and controls are idle during a draft
// anyway (R2-Q24, R2b/T116). The field above stays uncovered, dimmed except the general's formation preview, so the
// cards can be weighed against its army (`src/render/renderer.ts`). Three shorter cards, each with its full text in a
// tooltip; Reroll shows its cost in battle gold (20, then +10 each), Skip its +40 gold, and Begin stays unlit until you
// pick or skip. Picks, rerolls and skips are ordinary commands, so the battle stays replayable.
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { rerollCost } from '../sim/index.ts';
import type { BattleState, DraftCard } from '../sim/index.ts';
import { cardText, cardView } from './cards.ts';
import { h, setText } from './h.ts';
import { uiIcon } from './icons.ts';
import { sporeBurst } from './motion.ts';
import { AnchoredTip } from './tooltip.ts';

export interface DraftActions {
  pick(cardId: string): void;
  reroll(): void;
  skip(): void;
  /** The sheet's Begin, unlit: it says why it waits (§8.3). */
  begin(): void;
}

const TYPE_WORD = { blueprint: 'Blueprint', upgrade: 'Upgrade', relic: 'Relic' } as const;

export class DraftOverlay {
  readonly el: HTMLElement;
  private shown = '';
  private cards = h('div', { class: 'draft-cards', id: 'draft-cards' });
  private rerollBtn: HTMLButtonElement;
  private rerollCost = h('span');
  private skipBtn: HTMLButtonElement;
  private title = h('h2', { id: 'draft-title' }, '');
  private count = h('span');
  private lastKey = h('kbd', null, '3');
  /** Each card's full text and what it is, above the sheet. */
  private tip = new AnchoredTip('draft-tip', 'above', 'card-tip');

  constructor(private content: Content, private atlas: Atlas, private actions: DraftActions) {
    this.rerollBtn = h('button', { class: 'btn has-ico', id: 'draft-reroll', onclick: () => this.actions.reroll() }, 'Reroll', uiIcon(atlas, 'i-gold'), this.rerollCost);
    this.skipBtn = h('button', { class: 'btn', id: 'draft-skip', onclick: () => this.actions.skip() }, 'Skip');
    const begin = h('button', {
      class: 'btn primary', id: 'draft-begin', 'aria-disabled': 'true', title: 'Pick or skip the draft first', onclick: () => this.actions.begin(),
    }, 'Begin', h('kbd', null, 'Space'));
    this.el = h('section', { class: 'draft-sheet', id: 'draft', role: 'region', 'aria-label': 'Draft', hidden: true },
      h('div', { class: 'draft-side' },
        this.title,
        h('p', { class: 'hint' }, 'Choose 1 of ', this.count, ' before you plan: press ', h('kbd', null, '1'), '–', this.lastKey, ' or click a card.')),
      this.cards,
      h('div', { class: 'draft-actions' }, this.rerollBtn, this.skipBtn, begin),
      this.tip.el,
    );
  }

  get open(): boolean { return !this.el.hidden; }

  /** Shows, refreshes or hides the sheet to match the player's open draft. */
  update(state: BattleState, pending: boolean): void {
    const d = state.phase === 'planning' ? state.sides.player.draft : undefined;
    const human = state.config.player.controller.kind === 'human' || state.config.player.autoDraft === 'none';
    if (!d || !human) {
      if (!this.el.hidden) { this.el.hidden = true; this.tip.close(); }
      this.shown = '';
      return;
    }
    // it opens with a burst of spores rising behind the cards (§10.5)
    if (this.el.hidden) sporeBurst(this.el);
    this.el.hidden = false;
    const key = `${d.index}:${d.offer.map((c) => c.id).join(',')}`;
    const cost = rerollCost(state, 'player');
    setText(this.rerollCost, String(cost));
    this.rerollBtn.disabled = pending || state.sides.player.gold < cost;
    this.skipBtn.textContent = `Skip (+${state.compiled.player.draft?.skipGold ?? this.content.balance.skipGold} gold)`;
    this.skipBtn.disabled = pending;
    this.tip.refresh();
    if (key === this.shown) return;
    this.shown = key;
    this.tip.close();
    this.title.textContent = `Draft ${d.index}`;
    setText(this.count, String(d.offer.length));
    this.cards.style.setProperty('--cols', String(Math.max(3, d.offer.length)));
    setText(this.lastKey, String(d.offer.length));
    const upgrades = state.sides.player.upgrades;
    this.cards.replaceChildren(...d.offer.map((c, i) => {
      const el = cardView(this.content, this.atlas, c, upgrades, () => this.actions.pick(c.id), String(i + 1), i);
      this.tip.attach(el, this.details(c, upgrades, i + 1));
      return el;
    }));
  }

  /** A card's tooltip: its name, kind and rarity, the whole of its text, which the shorter card cuts to two lines, and how to pick it. */
  private details(card: DraftCard, upgrades: Record<string, number>, key: number) {
    const { name, text } = cardText(this.content, card.id, upgrades);
    return {
      key: () => card.id,
      build: () => [
        h('div', { class: 'tip-head' }, h('b', null, name), h('span', { class: `rarity ${card.rarity}` }, `${card.rarity[0]!.toUpperCase()}${card.rarity.slice(1)} ${TYPE_WORD[card.type].toLowerCase()}`)),
        h('span', null, text),
        h('div', { class: 'tip-foot' }, `Press ${key} or click to pick it.`),
      ],
    };
  }

  /** Card id for a 1-based key press, if the sheet is open. */
  cardForKey(state: BattleState, key: string): string | null {
    if (!this.open || !/^[1-9]$/.test(key)) return null;
    return state.sides.player.draft?.offer[Number(key) - 1]?.id ?? null;
  }

  dispose(): void { this.tip.dispose(); }
}
