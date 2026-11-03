// zod schemas for every data file (SPEC §14). Milestone 4 subset: balance, factions, buildings,
// units, maps, sprites, generals (with passives and the counter cycle), bots, scenarios, balance
// targets, plus the run content (upgrade tracks, relics, events, elite modifiers, commanders with
// their passives and powers), the effects DSL (§14.2) and the sound bank (§13.9).
import { z } from 'zod';

export const Id = z.string().min(1).regex(/^[a-zA-Z0-9:_-]+$/, 'ids use letters, digits, : _ -');
export const DamageType = z.enum(['slash', 'pierce', 'crush']);
export const UnitArmor = z.enum(['light', 'medium', 'heavy']);
export const ArmorType = z.enum(['light', 'medium', 'heavy', 'structure']);
/**
 * `burrow` (combat rework, the Rhizomorph's preset): the unit spawns underground and tunnels at its
 * speed until it surfaces beside an enemy ranged unit or spawner behind the enemy front.
 */
export const Tag = z.enum(['siege', 'slayer', 'ranged', 'swarm', 'support', 'burrow', 'burst', 'flying']);
export const Rarity = z.enum(['common', 'uncommon', 'rare']);
const Seconds = z.number().nonnegative();
/** A unit id, optionally at a merge tier: `capguard` or `capguard@2`. */
const DuelUnit = z.string().regex(/^[a-zA-Z0-9_-]+(@[123])?$/, 'duel units are <unitId> or <unitId>@<tier>');
const MergePolicy = z.enum(['on', 'off', 'auto']);
const Pos = z.number().positive();
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colors are #rrggbb');

const MatrixRow = z.object({ light: Pos, medium: Pos, heavy: Pos, structure: Pos }).strict();

// ---- the effects DSL (SPEC §14.1–14.2): one modifier and trigger language for every source ----

/** Stat keys the compiler understands. The list grows deliberately, one system at a time. */
export const UNIT_STATS = [
  'unit.hp', 'unit.damage', 'unit.attackInterval', 'unit.range', 'unit.speed', 'unit.splashRadius',
  'unit.resist.slash', 'unit.resist.pierce', 'unit.resist.crush', 'unit.siegeMult', 'unit.regenPctPerSec', 'unit.healAmount',
] as const;
export const BUILDING_STATS = [
  'building.hp', 'building.spawnInterval', 'building.spawnCount', 'building.goldPerTick', 'building.firstSpawnFraction',
  'tower.damage', 'tower.range', 'tower.splashRadius',
] as const;
export const SIDE_STATS = [
  'side.supplyCap', 'side.interestCap', 'side.stipend', 'side.captureSpeed', 'side.startingGold', 'side.sellRefund',
  'side.supplyLineRate', 'side.knitTicks', 'side.mergeRadius', 'side.rerollCost', 'side.draftCards', 'side.heartcapMaxHp',
  'side.turretDamage', 'side.comebackEnabled', 'side.loamBonus', 'side.powerCooldown',
] as const;
export const BATTLE_STATS = ['battle.sporestormStart'] as const;
export const StatKey = z.enum([...UNIT_STATS, ...BUILDING_STATS, ...SIDE_STATS, ...BATTLE_STATS]);
/** Building stats that may use positional selectors; they are evaluated when used, not compiled once. */
export const POSITIONAL_STATS: readonly string[] = ['building.spawnInterval', 'building.goldPerTick'];
/**
 * Unit stats may also select by a plot's `rank` and `onLoam`: a battle in rounds compiles them per squad at
 * Begin (§14.2, T046). v1's compile skips them, since v1 has no ranks and its units stand on no plot.
 */
const byPlot = (stat: string, w: { zone?: unknown; adjacentOwnBuildingsGte?: unknown }): boolean =>
  stat.startsWith('unit.') && w.zone === undefined && w.adjacentOwnBuildingsGte === undefined;

const TierSel = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const SelectorSchema = z.object({
  unit: Id.optional(), building: Id.optional(), tag: Tag.optional(), tier: TierSel.optional(),
  zone: z.enum(['home', 'contested']).optional(), onLoam: z.boolean().optional(),
  adjacentOwnBuildingsGte: z.number().int().positive().optional(),
  /** R2a: the plot's rank in a battle in rounds, 0 at the front (§4.6, §14.2); positional, and v1 has no ranks. */
  rank: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
}).strict();

export const ModifierSchema = z.object({
  stat: StatKey, op: z.enum(['add', 'mul', 'set']), value: z.number(),
  /** Whose stats change: the owner of the source (default) or the opponent. */
  side: z.enum(['self', 'opponent']).optional(),
  where: SelectorSchema.optional(),
}).strict().superRefine((m, ctx) => {
  const w = m.where ?? {};
  const scope = m.stat.split('.')[0];
  const positional = w.zone !== undefined || w.onLoam !== undefined || w.adjacentOwnBuildingsGte !== undefined || w.rank !== undefined;
  if ((scope === 'side' || scope === 'battle') && m.where) ctx.addIssue({ code: 'custom', message: `${m.stat} applies to the whole ${scope}; it takes no "where"` });
  if (positional && !POSITIONAL_STATS.includes(m.stat) && !byPlot(m.stat, w)) {
    ctx.addIssue({ code: 'custom', message: `positional selectors (zone, onLoam, adjacentOwnBuildingsGte, rank) only work on ${POSITIONAL_STATS.join(' and ')}, and rank and onLoam on unit stats` });
  }
  if (w.tier !== undefined && scope !== 'unit') ctx.addIssue({ code: 'custom', message: 'a tier selector only applies to unit stats' });
});

export const EffectActionSchema = z.union([
  z.object({ gainGold: z.number().int() }).strict(),
  z.object({ explode: z.object({ damage: Pos, damageType: DamageType, radius: Pos }).strict() }).strict(),
  z.object({ repairHeartcapPct: z.number().positive().max(1) }).strict(),
]);

export const TriggerSchema = z.object({
  /** `roundStart`, `clashStart` and `roundWon` are R2a's, for a battle in rounds (§14.2, §14.6); v1's battle never fires them. */
  on: z.enum(['merge', 'unitDeath', 'buildingDestroyed', 'enemyUnitKilled', 'waveStart', 'battleStart', 'roundStart', 'clashStart', 'roundWon']),
  if: SelectorSchema.extend({ sporestormGte: z.number().int().nonnegative().optional() }).strict().optional(),
  do: z.array(EffectActionSchema).min(1),
}).strict();

export const EffectBundleSchema = z.object({
  modifiers: z.array(ModifierSchema).optional(),
  triggers: z.array(TriggerSchema).optional(),
}).strict();

const Bp = z.number().int().positive();
const Round = z.number().int().positive();
const RoundCycle = z.object({ round: Round, from: Round }).strict();

/**
 * R2a's battle in rounds (SPEC §4.2, §6, §7.2–§7.4, §11.1): v2's keys, beside v1's until R2b folds them into
 * §11.1's names. v1's library leaves this block out (R2a Call 27), so it never moves a v1 golden.
 */
