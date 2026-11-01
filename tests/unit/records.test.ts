// The profile store (src/meta/records.ts, SPEC §9.7, §13.8): one key, spore-sprawl/profile/v1, that holds
// meta only. records-1 keeps the last setup in it. Every write loads the key, applies a pure change and
// saves; a corrupt record is copied raw to the .bak key, and a newer build's record is never overwritten.
// Run it back (SPEC §16 M6) starts the next run from a setup that the content still allows.
import { describe, expect, it } from 'vitest';
import { PROFILE_BACKUP_KEY, PROFILE_KEY, loadRecords, runItBackSetup, setLastSetup, updateRecords } from '../../src/meta/index.ts';
import type { ProfileV1 } from '../../src/meta/index.ts';
import { MemoryStorage, createRun } from '../../src/run/index.ts';
import { DEFAULT_COMMANDER } from '../../src/sim/index.ts';
import { content } from '../helpers.ts';

const stored = (s: MemoryStorage): unknown => JSON.parse(s.get(PROFILE_KEY)!);

describe('the profile store', () => {
  it('keeps the profile under keys that never change', () => {
    expect(PROFILE_KEY).toBe('spore-sprawl/profile/v1');
    expect(PROFILE_BACKUP_KEY).toBe('spore-sprawl/profile/v1.bak');
  });

  it('loads { v: 1 } from empty storage, and a change that leaves it as it was writes nothing', () => {
    const s = new MemoryStorage();
    expect(loadRecords(s)).toEqual({ v: 1 });
    expect(updateRecords(s, (rec) => ({ ...rec }))).toEqual({ v: 1 });
    expect(s.get(PROFILE_KEY)).toBeNull();
  });

  it('saves the last setup through updateRecords, and the next load returns it', () => {
    const s = new MemoryStorage();
    const before = loadRecords(s);
    expect(updateRecords(s, (rec) => setLastSetup(rec, { commander: 'armilla', bans: ['scythecapGrove'] })))
      .toEqual({ v: 1, lastSetup: { commander: 'armilla', bans: ['scythecapGrove'] } });
    expect(before).toEqual({ v: 1 }); // the change is pure
    expect(stored(s)).toEqual({ v: 1, lastSetup: { commander: 'armilla', bans: ['scythecapGrove'] } });
    expect(loadRecords(s)).toEqual({ v: 1, lastSetup: { commander: 'armilla', bans: ['scythecapGrove'] } });
    updateRecords(s, (rec) => setLastSetup(rec, { commander: 'cordis', bans: [] }));
    expect(loadRecords(s).lastSetup).toEqual({ commander: 'cordis', bans: [] });
    expect(s.get(PROFILE_BACKUP_KEY)).toBeNull();
  });

  it('applies each change to the key as it stands, so features sharing it keep each other\'s updates', () => {
    const s = new MemoryStorage();
    updateRecords(s, (rec) => setLastSetup(rec, { commander: 'armilla', bans: [] }));
    // another writer changes the key in between (another tab, or records-2's run records)
    s.set(PROFILE_KEY, JSON.stringify({ ...(stored(s) as object), runs: [{ key: '7:abc' }] }));
    updateRecords(s, (rec) => setLastSetup(rec, { commander: 'vesper', bans: ['scythecapGrove'] }));
    expect(stored(s)).toEqual({ v: 1, runs: [{ key: '7:abc' }], lastSetup: { commander: 'vesper', bans: ['scythecapGrove'] } });
  });

  it('copies a corrupt record raw to the .bak key and loads the defaults', () => {
    const corrupt = ['{not json', '', '[1,2]', 'null', '"vesper"', '{"lastSetup":{"commander":"vesper","bans":[]}}', '{"v":"1"}', '{"v":0}'];
    for (const text of corrupt) {
      const s = new MemoryStorage();
      s.set(PROFILE_KEY, text);
      expect(loadRecords(s), text).toEqual({ v: 1 });
      expect(s.get(PROFILE_BACKUP_KEY), text).toBe(text);
      // the next write replaces the corrupt record, and the backup stays
      updateRecords(s, (rec) => setLastSetup(rec, { commander: 'vesper', bans: [] }));
      expect(stored(s), text).toEqual({ v: 1, lastSetup: { commander: 'vesper', bans: [] } });
      expect(s.get(PROFILE_BACKUP_KEY), text).toBe(text);
    }
  });

  it('keeps unknown fields, and unknown commander and building ids in lastSetup, through a load and a save', () => {
    const s = new MemoryStorage();
    const record = {
      v: 1, runs: [{ key: '7:abc', outcome: 'victory' }], codex: ['sporelingBurrow'], later: { x: 1 },
      lastSetup: { commander: 'mycelia', bans: ['glowcapSpire', 'scythecapGrove'], traits: ['deepRoots'] },
    };
    s.set(PROFILE_KEY, JSON.stringify(record));
    expect(loadRecords(s)).toEqual(record);
    // a change to another field (records-2's codex, say) saves the rest as it was
    updateRecords(s, (rec) => ({ ...rec, codex: [...(rec as ProfileV1 & { codex: string[] }).codex, 'gillNest'] }));
    expect(stored(s)).toEqual({ ...record, codex: ['sporelingBurrow', 'gillNest'] });
    // a new setup replaces lastSetup only
    updateRecords(s, (rec) => setLastSetup(rec, { commander: 'vesper', bans: [] }));
    expect(stored(s)).toEqual({ ...record, codex: ['sporelingBurrow', 'gillNest'], lastSetup: { commander: 'vesper', bans: [] } });
  });

  it('fills a missing or malformed lastSetup with its default, and keeps only string bans', () => {
    const load = (record: object) => {
      const s = new MemoryStorage();
      s.set(PROFILE_KEY, JSON.stringify(record));
      return loadRecords(s);
    };
    expect(load({ v: 1, lastSetup: 'armilla' })).toEqual({ v: 1 });
    expect(load({ v: 1, lastSetup: { bans: ['scythecapGrove'] } })).toEqual({ v: 1 });
    expect(load({ v: 1, lastSetup: { commander: 'armilla' } })).toEqual({ v: 1, lastSetup: { commander: 'armilla', bans: [] } });
    expect(load({ v: 1, lastSetup: { commander: 'armilla', bans: ['scythecapGrove', 3, null] } }))
      .toEqual({ v: 1, lastSetup: { commander: 'armilla', bans: ['scythecapGrove'] } });
  });

  it('loads a record from a newer build read-only: updateRecords writes nothing', () => {
    const s = new MemoryStorage();
    const text = JSON.stringify({ v: 2, lastSetup: { commander: 'armilla', bans: ['scythecapGrove'] }, spores: 40 });
    s.set(PROFILE_KEY, text);
    expect(loadRecords(s)).toEqual({ v: 2, lastSetup: { commander: 'armilla', bans: ['scythecapGrove'] }, spores: 40 });
    expect(updateRecords(s, (rec) => setLastSetup(rec, { commander: 'vesper', bans: [] })).lastSetup)
      .toEqual({ commander: 'armilla', bans: ['scythecapGrove'] });
    expect(s.get(PROFILE_KEY)).toBe(text);
    expect(s.get(PROFILE_BACKUP_KEY)).toBeNull();
  });
});

