// Player settings (src/app/settings.ts): one key, spore-sprawl/settings/v1, that older saves keep
// loading from as fields are added (sound arrived with SPEC §13.9).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/app/settings.ts';

const KEY = 'spore-sprawl/settings/v1';
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('settings', () => {
  it('loads a save from before sound with the new defaults', () => {
    store.set(KEY, JSON.stringify({ damageNumbers: 'big' }));
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, damageNumbers: 'big' });
    expect(DEFAULT_SETTINGS).toMatchObject({ masterVolume: 0.6, muted: false });
  });

  it('clamps volumes and ignores values of the wrong type', () => {
    store.set(KEY, JSON.stringify({ masterVolume: 3, sfxVolume: -1, ambientVolume: 'loud', muted: 'yes', damageNumbers: 'some' }));
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, masterVolume: 1, sfxVolume: 0 });
    store.set(KEY, '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saves a change on top of what is there, under the same key', () => {
    store.set(KEY, JSON.stringify({ damageNumbers: 'all' }));
    saveSettings({ muted: true });
    saveSettings({ ambientVolume: 0.25 });
    expect(JSON.parse(store.get(KEY)!)).toEqual({ ...DEFAULT_SETTINGS, damageNumbers: 'all', muted: true, ambientVolume: 0.25 });
    expect([...store.keys()]).toEqual([KEY]);
  });

  it('falls back to the defaults when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings({ muted: true })).not.toThrow();
  });
});
