// runHeadless: steps a battle in a tight loop with no rendering (SPEC §14.6). Commands are fed
// just-in-time (queued right before the step that executes them), exactly as a live player would.
import { nextCommandTick, queueCommand } from './commands.ts';
import { hashState } from './snapshot.ts';
import { step } from './step.ts';
import { summarize } from './summary.ts';
import type { BattleSummary } from './summary.ts';
import type { BattleState, Command } from './state.ts';

export interface HeadlessOptions {
  until: 'end' | number;
  commands?: Command[];
  hashEvery?: number;
  /** Ticks at which to record a full summary (for `--assert path@tick`). */
  recordAt?: number[];
  onTick?: (s: BattleState) => void;
}

export interface HeadlessResult {
  hashes: Record<string, string>;
  finalHash: string;
  summaries: Record<string, BattleSummary>;
  eventCounts: Record<string, number>;
}

function cmpCmd(a: Command, b: Command): number {
  if (a.tick !== b.tick) return a.tick - b.tick;
  if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
  return a.seq - b.seq;
}

export function runHeadless(state: BattleState, opts: HeadlessOptions): HeadlessResult {
  const cmds = [...(opts.commands ?? [])].sort(cmpCmd);
  if (state.phase === 'deploy' && !cmds.some((c) => c.type === 'begin') && !state.queue.some((c) => c.type === 'begin')) {
    cmds.unshift({ tick: 0, side: 'player', seq: -1, type: 'begin' });
  }
  let ci = 0;
  const hashes: Record<string, string> = {};
  const summaries: Record<string, BattleSummary> = {};
  const eventCounts: Record<string, number> = {};
  const record = new Set(opts.recordAt ?? []);
  const until = opts.until;
  let guard = 0;
  while (state.phase !== 'ended' && (until === 'end' || state.tick < until)) {
    const due = nextCommandTick(state);
    while (ci < cmds.length && cmds[ci]!.tick <= due) {
      const c = cmds[ci++]!;
      queueCommand(state, c.seq < 0 ? { ...c, seq: undefined } : c);
    }
    const before = state.tick;
    step(state);
    for (const e of state.events) eventCounts[e.t] = (eventCounts[e.t] ?? 0) + 1;
    if (state.tick !== before) {
      guard = 0;
      if (opts.hashEvery && state.tick % opts.hashEvery === 0) hashes[String(state.tick)] = hashState(state);
      if (record.has(state.tick)) summaries[String(state.tick)] = { ...summarize(state), events: { ...eventCounts } };
      opts.onTick?.(state);
    } else if (state.phase === 'deploy' && ++guard > 1000) {
      throw new Error('runHeadless: deploy phase never ended (no begin command)');
    } else if (state.held && ++guard > 1000) {
      throw new Error(`runHeadless: held for a draft at tick ${state.tick} with no draft command to run`);
    }
  }
  const finalHash = hashState(state);
  if (record.has(state.tick) && !summaries[String(state.tick)]) summaries[String(state.tick)] = { ...summarize(state), events: { ...eventCounts } };
  return { hashes, finalHash, summaries, eventCounts };
}
