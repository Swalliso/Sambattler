// Your relics and upgrades during a battle (playtest round 3: "I want to see what I've unlocked"). A chip
// in the top band counts them; a click, Enter or `R` opens a popover under it with the run bar's relic
// badges (each with its tooltip, on hover or focus) and every upgraded building with its levels. Esc,
// `R`, the chip again or a press outside closes it. Drafted cards join it live.
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
    const levels = Object.values(p.upgrades).reduce((n, v) => n + v, 0);
    setText(this.relicCount, String(p.relics.length));
    setText(this.upgradeCount, String(levels));
    this.chip.setAttribute('aria-label', `Your relics and upgrades: ${p.relics.length} relic${p.relics.length === 1 ? '' : 's'}, ${levels} upgrade level${levels === 1 ? '' : 's'}`);
    if (!this.open) return;
    const key = `${p.relics.join()}|${JSON.stringify(p.upgrades)}|${p.kit.join()}`;
    if (key === this.key) return;
    this.key = key;
    this.render(state);
  }

  private render(state: BattleState): void {
    const { content, atlas } = this;
    const p = state.sides.player;
    const upgraded = trayOrder(content, p.kit).filter((id) => (p.upgrades[id] ?? 0) > 0 && content.upgrades[id]);
    const draftNote = state.config.flags.drafts ? `Drafts offer them after waves ${state.rules.draftWaves.join(', ')}.` : '';
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
            const levels = content.upgrades[id]!.levels;
            const art = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
            art.setAttribute('aria-hidden', 'true');
            return h('li', { 'data-upgrade': id },
              art,
              h('div', null,
                h('div', { class: 'kit-up-name' }, h('b', null, b.name), h('span', { class: 'lvl' }, `Level ${lvl} of ${levels.length}`)),
                h('ol', null, ...levels.map((_, i) => h('li', { class: i < lvl ? 'on' : '' }, upgradeText(content, id, i + 1))))));
          }))
          : h('p', { class: 'muted' }, `None yet. ${draftNote}`)),
    );
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.onPress, true);
    window.removeEventListener('keydown', this.onKey, true);
  }
}
