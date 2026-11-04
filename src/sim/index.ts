// Public sim API (SPEC §14.6), and the seeded streams, flags, controllers and draft offers the run builds on.
export { loadContent, ContentError } from '../data/registry.ts';
export type { Content, RawContent } from '../data/registry.ts';
export {
  createBattle, createFromScenario, makeRoundConfig, setCommander, setPassives, addBuilding, addUnit, DEFAULT_FLAGS, MILESTONE, parseFlags,
  parseController, DEFAULT_COMMANDER, MAX_BANS, draftPool,
} from './create.ts';
export type { Flags, RoundBattleOptions, RoundScenarioOverrides } from './create.ts';
export { emptyStats, foldRounds } from './stats.ts';
export { compileRoundUnit } from './compile.ts';
export { summarize, formatClock } from './summary.ts';
export type { RoundLogEntry, RoundSummary } from './summary.ts';
export { runHeadless } from './headless.ts';
export type { HeadlessOptions, HeadlessResult, HeadlessUntil } from './headless.ts';
export { queueCommand, commandStamp } from './commands.ts';
export { aimedLane, autoPowerTarget, bestBloom, bloomLift, bloomTrios, burstPreview, harvestGold, killedSupply, powerNow, powerOf, powerProblem } from './powers.ts';
export type { QueuedCommand } from './commands.ts';
export { colonyFull, legalPlots, plantProblem, priceOf, sellValue, upgradePrice, upgradeProblem } from './planning.ts';
export { featureReady, inKit, kitCards, kitOf } from './kit.ts';
export { basePlots, openOrder } from './colony.ts';
export { analyzeFielded, answersTo, topKinds } from './ai/counter.ts';
export { planningView } from './ai/view.ts';
export { formationOf, mergePreview } from './formation.ts';
export type { MergePreview, MusterTrio, PlanChange, SquadPlan, TierCounts } from './formation.ts';
export { matchupClass } from './matchups.ts';
export { survivingSupply } from './round.ts';
export { incomePreview } from './systems/economy.ts';
export { powerEffectMult } from './effects.ts';
export type { IncomeBreakdown } from './systems/economy.ts';
export { step } from './step.ts';
export { hashState, snapshot, restore } from './snapshot.ts';
export { hashValue } from './hash.ts';
export { seedStream, hash32, nextFloat, nextInt } from './rng.ts';
export { generateOffer, applyCard, parseCard, cardId, rarityWeights, RARITIES, draftLibrary, nextLevel, levelsLeft, rerollCost } from './draft.ts';
export type { DraftLibrary, DraftTrack, OfferOptions } from './draft.ts';
export { choosePick, greedyScore } from './ai/draftPolicy.ts';
export * from './state.ts';
