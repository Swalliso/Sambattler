// Public sim API (SPEC §14.6).
export { loadContent, ContentError } from '../data/registry.ts';
export type { Content, RawContent } from '../data/registry.ts';
export { createBattle, createFromScenario, makeConfig, parseController, controllerLabel } from './create.ts';
export type { BattleOptions } from './create.ts';
export { queueCommand, nextCommandTick, sellValue } from './commands.ts';
export { step } from './step.ts';
export { runHeadless } from './headless.ts';
export type { HeadlessOptions, HeadlessResult } from './headless.ts';
export { hashState, snapshot, restore } from './snapshot.ts';
export { legalPlacements, priceAt, placementProblem, depthOf, footprintOnLoam } from './placement.ts';
export type { Placement } from './placement.ts';
export { summarize, formatClock } from './summary.ts';
export type { BattleSummary } from './summary.ts';
export { incomePerMinute } from './systems/economy.ts';
export { lanePresence, frontierBlocked, frontier } from './systems/territory.ts';
export { turretPos } from './systems/combat.ts';
export * from './state.ts';
