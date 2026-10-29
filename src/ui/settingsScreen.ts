// The settings screen (SPEC §10.5): an overlay opened from the title's Settings button, the battle's cog
// (the battle pauses while it is open) and the run bar's cog. It holds sound (master, effects and
// ambience volume, and mute), damage numbers, default speed, screen shake, UI scale, reduced motion and
// color-blind assist, with a live preview of the assist drawn the way the field draws it. Every change
// saves at once, into the one settings record (src/app/settings.ts).
// Esc closes it; while it is open, keys reach nothing behind it (S still mutes).
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { PREVIEW_COLS, PREVIEW_ROWS, drawAssistPreview } from '../render/assistPreview.ts';
import { TILE } from '../render/renderer.ts';
import type { DamageNumbers } from '../render/renderer.ts';
import { h, toggleClass } from './h.ts';
import { uiIcon } from './icons.ts';
import { systemReducedMotion } from './motion.ts';
import { fitScale, uiScale } from './scale.ts';
import { soundPanel } from './soundControls.ts';
import type { SoundPrefs } from './soundControls.ts';

/** Reduced motion: follow the device's setting, or force it on or off. */
export type MotionPref = 'system' | 'on' | 'off';
/** UI scale: fit the window (shrink below 1280×720, 100% above), or a fixed step for big screens. */
export type UiScalePref = 'auto' | 1.25 | 1.5 | 1.75 | 2;
export const UI_SCALE_STEPS: readonly UiScalePref[] = ['auto', 1.25, 1.5, 1.75, 2];
export type Speed = 1 | 2 | 3;

/** The settings this screen edits (sound goes through SoundPrefs). */
export interface ScreenSettings {
  damageNumbers: DamageNumbers;
  defaultSpeed: Speed;
  screenShake: boolean;
  uiScale: UiScalePref;
  reducedMotion: MotionPref;
  colorAssist: boolean;
}

export interface SettingsStore {
  get(): ScreenSettings;
  set(patch: Partial<ScreenSettings>): void;
}

export interface SettingsScreenOptions {
  /** Shows "The battle is paused" in the head. */
  paused?: boolean;
  onClose(): void;
}

type Option<K extends keyof ScreenSettings> = [ScreenSettings[K], string];
const pct = (v: number) => `${Math.round(v * 100)}%`;
/** The assist preview's scale: three screen px per native px. */
const PREVIEW_SCALE = 3;

let openScreen: { close(): void } | null = null;

/** Closes the settings screen if it is open. */
export function closeSettings(): void { openScreen?.close(); }

export function settingsOpen(): boolean { return openScreen !== null; }

