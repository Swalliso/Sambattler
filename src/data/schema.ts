// zod schemas for every data file (SPEC §14). Milestone 4 subset: balance, factions, buildings,
// units, maps, sprites, generals (with passives and the counter cycle), bots, scenarios, balance
// targets, plus the run content (upgrade tracks, relics, events, elite modifiers, commanders with
// their passives and powers), the effects DSL (§14.2) and the sound bank (§13.9).
import { z } from 'zod';

export const Id = z.string().min(1).regex(/^[a-zA-Z0-9:_-]+$/, 'ids use letters, digits, : _ -');
export const DamageType = z.enum(['slash', 'pierce', 'crush']);
export const UnitArmor = z.enum(['light', 'medium', 'heavy']);
export const ArmorType = z.enum(['light', 'medium', 'heavy', 'structure']);
export const Tag = z.enum(['siege', 'slayer', 'ranged', 'swarm', 'support']);
export const Rarity = z.enum(['common', 'uncommon', 'rare']);
const Seconds = z.number().nonnegative();
/** A unit id, optionally at a merge tier: `capguard` or `capguard@2`. */
const DuelUnit = z.string().regex(/^[a-zA-Z0-9_-]+(@[123])?$/, 'duel units are <unitId> or <unitId>@<tier>');
const MergePolicy = z.enum(['on', 'off', 'auto']);
const Pos = z.number().positive();
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colors are #rrggbb');

const MatrixRow = z.object({ light: Pos, medium: Pos, heavy: Pos, structure: Pos }).strict();

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
   * Which hits suppress production (half-speed spawns and income) while a building is besieged:
   * any damage (default), melee and other non-projectile hits only, or none. Selling stays locked
   * under any damage.
   */
  besiegedBy: z.enum(['all', 'melee', 'none']).optional(),
  /**
   * Prototype B1 (balance backlog), absent by default: listed units sprint at `speedMult` for up to
   * `seconds` when they close on a target they acquired out of range, then wait `cooldownSeconds`
   * before the next rush. Targeting is unchanged.
   */
  approachRush: z.object({
    units: z.array(z.string()).min(1), speedMult: Pos, seconds: Pos, cooldownSeconds: Seconds,
  }).strict().optional(),
  /**
   * Prototype B3, absent by default: a ranged unit's shot deals `blockedDamageMult` × damage when at
   * least `freeRanks` friendly ranged units stand between it and its target, within
   * `corridorHalfWidth` tiles of the line of fire.
   */
  firingCongestion: z.object({
    freeRanks: z.number().int().positive(), corridorHalfWidth: Pos, blockedDamageMult: z.number().min(0).max(1),
  }).strict().optional(),
  /**
   * Prototype B4, absent by default: every unit withers `seconds` after it spawns (a merged unit
   * starts a fresh lifespan, × `tierMult` per tier above 1).
   */
  unitLifespan: z.object({ seconds: Pos, tierMult: Pos.optional() }).strict().optional(),
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
   * Prototype T1, absent by default: the first-spawn fraction (of the interval) for spawners whose
   * unit fires projectiles, in place of `firstSpawnFraction`. 1 makes a new Gill Nest wait a full
   * interval before its first archer.
   */
  rangedFirstSpawnFraction: z.number().min(0).max(2).optional(),
  /**
   * Prototype T2, absent by default: a melee unit closing on an enemy unit falls back toward its own
   * Heartcap while its side's supply within `radius` of it is below `ratio` × the enemy supply
   * within `radius` of its target, for at most `maxHoldSeconds` from its first hold; then it commits
   * for the rest of its life. A change to SPEC §5.2 ("units always advance") if adopted.
   */
  fallBack: z.object({ radius: Pos, ratio: Pos, maxHoldSeconds: Pos }).strict().optional(),
  /**
   * Prototype T3, absent by default: spawners (optionally only those in their side's home columns)
   * shoot the nearest enemy unit within `range` tiles of their edge.
   */
  spawnerDefense: z.object({
    damage: Pos, damageType: DamageType, interval: Pos, range: Pos, projectileSpeed: Pos, homeOnly: z.boolean(),
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
      /**
       * Prototype A2, absent by default: while a counter is active, every counter-set building in
       * the kit has at least this base purchase weight (before the ×counterMult), even one outside
       * the general's weights.
       */
      counterFloorWeight: Pos.optional(),
    }).strict(),
    score: z.object({
      spawnerDepth: z.number(), spawnerThreat: z.number(), spawnerSurcharge: z.number(),
      economyLoam: z.number(), economyDepth: z.number(), economyThreat: z.number(),
      towerFront: z.number(), towerThreat: z.number(),
    }).strict(),
  }).strict(),
}).strict();

