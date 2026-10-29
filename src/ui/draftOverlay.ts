// The in-battle draft (SPEC §8.3): opens at the end of waves 2, 4, 6 and 8 while the sim holds.
// Three cards; reroll for battle gold (20, then +10 each) or skip for +40 gold. Picks, rerolls
// and skips are ordinary commands, so the battle stays replayable.
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { rerollCost } from '../sim/index.ts';
import type { BattleState } from '../sim/index.ts';
import { cardView } from './cards.ts';
import { h, setText } from './h.ts';
import { uiIcon } from './icons.ts';

export interface DraftActions {
  pick(cardId: string): void;
  reroll(): void;
  skip(): void;
}

export class DraftOverlay {
  readonly el: HTMLElement;
  private shown = '';
  private cards = h('div', { class: 'draft-cards', id: 'draft-cards' });
  private rerollBtn: HTMLButtonElement;
  private rerollCost = h('span');
  private skipBtn: HTMLButtonElement;
  private title = h('h2', { id: 'draft-title' }, '');

  constructor(private content: Content, private atlas: Atlas, private actions: DraftActions) {
    this.rerollBtn = h('button', { class: 'btn has-ico', id: 'draft-reroll', onclick: () => this.actions.reroll() }, 'Reroll', uiIcon(atlas, 'i-gold'), this.rerollCost);
    this.skipBtn = h('button', { class: 'btn', id: 'draft-skip', onclick: () => this.actions.skip() }, 'Skip');
    const card = h('div', { class: 'draftcard', id: 'draft', role: 'dialog', 'aria-label': 'Draft' },
      h('div', { class: 'draft-top' }, this.title, h('div', { class: 'hint' }, 'The battle is held while you choose. Press ', h('kbd', null, '1'), '–', h('kbd', null, '3'), ' to pick a card.')),
      this.cards,
      h('div', { class: 'actions' }, this.rerollBtn, this.skipBtn),
    );
    this.el = h('div', { class: 'overlay draft-overlay', hidden: true }, card);
  }

  get open(): boolean { return !this.el.hidden; }

  /** Shows, refreshes or hides the overlay to match the player's open draft. */
  update(state: BattleState, pending: boolean): void {
    const d = state.sides.player.draft;
    const human = state.config.player.controller.kind === 'human' || state.config.player.autoDraft === 'none';
    if (!d || !state.held || !human) { this.el.hidden = true; this.shown = ''; return; }
    this.el.hidden = false;
    const key = `${d.index}:${d.offer.map((c) => c.id).join(',')}`;
    const cost = rerollCost(state, 'player');
    setText(this.rerollCost, String(cost));
    this.rerollBtn.disabled = pending || state.sides.player.gold < cost;
    this.skipBtn.textContent = `Skip (+${state.compiled.player.skipGold} gold)`;
    this.skipBtn.disabled = pending;
    if (key === this.shown) return;
    this.shown = key;
    this.title.textContent = `Draft ${d.index}: choose 1 of ${d.offer.length}`;
    this.cards.replaceChildren(...d.offer.map((c, i) =>
      cardView(this.content, this.atlas, c, state.sides.player.upgrades, () => this.actions.pick(c.id), String(i + 1), i)));
  }

  /** Card id for a 1-based key press, if the overlay is open. */
  cardForKey(state: BattleState, key: string): string | null {
    if (!this.open || !/^[1-9]$/.test(key)) return null;
    return state.sides.player.draft?.offer[Number(key) - 1]?.id ?? null;
  }
}
