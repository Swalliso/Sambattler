// Runtime state: plain, JSON-serializable data only (SPEC §13.3 rule 8, §14.4).
import type {
  BalanceDef, BuildingDef, EffectBundle, ModifierDef, PowerDef, RelicDef, TriggerDef, UnitDef, UpgradeTrackDef,
} from '../data/schema.ts';

export type Side = 'player' | 'enemy';
export const SIDES: readonly Side[] = ['player', 'enemy'];
export const other = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');

export type DamageType = 'slash' | 'pierce' | 'crush';
export type Armor = 'light' | 'medium' | 'heavy' | 'structure';
export type BuildingKind = 'spawner' | 'tower' | 'economy' | 'utility';
export type Rng4 = [number, number, number, number];
export type Effectiveness = 'strong' | 'normal' | 'weak';

/** Heartcaps are targetable but live off-grid; they use fixed negative ids. */
export const HEARTCAP_ID: Record<Side, number> = { player: -1, enemy: -2 };
export const NO_TARGET = 0;
/** The damage-by-building key for a commander power's damage (turrets use 0). */
export const POWER_SOURCE_ID = -3;

export type Controller =
  | { kind: 'human' }
  | { kind: 'general'; id: string }
  | { kind: 'bot'; id: string };

export type Rarity = 'common' | 'uncommon' | 'rare';
/** The general's four counter kinds (SPEC §7.4). */
export type CounterKind = 'swarm' | 'line' | 'armor' | 'elite';
export const COUNTER_KINDS: readonly CounterKind[] = ['swarm', 'line', 'armor', 'elite'];
/** A player profile over the four kinds: an analysis's scores or the run's intel file (SPEC §7.6). */
export type IntelProfile = Record<CounterKind, number>;
export type CardType = 'blueprint' | 'upgrade' | 'relic';
/** How a bot side answers its own drafts: `none` leaves them to the player (UI). */
export type DraftPolicy = 'first' | 'random' | 'greedy' | 'none';
/** How an AI-controlled side uses its commander power: `auto` picks targets itself (SPEC §16 M5); `none` never. */
export type PowerPolicy = 'none' | 'auto';

/** The cards a side can be offered in battle (SPEC §8.4): blueprints split into core and shared pools. */
export interface DraftPool { core: string[]; shared: string[]; relics: string[] }

export interface SideConfig {
  faction: string;
  controller: Controller;
  kit: string[];
  heartcapHp: number;
  heartcapMaxHp: number;
  startingGold: number;
  /** Upgrade levels per building (SPEC §11.6); missing means none. */
  upgrades?: Record<string, number>;
  relics?: string[];
  /** Present when this side drafts during the battle (with `flags.drafts`). */
  draft?: DraftPool;
  /** Draft policy for an AI-controlled side (default greedy); humans always draft through the UI. */
  autoDraft?: DraftPolicy;
  /** Battle-specific purchase weights, used when a run adds buildings outside the base AI profile. */
  aiWeights?: Record<string, number>;
  /**
   * What an adaptive general knows of its opponent from earlier battles (SPEC §7.6): it opens with a
   * doctrine against the top kind (the boss: a dual doctrine against the top two).
   */
  intel?: IntelProfile;
  /** The side's commander (SPEC §11.10); its passive is one of the battle's modifiers. */
  commander?: string;
  /** The commander's active power (SPEC §6.6); usable while `flags.powers` is on. */
  power?: string;
  /** Power policy for an AI-controlled side (default none); humans use the power through the UI. */
  powerPolicy?: PowerPolicy;
}

/** A battle-wide effect source: an event outcome, the elite modifier, later blights (SPEC §14.4). */
export interface BattleModifier { side: Side | 'both'; source: string; effects: EffectBundle }

export interface BattleConfig {
  seed: number;
  battleIndex: number;
  mapId: string;
  player: SideConfig;
  enemy: SideConfig;
  flags: { merging: boolean; drafts: boolean; adaptiveGeneral: boolean; powers: boolean };
  /** Event effects and elite modifiers for this battle (none by default). */
  modifiers?: BattleModifier[];
  scenario?: string;
  /** Test-harness rule switches used by balance duels; never set in play. */
  test?: { noTurrets?: boolean; noTerritory?: boolean; noHeartcapTargets?: boolean; timeLimitSeconds?: number };
}