export const BalanceTargetsSchema = z.object({
  G1: z.object({ seeds: z.number().int().positive(), goldBudget: z.number().int().positive(), seconds: Pos, maxPairingWinShare: z.number(), clearLossRatio: z.number() }).strict(),
  G2: z.object({
    seeds: z.number().int().positive(), supply: z.number().int().positive(), minSeedsForEdge: z.number().int().positive(), maxSeconds: Pos,
    /** Intended counter edges [winner, loser], reported (not asserted); `unit@tier` duels a merged unit. */
    intendedEdges: z.array(z.tuple([DuelUnit, DuelUnit])),
    /** Intended edges that must hold (in ≥ minSeedsForEdge seeds) for G2 to pass: the M4 edges. */
    assertedEdges: z.array(z.tuple([DuelUnit, DuelUnit])).optional(),
  }).strict(),
  G3: z.object({ seeds: z.number().int().positive(), maxMonoWinRate: z.number() }).strict(),
  G4: z.object({ seeds: z.number().int().positive(), medianMinSeconds: Pos, medianMaxSeconds: Pos, maxDecisionShare: z.number(), botWinMin: z.number(), botWinMax: z.number() }).strict(),
  G5: z.object({ seeds: z.number().int().positive(), bonusGold: z.number().int(), minWinRate: z.number(), maxWinRate: z.number() }).strict(),
  G6: z.object({ seeds: z.number().int().positive(), scenario: Id, minBehindWinRate: z.number() }).strict(),
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
}).strict();

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

const TierSel = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const SelectorSchema = z.object({
  unit: Id.optional(), building: Id.optional(), tag: Tag.optional(), tier: TierSel.optional(),
  zone: z.enum(['home', 'contested']).optional(), onLoam: z.boolean().optional(),
  adjacentOwnBuildingsGte: z.number().int().positive().optional(),
}).strict();

export const ModifierSchema = z.object({
  stat: StatKey, op: z.enum(['add', 'mul', 'set']), value: z.number(),
  /** Whose stats change: the owner of the source (default) or the opponent. */
  side: z.enum(['self', 'opponent']).optional(),
  where: SelectorSchema.optional(),
}).strict().superRefine((m, ctx) => {
  const w = m.where ?? {};
  const scope = m.stat.split('.')[0];
  const positional = w.zone !== undefined || w.onLoam !== undefined || w.adjacentOwnBuildingsGte !== undefined;
  if ((scope === 'side' || scope === 'battle') && m.where) ctx.addIssue({ code: 'custom', message: `${m.stat} applies to the whole ${scope}; it takes no "where"` });
  if (positional && !POSITIONAL_STATS.includes(m.stat)) {
    ctx.addIssue({ code: 'custom', message: `positional selectors (zone, onLoam, adjacentOwnBuildingsGte) only work on ${POSITIONAL_STATS.join(' and ')}` });
  }
  if (w.tier !== undefined && scope !== 'unit') ctx.addIssue({ code: 'custom', message: 'a tier selector only applies to unit stats' });
});

export const EffectActionSchema = z.union([
  z.object({ gainGold: z.number().int() }).strict(),
  z.object({ explode: z.object({ damage: Pos, damageType: DamageType, radius: Pos }).strict() }).strict(),
  z.object({ repairHeartcapPct: z.number().positive().max(1) }).strict(),
]);

export const TriggerSchema = z.object({
  on: z.enum(['merge', 'unitDeath', 'buildingDestroyed', 'enemyUnitKilled', 'waveStart', 'battleStart']),
  if: SelectorSchema.extend({ sporestormGte: z.number().int().nonnegative().optional() }).strict().optional(),
  do: z.array(EffectActionSchema).min(1),
}).strict();

export const EffectBundleSchema = z.object({
  modifiers: z.array(ModifierSchema).optional(),
  triggers: z.array(TriggerSchema).optional(),
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
  cost: z.number().int().positive(), hp: z.number().int().positive(),
  spawn: z.object({ unit: Id, count: z.number().int().positive(), interval: Pos, mergeForced: z.boolean().optional(), knitMult: Pos.optional() }).strict().optional(),
  attack: z.object({
    damage: Pos, damageType: DamageType, interval: Pos, range: Pos,
    minRange: z.number().nonnegative().optional(), splashRadius: Pos.optional(), projectileSpeed: z.number().nonnegative(),
  }).strict().optional(),
  economy: z.object({ goldPerTick: z.number().int().nonnegative(), interestCapAdd: z.number().int().optional() }).strict().optional(),
  /** Utility effects while the building stands (Rhizome Vault: +supply cap, at most `maxCount` count). */
  utility: z.object({ supplyCapAdd: z.number().int().positive(), maxCount: z.number().int().positive() }).strict().optional(),
}).strict().superRefine((b, ctx) => {
  const need = { spawner: 'spawn', tower: 'attack', economy: 'economy', utility: null } as const;
  const key = need[b.kind];
  if (key && !b[key]) ctx.addIssue({ code: 'custom', message: `${b.kind} building ${b.id} needs a "${key}" block` });
});

