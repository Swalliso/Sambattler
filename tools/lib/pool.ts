// Plays G3 cells (g3Row in tools/lib/balance.ts) in worker threads, for the long checks. Every worker
// builds its content from the same proto spec and every cell is deterministic, so a pooled run
// returns exactly what an in-process run does, in job order.
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { g3Row } from './balance.ts';
import type { G3Job, G3Row, RowRunner } from './balance.ts';
import { protoContent } from './content.ts';

/** The default pool size: half the machine's threads, leaving room for other work. */
export function defaultWorkers(): number {
  return Math.max(1, Math.floor(availableParallelism() / 2));
}

/** `size` workers, each with `protoContent(spec)`. `run` takes one batch at a time; `close` ends them. */
export function rowPool(spec: string, size: number): { run: RowRunner; close: () => Promise<void> } {
  const workers = Array.from({ length: size }, () => new Worker(new URL(import.meta.url), { workerData: { rowPool: true, spec } }));
  const run: RowRunner = (jobs) => new Promise((resolve, reject) => {
    const out: G3Row[] = [];
    let next = 0, done = 0, failed = false;
    if (!jobs.length) { resolve(out); return; }
    const feed = (w: Worker) => { if (next < jobs.length) w.postMessage({ i: next, job: jobs[next++] }); };
    const onMessage = (w: Worker) => ({ i, row }: { i: number; row: G3Row }) => {
      out[i] = row;
      if (++done === jobs.length) { stop(); resolve(out); } else feed(w);
    };
    const onError = (e: Error) => { if (!failed) { failed = true; stop(); reject(e); } };
    const handlers = workers.map((w) => ({ w, message: onMessage(w) }));
    const stop = () => { for (const { w, message } of handlers) { w.off('message', message); w.off('error', onError); } };
    for (const { w, message } of handlers) { w.on('message', message); w.on('error', onError); feed(w); }
  });
  return { run, close: async () => { await Promise.all(workers.map((w) => w.terminate())); } };
}

const data = workerData as { rowPool?: boolean; spec: string } | null;
if (!isMainThread && data?.rowPool) {
  const content = protoContent(data.spec);
  parentPort!.on('message', ({ i, job }: { i: number; job: G3Job }) => {
    parentPort!.postMessage({ i, row: g3Row(content, job.map, job.id, job.seeds, job.defender, job.firstSeed) });
  });
}