/** Opens the screen over whatever is showing; returns its overlay (already on the page). */
export function openSettings(content: Content, atlas: Atlas, store: SettingsStore, sound: SoundPrefs, opts: SettingsScreenOptions): HTMLElement {
  openScreen?.close();
  const current = store.get();
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const syncs: (() => void)[] = [];

  /** A labelled row of choices, sunk into a well with the chosen one lit. */
  function choice<K extends keyof ScreenSettings>(key: K, label: string, options: Option<K>[], hint: () => string, extra: Record<string, string> = {}): HTMLElement {
    const hintEl = h('span', { class: 'set-hint' });
    const buttons = options.map(([value, text]) => {
      const b = h('button', {
        class: 'btn', 'data-value': String(value), 'aria-pressed': 'false', 'data-sfx': 'ui-toggle',
        ...(key === 'damageNumbers' ? { 'data-numbers': String(value) } : {}),
        onclick: () => {
          current[key] = value;
          store.set({ [key]: value } as Partial<ScreenSettings>);
          // every row and the preview: a new scale changes the scale hint, the assist redraws the preview
          for (const f of syncs) f();
        },
      }, text);
      return [value, b] as const;
    });
    const sync = () => {
      for (const [value, b] of buttons) {
        toggleClass(b, 'on', value === current[key]);
        b.setAttribute('aria-pressed', String(value === current[key]));
      }
      hintEl.textContent = hint();
    };
    syncs.push(sync);
    sync();
    return h('div', { class: 'set-row', 'data-setting': key },
      h('div', { class: 'set-label' }, h('b', null, label), hintEl),
      h('div', { class: 'seg', role: 'group', 'aria-label': label, ...extra }, ...buttons.map(([, b]) => b)));
  }

  const scaleHint = () => {
    const fit = fitScale();
    const now = pct(uiScale());
    if (current.uiScale === 'auto') return fit < 1 ? `Now ${now}, shrunk to fit this window.` : `Now ${now}. Auto shrinks the game to fit windows smaller than 1280×720.`;
    return current.uiScale > fit ? `Now ${now}: this window fits up to ${pct(fit)}.` : `Now ${now}: everything larger, for big screens.`;
  };
  const motionHint = () => current.reducedMotion === 'system'
    ? `Follows your device, which ${systemReducedMotion() ? 'asks' : 'doesn’t ask'} for less motion.`
    : current.reducedMotion === 'on' ? 'No screen wipes, drift, tilt or shake; fades stay short.' : 'Full motion, whatever your device asks.';

  // the assist's preview: a strip of field drawn as the field draws it, with the assist on or off
  const previewArt = h('canvas', {
    class: 'preview-art', 'aria-hidden': 'true', width: PREVIEW_COLS * TILE, height: PREVIEW_ROWS * TILE,
    style: `width:${PREVIEW_COLS * TILE * PREVIEW_SCALE}px;height:${PREVIEW_ROWS * TILE * PREVIEW_SCALE}px`,
  });
  const previewTug = h('div', { class: 'tugbar', style: `--cols:${PREVIEW_COLS}` }, h('div', { class: 'p', style: 'width:50%' }), h('div', { class: 'e', style: 'width:50%' }));
  const preview = h('figure', { class: 'set-preview', id: 'assist-preview', role: 'img' },
    previewArt, previewTug,
    h('figcaption', null, h('span', { class: 'p' }, 'Your units'), h('span', { class: 'e' }, 'Gray Rot units')));
  syncs.push(() => {
    drawAssistPreview(previewArt, content, atlas, current.colorAssist);
    preview.dataset.assist = String(current.colorAssist);
    preview.setAttribute('aria-label', current.colorAssist
      ? 'Preview: your units stand on light rings, the Gray Rot’s on dark dashed bars'
      : 'Preview: your units and the Gray Rot’s, told apart by cap color and mat');
  });
  syncs[syncs.length - 1]!();

  const close = () => {
    if (openScreen !== handle) return;
    openScreen = null;
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    overlay.remove();
    opts.onClose();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
  const handle = { close };

  const closeBtn = h('button', { class: 'btn', id: 'settings-close', onclick: close }, 'Close', h('kbd', null, 'Esc'));
  const card = h('div', { class: 'settingscard', id: 'settings', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
    h('div', { class: 'settings-head' },
      h('h2', { id: 'settings-title' }, 'Settings'),
      opts.paused ? h('span', { class: 'set-paused', id: 'settings-paused' }, uiIcon(atlas, 'i-pause'), 'The battle is paused') : null,
      closeBtn),
    h('div', { class: 'settings-grid' },
      h('div', { class: 'settings-col' },
        h('section', { class: 'set-section', 'aria-labelledby': 'set-sound' },
          h('h3', { id: 'set-sound' }, uiIcon(atlas, 'i-sound'), 'Sound'),
          soundPanel(atlas, sound),
          h('span', { class: 'set-hint' }, 'Press ', h('kbd', null, 'S'), ' anywhere to mute.')),
        h('section', { class: 'set-section', 'aria-labelledby': 'set-battle' },
          h('h3', { id: 'set-battle' }, uiIcon(atlas, 'i-battle'), 'Battle'),
          choice('damageNumbers', 'Damage numbers', [['off', 'Off'], ['big', 'Big hits'], ['all', 'All']],
            () => (current.damageNumbers === 'off' ? 'Hit sparks only: gold strong, white normal, gray weak.' : current.damageNumbers === 'big' ? 'Numbers rise off hits of 30 or more.' : 'A number rises off every hit.'),
            { id: 'numbers' }),
          choice('defaultSpeed', 'Default speed', [[1, '1×'], [2, '2×'], [3, '3×']],
            () => 'Each battle runs at this speed once it begins.'),
          choice('screenShake', 'Screen shake', [[false, 'Off'], [true, 'On']],
            () => (current.screenShake ? 'The field jolts a little when a Heartcap is hit.' : 'Off by default. Never shakes under reduced motion.')))),
      h('div', { class: 'settings-col' },
        h('section', { class: 'set-section', 'aria-labelledby': 'set-display' },
          h('h3', { id: 'set-display' }, uiIcon(atlas, 'i-settings'), 'Display and motion'),
          choice('uiScale', 'UI scale', UI_SCALE_STEPS.map((v) => [v, v === 'auto' ? 'Auto' : pct(v)] as Option<'uiScale'>), scaleHint),
          choice('reducedMotion', 'Reduced motion', [['system', 'System'], ['on', 'On'], ['off', 'Off']], motionHint),
          choice('colorAssist', 'Color-blind assist', [[false, 'Off'], [true, 'On']],
            () => (current.colorAssist
              ? 'A light ring under your units, a dark dashed bar under theirs, and bolder textures on the mats and the territory bar.'
              : 'Adds a shape under every unit and bolder faction textures, so the sides never rely on color.')),
          preview),
        h('p', { class: 'set-note' }, 'Changes save as you make them, for the game and every battle. Save export and a profile reset arrive with the profile (Milestone 6).'))),
  );
  const overlay = h('div', { class: 'overlay settings-overlay' }, card);
  // a press on the scrim closes it, as Esc does
  overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) close(); });

  // modal: Esc closes, Tab stays inside, and keys reach nothing behind it (S still mutes, from the window)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      const f = [...card.querySelectorAll<HTMLElement>('button, input')].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (first && last) {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!card.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    }
    if (e.key !== 's' && e.key !== 'S') e.stopPropagation();
  };
  // the scale hint follows the window, and a new scale re-lays out the page
  const onResize = () => { for (const s of syncs) s(); };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  openScreen = handle;
  document.body.append(overlay);
  card.querySelector<HTMLElement>('.sound-mute')?.focus({ preventScroll: true });
  return overlay;
}

/** The cog that opens the screen (in battle and in the run bar), or the title's text button. */
export function settingsButton(atlas: Atlas, open: () => void, label?: string): HTMLButtonElement {
  return h('button', {
    class: 'btn has-ico', id: 'settings-btn', title: label ? null : 'Settings', 'aria-label': label ? null : 'Settings',
    'aria-haspopup': 'dialog', onclick: open,
  }, uiIcon(atlas, 'i-settings'), label ?? null);
}
