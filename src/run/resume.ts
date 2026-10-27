// Save and resume (SPEC §8.9). The run state autosaves at every node boundary. A battle in progress
// is saved as its config plus the player's commands (executed and still queued) with the tick and
// state hash; resuming re-simulates from tick 0 (AI and bot commands regenerate deterministically),
// checks the hash and continues. A battle is at most 12,000 ticks, so this takes about a second.
import { createBattle, draftCommandDue, hashState, queueCommand, runHeadless, step } from '../sim/index.ts';
import type { BattleConfig, BattleState, Command, Content } from '../sim/index.ts';
import { RUN_VERSION } from './runState.ts';
import type { RunState } from './runState.ts';
import type { Storage } from './storage.ts';

export const RUN_KEY = 'spore-sprawl.run.v1';
export const BATTLE_KEY = 'spore-sprawl.battle.v1';

export function saveRun(storage: Storage, run: RunState): void {
  storage.set(RUN_KEY, JSON.stringify(run));
}

/** The saved run, or null if there is none (or it is from an incompatible version). */
export function loadRun(storage: Storage): RunState | null {
  const text = storage.get(RUN_KEY);
  if (!text) return null;
  try {
    const run = JSON.parse(text) as RunState;
    return run.v === RUN_VERSION ? run : null;
  } catch {
    return null;
  }
}

export function clearRun(storage: Storage): void {
  storage.remove(RUN_KEY);
  storage.remove(BATTLE_KEY);
}

export interface BattleSave { config: BattleConfig; commands: Command[]; tick: number; hash: string }

function cmp(a: Command, b: Command): number {
  if (a.tick !== b.tick) return a.tick - b.tick;
  if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
  return a.seq - b.seq;
}

/** A battle's save: config, the human sides' commands (executed and queued), the tick and the hash. */
export function battleSave(state: BattleState): BattleSave {
  const human = (c: Command) => state.config[c.side].controller.kind === 'human';
  const commands = [...state.log.filter(human), ...state.queue.filter(human)].sort(cmp);
  return { config: state.config, commands, tick: state.tick, hash: hashState(state) };
}

export function saveBattle(storage: Storage, state: BattleState): void {
  storage.set(BATTLE_KEY, JSON.stringify(battleSave(state)));
}

export function loadBattle(storage: Storage): BattleSave | null {
  const text = storage.get(BATTLE_KEY);
  if (!text) return null;
  try { return JSON.parse(text) as BattleSave; } catch { return null; }
}

export function clearBattle(storage: Storage): void {
  storage.remove(BATTLE_KEY);
}

/**
 * Rebuilds a saved live battle: replays the command log from tick 0 up to the saved tick, re-queues
 * the commands that hadn't run yet, resolves a draft that was answered on the saved tick, and checks
 * the state hash. Throws if the replay diverges.
 */
export function resumeBattle(content: Content, save: BattleSave): BattleState {
  const state = createBattle(content, save.config);
  // a battle saved before it went live simply restarts its deploy phase
  if (save.tick === 0) return state;
  runHeadless(state, { until: save.tick, commands: save.commands.filter((c) => c.tick <= save.tick) });
  const seen = new Set([...state.log, ...state.queue].map((c) => `${c.side}:${c.seq}`));
  for (const c of save.commands) if (!seen.has(`${c.side}:${c.seq}`)) queueCommand(state, c);
  while (state.held && draftCommandDue(state)) step(state);
  const hash = hashState(state);
  if (hash !== save.hash) throw new Error(`resume diverged at tick ${save.tick}: expected ${save.hash}, got ${hash}`);
  return state;
}
