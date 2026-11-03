// Plays the long checks' jobs in worker threads: G3 cells (g3Row in tools/lib/balance.ts), R1's
// clashes (playClash in tools/lib/clash.ts) and R2a's round jobs, battles, clashes and supply duels in rounds
// (playRoundJob in tools/lib/rounds/balance.ts, T117). Every worker builds its content from the same proto spec
// and every job is deterministic, so a pooled run returns exactly what an in-process run does, in job
// order. A clash job carries both armies, built in the main thread, so workers need no bot content.
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import type { Content } from '../../src/data/registry.ts';
import { g3Row } from './balance.ts';
import type { ClashRunner, G3Job, G3Row, RowRunner } from './balance.ts';
import { playClash } from './clash.ts';
import type { ClashJob, ClashRecord } from './clash.ts';
import { protoContent } from './content.ts';
import { playRoundJob } from './rounds/balance.ts';
import type { RoundJob, RoundJobResult, RoundRunner } from './rounds/balance.ts';

/** A job for a worker: one G3 cell, one clash, or one round job. */
export type PoolJob = { kind: 'g3'; job: G3Job } | { kind: 'clash'; job: ClashJob } | { kind: 'rounds'; job: RoundJob };

/** The default pool size: half the machine's threads, leaving room for other work. */
export function defaultWorkers(): number {
  return Math.max(1, Math.floor(availableParallelism() / 2));
}

/** Plays one job, as a worker does: a G3 cell's row, a clash's record, or a round job's result. */
export function dispatch(content: Content, job: PoolJob): G3Row | ClashRecord | RoundJobResult {
  if (job.kind === 'clash') return playClash(content, job.job);
  if (job.kind === 'rounds') return playRoundJob(content, job.job);
  const { map, id, seeds, defender, firstSeed } = job.job;
  return g3Row(content, map, id, seeds, defender, firstSeed);
}

/** `size` workers, each with `protoContent(spec)`, for jobs of any kind. `run` takes one batch at a time; `close` ends them. */
function jobPool(spec: string, size: number): { run: (jobs: PoolJob[]) => Promise<unknown[]>; close: () => Promise<void> } {
  const workers = Array.from({ length: size }, () => new Worker(new URL(import.meta.url), { workerData: { jobPool: true, spec } }));
  const run = (jobs: PoolJob[]) => new Promise<unknown[]>((resolve, reject) => {
    const out: unknown[] = [];
    let next = 0, done = 0, failed = false;
    if (!jobs.length) { resolve(out); return; }
    const feed = (w: Worker) => { if (next < jobs.length) w.postMessage({ i: next, job: jobs[next++] }); };
    const onMessage = (w: Worker) => ({ i, result }: { i: number; result: unknown }) => {
      out[i] = result;
      if (++done === jobs.length) { stop(); resolve(out); } else feed(w);
    };
    const onError = (e: Error) => { if (!failed) { failed = true; stop(); reject(e); } };
    const handlers = workers.map((w) => ({ w, message: onMessage(w) }));
    const stop = () => { for (const { w, message } of handlers) { w.off('message', message); w.off('error', onError); } };
    for (const { w, message } of handlers) { w.on('message', message); w.on('error', onError); feed(w); }
  });
  return { run, close: async () => { await Promise.all(workers.map((w) => w.terminate())); } };
}

/** `size` workers playing G3 cells. */
export function rowPool(spec: string, size: number): { run: RowRunner; close: () => Promise<void> } {
  const pool = jobPool(spec, size);
  return { run: (jobs) => pool.run(jobs.map((job) => ({ kind: 'g3', job }))) as Promise<G3Row[]>, close: pool.close };
}

/** `size` workers playing clashes. */
export function clashPool(spec: string, size: number): { run: ClashRunner; close: () => Promise<void> } {
  const pool = jobPool(spec, size);
  return { run: (jobs) => pool.run(jobs.map((job) => ({ kind: 'clash', job }))) as Promise<ClashRecord[]>, close: pool.close };
}

/** Plays the clashes in this thread, with the same records as `clashPool`. */
export function inProcessClashes(content: Content): ClashRunner {
  return (jobs) => Promise.resolve(jobs.map((job) => playClash(content, job)));
}

/** `size` workers playing round jobs: battles, clashes and supply duels in rounds (T117). */
export function roundPool(spec: string, size: number): { run: RoundRunner; close: () => Promise<void> } {
  const pool = jobPool(spec, size);
  return { run: (jobs) => pool.run(jobs.map((job) => ({ kind: 'rounds', job }))) as Promise<RoundJobResult[]>, close: pool.close };
}

/** Plays the round jobs in this thread, with the same results as `roundPool`. */
export function inProcessRounds(content: Content): RoundRunner {
  return (jobs) => Promise.resolve(jobs.map((job) => playRoundJob(content, job)));
}

const data = workerData as { jobPool?: boolean; spec: string } | null;
if (!isMainThread && data?.jobPool) {
  const content = protoContent(data.spec);
  parentPort!.on('message', ({ i, job }: { i: number; job: PoolJob }) => {
    parentPort!.postMessage({ i, result: dispatch(content, job) });
  });
}
