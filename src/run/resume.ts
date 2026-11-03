// Save and resume (SPEC §8.9). The run state autosaves at every node boundary, and `loadRun` reads it
// through `migrateRun`. A run's battle isn't saved yet: a reload restarts it at round 1's planning, and a
// battle save left by an older build is cleared, until S8 saves battles between rounds (T095, T096).
import type { Content } from '../sim/index.ts';
import { migrateRun } from './migrate.ts';
import type { LoadedRun } from './migrate.ts';
import type { RunState } from './runState.ts';
import type { Storage } from './storage.ts';

export const RUN_KEY = 'spore-sprawl.run.v1';
export const BATTLE_KEY = 'spore-sprawl.battle.v1';

export function saveRun(storage: Storage, run: RunState): void {
  storage.set(RUN_KEY, JSON.stringify(run));
}

/**
 * The saved run, migrated to today's version with a notice when it was saved before (§8.9), or no save, or an
 * unreadable one: the title tells the two apart, and never overwrites an unreadable save unasked (A084).
 */
export function loadRun(storage: Storage, content: Content): { kind: 'none' } | LoadedRun {
  const text = storage.get(RUN_KEY);
  if (!text) return { kind: 'none' };
  return migrateRun(content, text);
}

export function clearRun(storage: Storage): void {
  storage.remove(RUN_KEY);
  storage.remove(BATTLE_KEY);
}

export function clearBattle(storage: Storage): void {
  storage.remove(BATTLE_KEY);
}