export const FactionSchema = z.object({
  id: Id, name: z.string(), palette: z.record(z.string().length(1), Hex),
  mat: z.object({ base: Hex, strand: Hex, glow: Hex }).strict(),
  buildings: z.array(Id).min(1), note: z.string().optional(),
}).strict();

export const MapSchema = z.object({
  id: Id, name: z.string(), width: z.number().int().min(8), height: z.number().int().min(3),
  homeCols: z.number().int().min(1), milestone: z.number().int().positive(), testOnly: z.boolean().optional(),
  lanes: z.array(z.object({ rowStart: z.number().int().nonnegative(), rowEnd: z.number().int().nonnegative() }).strict()).min(1).max(3),
  tiles: z.array(z.string().regex(/^[.$o#]+$/, 'tiles use . $ o #')),
}).strict().superRefine((m, ctx) => {
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

export const SpriteSchema = z.object({
  id: Id, w: z.number().int().positive(), h: z.number().int().positive(),
  anchor: z.tuple([z.number(), z.number()]),
  palette: z.record(z.string().length(1), Hex.nullable()),
  frames: z.array(z.array(z.string())).min(1),
  factionSwap: z.boolean().optional(),
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
export const SpriteSheetSchema = z.object({ sheet: Id, sprites: z.array(SpriteSchema) }).strict();

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

const Limit = z.object({ maxOwned: z.number().int().nonnegative().optional(), afterSeconds: Seconds.optional() }).strict();

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
}).strict();

const ScenarioUnits = z.object({
  unit: Id, tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  lane: z.number().int().nonnegative().optional(), x: z.number(), y: z.number(),
  count: z.number().int().positive().optional(), rows: z.number().int().positive().optional(),
  dx: z.number().optional(), dy: z.number().optional(),
}).strict();
const ScenarioSide = z.object({
  gold: z.number().int().nonnegative().optional(),
  heartcapHp: z.number().int().positive().optional(),
  kit: z.array(Id).optional(),
  /** The side's commander: its passive, and its power when the powers flag is on (SPEC §11.10). */
  commander: Id.optional(),
  buildings: z.array(z.object({ building: Id, col: z.number().int(), row: z.number().int() }).strict()).optional(),
  units: z.array(ScenarioUnits).optional(),
}).strict();

export const ScenarioSchema = z.object({
  id: Id, description: z.string(), map: Id,
  clockSeconds: Seconds.optional(),
  controllers: z.object({ player: z.string().optional(), enemy: z.string().optional() }).strict().optional(),
  lanes: z.array(z.object({ pBorder: z.number().int(), eBorder: z.number().int() }).strict()).optional(),
  /** Rule switches that isolate the rule a scenario tests (e.g. no Heartcap turrets). */
  test: z.object({ noTurrets: z.boolean().optional(), noTerritory: z.boolean().optional(), noHeartcapTargets: z.boolean().optional() }).strict().optional(),
  /** Feature flags this scenario needs, over the milestone defaults (an explicit --flags still wins). */
  flags: z.object({ merging: z.boolean().optional(), drafts: z.boolean().optional(), adaptiveGeneral: z.boolean().optional(), powers: z.boolean().optional() }).strict().optional(),
  sides: z.object({ player: ScenarioSide, enemy: ScenarioSide }).strict(),
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

/** Run-level outcomes of events and Grove choices (SPEC §8.7). */
export const RunEffectSchema = z.union([
  z.object({ repairPct: Pos.max(1) }).strict(),
  z.object({ maxHpPct: z.number().min(-0.9).max(1) }).strict(),
  z.object({ gainRelic: z.object({ rarity: Rarity.optional(), count: z.number().int().positive().optional() }).strict() }).strict(),
  z.object({ gainAmber: z.number().int().positive() }).strict(),
  z.object({ nextBattle: z.object({ startingGold: z.number().int().optional(), sporestormShiftSeconds: z.number().optional() }).strict() }).strict(),
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
