// Shared fixtures for the round-form unit suite (SPEC §15.7, §4.6, §4.7, §14.4): a battle in rounds in its
// planning phase, or one built from a round scenario. v1's tests keep `tests/helpers.ts` and its
// `liveState` until R2b folds this file into it. Each later helper lands with the task that builds its
// command: `plant`, `sell` and `toggle` came with T031, `begin` and `stepClash` with T043, and `finishRound`
// with T052.
import { nodeContent } from '../tools/lib/content.ts';
import { commandStamp, createFromScenario, queueCommand, SIDES, step } from '../src/sim/rounds/index.ts';
import type { BattleState, Command, CommandBody, Flags, RoundScenarioOverrides, Side, SimEvent } from '../src/sim/rounds/index.ts';
import type { RoundScenarioDef } from '../src/data/schema.ts';

export const content = nodeContent();

export interface PlanningOptions {
  /** Bogwater Hollow by default. */
  map?: string;
  /** The round to plan in, 1 by default. A later round starts as a scenario from that round does (T029). */
  round?: number;
  /** Each side's kit by building id: its faction's roster by default (§18.1 D45). */
  kits?: Partial<Record<Side, string[]>>;
  /** Each side's gold in this planning phase: §6.1's starting gold by default. */
  gold?: Partial<Record<Side, number>>;
  flags?: Partial<Flags>;
  battleIndex?: number;
}

/**
 * A battle in rounds in the planning phase of `round`, with both colonies empty and both sides human, so
 * nothing plans but the test. Tests build enemy colonies through scenarios, never commands (plan Call 8).
 */
export function planningState(opts: PlanningOptions = {}): BattleState {
  const side = (s: Side) => (opts.kits?.[s] ? { kit: opts.kits[s] } : {});
  const state = createFromScenario(content, {
    id: 'planning-state', description: 'planningState', map: opts.map ?? 'bogwater-hollow',
    ...(opts.round !== undefined ? { round: opts.round } : {}),
    ...(opts.battleIndex !== undefined ? { battleIndex: opts.battleIndex } : {}),
    ...(opts.flags ? { flags: opts.flags } : {}),
    sides: { player: side('player'), enemy: side('enemy') },
  });
  for (const s of SIDES) {
    const gold = opts.gold?.[s];
    if (gold !== undefined) state.sides[s].gold = gold;
  }
  return state;
}

/** A battle in rounds from `data/scenarios/rounds/<id>.json` (T029). */
export function fromScenario(id: string, over: RoundScenarioOverrides = {}): BattleState {
  return createFromScenario(content, id, over);
}

/**
 * A whole battle for the headless and determinism tests (T059, T064): both sides human, each colony a Capguard
 * Hall, a Gill Archer Nest and a Sporeling Burrow, so it plays every round from the player's commands alone
 * (`playerScript`), and each clash runs some hundreds of ticks.
 */
export const SCRIPTED_BATTLE: RoundScenarioDef = {
  id: 'scripted-battle', description: 'scriptedBattle', map: 'bogwater-hollow',
  sides: {
    player: { colony: [
      { building: 'capguardHall', lane: 0, rank: 0, file: 2 }, { building: 'gillNest', lane: 0, rank: 1, file: 2 },
      { building: 'sporelingBurrow', lane: 0, rank: 0, file: 3 },
    ] },
    enemy: { colony: [
      { building: 'capguardHall', lane: 0, rank: 0, file: 2 }, { building: 'gillNest', lane: 0, rank: 1, file: 2 },
      { building: 'sporelingBurrow', lane: 0, rank: 0, file: 1 },
    ] },
  },
};

export const scriptedBattle = (): BattleState => createFromScenario(content, SCRIPTED_BATTLE);

/**
 * A human player's commands for rounds 1 to `rounds`: each round's `plans`, then its Begin. Each is stamped
 * tick 0, which is due in its round's planning however many clash ticks came before (§14.5).
 */
export function playerScript(rounds: number, plans: Record<number, CommandBody[]> = {}): Command[] {
  const out: Command[] = [];
  for (let round = 1; round <= rounds; round++) {
    for (const body of [...(plans[round] ?? []), { type: 'beginClash' } as const]) out.push({ round, tick: 0, side: 'player', seq: out.length, ...body });
  }
  return out;
}

/** A plot named as §4.6 names it. */
export interface PlotPlace { lane: number; rank: number; file: number }

/** The index of the side's plot at a lane, rank and file. */
export function plotAt(s: BattleState, side: Side, at: PlotPlace): number {
  const i = s.sides[side].plots.findIndex((p) => p.lane === at.lane && p.rank === at.rank && p.file === at.file);
  if (i < 0) throw new Error(`${side} has no plot at lane ${at.lane}, rank ${at.rank}, file ${at.file}`);
  return i;
}

/** Queues a command for the side and steps once, so a planning command runs (§13.3 rule 7). It returns the step's events. */
export function command(s: BattleState, side: Side, body: CommandBody): SimEvent[] {
  queueCommand(s, { ...commandStamp(s), side, ...body });
  step(s);
  return [...s.events];
}

/** Plants a building on the side's plot at a lane, rank and file, through the queue (T031). */
export const plant = (s: BattleState, side: Side, buildingId: string, at: PlotPlace): SimEvent[] =>
  command(s, side, { type: 'plant', buildingId, plot: plotAt(s, side, at) });
export const sell = (s: BattleState, side: Side, entityId: number): SimEvent[] => command(s, side, { type: 'sell', entityId });
export const toggle = (s: BattleState, side: Side, entityId: number, on: boolean): SimEvent[] =>
  command(s, side, { type: 'toggleMerge', entityId, on });

/** The player's Begin through the queue, which fields both armies and resolves the muster (T043). It returns Begin's step's events. */
export const begin = (s: BattleState): SimEvent[] => command(s, 'player', { type: 'beginClash' });

/** Steps a clash `ticks` ticks, or until it ends, and returns every event of those steps in order. */
export function stepClash(s: BattleState, ticks = 1): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < ticks && s.phase === 'clash'; i++) {
    step(s);
    out.push(...s.events);
  }
  return out;
}

/**
 * Plays the round's clash to its end, Begin first if the round is still in planning, and stops in the
 * aftermath with the round scored (T051, T052). It returns every event of those steps in order.
 */
export function finishRound(s: BattleState): SimEvent[] {
  const out = s.phase === 'planning' ? begin(s) : [];
  // the cap ends every clash by `startTick + clashCapTicks`
  return [...out, ...stepClash(s, s.rules.clashCapTicks)];
}