/**
 * Stats of a unit at one merge tier (SPEC §5.5–5.6): HP and damage ×tierStatMult per tier, radius
 * ×tierRadiusMult per tier, supply ×tierSupplyMult, plus the tier's merge perks.
 */
export interface CompiledTier {
  hp: number;
  /** Damage per hit before the matrix and the Sporestorm. */
  damage: number;
  attackTicks: number;
  range: number;
  speedPerTick: number;
  radius: number;
  splashRadius: number;
  /** Multiplier against Bloomed and Elder targets (1 for units without the slayer tag). */
  slayerMult: number;
  /** Damage-taken multipliers from merge perks and upgrades. */
  resist: Record<DamageType, number>;
  supply: number;
  /** Multiplier against structures (1 for units without the siege tag). */
  siegeMult: number;
  /** Healing per heal (0 for units that don't heal), heal interval and targets per heal. */
  healAmount: number;
  healTicks: number;
  healTargets: number;
  /** Out-of-combat regeneration as a fraction of max HP per second (Elder's Patience). */
  regenPct: number;
}

/** Resolved, tick-based unit definition (SPEC §14.1 "compiled definitions"). */
export interface CompiledUnit {
  id: string;
  armor: Exclude<Armor, 'structure'>;
  damageType: DamageType;
  projectileSpeed: number;
  aggroRange: number;
  siege: boolean;
  slayer: boolean;
  /** Support healers never attack; they hold at their range and heal allies. */
  support: boolean;
  tags: string[];
  /** Index 0 is the base unit, 1 Bloomed, 2 Elder. */
  tiers: [CompiledTier, CompiledTier, CompiledTier];
}

export interface CompiledBuilding {
  id: string;
  kind: BuildingKind;
  w: number;
  h: number;
  cost: number;
  hp: number;
  spawn?: {
    unit: string; count: number; intervalHalfTicks: number; firstHalfTicks: number;
    /** Set when a positional modifier applies: the interval is re-resolved per building when its timer resets. */
    positional?: PositionalStat;
  };
  attack?: {
    damage: number; damageType: DamageType; intervalTicks: number; range: number;
    minRange: number; splashRadius: number; projectileSpeed: number;
  };
  economy?: { goldPerTick: number; positional?: PositionalStat; interestCapAdd?: number };
  /** Rhizome Vault: supply cap while standing, counted for at most `maxCount` buildings of this type. */
  utility?: { supplyCapAdd: number; maxCount: number };
}

/** A building stat with modifiers that depend on where the building stands (zone, loam, adjacency). */
export interface PositionalStat { base: number; mods: ModifierDef[] }

export interface CompiledSide {
  units: Record<string, CompiledUnit>;
  buildings: Record<string, CompiledBuilding>;
  supplyCap: number;
  interestCap: number;
  stipend: number;
  captureSpeed: number;
  sellRefundPct: number;
  supplyLineBp: number;
  loamBonusPct: number;
  comebackEnabled: boolean;
  mergeRadius: number;
  knitTicks: number;
  rerollBase: number;
  rerollStep: number;
  skipGold: number;
  draftCards: number;
  turret: { damage: number; damageType: DamageType; intervalTicks: number; range: number; projectileSpeed: number; perLane: number };
  /** Triggers from upgrades, relics and battle modifiers, in source order. */
  triggers: TriggerDef[];
  /** The power's cooldown multiplier (`side.powerCooldown`); present only when it isn't 1. */
  powerCooldownMult?: number;
  /** Combat rework `waves`: ticks between this side's wave releases (`side.waveBeat`). Present only under waves. */
  waveBeatTicks?: number;
  /** Combat rework `waves`: × the units each spawner releases on a beat (`side.waveSize`). Present only under waves. */
  waveSize?: number;
}

/**
 * The plain base definitions a battle can need (both kits, the draft pool, their units, upgrade
 * tracks and relics, and the balance constants), copied into state so `step` can recompile a side
 * after a draft pick without content lookups (SPEC §14.1).
 */
export interface Library {
  balance: BalanceDef;
  buildings: Record<string, BuildingDef>;
  units: Record<string, UnitDef>;
  upgrades: Record<string, UpgradeTrackDef>;
  relics: Record<string, RelicDef>;
  /** The commander powers in this battle (present only when a side has one). */
  powers?: Record<string, PowerDef>;
}

