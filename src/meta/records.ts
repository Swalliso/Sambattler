// The profile record (SPEC §9.7, §13.8): meta only, under one key that never changes. Run it back's
// records-1 keeps the last setup in it; records-2 adds the run records and the codex, and M6 migrates
// the record to a later version under the same key. Every write goes through updateRecords(), which
// loads the key, applies a pure change and saves in one synchronous step, so no screen holds a copy
// across another and the features sharing the key never lose each other's updates. The app passes
// the Storage in (SPEC §13.2).
import type { Storage } from '../run/index.ts';

export const PROFILE_KEY = 'spore-sprawl/profile/v1';
/** Where a corrupt record is copied, raw, before the defaults load (SPEC §9.7). */
export const PROFILE_BACKUP_KEY = 'spore-sprawl/profile/v1.bak';
/** The record version this build reads and writes. */
export const PROFILE_VERSION = 1;

/** The setup a run began with (SPEC §8.1): its commander and bans, with room for M6's traits and strains and M7's blights (M6-Q7). */
export interface SetupRecord {
  commander: string;
  bans: string[];
  traits?: string[];
  strains?: Record<string, string>;
  blights?: Record<string, number>;
}

/** The profile, version 1 (SPEC §9.7). Fields this build doesn't know, records-2's or a newer build's, load and save untouched. */
export interface ProfileV1 {
  /** PROFILE_VERSION, or a newer build's version: that record loads read-only and is never overwritten. */
  v: number;
  /** The commander and bans of the last run begun (records-1). */
  lastSetup?: SetupRecord;
}

type Raw = Record<string, unknown>;
const isObject = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x);

/** The stored record, or null if it's corrupt: unparseable, or not an object with a version. */
function parse(text: string): Raw | null {
  try {
    const raw: unknown = JSON.parse(text);
    return isObject(raw) && Number.isInteger(raw.v) && (raw.v as number) >= 1 ? raw : null;
  } catch {
    return null;
  }
}

/** A stored setup needs a commander; its bans keep only the strings, and its other fields stay. */
function setupOf(x: unknown): SetupRecord | undefined {
  if (!isObject(x) || typeof x.commander !== 'string') return undefined;
  const bans = Array.isArray(x.bans) ? x.bans.filter((b): b is string => typeof b === 'string') : [];
  return { ...x, commander: x.commander, bans } as SetupRecord;
}

function read(storage: Storage): { rec: ProfileV1; readOnly: boolean } {
  const text = storage.get(PROFILE_KEY);
  if (text === null) return { rec: { v: PROFILE_VERSION }, readOnly: false };
  const raw = parse(text);
  if (!raw) {
    storage.set(PROFILE_BACKUP_KEY, text);
    return { rec: { v: PROFILE_VERSION }, readOnly: false };
  }
  const { lastSetup, ...rest } = raw;
  const setup = setupOf(lastSetup);
  const rec: ProfileV1 = { ...rest, v: raw.v as number, ...(setup ? { lastSetup: setup } : {}) };
  return { rec, readOnly: rec.v > PROFILE_VERSION };
}

/**
 * The profile as stored, read as forgivingly as loadSettings(): fields it doesn't know stay, and missing
 * ones take their defaults, so empty storage loads `{ v: 1 }`. A corrupt record is copied raw to
 * PROFILE_BACKUP_KEY, and the defaults load.
 */
export function loadRecords(storage: Storage): ProfileV1 {
  return read(storage).rec;
}

/**
 * The one way to write the profile: loads the key as it stands, applies the pure `change` and saves, in
 * one synchronous step. It writes nothing when the record is a newer build's or the change leaves it as
 * it was. Returns the record as it now stands.
 */
export function updateRecords(storage: Storage, change: (rec: ProfileV1) => ProfileV1): ProfileV1 {
  const { rec, readOnly } = read(storage);
  if (readOnly) return rec;
  const before = JSON.stringify(rec);
  const next = change(rec);
  const text = JSON.stringify(next);
  if (text !== before) storage.set(PROFILE_KEY, text);
  return next;
}

/** The record with `setup` as its last setup, a change for updateRecords(). */
export function setLastSetup(rec: ProfileV1, setup: SetupRecord): ProfileV1 {
  return { ...rec, lastSetup: { ...setup, bans: [...setup.bans] } };
}
