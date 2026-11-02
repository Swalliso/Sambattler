// The sim API for a battle in rounds (SPEC §14.6). It stands beside v1's `src/sim/index.ts` until R2b moves
// it there; later sessions add `runHeadless`, the planning checks and the previews.
export { loadContent, ContentError } from '../../data/registry.ts';
export type { Content, RawContent } from '../../data/registry.ts';
export {
  createBattle, createFromScenario, makeRoundConfig, setCommander, emptyStats, addBuilding, addUnit, DEFAULT_FLAGS,
} from './create.ts';
export type { Flags, RoundBattleOptions, RoundScenarioOverrides } from './create.ts';
export { queueCommand, commandStamp } from './commands.ts';
export type { QueuedCommand } from './commands.ts';
export { step } from './step.ts';
export { hashState, snapshot, restore } from './snapshot.ts';
export * from './state.ts';
