// Shared fixtures for the round-form unit suite (SPEC §15.7, §4.6, §4.7, §14.4): a battle in rounds in its
// planning phase, or one built from a round scenario. v1's tests keep `tests/helpers.ts` and its
// `liveState` until R2b folds this file into it. Each later helper lands with the task that builds its
// command: `plant`, `sell` and `toggle` with T031, `begin` and `stepClash` with T043, `finishRound` with T052.
import { nodeContent } from '../tools/lib/content.ts';
import { createFromScenario, SIDES } from '../src/sim/rounds/index.ts';
import type { BattleState, Flags, RoundScenarioOverrides, Side } from '../src/sim/rounds/index.ts';

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
