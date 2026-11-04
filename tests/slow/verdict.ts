// What the round guardrails' files share (SPEC §12.3; R2a/T122): a verdict asserted with its readings printed, and
// the pools their jobs play on (`tools/lib/pool.ts`, R2-Q9): round jobs, and whole runs for G14 and G15 (R2b/T121).
// The readings go to stdout, which vitest shows on a pass too; it hides a passing test's `console.log`. Every file's
// timeouts come from its measured runtime, in `docs/balance-backlog.md`.
import { afterAll, beforeAll, expect } from 'vitest';
import type { RoundRunner, RunRunner, Verdict } from '../../tools/lib/balance.ts';
import { defaultWorkers, roundPool, runJobPool } from '../../tools/lib/pool.ts';

/**
 * A known miss (R2b/T168, the user, 2026-11-03): it asserts as an expected fail, its numbers printed, and the test
 * fails once it passes, so a fix shows and its owner turns it back into an assert.
 */
export interface KnownMiss {
  /** Who fixes it: S14's tuning (T169), R3's copies or R3's combos. */
  owner: string;
  /** The clauses that miss, when the rest of the verdict must pass (`Verdict.clauses`); the whole verdict when unset. */
  clauses?: string[];
}

export function assertVerdict(v: Verdict, known?: KnownMiss): void {
  const miss = known ? ` (a known miss${known.clauses ? `: ${known.clauses.join(', ')}` : ''}, until ${known.owner})` : '';
  process.stdout.write(`${v.pass ? 'PASS' : 'FAIL'} ${v.id}${miss}: ${v.summary}\n  ${v.details.join('\n  ')}\n`);
  if (!known) {
    expect(v.pass, `${v.id} failed:\n${v.details.join('\n')}`).toBe(true);
    return;
  }
  if (!known.clauses) {
    expect(v.pass, `${v.id} passes now: make it an assert again (T168; ${known.owner})`).toBe(false);
    return;
  }
  const clauses = v.clauses ?? {};
  expect(known.clauses.filter((c) => !(c in clauses)), `${v.id}'s clauses are ${Object.keys(clauses).join(', ')}`).toEqual([]);
  expect(Object.entries(clauses).filter(([c, pass]) => !pass && !known.clauses!.includes(c)).map(([c]) => c), `${v.id} failed:\n${v.details.join('\n')}`).toEqual([]);
  expect(known.clauses.filter((c) => clauses[c]), `${v.id}'s known miss passes now: make it an assert again (T168; ${known.owner})`).toEqual([]);
}

/** The owners of T168's known misses. */
export const S14 = "S14's tuning (T169)", R3_COPIES = "R3's copies", R3_COMBOS = "R3's combos";

/** A pool of round workers for the file, built from the proto `spec`, opened before its tests and closed after them. */
export function filePool(spec = ''): { run: RoundRunner } {
  let pool: ReturnType<typeof roundPool> | undefined;
  beforeAll(() => { pool = roundPool(spec, defaultWorkers()); });
  afterAll(async () => { await pool?.close(); });
  return { run: (jobs) => pool!.run(jobs) };
}

/** A pool of run workers for the file (R2b/T121), as `filePool`. */
export function runFilePool(spec = ''): { run: RunRunner } {
  let pool: ReturnType<typeof runJobPool> | undefined;
  beforeAll(() => { pool = runJobPool(spec, defaultWorkers()); });
  afterAll(async () => { await pool?.close(); });
  return { run: (jobs) => pool!.run(jobs) };
}
