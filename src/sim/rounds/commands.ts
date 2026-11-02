// The command queue and log in rounds (SPEC §13.3 rule 7, §14.5). A command is stamped {round, tick, side,
// seq}, with no phase field since its type implies the phase, and the queue sorts by the stamp with the
// player first (plan Call 7). A planning command runs at the next step, a clash command on its tick.
// Commands are validated when they run, so an illegal one becomes a deterministic `commandRejected` on
// replay too. It stands beside v1's `src/sim/commands.ts` until R2b moves it there.
import { executePlanning } from './planning.ts';
import type { BattleState, Command, CommandBody, Side } from './state.ts';

export type QueuedCommand = { round: number; tick: number; side: Side; seq?: number } & CommandBody;

/** The stamp a command issued now carries: its round, and `state.tick` in planning or `state.tick + 1` in a clash (§14.5). */
export function commandStamp(state: BattleState): { round: number; tick: number } {
  return { round: state.round, tick: state.phase === 'clash' ? state.tick + 1 : state.tick };
}

function cmpCommand(a: Command, b: Command): number {
  if (a.round !== b.round) return a.round - b.round;
  if (a.tick !== b.tick) return a.tick - b.tick;
  if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
  return a.seq - b.seq;
}

/**
 * Queues a command, keeping the queue sorted by (round, tick, side, seq). Sequence numbers are per side;
 * a replayed command keeps its original seq.
 */
export function queueCommand(state: BattleState, cmd: QueuedCommand): Command {
  let seq: number;
  if (cmd.seq === undefined) {
    seq = state.nextSeq[cmd.side]++;
  } else {
    seq = cmd.seq;
    if (state.nextSeq[cmd.side] <= seq) state.nextSeq[cmd.side] = seq + 1;
  }
  const full = { ...cmd, seq } as Command;
  const q = state.queue;
  let i = q.length;
  while (i > 0 && cmpCommand(q[i - 1]!, full) > 0) i--;
  q.splice(i, 0, full);
  return full;
}

/** Due once its round and tick are reached: in planning every command stamped for this round, in a clash those for this tick. */
const isDue = (state: BattleState, c: Command): boolean => c.round < state.round || (c.round === state.round && c.tick <= state.tick);

/** Runs every queued command that is due, in queue order, logging each as it runs. */
export function executeCommands(state: BattleState): void {
  let n = 0;
  while (n < state.queue.length && isDue(state, state.queue[n]!)) n++;
  for (const cmd of state.queue.splice(0, n)) {
    state.log.push(cmd);
    execute(state, cmd);
  }
}

function reject(state: BattleState, cmd: Command, reason: string): void {
  state.events.push({ t: 'commandRejected', side: cmd.side, seq: cmd.seq, reason });
  state.stats[cmd.side].rejectedCommands++;
}

/** The phase a command runs in, which its type implies (plan Call 7): the power in a clash, the rest in planning. */
const phaseOf = (type: Command['type']): BattleState['phase'] => (type === 'power' ? 'clash' : 'planning');

function execute(state: BattleState, cmd: Command): void {
  if (state.phase !== phaseOf(cmd.type)) { reject(state, cmd, 'wrongPhase'); return; }
  switch (cmd.type) {
    case 'plant':
    case 'sell':
    case 'toggleMerge':
    case 'beginClash': {
      // planning.ts refuses Begin until its clash half lands (S6, T043)
      const problem = executePlanning(state, cmd);
      if (problem) reject(state, cmd, problem);
      return;
    }
    // The power lands in S16, and R2a has no drafts (plan Call 26), so these are refused.
    case 'draftPick':
    case 'draftReroll':
    case 'draftSkip':
    case 'power':
      reject(state, cmd, 'notInRoundsYet');
      return;
    default:
      // every command type is handled above; a malformed replay is rejected, not crashed on
      reject(state, cmd as Command, `${(cmd as Command).type} is not a command`);
  }
}
