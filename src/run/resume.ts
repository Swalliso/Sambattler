// Save and resume (SPEC §8.9). The run state autosaves at every node boundary. A battle in progress
// is saved as its config plus the player's commands (executed and still queued) with the tick and
// state hash; resuming re-simulates from tick 0 (AI and bot commands regenerate deterministically),
// checks the hash and continues. A battle is at most 12,000 ticks, so this takes about a second.
import { createBattle, draftCommandDue, hashState, queueCommand, runHeadless, step } from '../sim/index.ts';
import type { BattleConfig, BattleState, Command, Content, SimEvent } from '../sim/index.ts';
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
    if (run.v !== RUN_VERSION) return null;
    run.bans ??= []; // saved before M5's bans
    return run;
  } catch {
    return null;
  }
}

export function clearRun(storage: Storage): void {
  storage.remove(RUN_KEY);
  storage.remove(BATTLE_KEY);
}

export interface BattleSave {
  /** Missing on legacy saves, whose commands combine the log and queue. */
  v?: 2;
  config: BattleConfig;
  /** Executed human commands in log order in v2; combined commands in legacy saves. */
  commands: Command[];
  pending?: Command[];
  phase?: BattleState['phase'];
  /** Events belong to the last step, including steps that do not advance the clock. */
  events?: SimEvent[];
  tick: number;
  hash: string;
}

function cmp(a: Command, b: Command): number {
  if (a.tick !== b.tick) return a.tick - b.tick;
  if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
  return a.seq - b.seq;
}

/** Keep executed and pending input separate: both can have tick T+1 while a draft holds tick T. */
export function battleSave(state: BattleState): BattleSave {
  const human = (c: Command) => state.config[c.side].controller.kind === 'human';
  return {
    v: 2, config: state.config, commands: state.log.filter(human), pending: state.queue.filter(human),
    phase: state.phase, events: [...state.events], tick: state.tick, hash: hashState(state),
  };
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
 * Replays executed input, including answers applied without advancing a held clock, then restores
 * pending input without executing it. A full hash check rejects incompatible or divergent saves.
 */
export function resumeBattle(content: Content, save: BattleSave): BattleState {
  if (save.v === undefined) return resumeLegacyBattle(content, save);
  if (save.v !== 2 || !save.pending || !save.phase || !save.events) throw new Error('unsupported battle save format');
  const state = createBattle(content, save.config);
  if (save.tick > 0) {
    runHeadless(state, { until: save.tick, commands: save.commands });
  } else {
    // Deploy commands and Begin also execute without advancing tick 0 (after a deploy draft's answer).
    for (const c of save.commands) queueCommand(state, c);
    if (state.queue.length) step(state);
    if (state.queue.length && state.phase === 'deploy' && !state.held) step(state);
    // Headless bot games synthesize Begin rather than retaining it as human input.
    if (state.phase === 'deploy' && save.phase !== 'deploy') {
      queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
      step(state);
    }
  }
  const executed = new Set(state.log.map((c) => `${c.side}:${c.seq}`));
  for (const c of save.commands) {
    if (executed.has(`${c.side}:${c.seq}`)) continue;
    // The only remaining executed input can be a draft answer on the saved, held tick.
    if (!state.held || c.tick > state.tick + 1 || !isDraft(c)) throw new Error('invalid executed command boundary');
    queueCommand(state, c);
    step(state);
  }
  for (const c of save.pending) queueCommand(state, c);
  // Replaying several held/deploy steps together can combine their transient event arrays.
  // Restore this presentation boundary explicitly; the rest of the replay must still hash exactly.
  state.events = [...save.events];
  assertHash(state, save);
  return state;
}

const isDraft = (c: Command) => c.type === 'draftPick' || c.type === 'draftReroll' || c.type === 'draftSkip';

function assertHash(state: BattleState, save: BattleSave): void {
  const hash = hashState(state);
  if (hash !== save.hash) throw new Error(`resume diverged at tick ${save.tick}: expected ${save.hash}, got ${hash}`);
}

/** Legacy saves lack a command boundary. Accept only a replay that matches their complete hash. */
function resumeLegacyBattle(content: Content, save: BattleSave): BattleState {
  const state = createBattle(content, save.config);
  if (save.tick === 0) {
    assertHash(state, save);
    return state;
  }
  runHeadless(state, { until: save.tick, commands: save.commands.filter((c) => c.tick <= save.tick) });
  const seen = new Set([...state.log, ...state.queue].map((c) => `${c.side}:${c.seq}`));
  for (const c of [...save.commands].sort(cmp)) if (!seen.has(`${c.side}:${c.seq}`)) queueCommand(state, c);
  // A queued answer must remain pending if the pre-execution state is what was saved.
  if (hashState(state) === save.hash) return state;
  while (state.held && draftCommandDue(state)) step(state);
  assertHash(state, save);
  return state;
}
