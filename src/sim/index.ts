// Public sim API (SPEC §14.6).
export { loadContent, ContentError } from '../data/registry.ts';
export type { Content, RawContent } from '../data/registry.ts';
export {
  createBattle, createFromScenario, makeConfig, parseController, controllerLabel, parseFlags, DEFAULT_FLAGS, MILESTONE,
  draftPool, STAND_IN_COMMANDER, generalPassives,
} from './create.ts';
export type { BattleOptions, Flags } from './create.ts';
export { canMerge } from './systems/merging.ts';
export { queueCommand, nextCommandTick, sellValue, draftCommandDue } from './commands.ts';
export { step } from './step.ts';
export { runHeadless } from './headless.ts';
export type { HeadlessOptions, HeadlessResult } from './headless.ts';
export { hashState, snapshot, restore } from './snapshot.ts';
export { hashValue } from './hash.ts';
export { buildLibrary } from './compile.ts';
export { generateOffer, applyCard, parseCard, cardId, rarityWeights, rerollCost, RARITIES } from './draft.ts';
export type { OfferOptions } from './draft.ts';
export { choosePick, greedyScore } from './ai/draftPolicy.ts';
export {
  activeCounter, analyzeMix, counterKindsOf, counterSets, doctrineMult, mergedFraction, openingActive, topKind, topKinds, zeroProfile,
} from './ai/counter.ts';
export type { MixAnalysis } from './ai/counter.ts';
export { seedStream, hash32, nextFloat, nextInt } from './rng.ts';
export { legalPlacements, priceAt, placementProblem, depthOf, footprintOnLoam } from './placement.ts';
export type { Placement } from './placement.ts';
export { summarize, formatClock } from './summary.ts';
export type { BattleSummary } from './summary.ts';
export { incomePerMinute } from './systems/economy.ts';
export { lanePresence, frontierBlocked, frontier } from './systems/territory.ts';
export { isBesieged, isSuppressed } from './world.ts';
export { turretPos } from './systems/combat.ts';
export { holdsLane, rallyX } from './systems/stance.ts';
export * from './state.ts';
