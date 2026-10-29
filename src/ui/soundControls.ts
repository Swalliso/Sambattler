// The sound control (SPEC §13.9): a speaker button that mutes and unmutes (S does the same). Hovering
// or focusing it opens a small popover with the volume sliders, as media players do, so it takes one
// button's width. One sits in the battle's speed row and one in the run bar; every copy on the page
// stays in step through syncSoundControls().
import type { Atlas } from '../render/atlas.ts';
import { h, toggleClass } from './h.ts';
import { uiIcon } from './icons.ts';

export interface SoundLevels { master: number; sfx: number; ambient: number; muted: boolean }

export interface SoundPrefs {
  get(): SoundLevels;
  /** Applies a change; `commit` also saves it (a slider was let go). */
  set(patch: Partial<SoundLevels>, commit: boolean): void;
  toggleMute(): void;
}

type Level = 'master' | 'sfx' | 'ambient';
const SLIDERS: [Level, string][] = [['master', 'Master'], ['sfx', 'Effects'], ['ambient', 'Ambience']];
/** Hover delays (ms): a pointer passing over the button doesn't flash the popover, and crossing the gap to it doesn't close it. */
const OPEN_DELAY = 150;
const CLOSE_DELAY = 300;

let globalBound = false;

/** A press outside, or Escape, closes open popovers. */
function bindGlobal(): void {
  if (globalBound) return;
  globalBound = true;
  document.addEventListener('pointerdown', (e) => {
    for (const ctl of document.querySelectorAll<HTMLElement>('.sound-ctl.open')) if (!ctl.contains(e.target as Node)) setOpen(ctl, false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') for (const ctl of document.querySelectorAll<HTMLElement>('.sound-ctl.open')) setOpen(ctl, false);
  });
}

function setOpen(ctl: HTMLElement, open: boolean): void {
  toggleClass(ctl, 'open', open);
  ctl.querySelector<HTMLElement>('.sound-pop')!.hidden = !open;
}

function sliderRows(prefs: SoundPrefs): HTMLElement[] {
  return SLIDERS.map(([key, label]) => {
    const input = h('input', { type: 'range', min: 0, max: 100, step: 1, 'data-level': key, 'aria-label': `${label} volume` });
    const value = (): Partial<SoundLevels> => ({ [key]: Number(input.value) / 100 });
    input.addEventListener('input', () => prefs.set(value(), false));
    input.addEventListener('change', () => prefs.set(value(), true));
    return h('label', { class: 'sound-row' }, h('span', null, label), input, h('b', { 'data-level-text': key }));
  });
}

function muteButton(atlas: Atlas, prefs: SoundPrefs, ...label: (HTMLElement | string)[]): HTMLButtonElement {
  const on = uiIcon(atlas, 'i-sound'), off = uiIcon(atlas, 'i-mute');
  on.classList.add('when-on');
  off.classList.add('when-off');
  return h('button', {
    class: 'btn has-ico sound-mute', 'data-sfx': 'none', 'aria-label': 'Mute', 'aria-pressed': 'false',
    onclick: () => prefs.toggleMute(),
  }, on, off, ...label);
}

/** `opens` is where the popover goes: up from the battle's bottom band, down from the run bar. */
export function soundControl(atlas: Atlas, prefs: SoundPrefs, opens: 'up' | 'down'): HTMLElement {
  bindGlobal();
  const mute = muteButton(atlas, prefs);
  const pop = h('div', { class: `sound-pop ${opens}`, role: 'group', 'aria-label': 'Volume', hidden: true },
    ...sliderRows(prefs), h('div', { class: 'hint' }, 'Click the speaker or press S to mute'));
  const ctl = h('div', { class: `sound-ctl ${opens}` }, mute, pop);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = (open: boolean, ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => setOpen(ctl, open), ms);
  };
  ctl.addEventListener('pointerenter', () => later(true, ctl.classList.contains('open') ? 0 : OPEN_DELAY));
  // a slider being dragged or focused from the keyboard keeps it open
  ctl.addEventListener('pointerleave', () => { if (!(document.activeElement instanceof HTMLInputElement && ctl.contains(document.activeElement))) later(false, CLOSE_DELAY); });
  // keyboard: focusing the speaker opens the sliders, so Tab reaches them
  ctl.addEventListener('focusin', (e) => { if ((e.target as Element).matches(':focus-visible')) later(true, 0); });
  ctl.addEventListener('focusout', (e) => { if (!ctl.contains(e.relatedTarget as Node | null)) later(false, 0); });
  syncControl(ctl, prefs.get());
  return ctl;
}

/** The same mute and sliders laid open, for a settings panel (the title's settings popover). */
export function soundPanel(atlas: Atlas, prefs: SoundPrefs): HTMLElement {
  const ctl = h('div', { class: 'sound-ctl inline', role: 'group', 'aria-label': 'Sound' },
    muteButton(atlas, prefs, h('span', { class: 'when-on' }, 'Sound on'), h('span', { class: 'when-off' }, 'Sound off')),
    ...sliderRows(prefs));
  syncControl(ctl, prefs.get());
  return ctl;
}

function syncControl(ctl: Element, l: SoundLevels): void {
  const mute = ctl.querySelector('.sound-mute')!;
  mute.setAttribute('aria-pressed', String(l.muted));
  mute.setAttribute('title', l.muted ? 'Sound is off: click or press S to turn it on' : 'Sound: click or press S to mute');
  toggleClass(ctl, 'muted', l.muted);
  for (const input of ctl.querySelectorAll<HTMLInputElement>('input[data-level]')) {
    const v = String(Math.round(l[input.dataset.level as Level] * 100));
    if (input.value !== v) input.value = v;
  }
  for (const b of ctl.querySelectorAll<HTMLElement>('[data-level-text]')) {
    b.textContent = String(Math.round(l[b.dataset.levelText as Level] * 100));
  }
}

/** Updates every sound control on the page. */
export function syncSoundControls(levels: SoundLevels): void {
  for (const ctl of document.querySelectorAll('.sound-ctl')) syncControl(ctl, levels);
}