/** What a side owns in this battle: the inputs to compilation besides battle modifiers. */
export interface Loadout { kit: string[]; upgrades: Record<string, number>; relics: string[] }

export interface DraftCard { id: string; type: CardType; rarity: Rarity }
export interface OpenDraft {
  offer: DraftCard[];
  /** Rerolls taken in this draft (the next one costs base + step × rerolls). */
  rerolls: number;
  /** 1-based draft number within the battle. */
  index: number;
  /** Bigger-drafts prototype: cards still to take from this offer, when more than one. */
  picks?: number;
}

/** Global rule constants, converted to ticks and integers at battle creation. */
export interface Rules {
  tickRate: number;
  waveTicks: number;
  incomeTicks: number;
  interestPer: number;
  comebackDivisor: number;
  comebackMax: number;
  fullRefundTicks: number;
  besiegedTicks: number;
  besiegedHalfTicks: number;
  normalHalfTicks: number;
  besiegedIncomePct: number;
  /** Set only when production suppression differs from "any damage" (balance `besiegedBy`). */
  suppressBy?: 'melee' | 'none';
  /** Prototype B1 (balance `approachRush`); absent by default. */
  rush?: { units: string[]; speedMult: number; ticks: number; cooldownTicks: number };
  /** Prototype B3 (balance `firingCongestion`); absent by default. */
  congestion?: { freeRanks: number; halfWidth: number; mult: number };
  /** Prototype B4 (balance `unitLifespan`): lifespan ticks of a tier-1 unit and the per-tier multiplier; absent by default. */
  lifespan?: { ticks: number; tierMult: number };
  /** Prototype E1 (balance `laneStance`): the per-lane Hold / Advance command; absent by default. */
  stance?: {
    rallyBack: number; maxHoldTicks: number; cooldownTicks: number;
    ai?: { musterSupply: number; spentSupply: number; profiles?: string[]; advanceWhenBesieged?: boolean };
  };
  /** Prototype T2 (balance `fallBack`); absent by default. */
  fallBack?: { radius: number; ratio: number; maxHoldTicks: number };
  /** Prototype T3 (balance `spawnerDefense`); absent by default. */
  spawnerDefense?: { damage: number; damageType: DamageType; intervalTicks: number; range: number; projectileSpeed: number; homeOnly: boolean };
  /** Diver prototype (balance `diveRanged`); absent by default. */
  dive?: { units: string[]; aggroAdd: number; burst?: { speedMult: number; ticks: number; cooldownTicks: number } };
  /** Hot-start prototype (balance `hotStart.deployDraft`): a free draft before the clock starts; absent by default. */
  deployDraft?: { cards?: number };
  /** Bigger-drafts prototype (balance `bigDrafts`): cards taken per in-battle draft and the offers' rare bonus; absent by default. */
  bigDrafts?: { picks: number; rareBonus: number };
  /**
   * Combat rework `pinned` (balance `pinned`): a ranged unit with an enemy unit within `radius` runs
   * its attack cooldown on `permille` ticks in 1000; absent by default.
   */
  pin?: { radius: number; permille: number };
  /** Combat rework `callForHelp` (balance `callForHelp`): the call's radius; absent by default. */
  help?: { radius: number };
  /**
   * Combat rework `sporeCloud` (balance `sporeCloud`): towers whose shells leave clouds, the clouds'
   * radius and lifetime, the damage per pulse and the pulse cadence, and the AI's cover score per
   * tile; absent by default.
   */
  cloud?: CloudSpec & { buildings: string[]; aiCover: number };
  /**
   * Combat rework `waves` (balance `waves`): spawns wait in their building until their side's beat
   * (`CompiledSide.waveBeatTicks`), spawners behind a lane's front one leaving early; idle wave units
   * march at their wave's slowest pace (`matchPace`) and ranged units keep `rangedGap` behind their
   * melee front. Absent by default.
   */
  waves?: { rangedGap: number; matchPace: boolean };
  /**
   * Combat rework `mixedWave` (balance `mixedWave`, only with `waves`): a lane's wave of `minTypes` or
   * more unit types sets out with shields of `shieldFrac` × each unit's max HP. Absent by default.
   */
  mixed?: { minTypes: number; shieldFrac: number };
  /** Combat rework `cleave` (balance `cleave`): units whose splash hits other units at full damage. Absent by default. */
  cleave?: { units: string[] };
  /** Combat rework `burster` (balance `burst`): the cloud a `burst` unit leaves where it bursts. Absent by default. */
  burst?: { cloud: CloudSpec };
  /** Combat rework `stormWaves` (balance `stormWaves`, only with `waves`): × (1 + perStack × storm stacks) on each wave release. Absent by default. */
  stormWaves?: { perStack: number };
  timeLimitTicks: number;
  captureThreshold: number;
  captureStep: number;
  captureDecay: number;
  captureRatio: number;
  retargetEvery: number;
  leashMult: number;
  splashFalloff: number;
  storm: { startTick: number; everyTicks: number; maxStacks: number; unitDamage: number; turretDamage: number; heartcapTaken: number };
  matrix: Record<DamageType, Record<Armor, number>>;
  siegeMult: number;
  slayerMult: number;
  merge: { cooldownTicks: number; every: number };
  /** Wave numbers whose end opens a draft (SPEC §8.3). */
  draftWaves: number[];
  strongAt: number;
  weakAt: number;
  spawnOffset: number;
  spawnJitter: number;
  driftPerTick: number;
  separationPasses: number;
  ai: {
    thinkEvery: number; stickyTicks: number; pressureWindow: number; pressureMin: number; threatRadius: number;
    towerRangeThreat: number; noise: number; economyEarlyTick: number; economyEarlyMult: number;
    economyLateTick: number; economyLateMult: number; towerPressureMult: number; mergeOffSlayerShare: number;
    counter: {
      cycles: { analyzeTick: number; activeTick: number }[]; bossCycles: { analyzeTick: number; activeTick: number }[];
      scoreNoise: number; swarmEliteDiscount: number; eliteScoreMult: number; counterMult: number; otherMult: number;
      openingMult: number; openingOtherMult: number; dualMult: number; freeSlots: number; maxSells: number;
      /** Prototype A2 (balance `counterFloorWeight`); absent by default. */
      floorWeight?: number;
      /** Combat rework swarm read (balance `swarmMaxSupply`); absent by default. */
      swarmMaxSupply?: number;
    };
    score: { spawnerDepth: number; spawnerThreat: number; spawnerSurcharge: number; economyLoam: number;
      economyDepth: number; economyThreat: number; towerFront: number; towerThreat: number };
  };
  test: { turrets: boolean; territory: boolean; heartcapTargets: boolean };
}

