// The sim API for a battle in rounds (SPEC §14.6). It stands beside v1's `src/sim/index.ts` until R2b moves
// it there.
export { loadContent, ContentError } from '../../data/registry.ts';
export type { Content, RawContent } from '../../data/registry.ts';
export {
  createBattle, createFromScenario, makeRoundConfig, setCommander, addBuilding, addUnit, DEFAULT_FLAGS,
} from './create.ts';
export type { Flags, RoundBattleOptions, RoundScenarioOverrides } from './create.ts';
export { emptyStats, foldRounds } from './stats.ts';
export { summarize } from './summary.ts';
export type { RoundLogEntry, RoundSummary } from './summary.ts';
export { runHeadless } from './headless.ts';
export type { HeadlessOptions, HeadlessResult, HeadlessUntil } from './headless.ts';
export { queueCommand, commandStamp } from './commands.ts';
export type { QueuedCommand } from './commands.ts';
export { legalPlots, plantProblem, priceOf, sellValue } from './planning.ts';
export { inKit, kitOf } from './kit.ts';
export { formationOf, mergePreview } from './formation.ts';
export type { MergePreview, MusterTrio, PlanChange, SquadPlan, TierCounts } from './formation.ts';
export { matchupClass } from './matchups.ts';
export { survivingSupply } from './round.ts';
export { incomePreview } from './systems/economy.ts';
export type { IncomeBreakdown } from './systems/economy.ts';
export { step } from './step.ts';
export { hashState, snapshot, restore } from './snapshot.ts';
export * from './state.ts';
