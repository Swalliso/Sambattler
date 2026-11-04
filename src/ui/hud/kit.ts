// Your relics and upgrades during a battle (SPEC §10.2, §10.3 `R`; playtest round 3: "I want to see what I've
// unlocked"), back in rounds since R2b/T175. In a run's battle, or any battle you draft in, a chip in the top band
// counts them; a click, Enter or `R` opens a popover under it with the run bar's relic badges (each with its v2
// text in a tooltip, on hover or focus) and every upgraded building with its levels, the gold upgrades bought this
// battle among them (§6.1). Esc, `R`, the chip again or a press outside closes it. Drafted cards and upgrades join
// it live.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import type { BattleState } from '../../sim/index.ts';
import { trayOrder } from '../buildingInfo.ts';
import { h, setText } from '../h.ts';
import { uiIcon } from '../icons.ts';
import { uiScale } from '../scale.ts';
import { relicBadge } from '../screens/run.ts';
import { upgradeText } from '../words.ts';

/** The player's spawners upgraded with gold this battle (§6.1, R2b/T161), a building id each, in plot order. */
function goldUpgrades(state: BattleState): string[] {
  return state.buildings.filter((b) => b.side === 'player' && b.upgrade).sort((a, b) => a.plot - b.plot).map((b) => b.buildingId);
}