export interface MapState {
  id: string;
  name: string;
  width: number;
  height: number;
  homeCols: number;
  tiles: string[];
}

export interface LaneState {
  rowStart: number;
  rowEnd: number;
  /** Per column: 0 neutral, 1 player, 2 enemy. */
  owner: number[];
  pBorder: number;
  eBorder: number;
  capture: Record<Side, { column: number; progress: number }>;
}

export interface UnitState {
  id: number;
  side: Side;
  lane: number;
  unitId: string;
  tier: Tier;
  x: number;
  y: number;
  px: number;
  py: number;
  spawnY: number;
  hp: number;
  maxHp: number;
  supply: number;
  cooldown: number;
  targetId: number;
  lastCombatTick: number;
  lastAttackTick: number;
  mergeOn: boolean;
  sourceBuildingId: number;
  /** Set while the unit knits with two others (SPEC §5.6); undefined otherwise. */
  knit?: KnitState;
  /** Prototype B1 (and the diver's burst): the current rush ends at this tick, and the next may start at `rushReady`. Absent unless `rules.rush` or `rules.dive.burst`. */
  rushUntil?: number;
  rushReady?: number;
  /** Prototype B4: the unit withers at this tick. Absent unless `rules.lifespan`. */
  expiresTick?: number;
  /** Prototype T2: the tick the unit started falling back (kept while committed). Absent unless `rules.fallBack`. */
  holdSince?: number;
  /**
   * Combat rework: true while a `burrow` unit (the Rhizomorph) tunnels. It can't be targeted, hit,
   * pinned or merged, doesn't collide or hold ground, and can't attack; false once it has surfaced.
   * Absent for every other unit.
   */
  burrowed?: boolean;
  /** Combat rework `waves`: the beat that released this unit (beat tick ÷ beat length). Absent for units no beat released. */
  wave?: number;
  /** Combat rework `mixedWave`: what is left of the shield its mixed wave set out with. Absent when it has none. */
  shield?: number;
  /** Combat rework `burster`: true once a `burst` unit has burst (it is spent). Absent until then, and for every other unit. */
  burst?: boolean;
}

