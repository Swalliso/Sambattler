// Player settings kept in localStorage (the M8 settings screen will own these; the profile save
// arrives in M6). Reads and writes never throw: a private window or blocked storage falls back to
// the defaults.
import type { DamageNumbers } from '../render/renderer.ts';
import { storageKey } from './channel.ts';

const KEY = storageKey('spore-sprawl/settings/v1');

export interface Settings { damageNumbers: DamageNumbers }

const DEFAULTS: Settings = { damageNumbers: 'off' };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    const dn = s.damageNumbers;
    return { damageNumbers: dn === 'big' || dn === 'all' || dn === 'off' ? dn : DEFAULTS.damageNumbers };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* storage unavailable: the setting lasts for this page only */ }
}