export const RoundsSchema = z.object({
  maxRounds: Round,
  clashCapSeconds: Pos,
  musterSeconds: Seconds,
  formationGapTiles: z.number().int().positive(),
  heartcapDamagePerSupply: z.number().int().positive(),
  siegeHeartcapMult: z.number().int().positive(),
  /** Each lane's army of `minTypes` or more unit types arrives with shields of `shieldFrac` × each unit's max HP (§5.3, #8). */
  arrivalShield: z.object({ minTypes: z.number().int().min(2), shieldFrac: z.number().gt(0).max(1) }).strict(),
  /**
   * The most a Heartcap takes in a round (§6.7): `maxHpBp` of the loser's max HP (X5), or a `flat` amount;
   * `stormScales` multiplies it by the storm (A208). The other shapes are for T124's measurements.
   */
  roundDamageCap: z.object({ maxHpBp: Bp.optional(), flat: z.number().int().positive().optional(), stormScales: z.boolean().optional() })
    .strict().refine((c) => (c.maxHpBp === undefined) !== (c.flat === undefined), 'a round damage cap names one base: maxHpBp or flat'),
  /** After `maxRounds`, a Decision by the share of max HP dealt (X5), or by damage dealt (§6.5). */
  decision: z.object({ by: z.enum(['shareOfMaxHp', 'damage']) }).strict(),
  /** Interest on the gold banked at the end of planning (§6.2, R2-Q2). */
  interestPer: z.number().int().positive(),
  interestCap: z.number().int().nonnegative(),
  /** The storm by round (§6.4): from `startRound`, +`stepBp` a round, at most `maxBp`. */
  sporestorm: z.object({ startRound: Round, stepBp: Bp, maxBp: Bp }).strict(),
  stipendPerRound: z.number().int().nonnegative(),
  comebackGold: z.number().int().nonnegative(),
  enemyIncomeMult: Pos,
  /** Selling a building in the planning phase it was planted refunds this share (§4.4). */
  sellRefundPlanted: z.number().min(0).max(1),
  /** R2b's, data only in R2a: the drafts, lives and plot growth (§8.3, §8.5, §4.6). */
  draftRounds: z.array(Round),
  lives: z.number().int().positive(),
  plotGrowth: z.object({ perWin: z.number().int().nonnegative(), max: z.number().int().nonnegative() }).strict(),
  /** The planning AI (§7.2, §7.3), and the counter cycle by round (§7.4): in `round`'s planning it reads rounds `from` to `round` − 1. */
  ai: z.object({
    economyEarly: z.object({ beforeRound: Round, mult: z.number().nonnegative() }).strict(),
    economyLate: z.object({ fromRound: Round, mult: z.number().nonnegative() }).strict(),
    towerAfterLossMult: z.number().nonnegative(),
    score: z.object({
      depth: z.number(), offCentre: z.number(), besideSame: z.number(), frontSupport: z.number(), loam: z.number(),
      backThird: z.number(), noise: z.number().nonnegative(),
    }).strict(),
    counter: z.object({ cycles: z.array(RoundCycle), bossCycles: z.array(RoundCycle), freePlots: z.number().int().nonnegative() }).strict(),
    /**
     * X8's knobs, both off by default, for a general that runs the counter cycle (§7.2): from round 2 its weights
     * on the answer to last round's army × (1 + `leanToLastAnswer`), 0 for off; and with `replaceWhenFull`, once its
     * colony is full it sells its lowest-weighted fielded spawner at 60% for a heavier card.
     */
    leanToLastAnswer: z.number().nonnegative(),
    replaceWhenFull: z.boolean(),
  }).strict(),
}).strict();