export interface KnitState {
  /** The trio's lowest unit id. */
  group: number;
  untilTick: number;
  /** The centroid the trio walks toward. */
  x: number;
  y: number;
  /** Set when this member takes damage; the knit cancels at the merge step. */
  hurt: boolean;
}

export type Tier = 1 | 2 | 3;

export interface BuildingState {
  id: number;
  side: Side;
  buildingId: string;
  lane: number;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  /** Half-ticks remaining to the next spawn. */
  timer: number;
  cooldown: number;
  targetId: number;
  lastAttackTick: number;
  lastDamagedTick: number;
  /** Last melee (non-projectile) hit; written only when `rules.suppressBy` is `melee`. */
  lastMeleeDamagedTick?: number;
  placedTick: number;
  pricePaid: number;
  /** A spawn, gold payout or shot ends the live placement's full-refund grace period. */
  hasProduced: boolean;
  mergeOn: boolean;
  holding: boolean;
  /** Combat rework `waves`: units waiting inside for the side's next wave (they count toward supply). Absent until one waits. */
  stored?: number;
  /** Combat rework `waves`: the last beat whose release this spawner made (it makes one per beat). Absent without waves. */
  lastWave?: number;
  /** Combat rework `stormWaves`: thousandths of a unit owed to this spawner's next release. Absent until the storm grows a wave. */
  waveCarry?: number;
}

/** Combat rework: a spore cloud's size, lifetime, damage per pulse and pulse cadence. */
export interface CloudSpec { radius: number; ticks: number; damage: number; pulseTicks: number }

/**
 * Combat rework `sporeCloud` and `burster`: a spore cloud left where a tower's shell landed or a
 * Burster burst. It deals `damage` to the enemy units of `side`'s opponent inside it on each cadence
 * tick (every `pulseTicks`) after `fromTick`, up to `untilTick`. Clouds keep the order they formed in.
 */
export interface CloudState {
  id: number;
  side: Side;
  lane: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  pulseTicks: number;
  fromTick: number;
  untilTick: number;
  /** The tower that fired it, or the spawner of the unit that burst (damage-by-building stats). */
  sourceBuildingId: number;
}

export interface PendingHit {
  tick: number;
  sourceId: number;
  seq: number;
  side: Side;
  targetId: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  fireTick: number;
  lane: number;
  /** Attacker-side damage (base × tier × storm); target-side multipliers apply at impact. */
  damage: number;
  damageType: DamageType;
  splashRadius: number;
  /** Attacker's multiplier against structures (1 if it is not siege). */
  siegeMult: number;
  /** Attacker's multiplier against Bloomed and Elder targets (1 if it is not a slayer). */
  slayerMult: number;
  sourceBuildingId: number;
  /** Unit id, tower building id or 'turret' (for damage-by-source stats). */
  sourceType: string;
  ranged: boolean;
}

export type CommandBody =
  | { type: 'begin' }
  | { type: 'place'; buildingId: string; lane: number; col: number; row: number }
  | { type: 'sell'; entityId: number }
  | { type: 'toggleMerge'; entityId: number; on: boolean }
  | { type: 'stance'; lane: number; hold: boolean }
  | { type: 'power'; x?: number; y?: number; lane?: number }
  | { type: 'draftPick'; cardId: string }
  | { type: 'draftReroll' }
  | { type: 'draftSkip' };
export type Command = { tick: number; side: Side; seq: number } & CommandBody;

