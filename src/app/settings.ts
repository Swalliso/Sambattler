// Player settings kept in localStorage, edited on the settings screen (src/ui/settingsScreen.ts; the
// profile save arrives in M6). Reads and writes never throw: a private window or blocked storage falls
// back to the defaults. Every field lives in the one record, spore-sprawl/settings/v1, and a record
// saved before a field existed loads with that field's default.
import { UI_SCALE_STEPS } from '../ui/settingsScreen.ts';
import type { ScreenSettings, SettingsStore } from '../ui/settingsScreen.ts';
import { storageKey } from './channel.ts';

const KEY = storageKey('spore-sprawl/settings/v1');

/**
 * What the settings screen edits (damage numbers, default speed, screen shake, UI scale, reduced motion,
 * color-blind assist), plus sound.
 */
export interface Settings extends ScreenSettings {
  /** Sound (SPEC §13.9): volumes from 0 to 1, and mute. */
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  damageNumbers: 'off', masterVolume: 0.6, sfxVolume: 0.8, ambientVolume: 0.5, muted: false,
  reducedMotion: 'system', uiScale: 'auto', colorAssist: false, defaultSpeed: 1, screenShake: false,
};

const volume = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
const oneOf = <T>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? v as T : fallback);
const flag = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** Settings saved before a field existed load with that field's default. */
export function loadSettings(): Settings {
  const d = DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    const s = (raw ? JSON.parse(raw) : {}) as Partial<Record<keyof Settings, unknown>>;
    return {
      damageNumbers: oneOf(s.damageNumbers, ['off', 'big', 'all'] as const, d.damageNumbers),
      masterVolume: volume(s.masterVolume, d.masterVolume),
      sfxVolume: volume(s.sfxVolume, d.sfxVolume),
      ambientVolume: volume(s.ambientVolume, d.ambientVolume),
      muted: flag(s.muted, d.muted),
      reducedMotion: oneOf(s.reducedMotion, ['system', 'on', 'off'] as const, d.reducedMotion),
      uiScale: oneOf(s.uiScale, UI_SCALE_STEPS, d.uiScale),
      colorAssist: flag(s.colorAssist, d.colorAssist),
      defaultSpeed: oneOf(s.defaultSpeed, [1, 2, 3] as const, d.defaultSpeed),
      screenShake: flag(s.screenShake, d.screenShake),
    };
  } catch {
    return { ...d };
  }
}

type Listener = (next: Settings, patch: Partial<Settings>) => void;
const listeners = new Set<Listener>();

/** Called after every saved change, with the whole result and the fields that changed; returns an unsubscribe. */
export function onSettings(f: Listener): () => void {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

/** Saves a change on top of the current settings, tells every listener, and returns the result. */
export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage unavailable: the setting lasts for this page only */ }
  for (const f of listeners) f(next, patch);
  return next;
}

/** The settings screen's view of the record. */
export const settingsStore: SettingsStore = {
  get: () => loadSettings(),
  set: (patch) => { saveSettings(patch); },
};