describe('Run it back', () => {
  it('falls back to the default commander, with no bans, for an unknown commander or no setup', () => {
    expect(runItBackSetup(content, { commander: 'nobody', bans: [] })).toEqual({ commander: DEFAULT_COMMANDER, bans: [] });
    expect(runItBackSetup(content, { commander: 'nobody', bans: ['scythecapGrove'] })).toEqual({ commander: DEFAULT_COMMANDER, bans: ['scythecapGrove'] });
    expect(runItBackSetup(content, undefined)).toEqual({ commander: DEFAULT_COMMANDER, bans: [] });
  });

  it("keeps each ban banProblem() still accepts, in order: a ban in the commander's core drops", () => {
    expect(runItBackSetup(content, { commander: 'vesper', bans: ['rootbreakerDen', 'scythecapGrove'] })).toEqual({ commander: 'vesper', bans: ['scythecapGrove'] });
    // a building outside the roster, a repeat and a fourth ban drop too
    expect(runItBackSetup(content, { commander: 'armilla', bans: ['glowcapSpire', 'scythecapGrove', 'gillNest', 'scythecapGrove', 'tendersRing', 'morelWarren'] }))
      .toEqual({ commander: 'armilla', bans: ['scythecapGrove', 'gillNest', 'tendersRing'] });
  });

  it('gives a setup that createRun() accepts', () => {
    const setup = runItBackSetup(content, { commander: 'cordis', bans: ['scythecapGrove', 'hammercapForge'] });
    expect(setup).toEqual({ commander: 'cordis', bans: ['hammercapForge'] });
    expect(createRun(content, { seed: 1, ...setup })).toMatchObject({ commander: 'cordis', bans: ['hammercapForge'] });
  });
});