export type SimEvent =
  | { t: 'spawned'; id: number }
  | { t: 'died'; id: number; side: Side; unitId: string; x: number; y: number }
  | { t: 'hit'; target: number; src: number; amount: number; eff: Effectiveness; x: number; y: number; splash: boolean }
  | { t: 'knitStart'; side: Side; ids: number[]; x: number; y: number }
  | { t: 'knitCancel'; side: Side; ids: number[] }
  | { t: 'merged'; side: Side; id: number; unitId: string; tier: 2 | 3; x: number; y: number }
  | { t: 'columnFlipped'; lane: number; column: number; to: Side }
  | { t: 'buildingPlaced'; id: number }
  | { t: 'buildingDestroyed'; id: number; side: Side; buildingId: string; col: number; row: number }
  | { t: 'buildingSold'; id: number; refund: number }
  | { t: 'income'; side: Side; amount: number }
  | { t: 'interest'; side: Side; amount: number }
  | { t: 'wave'; n: number }
  | { t: 'sporestorm'; stacks: number }
  | { t: 'begin' }
  | { t: 'commandRejected'; side: Side; seq: number; reason: string }
  | { t: 'draftOpen'; side: Side; index: number }
  | { t: 'drafted'; side: Side; cardId: string | null; skipped: boolean }
  | { t: 'effectGold'; side: Side; amount: number }
  | { t: 'healed'; target: number; src: number; amount: number; x: number; y: number }
  | { t: 'counterWarned'; side: Side; kind: CounterKind; activatesAtTick: number }
  | { t: 'counterActive'; side: Side; kind: CounterKind }
  /** A commander power went off: its point (if it has one) and what it did. */
  | { t: 'power'; side: Side; power: string; x?: number; y?: number; hits: number; lanes: number[]; merges: number; gold?: number }
  /** Prototype E1: a lane switched between Hold and Advance (`auto` when the hold timer ran out). */
  | { t: 'stance'; side: Side; lane: number; hold: boolean; auto: boolean }
  /**
   * Combat rework `waves`: a side's wave set out on its beat with `units` units, counting those that
   * left early (`held`: lanes it kept home; `shielded`: lanes whose mixed wave got shields).
   */
  | { t: 'release'; side: Side; units: number; held: number[]; shielded: number[] }
  /** Combat rework `stormWaves`: a spawner's release lost `units` extra units to the supply cap. */
  | { t: 'waveCapped'; side: Side; units: number }
  /** Combat rework `burster`: unit `id` burst at (x, y), reaching `radius` tiles. */
  | { t: 'burst'; side: Side; id: number; x: number; y: number; radius: number }
  /** Heartcap breach prototype: a side's Heartcap fell to `at` of its max HP, firing its `heartcapBreach` triggers. */
  | { t: 'heartcapBreach'; side: Side; at: number; x: number; y: number }
  | { t: 'ended'; winner: Side; by: 'rout' | 'decision' };

export interface AiWeight { building: string; weight: number; maxOwned: number; afterTick: number }

/** One counter cycle (SPEC §7.4): the analysis, its warning and its activation, for reports and the CLI. */
export interface CounterRecord {
  kind: CounterKind;
  warnedAt: number;
  activeAt: number;
  /** Set once the counter has activated. */
  active: boolean;
  /** The analysis's scores before noise. */
  scores: IntelProfile;
  /** A counter blueprint added to the kit because none was there. */
  drafted?: string;
  /** Buildings sold for space at activation. */
  sold: string[];
  /** Buildings in the counter set placed while this counter was the active doctrine. */
  built: Record<string, number>;
}

/** Spawn and merge counts by wave index for one of the observed side's spawners (Elite share, SPEC §7.4). */
export interface SpawnTrack { spawned: Record<string, number>; merged: Record<string, number> }

/** The counter cycle's state for an adaptive side (absent for every other side). */
export interface CounterState {
  /** Analysis and activation ticks still to come, in order. */
  schedule: { analyzeTick: number; activeTick: number }[];
  /** Every cycle so far, in order; pending ones have `active: false`. */
  history: CounterRecord[];
  /** The active counter doctrine (index into `history`), or -1. */
  current: number;
  /** Opponent spawner id → spawns and merges per wave index. */
  track: Record<string, SpawnTrack>;
  /** [wave index, first unit id the opponent spawned in that wave], in order. */
  waveIds: [number, number][];
  /** The kind scores sampled at analysis times (the intel profile reads 2:00 and 5:00). */
  samples: { tick: number; scores: IntelProfile; total: number }[];
}

/**
 * An opening doctrine from intel (SPEC §7.6): one kind (×2 / ×0.8) until the first counter activates,
 * or the boss's dual doctrine (×2.5 on either kind's set) for the whole battle.
 */
