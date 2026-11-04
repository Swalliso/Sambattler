// Plays the long checks' jobs in worker threads: round jobs, the battles, clashes and supply duels the
// guardrails play (playRoundJob in tools/lib/balance.ts, T117), R1's clash-check clashes (clashRecord in
// tools/lib/clash.ts), and whole runs for G14 and G15 (playRunJob, R2b/T121). Every worker builds its content
// from the same proto spec and every job is deterministic,
// so a pooled run returns exactly what an in-process run does, in job order. A clash job carries both armies,
// built in the main thread, so workers need no bot content.
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import type { Content } from '../../src/data/registry.ts';
import { playRoundJob, playRunJob } from './balance.ts';
import type { ClashRunner, RoundJob, RoundJobResult, RoundRunner, RunJob, RunRecord, RunRunner } from './balance.ts';
import { clashRecord } from './clash.ts';
import type { ClashJob, ClashRecord } from './clash.ts';
import { protoContent } from './content.ts';

/** A job for a worker: a round job, one of the clash check's clashes, or a whole run (R2b/T121). */
export type PoolJob = RoundJob | { kind: 'clashRecord'; job: ClashJob } | { kind: 'run'; job: RunJob };

/** The default pool size: half the machine's threads, leaving room for other work. */
export function defaultWorkers(): number {
  return Math.max(1, Math.floor(availableParallelism() / 2));
}

/** Plays one job, as a worker does: a round job's result, a clash check's record, or a run's. */
export function dispatch(content: Content, job: PoolJob): RoundJobResult | ClashRecord | RunRecord {
  if (job.kind === 'clashRecord') return clashRecord(content, job.job);
  if (job.kind === 'run') return playRunJob(content, job.job);
  return playRoundJob(content, job);
}

/**
 * A worker's flags: under `tsx` it inherits the parent's loader; elsewhere, as in the slow suite's vitest workers
 * (R2a/T122), it registers `tsx` itself, since Node's own type stripping refuses the parameter properties some
 * modules in the content's import graph use.
 */
function workerArgv(): { execArgv?: string[] } {
  return process.execArgv.some((a) => a.includes('tsx')) ? {} : { execArgv: [...process.execArgv, '--import', 'tsx'] };
}

/** `size` workers, each with `protoContent(spec)`, for jobs of any kind. `run` takes one batch at a time; `close` ends them. */
function jobPool(spec: string, size: number): { run: (jobs: PoolJob[]) => Promise<unknown[]>; close: () => Promise<void> } {
  const workers = Array.from({ length: size }, () => new Worker(new URL(import.meta.url), { workerData: { jobPool: true, spec }, ...workerArgv() }));
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

/** `size` workers playing the clash check's clashes. */
export function clashPool(spec: string, size: number): { run: ClashRunner; close: () => Promise<void> } {
  const pool = jobPool(spec, size);
  return { run: (jobs) => pool.run(jobs.map((job) => ({ kind: 'clashRecord', job }))) as Promise<ClashRecord[]>, close: pool.close };
}

/** Plays the clash check's clashes in this thread, with the same records as `clashPool`. */
export function inProcessClashes(content: Content): ClashRunner {
  return (jobs) => Promise.resolve(jobs.map((job) => clashRecord(content, job)));
}

/** `size` workers playing round jobs: battles, clashes and supply duels in rounds (T117). */
export function roundPool(spec: string, size: number): { run: RoundRunner; close: () => Promise<void> } {
  const pool = jobPool(spec, size);
  return { run: (jobs) => pool.run(jobs) as Promise<RoundJobResult[]>, close: pool.close };
}

/** Plays the round jobs in this thread, with the same results as `roundPool`. */
export function inProcessRounds(content: Content): RoundRunner {
  return (jobs) => Promise.resolve(jobs.map((job) => playRoundJob(content, job)));
}

/** `size` workers playing whole runs (R2b/T121, A102), each run's record the same as in process (`inProcessRuns`). */
export function runJobPool(spec: string, size: number): { run: RunRunner; close: () => Promise<void> } {
  const pool = jobPool(spec, size);
  return { run: (jobs) => pool.run(jobs.map((job): PoolJob => ({ kind: 'run', job }))) as Promise<RunRecord[]>, close: pool.close };
}

/** Plays whole runs in this thread, with the same records as `runJobPool`. */
export function inProcessRuns(content: Content): RunRunner {
  return (jobs) => Promise.resolve(jobs.map((job) => playRunJob(content, job)));
}

const data = workerData as { jobPool?: boolean; spec: string } | null;
if (!isMainThread && data?.jobPool) {
  const content = protoContent(data.spec);
  parentPort!.on('message', ({ i, job }: { i: number; job: PoolJob }) => {
    parentPort!.postMessage({ i, result: dispatch(content, job) });
  });
}