export const BalanceSchema = z.object({
  tickRate: z.literal(20),
  waveSeconds: Pos,
  incomeTickSeconds: Pos,
  stipendPerTick: z.number().int().nonnegative(),
  startingGold: z.number().int().nonnegative(),
  startingGoldPerBattle: z.number().int().nonnegative(),
  supplyCap: z.number().int().positive(),
  interestPer: z.number().int().positive(),
  interestCap: z.number().int().nonnegative(),
  comebackDivisor: z.number().int().positive(),
  comebackMax: z.number().int().nonnegative(),
  loamBonus: z.number().nonnegative(),
  supplyLinePerColumn: z.number().nonnegative(),
  sellRefund: z.number().min(0).max(1),
  fullRefundSeconds: Seconds,
  besiegedSeconds: Seconds,
  besiegedRate: z.number().min(0).max(1),
  /**
   * E1 (engagement review; adopted 2026-10-28, set in balance.json): a per-lane Hold / Advance
   * command. While a side holds a lane, its idle units gather at a rally line `rallyBack` tiles
   * behind the front edge of its border column; units that dealt or took damage in the last 2 s fight as usual. A held lane
   * advances on its own after `maxHoldSeconds`, and can't be held again for `cooldownSeconds` after
   * it advances. `ai` gives every AI side (or those whose profile id starts with one of `profiles`)
   * a muster policy: hold a lane until `musterSupply` stands in it, then advance; hold again once it
   * drops below `spentSupply`. With `advanceWhenBesieged`, it never holds while one of its buildings
   * in the lane is besieged.
   */
  laneStance: z.object({
    rallyBack: Seconds,
    maxHoldSeconds: Pos,
    cooldownSeconds: Seconds,
    ai: z.object({
      musterSupply: Pos, spentSupply: Seconds, profiles: z.array(z.string()).optional(), advanceWhenBesieged: z.boolean().optional(),
    }).strict().optional(),
  }).strict().optional(),
  /**
   * "Lives left count at the boss" (§8.5, §18.2 #16, A199), absent by default: in the boss battle your
   * Heartcap's max gains `heartcapPerLife` for each life the run has left. A knob for R2b's playtest (`bosslives`).
   */
  livesAtBoss: z.object({ heartcapPerLife: z.number().int().positive() }).strict().optional(),
  /**
   * Pinning (§5.3; the combat rework's P1, default data since R2a): a `ranged` unit with an enemy unit
   * within `radius` tiles (edge distance) attacks at `rateMult` × its normal rate.
   */
  pinned: z.object({ radius: Pos, rateMult: z.number().gt(0).max(1) }).strict().optional(),
  /**
   * Spore clouds (§5.3; the combat rework's, default data since R2a): every shell from a listed tower (the
   * Puffball Mortar) leaves a spore cloud of `radius` tiles where it lands, for `seconds`. Every
   * `pulseSeconds` (default 1) on the battle clock, a cloud deals `damagePerSecond` × pulseSeconds,
   * ignoring armor, to every enemy unit whose body is inside it; buildings and friendly units are
   * untouched. `range` replaces the listed towers' base range.
   */
  sporeCloud: z.object({
    buildings: z.array(z.string()).min(1), radius: Pos, seconds: Pos, damagePerSecond: Pos,
    pulseSeconds: Pos.optional(), range: Pos.optional(),
  }).strict().optional(),
  /**
   * Cleave (§5.3; the combat rework's P1c, default data since R2a): a listed unit's splash (the Scythecap's
   * swing) hits every enemy unit within its splash radius of its target at full damage, instead of at
   * `splashFalloff`; buildings in it still take the falloff share. The Scythecap's splash is 1, 1.2 and
   * 1.4 tiles by tier.
   */
  cleave: z.object({ units: z.array(z.string()).min(1) }).strict().optional(),
  /**
   * Bursts (§5.3; the combat rework's P1c, default data since R2a): a `burst` unit has no normal attack. It heads for
   * the enemy unit in its aggro range with the most enemy units within its splash radius, and when it
   * reaches that unit, or when it dies, it bursts: its damage, ignoring armor, to every enemy unit within
   * its splash radius, and a spore cloud of `cloud.radius` tiles for `cloud.seconds` that deals
   * `cloud.damagePerSecond` (each second) to the enemy units inside it. Never buildings or friends.
   */
  burst: z.object({ cloud: z.object({ radius: Pos, seconds: Pos, damagePerSecond: Pos }).strict() }).strict().optional(),
  /**
   * Flyers (`flyers`; §5.3, §1.3 #11, docs/archive/v1/ideas/flyers.md), absent by default: a `flying` unit
   * passes over ground units, and only attacks with reach can hit it: ranged units, other flyers, commander
   * powers, spore clouds (with `cloudsReach`), emplacements that don't lob (the Mortar's splashing shell
   * does), and melee unit types of at least `reachSupply` supply (a merged unit's own supply with
   * `mergedReach`). Melee hits on a flyer deal × `meleeMult`. The round sim reads none of it yet.
   */
  flying: z.object({
    reachSupply: Pos, meleeMult: z.number().nonnegative(), mergedReach: z.boolean(), cloudsReach: z.boolean(),
  }).strict().optional(),
  firstSpawnFraction: z.number().min(0).max(1),
  timeLimitSeconds: Pos,
  heartcapPlayerHp: z.number().int().positive(),
  heartcapEnemyHp: z.object({ base: z.number().int().positive(), perBattle: z.number().int().nonnegative(), boss: z.number().int().positive() }).strict(),
  turret: z.object({
    perLane: z.number().int().nonnegative(), damage: Pos, damageType: DamageType,
    interval: Pos, range: Pos, projectileSpeed: Pos,
  }).strict(),
  captureSeconds: Pos,
  captureRatio: Pos,
  captureDecayMult: Pos,
  mergeRadius: Pos,
  mergeCombatCooldownSeconds: Seconds,
  mergeKnitSeconds: Seconds,
  mergeCheckEveryTicks: z.number().int().positive(),
  tierStatMult: Pos,
  tierSupplyMult: z.tuple([Pos, Pos, Pos]),
  tierRadiusMult: Pos,
  retargetEveryTicks: z.number().int().positive(),
  leashMult: Pos,
  splashFalloff: z.number().min(0).max(1),
  sporestorm: z.object({
    startSeconds: Seconds, everySeconds: Pos, maxStacks: z.number().int().nonnegative(),
    unitDamagePerStack: z.number(), turretDamagePerStack: z.number(), heartcapTakenPerStack: z.number(),
  }).strict(),
  routRepair: z.number(), decisionLossDamage: z.number(), groveRepair: z.number(),
  draftWaves: z.array(z.number().int().positive()),
  reroll: z.object({ base: z.number().int(), step: z.number().int() }).strict(),
  skipGold: z.number().int(),
  /** A general's kit across a run (SPEC §7.8): opener + preferred blueprints and random upgrade levels by battle index. */
  enemyKit: z.object({
    blueprintsPerBattle: z.number().int().nonnegative(),
    upgradesPerBattle: z.number().int().nonnegative(),
    eliteUpgrades: z.number().int().nonnegative(),
    bossBuildings: z.number().int().positive(),
    bossUpgrades: z.number().int().nonnegative(),
  }).strict(),
  /** Draft offer generation (SPEC §8.3): type weights, rarity weights and their per-battle shift. */
  draft: z.object({
    cards: z.number().int().positive(),
    typeWeights: z.object({ blueprint: z.number().nonnegative(), upgrade: z.number().nonnegative(), relic: z.number().nonnegative() }).strict(),
    smallKit: z.object({ below: z.number().int().positive(), blueprintShare: z.number().min(0).max(1) }).strict(),
    rarity: z.tuple([z.number().nonnegative(), z.number().nonnegative(), z.number().nonnegative()]),
    rarityShiftPerBattle: z.number().nonnegative(),
    eliteRareBonus: z.number().nonnegative(),
    rarityBiasStep: z.number().nonnegative(),
    coreWeight: z.number().positive(),
  }).strict(),
  matrix: z.object({ slash: MatrixRow, pierce: MatrixRow, crush: MatrixRow }).strict(),
  tagMult: z.object({ siegeVsStructure: Pos, slayerVsElite: Pos }).strict(),
  effectiveness: z.object({ strongAtLeast: Pos, weakAtMost: Pos }).strict(),
  movement: z.object({ spawnOffset: z.number(), spawnJitter: z.number().nonnegative(), driftSpeed: z.number().nonnegative(), separationPasses: z.number().int().nonnegative() }).strict(),
  ai: z.object({
    thinkEverySeconds: Pos, targetStickySeconds: Pos, pressureWindowCols: z.number().int().positive(),
    pressureMinPresence: z.number().int().nonnegative(), threatRadius: Pos, towerRangeThreat: z.number(),
    placementNoise: z.number().nonnegative(),
    economyEarly: z.object({ beforeSeconds: Seconds, mult: z.number().nonnegative() }).strict(),
    economyLate: z.object({ afterSeconds: Seconds, mult: z.number().nonnegative() }).strict(),
    towerPressureMult: z.number().nonnegative(),
    mergeOffSlayerShare: z.number().min(0).max(1),
    /** The counter cycle and intel doctrines (SPEC §7.4, §7.6). */
    counter: z.object({
      /** Analysis times and the activation delay, in seconds; the boss adds `bossCycles`. */
      cycles: z.array(z.object({ analyzeSeconds: Seconds, activeSeconds: Seconds }).strict()),
      bossCycles: z.array(z.object({ analyzeSeconds: Seconds, activeSeconds: Seconds }).strict()),
      scoreNoise: z.number().nonnegative(),
      swarmEliteDiscount: z.number().min(0).max(1),
      eliteScoreMult: z.number().nonnegative(),
      counterMult: z.number().nonnegative(),
      otherMult: z.number().nonnegative(),
      openingMult: z.number().nonnegative(),
      openingOtherMult: z.number().nonnegative(),
      dualMult: z.number().nonnegative(),
      /** Free 2×2 slots wanted at activation before the general sells (at most `maxSells`). */
      freeSlots: z.number().int().nonnegative(),
      maxSells: z.number().int().nonnegative(),
      /** Intel: weight of the previous file in `intel = keep × intel + (1 − keep) × profile`. */
      intelKeep: z.number().min(0).max(1),
    }).strict(),
    score: z.object({
      spawnerDepth: z.number(), spawnerThreat: z.number(), spawnerSurcharge: z.number(),
      economyLoam: z.number(), economyDepth: z.number(), economyThreat: z.number(),
      towerFront: z.number(), towerThreat: z.number(),
    }).strict(),
  }).strict(),
  rounds: RoundsSchema,
}).strict();

