// The settings popover: in battle, a cog beside the sound control that opens a small panel above it; on
// the title, a Settings button whose panel also holds the sound sliders. It holds the damage-numbers choice
// (off, big hits, all) until the settings screen arrives; the choice is saved with the other settings
// (src/app/settings.ts). A press outside, or Escape, closes it.
import type { DamageNumbers } from '../render/renderer.ts';
import type { Atlas } from '../render/atlas.ts';
import { h, toggleClass } from './h.ts';
import { uiIcon } from './icons.ts';

const NUMBERS: [DamageNumbers, string][] = [['off', 'Off'], ['big', 'Big hits'], ['all', 'All']];

let globalBound = false;

function setOpen(ctl: Element, open: boolean): void {
  ctl.querySelector<HTMLElement>('.settings-pop')!.hidden = !open;
  ctl.querySelector('#settings-btn')!.setAttribute('aria-expanded', String(open));
  toggleClass(ctl, 'open', open);
}

/** One listener for the page (a run builds a new battle view each battle): a press outside closes it. */
function bindGlobal(): void {
  if (globalBound) return;
  globalBound = true;
  document.addEventListener('pointerdown', (e) => {
    for (const ctl of document.querySelectorAll('.settings-ctl.open')) if (!ctl.contains(e.target as Node)) setOpen(ctl, false);
  });
}

export interface SettingsControl {
  readonly el: HTMLElement;
  /** Shows the current choice (cheap to call every frame). */
  sync(numbers: DamageNumbers): void;
}

export interface SettingsOptions {
  /** A text button (the title's menu) in place of the cog. */
  label?: string;
  /** Where the panel opens: up from the battle's bottom band (the default), or beside the button. */
  opens?: 'up' | 'side';
  /** Shown above the damage numbers (the title's sound sliders). */
  before?: HTMLElement;
}

export function settingsControl(atlas: Atlas, setNumbers: (v: DamageNumbers) => void, opts: SettingsOptions = {}): SettingsControl {
  bindGlobal();
  const pick = new Map<DamageNumbers, HTMLButtonElement>();
  const seg = h('div', { class: 'seg', id: 'numbers', role: 'group', 'aria-label': 'Damage numbers' },
    ...NUMBERS.map(([v, label]) => {
      const b = h('button', { class: 'btn', 'data-numbers': v, 'aria-pressed': 'false', onclick: () => setNumbers(v) }, label);
      pick.set(v, b);
      return b;
    }));
  const pop = h('div', { class: `settings-pop ${opts.opens ?? 'up'}`, id: 'settings-pop', role: 'group', 'aria-label': 'Settings', hidden: true },
    opts.before ? h('div', { class: 'pop-label' }, 'Sound') : null, opts.before ?? null,
    h('div', { class: 'pop-label' }, 'Damage numbers'), seg,
    h('div', { class: 'hint' }, 'Numbers rise off hits on the field. Saved for every battle.'));
  const btn = h('button', {
    class: 'btn has-ico', id: 'settings-btn', title: opts.label ? null : 'Settings', 'aria-label': opts.label ? null : 'Settings',
    'aria-expanded': 'false', 'aria-controls': 'settings-pop',
    onclick: () => setOpen(el, !el.classList.contains('open')),
  }, uiIcon(atlas, 'i-settings'), opts.label ?? null);
  const el = h('div', { class: 'settings-ctl' }, btn, pop);
  // Escape closes it without also cancelling a placement (src/app/input.ts listens on the window)
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('open')) { e.stopPropagation(); setOpen(el, false); btn.focus(); }
  });
  let shown: DamageNumbers | null = null;
  return {
    el,
    sync(numbers) {
      if (numbers === shown) return;
      shown = numbers;
      for (const [v, b] of pick) {
        toggleClass(b, 'on', v === numbers);
        b.setAttribute('aria-pressed', String(v === numbers));
      }
    },
  };
}
