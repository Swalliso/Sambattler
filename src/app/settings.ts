// Player settings kept in localStorage (the M8 settings screen will own these; the profile save
// arrives in M6). Reads and writes never throw: a private window or blocked storage falls back to
// the defaults.
import type { DamageNumbers } from '../render/renderer.ts';
import { storageKey } from './channel.ts';

const KEY = storageKey('spore-sprawl/settings/v1');

export interface Settings {
  damageNumbers: DamageNumbers;
  /** Sound (SPEC §13.9): volumes from 0 to 1, and mute. */
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { damageNumbers: 'off', masterVolume: 0.6, sfxVolume: 0.8, ambientVolume: 0.5, muted: false };

const volume = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);

/** Settings saved before a field existed load with that field's default. */
export function loadSettings(): Settings {
  const d = DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    const s = (raw ? JSON.parse(raw) : {}) as Partial<Record<keyof Settings, unknown>>;
    const dn = s.damageNumbers;
    return {
      damageNumbers: dn === 'big' || dn === 'all' || dn === 'off' ? dn : d.damageNumbers,
      masterVolume: volume(s.masterVolume, d.masterVolume),
      sfxVolume: volume(s.sfxVolume, d.sfxVolume),
      ambientVolume: volume(s.ambientVolume, d.ambientVolume),
      muted: typeof s.muted === 'boolean' ? s.muted : d.muted,
    };
  } catch {
    return { ...d };
  }
}

/** Saves a change on top of the current settings and returns the result. */
export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage unavailable: the setting lasts for this page only */ }
  return next;
}