export const BalanceTargetsSchema = z.object({
  G1: z.object({ seeds: z.number().int().positive(), goldBudget: z.number().int().positive(), maxPairingWinShare: z.number(), clearLossRatio: z.number() }).strict(),
  G2: z.object({
    seeds: z.number().int().positive(), supply: z.number().int().positive(), minSeedsForEdge: z.number().int().positive(), maxSeconds: Pos,
    /** Intended counter edges [winner, loser], reported (not asserted); `unit@tier` duels a merged unit. */
    intendedEdges: z.array(z.tuple([DuelUnit, DuelUnit])),
    /** Intended edges that must hold (in ≥ minSeedsForEdge seeds) for G2 to pass: the M4 edges. */
    assertedEdges: z.array(z.tuple([DuelUnit, DuelUnit])).optional(),
  }).strict(),
  /** G3: mono bots against `bot:balanced` on every map in the run pool; `seeds` per seat, limits on the mean over maps and the worst map. */
  G3: z.object({ seeds: z.number().int().positive(), maxMeanWinRate: z.number(), maxMapWinRate: z.number() }).strict(),
  G4: z.object({ seeds: z.number().int().positive(), botWinMin: z.number(), botWinMax: z.number() }).strict(),
  G5: z.object({ seeds: z.number().int().positive(), bonusGold: z.number().int(), minWinRate: z.number(), maxWinRate: z.number() }).strict(),
  /** Each check pits a bot against its own merge-off twin, so merging is the only difference. */
  /** G8: adaptation matters. Mono bots against one general with and without `adaptive`. */
  G8: z.object({
    seeds: z.number().int().positive(), general: Id, minDrop: z.number(), minBaseline: z.number(),
    balancedMin: z.number(), balancedMax: z.number(),
  }).strict(),
  G7: z.object({
    seeds: z.number().int().positive(),
    mirror: z.object({ mergeBot: Id, noMergeBot: Id, minWinRate: z.number(), maxWinRate: z.number() }).strict(),
    slayers: z.object({ mergeBot: Id, noMergeBot: Id, share: z.number(), maxWinRate: z.number() }).strict(),
  }).strict(),
  G11: z.object({ tickMeanMs: Pos, tickP99Ms: Pos, battleWallMs: Pos, benchTicks: z.number().int().positive(), quickTicks: z.number().int().positive() }).strict(),
  /**
   * The round forms (SPEC §12.3, R2a/T119), asserted in `tests/slow/` beside v1's blocks until R2b retires
   * those. G2 stays the block above. The battle-level bands (G4, G6, G8, G13, G16) are the user's, set from R2a's
   * measurement (§18.2 #35, T125, 2026-11-03); R2b sets G14's and G15's and re-reads G8's beside G14.
   */
  rounds: z.object({
    G1: z.object({ seeds: z.number().int().positive(), goldBudget: z.number().int().positive(), maxPairingWinShare: z.number(), clearLossRatio: z.number() }).strict(),
    G3: z.object({ seeds: z.number().int().positive(), maxMeanWinRate: z.number(), maxMapWinRate: z.number() }).strict(),
    /** `bot:balanced` against the scripted general on Bogwater Hollow: the median rounds, the share reaching the last round, the bot's wins. */
    G4: z.object({
      seeds: z.number().int().positive(), medianMinRounds: z.number().int().positive(), medianMaxRounds: z.number().int().positive(),
      maxRound9Share: z.number(), botWinMin: z.number(), botWinMax: z.number(),
    }).strict(),
    G5: z.object({ seeds: z.number().int().positive(), bonusGold: z.number().int(), minWinRate: z.number(), maxWinRate: z.number() }).strict(),
    /** `scenario` played by `bot` in both seats, with equal max HP; and in G4's games, the winner's Heartcap hit in at least `winnerHitShare`. */
    G6: z.object({
      seeds: z.number().int().positive(), scenario: Id, bot: Id, minBehindWinRate: z.number(), maxBehindWinRate: z.number(), winnerHitShare: z.number(),
    }).strict(),
    /** As v1's G7, the Slayer share read from what each side fielded (§14.4's `fielded`). */
    G7: z.object({
      seeds: z.number().int().positive(),
      mirror: z.object({ mergeBot: Id, noMergeBot: Id, minWinRate: z.number(), maxWinRate: z.number() }).strict(),
      slayers: z.object({ mergeBot: Id, noMergeBot: Id, share: z.number(), maxWinRate: z.number() }).strict(),
    }).strict(),
    /** As v1's G8, with a band for each planning policy's bot against the adaptive general (X7): `bot:balanced`'s, and `bot:answer`'s ceiling. */
    G8: z.object({
      seeds: z.number().int().positive(), general: Id, minDrop: z.number(), minBaseline: z.number(),
      policies: z.array(z.object({ bot: Id, min: z.number().optional(), max: z.number().optional() }).strict()).min(1),
    }).strict(),
    /** v1's G11, plus the budgets new in v2 (§13.7): the arrival, the general's turn, a planning command's sim part, and a full colony's units a side. */
    G11: z.object({
      tickMeanMs: Pos, tickP99Ms: Pos, battleWallMs: Pos, benchTicks: z.number().int().positive(), quickTicks: z.number().int().positive(),
      arrivalMs: Pos, generalTurnMs: Pos, planCommandMs: Pos, colonyUnits: z.number().int().positive(),
    }).strict(),
    /** The strict counter bar: an answer winning `minAnswerRate` on every run-pool map for each build whose G3 mean is above `minBuildMean`. */
    G12: z.object({
      screenSeeds: z.number().int().positive(), confirmSeeds: z.number().int().positive(), top: z.number().int().positive(),
      minBuildMean: z.number(), minAnswerRate: z.number(),
    }).strict(),
    G13: z.object({ maxCappedShare: z.number(), clashSecondsMin: Pos, clashSecondsMax: Pos }).strict(),
    /** The formation rule against its front and back ranks swapped, pooled over role-split pairs (R2-Q10), a column per budget. */
    G16: z.object({
      seeds: z.number().int().positive(), budgets: z.array(z.number().int().positive()).min(1), minWinRate: z.number(), pairs: z.literal('roleSplit'),
    }).strict(),
  }).strict(),
}).strict();

const StatPatch = z.object({
  hpMult: Pos.optional(), damageMult: Pos.optional(), speedMult: Pos.optional(), attackIntervalMult: Pos.optional(),
  rangeAdd: z.number().optional(), splashRadius: Pos.optional(), radiusAdd: z.number().optional(), slayerMult: Pos.optional(),
  resist: z.object({ slash: Pos.optional(), pierce: Pos.optional(), crush: Pos.optional() }).strict().optional(),
  healTargets: z.number().int().positive().optional(),
}).strict();

export const UnitSchema = z.object({
  id: Id, name: z.string().min(1), sprite: Id, milestone: z.number().int().positive(),
  hp: z.number().int().positive(), armor: UnitArmor,
  /** Damage per hit; 0 only for support units that heal instead of attacking. */
  damage: z.number().nonnegative(), damageType: DamageType, attackInterval: Pos,
  range: Pos, projectileSpeed: z.number().nonnegative(),
  speed: Pos, supply: z.union([z.literal(1), z.literal(2), z.literal(3)]), aggroRange: Pos, radius: Pos,
  splashRadius: Pos.optional(), tags: z.array(Tag),
  /** Support healing (Tender, SPEC §11.3): heals the ally missing the most HP within the unit's range. */
  heal: z.object({ amount: Pos, interval: Pos, targets: z.number().int().positive().optional() }).strict().optional(),
  /** Actions fired where the unit dies (e.g. M6's Bursting strain). */
  onDeath: z.array(EffectActionSchema).optional(),
  mergePerks: z.object({ '2': StatPatch, '3': StatPatch }).strict(),
}).strict().superRefine((u, ctx) => {
  if (u.damage === 0 && !u.heal) ctx.addIssue({ code: 'custom', message: `unit ${u.id}: damage 0 is only allowed for healers` });
  if (u.heal && !u.tags.includes('support')) ctx.addIssue({ code: 'custom', message: `unit ${u.id}: healers need the support tag` });
});