export interface OpeningDoctrine { kinds: CounterKind[]; mult: number; otherMult: number; dual: boolean }
/** on/off: every spawner's merge toggle; auto: SPEC §7.2 step 5 (swarm merging off against Slayers). */
export type MergePolicy = 'on' | 'off' | 'auto';
export interface AiState {
  profileId: string;
  mergePolicy: MergePolicy;
  opener: string[];
  weights: AiWeight[];
  spawnerDepthWeight: number;
  openerDone: boolean;
  target: string | null;
  targetSince: number;
  draftPolicy: DraftPolicy;
  /** Aggressive generals send spawners to the lane where the opponent holds least (SPEC §7.3). */
  laneStyle?: 'aggressive';
  /** Present only for an adaptive general with `flags.adaptiveGeneral` on. */
  counter?: CounterState;
  /** Counter-set buildings per kind in the general's faction roster (fixed at battle start). */
  counterSets?: Record<CounterKind, string[]>;
  /** The doctrine intel gives it at the start of the battle. */
  opening?: OpeningDoctrine;
  /** The general's faction roster (missing counters are drafted from it). */
  roster?: string[];
  boss?: boolean;
}

export interface SideState {
  gold: number;
  supplyUsed: number;
  supplyCap: number;
  heartcapHp: number;
  heartcapMaxHp: number;
  turretCooldowns: number[];
  /** Live ticks until the commander power is ready (0: ready, or no power). */
  powerCooldown: number;
  kit: string[];
  upgrades: Record<string, number>;
  relics: string[];
  /** The open draft, while the sim is held for it. */
  draft?: OpenDraft;
  /** Drafts opened so far this battle. */
  draftsOpened: number;
  /** Prototype E1: each lane's Hold / Advance stance. Absent unless `rules.stance`. */
  stance?: LaneStance[];
  /** Heartcap breach prototype: the Heartcap takes × `takenMult` damage until `untilTick` (a `shieldHeartcap` action). */
  heartcapShield?: { untilTick: number; takenMult: number };
  ai?: AiState;
}

/** A lane's stance (prototype E1): held since `since`, or advancing; it can hold again from `readyAt`. */
export interface LaneStance { hold: boolean; since: number; readyAt: number }

export interface SideStats {
  spawned: Record<string, number>;
  merges: { '2': number; '3': number };
  damageDealt: number;
  /** Building entity id → damage dealt by it or its units. Key "0" is the Heartcap turrets. */
  damageByBuilding: Record<string, number>;
  /** Building entity id → building type, for every building this side ever had (reports). */
  buildingTypes: Record<string, string>;
  /** Attacker kind (unit id, tower building id or 'turret') → damage dealt. */
  damageBySource: Record<string, number>;
  heartcapDamageTaken: number;
  goldEarned: { stipend: number; economy: number; comeback: number; interest: number; effects: number; drafts: number };
  healingDone: number;
  /** Card ids picked in this battle's drafts, in order. */
  drafted: string[];
  goldByBuilding: Record<string, number>;
  buildingsBuilt: number;
  buildingsLost: number;
  buildingsDestroyed: number;
  buildingsSold: number;
  unitsLost: number;
  maxEldersAlive: number;
  maxGoldBanked: number;
  columnsLost: number;
  rejectedCommands: number;
  /** Commander power use (present only for a side with a power): uses, damage dealt, columns captured, trios merged, gold paid. */
  powerUses?: number;
  powerDamage?: number;
  powerCaptures?: number;
  powerMerges?: number;
  powerGold?: number;
}

export interface BattleState {
  v: 1;
  config: BattleConfig;
  tick: number;
  phase: 'deploy' | 'live' | 'ended';
  held: boolean;
  rng: Record<'combat' | 'ai' | 'draft', Rng4>;
  nextId: number;
  nextSeq: Record<Side, number>;
  nextHitSeq: number;
  rules: Rules;
  library: Library;
  map: MapState;
  sides: Record<Side, SideState>;
  lanes: LaneState[];
  units: UnitState[];
  buildings: BuildingState[];
  hits: PendingHit[];
  /** Combat rework `sporeCloud` and `burster`: the clouds on the field, oldest first. Absent unless `rules.cloud` or `rules.burst`. */
  clouds?: CloudState[];
  sporestorm: number;
  queue: Command[];
  log: Command[];
  events: SimEvent[];
  compiled: Record<Side, CompiledSide>;
  stats: Record<Side, SideStats>;
  /** Per lane: [tick, pBorder, eBorder] sampled every second. */
  frontLine: [number, number, number][][];
  outcome?: { winner: Side; by: 'rout' | 'decision'; tick: number };
}
