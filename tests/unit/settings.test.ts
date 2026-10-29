// Player settings (src/app/settings.ts): one key, spore-sprawl/settings/v1, that older saves keep
// loading from as fields are added (sound arrived with SPEC §13.9, the settings screen's fields with
// docs/ui-ux-plan.md Phase 3, tips and spawn timers with the clarity pass). The first-time tips already
// shown live apart, under spore-sprawl/tips/v1.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, markTipShown, onSettings, resetTips, saveSettings, tipsShown } from '../../src/app/settings.ts';

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

  it('loads a record from before the settings screen with its new fields at their defaults', () => {
    const old = { damageNumbers: 'all', masterVolume: 0.3, sfxVolume: 0.8, ambientVolume: 0.5, muted: true };
    store.set(KEY, JSON.stringify(old));
    expect(loadSettings()).toEqual({ ...old, reducedMotion: 'system', uiScale: 'auto', colorAssist: false, defaultSpeed: 1, screenShake: false, tips: true, spawnTimers: true });
  });

  it('loads tips and spawn timers, on by default, and drops values of the wrong type', () => {
    store.set(KEY, JSON.stringify({ tips: false, spawnTimers: false }));
    expect(loadSettings()).toMatchObject({ tips: false, spawnTimers: false });
    store.set(KEY, JSON.stringify({ tips: 'no', spawnTimers: 0 }));
    expect(loadSettings()).toMatchObject({ tips: true, spawnTimers: true });
  });

  it('remembers shown tips under their own key, and forgets them all on "Show tips again"', () => {
    store.set(KEY, JSON.stringify({ tips: true }));
    markTipShown('frontier');
    markTipShown('storm');
    markTipShown('frontier');
    expect([...tipsShown()]).toEqual(['frontier', 'storm']);
    expect(JSON.parse(store.get('spore-sprawl/tips/v1')!)).toEqual({ shown: ['frontier', 'storm'] });
    resetTips();
    expect(tipsShown().size).toBe(0);
    // the settings record is untouched
    expect(JSON.parse(store.get(KEY)!)).toEqual({ tips: true });
    store.set('spore-sprawl/tips/v1', '{"shown": [1, "hold"]}');
    expect([...tipsShown()]).toEqual(['hold']);
  });

  it('keeps known choices and drops unknown ones', () => {
    store.set(KEY, JSON.stringify({ reducedMotion: 'on', uiScale: 1.75, colorAssist: true, defaultSpeed: 3, screenShake: true }));
    expect(loadSettings()).toMatchObject({ reducedMotion: 'on', uiScale: 1.75, colorAssist: true, defaultSpeed: 3, screenShake: true });
    store.set(KEY, JSON.stringify({ reducedMotion: 'maybe', uiScale: 1.3, colorAssist: 1, defaultSpeed: '2', screenShake: null }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('tells listeners what changed, until they unsubscribe', () => {
    const seen: [boolean, string[]][] = [];
    const off = onSettings((next, patch) => seen.push([next.colorAssist, Object.keys(patch)]));
    saveSettings({ colorAssist: true });
    off();
    saveSettings({ colorAssist: false });
    expect(seen).toEqual([[true, ['colorAssist']]]);
  });

  it('falls back to the defaults when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings({ muted: true })).not.toThrow();
  });
});