export const BuildingSchema = z.object({
  id: Id, name: z.string().min(1), sprite: Id, description: z.string(), milestone: z.number().int().positive(),
  /** Draft rarity of the blueprint card (default common). */
  rarity: Rarity.optional(),
  kind: z.enum(['spawner', 'tower', 'economy', 'utility']),
  footprint: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }).strict(),
  cost: z.number().int().positive(),
  /**
   * A tower's emplacement's HP (§6.7). v1's buildings took damage, so the data's other buildings still carry
   * one until R2b's T129 moves the tower's to `attack.hp`; a building in squad form has none (the flyers' Drift Stalk).
   */
  hp: z.number().int().positive().optional(),
  /** v1's spawn timer, still in the data until R2b's T129; nothing in rounds reads it, and a building in squad form has none. */
  spawn: z.object({ unit: Id, count: z.number().int().positive(), interval: Pos, mergeForced: z.boolean().optional(), knitMult: Pos.optional() }).strict().optional(),
  /** The squad a spawner fields every round (§4.4, §11.2). */
  squad: z.object({ unit: Id, count: z.number().int().positive() }).strict().optional(),
  attack: z.object({
    damage: Pos, damageType: DamageType, interval: Pos, range: Pos,
    minRange: z.number().nonnegative().optional(), splashRadius: Pos.optional(), projectileSpeed: z.number().nonnegative(),
  }).strict().optional(),
  /** `goldPerRound` is R2a's, beside v1's `goldPerTick` until R2b replaces it (§6.2, §11.2). v1 never reads it. */
  economy: z.object({
    goldPerTick: z.number().int().nonnegative(), interestCapAdd: z.number().int().optional(), goldPerRound: z.number().int().nonnegative().optional(),
  }).strict().optional(),
  /** Utility effects while the building stands (Rhizome Vault: +supply cap, at most `maxCount` count). */
  utility: z.object({ supplyCapAdd: z.number().int().positive(), maxCount: z.number().int().positive() }).strict().optional(),
}).strict().superRefine((b, ctx) => {
  const need = { spawner: 'squad', tower: 'attack', economy: 'economy', utility: null } as const;
  const key = need[b.kind];
  if (key && !b[key]) ctx.addIssue({ code: 'custom', message: `${b.kind} building ${b.id} needs a "${key}" block` });
  if (b.kind === 'tower' && b.hp === undefined) ctx.addIssue({ code: 'custom', message: `tower ${b.id} needs "hp", its emplacement's` });
});

export const FactionSchema = z.object({
  id: Id, name: z.string(), palette: z.record(z.string().length(1), Hex),
  mat: z.object({ base: Hex, strand: Hex, glow: Hex }).strict(),
  buildings: z.array(Id).min(1), note: z.string().optional(),
}).strict();

/**
 * A map's colonies in rounds (SPEC §4.1, §4.6, §11.9): its tiles with the terrain moved into the colonies,
 * the home columns (2 a rank, so homeCols 6 holds a closed third rank) and how many ranks start open
 * (§18.2 #19). v1 reads none of it, only the map's own `tiles` and `homeCols` (`src/sim/create.ts`), so it
 * moves no v1 golden. R2b folds it into the map's own fields.
 */
