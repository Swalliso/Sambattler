// What the round guardrails' files share (SPEC §12.3; R2a/T122): a verdict asserted with its readings printed, and
// the pool their round jobs play on (`tools/lib/pool.ts`, R2-Q9). The readings go to stdout, which vitest shows on a
// pass too; it hides a passing test's `console.log`. Every file's timeouts come from its measured runtime, in
// `docs/balance-backlog.md`.
import { afterAll, beforeAll, expect } from 'vitest';
import type { Verdict } from '../../tools/lib/balance.ts';
import { defaultWorkers, roundPool } from '../../tools/lib/pool.ts';
import type { RoundRunner } from '../../tools/lib/balance.ts';

export function assertVerdict(v: Verdict): void {
  process.stdout.write(`${v.pass ? 'PASS' : 'FAIL'} ${v.id}: ${v.summary}\n  ${v.details.join('\n  ')}\n`);
  expect(v.pass, `${v.id} failed:\n${v.details.join('\n')}`).toBe(true);
}

/** A pool of round workers for the file, built from the proto `spec`, opened before its tests and closed after them. */
export function filePool(spec = ''): { run: RoundRunner } {
  let pool: ReturnType<typeof roundPool> | undefined;
  beforeAll(() => { pool = roundPool(spec, defaultWorkers()); });
  afterAll(async () => { await pool?.close(); });
  return { run: (jobs) => pool!.run(jobs) };
}
