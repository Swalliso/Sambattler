// runHeadless for a battle in rounds (SPEC §14.6, §15.2, §15.5): it steps the battle by phase in a tight loop
// with no rendering. Commands are fed just in time, each queued right before the step that runs it, as a live
// player would queue it: a planning command in its round's planning, a clash command before its tick. It
// records hashes and summaries at plan Call 17's checkpoints, and a planning phase that never Begins throws
// rather than looping.
import { queueCommand } from './commands.ts';
import { hashState } from './snapshot.ts';
import { step } from './step.ts';
import { summarize } from './summary.ts';
import type { RoundSummary } from './summary.ts';
import type { BattleState, Command } from './state.ts';

/** Where a run stops (plan Call 7): the battle's end, the end of round n, or tick t of round n's clash, counted from the clash's start. */
export type HeadlessUntil = 'end' | { round: number; tick?: number };

export interface HeadlessOptions {
  until: HeadlessUntil;
  /** A human's or a replay's commands. One already queued or run (by side and seq) is skipped, so a log replays onto a state that ran part of it. */
  commands?: Command[];
  /**
   * Hashes the state at each phase's checkpoint, `r<n>.planning`, `r<n>.clash` and `r<n>.aftermath`, and every
   * `hashEvery` ticks of each clash, `r<n>:<t>` with t counted from the clash's start (plan Call 17).
   */
  hashEvery?: number;
  /** Checkpoints to record a summary at (`--assert path@r<n>`): any key above, or `r<n>` for the end of round n's aftermath. */
  recordAt?: string[];
  /** After each clash tick. */
  onTick?: (s: BattleState) => void;
}

export interface HeadlessResult {
  /** In battle order. */
  hashes: Record<string, string>;
  finalHash: string;
  summaries: Record<string, RoundSummary & { events: Record<string, number> }>;
  /** The events of every step run, and those the state held as the run began, such as round 1's opening. */
  eventCounts: Record<string, number>;
}

function byStamp(a: Command, b: Command): number {
  if (a.round !== b.round) return a.round - b.round;
  if (a.tick !== b.tick) return a.tick - b.tick;
  if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
  return a.seq - b.seq;
}

/** Whether a command runs at the next step: in planning, one stamped for this round; in a clash, one for its next tick. */
function dueNext(state: BattleState, c: Command): boolean {
  if (state.phase !== 'planning' && state.phase !== 'clash') return false;
  const tick = state.phase === 'clash' ? state.tick + 1 : state.tick;
  return c.round < state.round || (c.round === state.round && c.tick <= tick);
}

const sameCommand = (a: Command, b: Command): boolean => a.side === b.side && a.seq === b.seq;

function reached(state: BattleState, until: HeadlessUntil): boolean {
  if (until === 'end') return false;
  if (state.round !== until.round) return state.round > until.round;
  if (state.phase === 'aftermath' || state.phase === 'ended') return true;
  return until.tick !== undefined && state.phase === 'clash' && state.tick - state.clash!.startTick >= until.tick;
}

export function runHeadless(state: BattleState, opts: HeadlessOptions): HeadlessResult {
  const cmds = [...(opts.commands ?? [])].sort(byStamp);
  let ci = 0;
  const hashes: Record<string, string> = {};
  const summaries: HeadlessResult['summaries'] = {};
  const eventCounts: Record<string, number> = {};
  const asked = new Set(opts.recordAt ?? []);
  const count = () => { for (const e of state.events) eventCounts[e.t] = (eventCounts[e.t] ?? 0) + 1; };
  const summary = (key: string) => { if (asked.has(key)) summaries[key] = { ...summarize(state), events: { ...eventCounts } }; };
  /** A phase's checkpoint: the aftermath's is also `r<n>` alone, since nothing is simulated in it. An ended battle has none. */
  const checkpoint = () => {
    if (state.phase === 'ended') return;
    const key = `r${state.round}.${state.phase}`;
    if (opts.hashEvery) hashes[key] = hashState(state);
    summary(key);
    if (state.phase === 'aftermath') summary(`r${state.round}`);
  };
  count();
  // a state handed over in planning is taken as its round's planning checkpoint, as `createBattle` and a scenario
  // give it; one in a clash is the clash's checkpoint only before its first tick
  if (state.phase === 'planning' || state.phase === 'aftermath' || (state.phase === 'clash' && state.tick === state.clash!.startTick)) checkpoint();
  while (state.phase !== 'ended' && !reached(state, opts.until)) {
    while (ci < cmds.length && dueNext(state, cmds[ci]!)) {
      const c = cmds[ci++]!;
      if (!state.queue.some((q) => sameCommand(q, c)) && !state.log.some((l) => sameCommand(l, c))) queueCommand(state, c);
    }
    const { phase, tick } = state;
    step(state);
    count();
    if (state.tick !== tick) {
      const t = state.tick - state.clash!.startTick;
      const key = `r${state.round}:${t}`;
      if (opts.hashEvery && t % opts.hashEvery === 0) hashes[key] = hashState(state);
      summary(key);
      opts.onTick?.(state);
    }
    if (state.phase !== phase) checkpoint();
    // in planning the round and the tick stand still, so every command due has run: without a Begin among them, none ever will
    if (phase === 'planning' && state.phase === 'planning') {
      throw new Error(`runHeadless: round ${state.round}'s planning never begins: no queued or given command begins its clash`);
    }
  }
  return { hashes, finalHash: hashState(state), summaries, eventCounts };
}