const ColonySchema = z.object({
  homeCols: z.number().int().min(2), startRanks: z.number().int().min(1),
  tiles: z.array(z.string().regex(/^[.$o#]+$/, 'tiles use . $ o #')),
}).strict();
type ColonyDef = z.infer<typeof ColonySchema>;
type LaneRows = { rowStart: number; rowEnd: number };

/**
 * The colony block's checks: even home columns, point-symmetric tiles on mirrored lanes, lanes that hold
 * pairs of rows, and loam and stumps only on plots. A lane of odd rows leaves a row out of its plots,
 * your colony's bottom row and the general's top row (its point mirror), so that row holds no terrain.
 */
function colonyProblems(m: { id: string; width: number; height: number; lanes: LaneRows[] }, c: ColonyDef): string[] {
  const W = m.width, H = m.height, out: string[] = [];
  const ranks = Math.floor(c.homeCols / 2);
  if (c.homeCols % 2 !== 0) out.push(`${m.id}: colony.homeCols ${c.homeCols} must be even, 2 columns a rank`);
  if (c.startRanks > ranks) out.push(`${m.id}: colony.startRanks ${c.startRanks} is more than its ${ranks} ranks`);
  if (c.homeCols * 2 >= W) out.push(`${m.id}: the colonies overlap`);
  if (c.tiles.length !== H || c.tiles.some((row) => row.length !== W)) return [...out, `${m.id}: colony.tiles must be ${H} rows of ${W}`];
  symmetry: for (let r = 0; r < H; r++) {
    for (let col = 0; col < W; col++) {
      if (c.tiles[r]![col] !== c.tiles[H - 1 - r]![W - 1 - col]) { out.push(`${m.id}: colony.tiles are not point-symmetric at (${col}, ${r})`); break symmetry; }
    }
  }
  const terrain = (row: number, from: number, to: number): boolean => /[$o]/.test(c.tiles[row]!.slice(from, to));
  m.lanes.forEach((lane, i) => {
    if (lane.rowEnd < lane.rowStart || lane.rowEnd >= H) return; // the map's own checks report it
    const mirror = m.lanes[m.lanes.length - 1 - i]!;
    if (lane.rowStart + mirror.rowEnd !== H - 1) out.push(`${m.id}: lane ${i} doesn't mirror lane ${m.lanes.length - 1 - i}, so the colonies can't`);
    const rows = lane.rowEnd - lane.rowStart + 1;
    if (rows < 2) out.push(`${m.id}: lane ${i} has no pair of rows for a plot`);
    else if (rows % 2 === 1 && (terrain(lane.rowEnd, 0, c.homeCols) || terrain(lane.rowStart, W - c.homeCols, W))) {
      out.push(`${m.id}: lane ${i}'s leftover row holds no plot, so it holds no loam or stump`);
    }
    for (let r = lane.rowStart; r <= lane.rowEnd; r++) if (c.tiles[r]!.includes('#')) out.push(`${m.id}: colony root wall inside lane ${i} (row ${r})`);
  });
  c.tiles.forEach((row, r) => {
    const col = row.slice(c.homeCols, W - c.homeCols).search(/[$o]/);
    if (col >= 0) out.push(`${m.id}: colony terrain at (${c.homeCols + col}, ${r}) lies outside the colonies`);
  });
  return out;
}

export const MapSchema = z.object({
  id: Id, name: z.string(), width: z.number().int().min(8), height: z.number().int().min(3),
  homeCols: z.number().int().min(1), milestone: z.number().int().positive(), testOnly: z.boolean().optional(),
  lanes: z.array(z.object({ rowStart: z.number().int().nonnegative(), rowEnd: z.number().int().nonnegative() }).strict()).min(1).max(3),
  tiles: z.array(z.string().regex(/^[.$o#]+$/, 'tiles use . $ o #')),
  /** Rounds' colonies (R2a). Optional, so the two-lane test maps that have none still validate. */
  colony: ColonySchema.optional(),
}).strict().superRefine((m, ctx) => {
  if (m.colony) for (const message of colonyProblems(m, m.colony)) ctx.addIssue({ code: 'custom', message });
  if (m.tiles.length !== m.height) ctx.addIssue({ code: 'custom', message: `${m.id}: ${m.tiles.length} tile rows, expected ${m.height}` });
  m.tiles.forEach((row, r) => {
    if (row.length !== m.width) ctx.addIssue({ code: 'custom', message: `${m.id}: row ${r} has ${row.length} chars, expected ${m.width}` });
  });
  if (m.homeCols * 2 >= m.width) ctx.addIssue({ code: 'custom', message: `${m.id}: home zones overlap` });
  let prevEnd = -1;
  m.lanes.forEach((l, i) => {
    if (l.rowEnd < l.rowStart || l.rowEnd >= m.height) ctx.addIssue({ code: 'custom', message: `${m.id}: lane ${i} rows out of range` });
    if (l.rowStart <= prevEnd) ctx.addIssue({ code: 'custom', message: `${m.id}: lane ${i} overlaps the previous lane` });
    prevEnd = l.rowEnd;
    for (let r = l.rowStart; r <= l.rowEnd; r++) {
      if ((m.tiles[r] ?? '').includes('#')) ctx.addIssue({ code: 'custom', message: `${m.id}: root wall inside lane ${i} (row ${r})` });
    }
  });
});

/**
 * A unit's or an emplacement's shape (SPEC §5.8, §14.2, §14.3; R4a): its body, which the data checks
 * (src/data/shapes.ts) hold every frame to. Strict, so a weapon mark can't come back in: units and
 * emplacements carry none (§5.8, the user's decision of 2026-11-01).
 */
export const SpriteShapeSchema = z.object({
  body: z.enum(['small', 'medium', 'big', 'structure']),
}).strict();
const Band = z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(([lo, hi]) => lo <= hi, 'a band is [min, max]');
/** Each body class's [min, max] height in native px (§14.3): display data, kept out of balance.json. Structure has none. */
export const SpriteBandsSchema = z.object({ small: Band, medium: Band, big: Band }).strict();

export const SpriteSchema = z.object({
  id: Id, w: z.number().int().positive(), h: z.number().int().positive(),
  anchor: z.tuple([z.number(), z.number()]),
  palette: z.record(z.string().length(1), Hex.nullable()),
  frames: z.array(z.array(z.string())).min(1),
  factionSwap: z.boolean().optional(),
  shape: SpriteShapeSchema.optional(),
}).strict().superRefine((s, ctx) => {
  s.frames.forEach((frame, f) => {
    if (frame.length !== s.h) ctx.addIssue({ code: 'custom', message: `sprite ${s.id} frame ${f}: ${frame.length} rows, expected ${s.h}` });
    frame.forEach((row, r) => {
      if (row.length !== s.w) ctx.addIssue({ code: 'custom', message: `sprite ${s.id} frame ${f} row ${r}: ${row.length} chars, expected ${s.w}` });
      for (const ch of row) {
        if (!(ch in s.palette)) ctx.addIssue({ code: 'custom', message: `sprite ${s.id} frame ${f} row ${r}: "${ch}" is not in the palette` });
      }
    });
  });
});
export const SpriteSheetSchema = z.object({ sheet: Id, sprites: z.array(SpriteSchema), bands: SpriteBandsSchema.optional() }).strict();

// ---- sounds (SPEC §13.9): synthesized WebAudio, defined as parameters the way sprites are text ----

const OSC_WAVES = ['sine', 'triangle', 'square', 'saw'] as const;
const NOISE_WAVES = ['white', 'pink', 'brown'] as const;
export const SoundWave = z.enum([...OSC_WAVES, ...NOISE_WAVES]);
export const NoiseWave = z.enum(NOISE_WAVES);
export const SoundBus = z.enum(['sfx', 'ui', 'ambient']);
const Hz = z.number().min(10).max(20000);
/** A ramp from the starting value to `to` over `time` seconds (exponential, so pitches glide evenly). */
const Sweep = z.object({ to: Hz, time: Pos }).strict();
const SoundFilter = z.object({
  type: z.enum(['lowpass', 'highpass', 'bandpass', 'notch', 'peaking']),
  freq: Hz, q: z.number().min(0.0001).max(40).optional(), sweep: Sweep.optional(),
}).strict();
/** Attack and decay to the sustain level (a fraction of the layer's gain), hold it, then release; all in seconds. */
const Envelope = z.object({ attack: Seconds, decay: Seconds, sustain: z.number().min(0).max(1), hold: Seconds, release: Seconds }).strict();

/** One oscillator or noise source through an optional filter and an envelope. */
export const SoundLayerSchema = z.object({
  wave: SoundWave,
  /** Oscillators only: the starting pitch in Hz, with an optional glide. */
  freq: Hz.optional(),
  sweep: Sweep.optional(),
  /** Oscillators only: pitch wobble, `depth` in cents. */
  vibrato: z.object({ rate: Pos, depth: Pos }).strict().optional(),
  filter: SoundFilter.optional(),
  env: Envelope,
  gain: z.number().min(0).max(1),
  /** Seconds after the sound starts (arpeggios, a thud after a crack). */
  delay: Seconds.optional(),
}).strict().superRefine((l, ctx) => {
  const noise = (NOISE_WAVES as readonly string[]).includes(l.wave);
  if (noise && (l.freq !== undefined || l.sweep || l.vibrato)) ctx.addIssue({ code: 'custom', message: `${l.wave} noise has no pitch: shape it with a filter instead of freq, sweep or vibrato` });
  if (!noise && l.freq === undefined) ctx.addIssue({ code: 'custom', message: `a ${l.wave} oscillator needs a freq` });
});

export const SoundSchema = z.object({
  id: Id, name: z.string().min(1),
  /** What it is for, shown on the sound board. */
  note: z.string().optional(),
  bus: SoundBus,
  gain: z.number().min(0).max(1),
  /** When every voice is busy, a sound takes over the oldest voice of lower priority, or is dropped. */
  priority: z.number().int().min(0).max(10),
  /** The same sound (per key) is dropped if it played less than this long ago. */
  cooldownMs: z.number().int().nonnegative(),
  /** Frequent sounds thin out and play quieter at 2× and 3× speed. */
  frequent: z.boolean().optional(),
  /** Random variation per play: pitch and gain as fractions (±), pan as the widest offset from centre. */
  jitter: z.object({
    pitch: z.number().min(0).max(0.5).optional(), gain: z.number().min(0).max(0.9).optional(), pan: z.number().min(0).max(1).optional(),
  }).strict().optional(),
  layers: z.array(SoundLayerSchema).min(1).max(6),
}).strict();

const PerSpeed = z.tuple([Pos, Pos, Pos]);
export const SoundBankSchema = z.object({
  /** The enemy's sounds play at this fraction of the player's. */
  enemyGain: z.number().min(0).max(1),
  maxVoices: z.number().int().min(1).max(32),
  /** Bus levels under the player's volume settings (ui follows the effects volume). */
  buses: z.object({ sfx: z.number().min(0).max(1), ui: z.number().min(0).max(1), ambient: z.number().min(0).max(1) }).strict(),
  /** For frequent sounds at 1×, 2× and 3× speed: cooldown multipliers and gain multipliers. */
  speedThinning: z.object({ cooldown: PerSpeed, gain: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]) }).strict(),
  /** A cave: a generated impulse response `seconds` long that fades as (1 − t)^decay, fed from each bus. */
  reverb: z.object({
    seconds: z.number().min(0.1).max(4), decay: Pos,
    sends: z.object({ sfx: z.number().min(0).max(1), ui: z.number().min(0).max(1), ambient: z.number().min(0).max(1) }).strict(),
  }).strict(),
  ambient: z.object({
    /** A looping noise bed through a filter whose cutoff drifts by `wobble.depth` Hz at `wobble.rate` Hz. */
    drone: z.object({
      wave: NoiseWave, filter: SoundFilter, gain: z.number().min(0).max(1),
      wobble: z.object({ rate: Pos, depth: Pos }).strict().optional(),
    }).strict(),
    /** One of `sounds` (ambient-bus sounds) every `minGapMs`–`maxGapMs`. */
    drips: z.object({ sounds: z.array(Id).min(1), minGapMs: z.number().int().positive(), maxGapMs: z.number().int().positive() }).strict()
      .refine((d) => d.maxGapMs >= d.minGapMs, 'maxGapMs must be at least minGapMs'),
    /** The bed's level while a battle is paused. */
    pausedLevel: z.number().min(0).max(1),
  }).strict(),
  sounds: z.array(SoundSchema).min(1),
}).strict();

/** `afterRound` is R2a's reading of `afterSeconds`, one round a minute (§7.2, §14.2); v1's profiles never copy it. */
const Limit = z.object({ maxOwned: z.number().int().nonnegative().optional(), afterSeconds: Seconds.optional(), afterRound: Round.optional() }).strict();

export const GeneralSchema = z.object({
  id: Id, name: z.string(), sprite: Id, faction: Id, milestone: z.number().int().positive(), description: z.string().optional(),
  opener: z.array(Id), weights: z.record(Id, z.number().nonnegative()), limits: z.record(Id, Limit).optional(),
  /** Blueprints the general adds to its kit, one per battle index, in order (SPEC §7.8). */
  preferred: z.array(Id).optional(),
  laneStyle: z.enum(['defensive', 'aggressive']), appearsIn: z.array(z.number().int().positive()),
  /** Default auto: merging off on swarm buildings while the opponent's Slayer share is high (SPEC §7.2). */
  mergePolicy: MergePolicy.optional(),
  /** Personality passive (SPEC §7.7), applied as a battle modifier on the general's side. */
  passive: EffectBundleSchema.optional(),
  /** Runs the counter cycle and reads intel when `flags.adaptiveGeneral` is on (SPEC §7.4, §7.6). */
  adaptive: z.boolean().optional(),
  /** The run's final general: the early counter cycle, the dual doctrine and the boss kit (SPEC §7.6–7.8). */
  boss: z.boolean().optional(),
  /** Portrait line on the route and in the Intent panel. */
  title: z.string().optional(),
}).strict();

export const BotSchema = z.object({
  id: Id, description: z.string().optional(), opener: z.array(Id), weights: z.record(Id, z.number().nonnegative()),
  limits: z.record(Id, Limit).optional(), mergePolicy: MergePolicy, adaptive: z.boolean().optional(),
  placement: z.object({ spawnerDepthWeight: z.number().optional() }).strict().optional(),
  /** Buys only what `weights` lists (the counter check's test bots). */
  fixedWeights: z.boolean().optional(),
  /** In rounds, `answer` leans toward the answer to the general's planned army (SPEC §12.2, X7); fixed weights unless set. */
  policy: z.literal('answer').optional(),
}).strict();

const ScenarioUnits = z.object({
  unit: Id, tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  lane: z.number().int().nonnegative().optional(), x: z.number(), y: z.number(),
  count: z.number().int().positive().optional(), rows: z.number().int().positive().optional(),
  dx: z.number().optional(), dy: z.number().optional(),
}).strict();
// ---- scenarios: `data/scenarios/<id>.json` (SPEC §15.2, R2a plan Call 18) ----

const SideName = z.enum(['player', 'enemy']);
const ScenarioSide = z.object({
  /** The buildings planted on its plots before the scenario's round; each merges unless `merge` is false (§5.6). */
  colony: z.array(z.object({
    building: Id, lane: z.number().int().nonnegative(), rank: z.number().int().nonnegative(), file: z.number().int().positive(),
    merge: z.boolean().optional(),
  }).strict()).optional(),
  /** Its kit by building id: its faction's roster unless set (SPEC §18.1 D45). */
  kit: z.array(Id).optional(),
  /** Its gold before the round's income: §6.1's starting gold unless set. */
  gold: z.number().int().nonnegative().optional(),
  /** Its Heartcap, full unless `heartcapHp` is set (SPEC §4.5). */
  heartcapHp: z.number().int().nonnegative().optional(),
  heartcapMaxHp: z.number().int().positive().optional(),
  /** The Heartcap damage it has dealt in the rounds before: the other side's max HP minus its HP unless set. */
  dealt: z.number().int().nonnegative().optional(),
  /** The plots its colony holds: the map's base plots unless set (SPEC §4.6). */
  plots: z.number().int().nonnegative().optional(),
  /** Its commander: the passive, and the power with the powers flag (SPEC §11.10). */
  commander: Id.optional(),
}).strict();
/** A round before the scenario's: each lane's winner (null for a draw), and the Heartcap damage each side dealt, whose smaller dealer lost it (SPEC §6.7). */
const ScenarioRound = z.object({
  lanes: z.array(SideName.nullable()).optional(),
  damage: z.object({ player: z.number().int().nonnegative(), enemy: z.number().int().nonnegative() }).strict().optional(),
}).strict();
const ScenarioFielded = z.object({
  unit: Id, tier: TierSel.optional(), count: z.number().int().positive(), lane: z.number().int().nonnegative().optional(),
}).strict();

export const ScenarioSchema = z.object({
  id: Id, description: z.string(), map: Id,
  battleIndex: z.number().int().positive().optional(),
  /** The round it starts in, 1 unless set. */
  round: z.number().int().positive().optional(),
  controllers: z.object({ player: z.string().optional(), enemy: z.string().optional() }).strict().optional(),
  /** Feature flags this scenario needs, over the milestone defaults (an explicit --flags still wins). */
  flags: z.object({ merging: z.boolean().optional(), drafts: z.boolean().optional(), adaptiveGeneral: z.boolean().optional(), powers: z.boolean().optional() }).strict().optional(),
  sides: z.object({ player: ScenarioSide, enemy: ScenarioSide }).strict(),
  /** The last round's result, whose damage counts in each side's `dealt` (R2a plan Call 18, A106). */
  last: ScenarioRound.optional(),
  /** Instead of `dealt` and `last`: every round before this one, with what each side fielded, which the counter cycle reads (SPEC §7.4). */
  rounds: z.array(ScenarioRound.extend({
    fielded: z.object({ player: z.array(ScenarioFielded).optional(), enemy: z.array(ScenarioFielded).optional() }).strict().optional(),
  })).optional(),
  /** For rule tests: units placed for a clash directly, which the scenario starts in. */
  clash: z.object({ units: z.array(z.object({ side: SideName, ...ScenarioUnits.shape }).strict()) }).strict().optional(),
}).strict();

// ---- run content (SPEC §8, §11.6–11.7) ----

const TrackLevel = z.object({ text: z.string().min(1), effects: EffectBundleSchema }).strict();
export const UpgradeTrackSchema = z.object({
  building: Id,
  levels: z.tuple([TrackLevel, TrackLevel, TrackLevel]),
  rarity: z.tuple([Rarity, Rarity, Rarity]),
}).strict();

export const RelicSchema = z.object({
  id: Id, name: z.string().min(1), rarity: Rarity, text: z.string().min(1), effects: EffectBundleSchema,
  /** A feat that unlocks it (M6). Until meta-progression exists every relic counts as unlocked. */
  unlockedBy: Id.optional(),
  /** A feature the relic needs; it stays out of the draft pool while that feature is off. */
  requires: z.enum(['powers']).optional(),
}).strict();

/**
 * Run-level outcomes of events and Grove choices (SPEC §8.7). Since R2 there's no run-long Heartcap to repair:
 * `gainLife` regains a life, `maxHpPct` changes every later battle's Heartcap max, and `nextBattle` shapes one
 * battle, its storm shifted in rounds.
 */
export const RunEffectSchema = z.union([
  z.object({ gainLife: z.number().int().positive() }).strict(),
  z.object({ maxHpPct: z.number().min(-0.9).max(1) }).strict(),
  z.object({ gainRelic: z.object({ rarity: Rarity.optional(), count: z.number().int().positive().optional() }).strict() }).strict(),
  z.object({ gainAmber: z.number().int().positive() }).strict(),
  z.object({
    nextBattle: z.object({
      startingGold: z.number().int().optional(), sporestormShiftRounds: z.number().int().optional(), heartcapMaxHpPct: z.number().min(-0.9).max(1).optional(),
    }).strict(),
  }).strict(),
  z.object({ halveIntel: z.literal(true) }).strict(),
  z.object({ upgrade: z.object({ count: z.number().int().positive(), pick: z.enum(['choose', 'random']), ownedOnly: z.boolean().optional() }).strict() }).strict(),
  z.object({ removeBlueprint: z.literal('choose') }).strict(),
  z.object({ sacrificeRelic: z.object({ gain: z.number().int().positive(), rarityShift: z.number().int().min(-2).max(0) }).strict() }).strict(),
]);

export const EventSchema = z.object({
  id: Id, title: z.string().min(1), text: z.string().min(1),
  choices: z.array(z.object({ label: z.string().min(1), text: z.string(), outcome: z.array(RunEffectSchema) }).strict()).min(2).max(3),
}).strict();

/** Elite modifiers (SPEC §7.7): an effect bundle on the general's side and/or extra upgrade levels. */
export const EliteSchema = z.object({
  id: Id, name: z.string().min(1), text: z.string().min(1),
  effects: EffectBundleSchema.optional(),
  upgradeLevels: z.number().int().positive().optional(),
}).strict();

/**
 * A commander's active power (SPEC §6.6, §11.10). `burst` deals damage to every enemy unit and building
 * within `radius` of a point; `surge` captures the side's frontier column in every lane where no enemy
 * building stands; `bloom` merges every same-type trio within `radius` of a point at once; `tithe` pays
 * `goldPerColumn` for every column the side holds past its home columns.
 */
const PowerBase = { id: Id, name: z.string().min(1), text: z.string().min(1), cooldown: Pos, firstReady: Seconds };
export const PowerSchema = z.discriminatedUnion('kind', [
  z.object({ ...PowerBase, kind: z.literal('burst'), target: z.literal('point'), radius: Pos, damage: Pos, damageType: DamageType }).strict(),
  z.object({ ...PowerBase, kind: z.literal('surge'), target: z.literal('global') }).strict(),
  z.object({ ...PowerBase, kind: z.literal('bloom'), target: z.literal('point'), radius: Pos }).strict(),
  z.object({ ...PowerBase, kind: z.literal('tithe'), target: z.literal('global'), goldPerColumn: z.number().int().positive() }).strict(),
]);

/** Commanders (SPEC §11.10): a core pool, a starter kit, a passive and an active power. */
export const CommanderSchema = z.object({
  id: Id, name: z.string().min(1), milestone: z.number().int().positive(),
  /** A short epithet for the select screen ("The starter"). */
  title: z.string().min(1),
  /** The portrait on the select screen (a 16×16 sprite). */
  sprite: Id,
  description: z.string().min(1),
  core: z.array(Id).length(6), starter: z.tuple([Id, Id, Id]),
  passive: z.object({ text: z.string().min(1), effects: EffectBundleSchema }).strict(),
  power: PowerSchema,
}).strict().superRefine((c, ctx) => {
  for (const id of c.starter) if (!c.core.includes(id)) ctx.addIssue({ code: 'custom', message: `commander ${c.id}: starter ${id} is not in the core pool` });
});

export type BalanceDef = z.infer<typeof BalanceSchema>;
export type BalanceTargets = z.infer<typeof BalanceTargetsSchema>;
export type UnitDef = z.infer<typeof UnitSchema>;
export type BuildingDef = z.infer<typeof BuildingSchema>;
export type FactionDef = z.infer<typeof FactionSchema>;
export type MapDef = z.infer<typeof MapSchema>;
export type SpriteDef = z.infer<typeof SpriteSchema>;
export type SpriteShape = z.infer<typeof SpriteShapeSchema>;
export type SpriteBands = z.infer<typeof SpriteBandsSchema>;
export type SoundLayerDef = z.infer<typeof SoundLayerSchema>;
export type SoundDef = z.infer<typeof SoundSchema>;
export type SoundBankDef = z.infer<typeof SoundBankSchema>;
export type SoundBusT = z.infer<typeof SoundBus>;
export type GeneralDef = z.infer<typeof GeneralSchema>;
export type BotDef = z.infer<typeof BotSchema>;
export type ScenarioDef = z.infer<typeof ScenarioSchema>;
export type UpgradeTrackDef = z.infer<typeof UpgradeTrackSchema>;
export type RelicDef = z.infer<typeof RelicSchema>;
export type EventDef = z.infer<typeof EventSchema>;
export type EliteDef = z.infer<typeof EliteSchema>;
export type CommanderDef = z.infer<typeof CommanderSchema>;
export type PowerDef = z.infer<typeof PowerSchema>;
export type RunEffect = z.infer<typeof RunEffectSchema>;
export type ModifierDef = z.infer<typeof ModifierSchema>;
export type SelectorDef = z.infer<typeof SelectorSchema>;
export type TriggerDef = z.infer<typeof TriggerSchema>;
export type EffectAction = z.infer<typeof EffectActionSchema>;
export type EffectBundle = z.infer<typeof EffectBundleSchema>;
export type StatKeyT = z.infer<typeof StatKey>;
export type RarityT = z.infer<typeof Rarity>;
export type DamageTypeT = z.infer<typeof DamageType>;
export type ArmorTypeT = z.infer<typeof ArmorType>;
export type TagT = z.infer<typeof Tag>;
