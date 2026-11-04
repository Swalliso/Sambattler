// Save and resume (SPEC §8.9, §13.8). The run state autosaves at every node boundary, and `loadRun` reads it
// through `migrateRun`. A run's battle saves between rounds as a `BattleSave` of `v: 3` (A089): at each planning
// phase, at Begin, and when the power fires (R2-Q22). Resume replays the save's commands from the battle's
// config and checks its hash; a save it can't rebuild, of any other version among them, restarts the battle.
import type { BattleConfig, Command, Content, SimEvent } from '../sim/index.ts';
import type { BattleState } from '../sim/index.ts';
import { createBattle, hashState, hashValue, queueCommand, runHeadless, step } from '../sim/index.ts';
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

/** The battle save's version: v1's battles saved `v: 2` (A089). */
export const BATTLE_SAVE_VERSION = 3;

/** A battle saved between rounds (§8.9, §14.5). The key stays `spore-sprawl.battle.v1` (§13.8). */
export interface BattleSave {
  v: typeof BATTLE_SAVE_VERSION;
  config: BattleConfig;
  /** Your executed commands, in order: each planning command stamped with its round and seq, each power with its round and clash tick. */
  commands: Command[];
  /** Your commands queued but not run, restored without running: the power fired in the clash a resume replays (R2-Q22). */
  pending: Command[];
  /** Where the battle resumes: this round's planning, or its clash's first tick. */
  round: number;
  phase: 'planning' | 'clash';
  /** The last step's events, which the hash covers, since a resume's steps run its commands together. */
  events: SimEvent[];
  hash: string;
}

/**
 * The battle as a save (§8.9), at one of its save points: in planning, with every plant and sale made, or at
 * its clash's first tick, as Begin leaves it. Anywhere else, later in a clash or in an aftermath, there's none,
 * so the latest save stays: the Begin save, or the power's.
 */
export function battleSave(state: BattleState): BattleSave | null {
  const phase = state.phase;
  if (phase !== 'planning' && (phase !== 'clash' || state.tick !== state.clash!.startTick)) return null;
  return {
    v: BATTLE_SAVE_VERSION, config: state.config,
    commands: state.log.filter((c) => c.side === 'player'), pending: state.queue.filter((c) => c.side === 'player'),
    round: state.round, phase, events: [...state.events], hash: hashState(state),
  };
}

/**
 * The save once your power has run in a clash (R2-Q22, A087): the clash's Begin save, from `begin` (the battle as
 * Begin left it), with the power pending at its tick, so a resume's clash fires it there and it can't be fired again.
 * A Begin state that already holds it, as a resume from this save does, gives the same save.
 */
export function powerSave(begin: BattleState, power: Command): BattleSave {
  const at = structuredClone(begin);
  if (!at.queue.some((c) => c.side === power.side && c.seq === power.seq)) queueCommand(at, power);
  return battleSave(at)!;
}

export function saveBattle(storage: Storage, save: BattleSave): void {
  storage.set(BATTLE_KEY, JSON.stringify(save));
}

/**
 * The saved battle rebuilt (§8.9), or null when it can't be: a save of another version or another battle, or one
 * whose replay doesn't reach its hash. The battle is created from the save's config, each earlier round is played
 * from its commands, each clash tick by tick, and the saved round's planning commands run; then the pending ones
 * are queued and the last step's events restored before the hash is checked. A command the battle has already
 * run or queued, such as a bot's, is skipped, as `runHeadless` skips it.
 */
export function resumeBattle(content: Content, text: string, config: BattleConfig): BattleState | null {
  try {
    const save = JSON.parse(text) as BattleSave | null;
    if (save?.v !== BATTLE_SAVE_VERSION || hashValue(save.config) !== hashValue(config)) return null;
    const state = createBattle(content, save.config);
    if (save.round > 1) runHeadless(state, { until: { round: save.round - 1 }, commands: save.commands });
    // the aftermath's step opens the saved round
    if (state.phase === 'aftermath') step(state);
    if (state.round !== save.round || state.phase !== 'planning') return null;
    const known = (c: Command) => [...state.queue, ...state.log].some((q) => q.side === c.side && q.seq === c.seq);
    const planned = save.commands.filter((c) => c.round === save.round && !known(c));
    for (const c of planned) queueCommand(state, c);
    if (planned.length) step(state);
    for (const c of save.pending) if (!known(c)) queueCommand(state, c);
    state.events = save.events;
    return state.phase === save.phase && hashState(state) === save.hash ? state : null;
  } catch {
    // a save that isn't JSON, or whose commands can't play
    return null;
  }
}