export class KitView {
  readonly chip: HTMLButtonElement;
  readonly el: HTMLElement;
  private relicCount = h('b');
  private upgradeCount = h('b');
  private body = h('div', { class: 'kit-body' });
  private key = '';
  private onPress = (e: PointerEvent) => {
    if (this.open && !this.el.contains(e.target as Node) && !this.chip.contains(e.target as Node)) this.close();
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) { e.preventDefault(); e.stopPropagation(); this.close(true); }
  };

  constructor(private content: Content, private atlas: Atlas, private state: BattleState) {
    this.chip = h('button', {
      class: 'chip kit-chip', id: 'kit-btn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'kit-pop',
      onclick: () => this.toggle(),
    }, uiIcon(atlas, 'i-relic'), this.relicCount, uiIcon(atlas, 'i-upgrade'), this.upgradeCount, h('kbd', null, 'R'));
    this.el = h('div', { class: 'kit-pop', id: 'kit-pop', role: 'dialog', 'aria-label': 'Your relics and upgrades', hidden: true },
      h('div', { class: 'kit-head' }, h('h2', null, 'Relics and upgrades'), h('button', { class: 'btn', id: 'kit-close', onclick: () => this.close(true) }, 'Close', h('kbd', null, 'R'))),
      this.body);
    // Tab moves inside the popover (the battle keeps Tab for cycling buildings everywhere else)
    this.el.dataset.nativeTab = '';
    window.addEventListener('pointerdown', this.onPress, true);
    window.addEventListener('keydown', this.onKey, true);
  }

  get open(): boolean { return !this.el.hidden; }

  toggle(): void { if (this.open) this.close(true); else this.show(); }

  /** Opens under the chip with focus on the first relic (or Close), so the keyboard can read each one. */
  show(): void {
    this.key = '';
    this.el.hidden = false;
    this.chip.setAttribute('aria-expanded', 'true');
    this.chip.classList.add('tip-open');
    this.update(this.state);
    const r = this.chip.getBoundingClientRect(), s = uiScale();
    const w = this.el.offsetWidth;
    this.el.style.left = `${Math.max(8, Math.min((r.left + r.width / 2) / s - w / 2, window.innerWidth / s - w - 8))}px`;
    this.el.style.top = `${r.bottom / s + 6}px`;
    (this.el.querySelector<HTMLElement>('.relic') ?? this.el.querySelector<HTMLElement>('#kit-close'))?.focus({ preventScroll: true });
  }

  close(refocus = false): void {
    if (!this.open) return;
    const inside = this.el.contains(document.activeElement);
    this.el.hidden = true;
    this.chip.setAttribute('aria-expanded', 'false');
    this.chip.classList.remove('tip-open');
    if (inside || refocus) (document.activeElement as HTMLElement | null)?.blur();
  }

  /** The counts every frame; the popover's body only when what you own changed. */
  update(state: BattleState): void {
    this.state = state;
    const p = state.sides.player;
    const bought = goldUpgrades(state);
    const levels = Object.values(p.upgrades).reduce((n, v) => n + v, 0) + bought.length;
    setText(this.relicCount, String(p.relics.length));
    setText(this.upgradeCount, String(levels));
    this.chip.setAttribute('aria-label', `Your relics and upgrades: ${p.relics.length} relic${p.relics.length === 1 ? '' : 's'}, ${levels} upgrade${levels === 1 ? '' : 's'}`);
    if (!this.open) return;
    const key = `${p.relics.join()}|${JSON.stringify(p.upgrades)}|${p.kit.map((k) => k.building).join()}|${bought.join()}`;
    if (key === this.key) return;
    this.key = key;
    this.render(state);
  }

  private render(state: BattleState): void {
    const { content, atlas } = this;
    const p = state.sides.player;
    const bought = goldUpgrades(state);
    const upgraded = trayOrder(content, p.kit.map((k) => k.building)).filter((id) => ((p.upgrades[id] ?? 0) > 0 && content.upgrades[id]) || bought.includes(id));
    const draftNote = state.config.flags.drafts ? `Drafts offer them in rounds ${content.balance.draftRounds.map((r) => r + 1).join(', ')}.` : '';
    this.body.replaceChildren(
      h('section', { class: 'kit-sec', 'aria-labelledby': 'kit-relics' },
        h('h3', { id: 'kit-relics' }, uiIcon(atlas, 'i-relic'), 'Relics', h('small', null, 'last the whole run')),
        p.relics.length
          ? h('div', { class: 'relics', id: 'kit-relic-list' }, ...p.relics.map((id) => relicBadge(content, atlas, id)))
          : h('p', { class: 'muted' }, `None yet. ${draftNote}`)),
      h('section', { class: 'kit-sec', 'aria-labelledby': 'kit-upgrades' },
        h('h3', { id: 'kit-upgrades' }, uiIcon(atlas, 'i-upgrade'), 'Upgrades', h('small', null, 'each building has 3 levels')),
        upgraded.length
          ? h('ul', { class: 'kit-ups', id: 'kit-upgrade-list' }, ...upgraded.map((id) => {
            const b = content.buildings[id]!;
            const lvl = p.upgrades[id] ?? 0;
            const levels = lvl > 0 ? content.upgrades[id]?.levels ?? [] : [];
            const gold = bought.filter((x) => x === id).length;
            const art = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
            art.setAttribute('aria-hidden', 'true');
            return h('li', { 'data-upgrade': id },
              art,
              h('div', null,
                h('div', { class: 'kit-up-name' }, h('b', null, b.name), levels.length ? h('span', { class: 'lvl' }, `Level ${lvl} of ${levels.length}`) : null),
                // a level that isn't offered does nothing in rounds, so it isn't listed (#27)
                levels.length ? h('ol', null, ...levels.flatMap((l, i) => (l.offered === false ? [] : [h('li', { class: i < lvl ? 'on' : '' }, upgradeText(content, id, i + 1))]))) : null,
                gold ? h('p', { class: 'kit-gold', 'data-gold-upgrades': gold }, `${gold === 1 ? 'One' : gold} upgraded with gold: ${gold === 1 ? 'its squad arrives' : 'their squads arrive'} Bloomed for the rest of this battle.`) : null));
          }))
          : h('p', { class: 'muted' }, `None yet. ${draftNote} Once every plot is built on, gold buys one: select a spawner and press U.`)),
    );
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.onPress, true);
    window.removeEventListener('keydown', this.onKey, true);
  }
}
