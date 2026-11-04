// A battle in rounds' runtime state (SPEC §14.4, §14.5): plain, JSON-serializable data only (§13.3 rule 8).
// The library and the compiled sides hold ids and numbers only, so rewording a card never moves a golden
// (R2-Q8, A152).
import type { BalanceDef, BuildingDef, EffectAction, EffectBundle, ModifierDef, PowerDef, TriggerDef, UnitDef } from '../data/schema.ts';
import type { Slot } from './formation.ts';
import type { ColonyPlot } from './colony.ts';

export type Side = 'player' | 'enemy';
export const SIDES: readonly Side[] = ['player', 'enemy'];
export const other = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');

export type DamageType = 'slash' | 'pierce' | 'crush';
export type Armor = 'light' | 'medium' | 'heavy' | 'structure';
export type BuildingKind = 'spawner' | 'tower' | 'economy' | 'utility';
export type Rng4 = [number, number, number, number];
export type Effectiveness = 'strong' | 'normal' | 'weak';
export type Tier = 1 | 2 | 3;

/** The damage-by-building key for a commander power's damage. */
export const POWER_SOURCE_ID = -3;

export type Controller =
  | { kind: 'human' }
  | { kind: 'general'; id: string }
  | { kind: 'bot'; id: string };

export type Rarity = 'common' | 'uncommon' | 'rare';
export type CardType = 'blueprint' | 'upgrade' | 'relic';
/** How a bot side answers its own drafts: `none` leaves them to the player (UI). */
export type DraftPolicy = 'first' | 'random' | 'greedy' | 'none';
/** How an AI-controlled side uses its commander power: `auto` picks targets itself (§6.6); `none` never. */
export type PowerPolicy = 'none' | 'auto';
/** on/off: every spawner's merge toggle; auto: §7.2's merge rule (swarm merging off against Slayers). */
export type MergePolicy = 'on' | 'off' | 'auto';

/** The cards a side can be offered (§8.4): blueprints split into core and shared pools. */
export interface DraftPool { core: string[]; shared: string[]; relics: string[] }
/** What a side owns in a run: its kit, upgrade levels and relics, which drafts and spoils add to. */
export interface Loadout { kit: string[]; upgrades: Record<string, number>; relics: string[] }
export interface DraftCard { id: string; type: CardType; rarity: Rarity }
export interface OpenDraft {
  offer: DraftCard[];
  /** Rerolls taken in this draft (the next one costs base + step × rerolls). */
  rerolls: number;
  /** 1-based draft number within the battle. */
  index: number;
}

/** A battle-wide effect source: an event outcome, the elite modifier, later blights (§14.4). */
export interface BattleModifier { side: Side | 'both'; source: string; effects: EffectBundle }

/**
 * Stats of a unit at one merge tier (§5.5–5.6): HP and damage ×tierStatMult per tier, radius
 * ×tierRadiusMult per tier, supply ×tierSupplyMult, plus the tier's merge perks.
 */
export interface CompiledTier {
  hp: number;
  /** Damage per hit before the matrix and the Sporestorm. */
  damage: number;
  attackTicks: number;
  range: number;
  speedPerTick: number;
  /** × its speed until its first attack in a clash: `unit.openingSpeed`, 1 unless a modifier sets it (Quick Roots, §11.7). */
  openingSpeedMult: number;
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

/** A spore cloud's size, lifetime, damage per pulse and pulse cadence (§5.3). */
export interface CloudSpec { radius: number; ticks: number; damage: number; pulseTicks: number }

/**
 * A spore cloud left where a tower's shell landed or a Burster burst (§5.3). It deals `damage` to the
 * enemy units of `side`'s opponent inside it on each cadence tick (every `pulseTicks`) after `fromTick`,
 * up to `untilTick`. Clouds keep the order they formed in.
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
  /** Unit id or tower building id (for damage-by-source stats). */
  sourceType: string;
  ranged: boolean;
}

/** The counter kinds in rounds (§7.4): v1's four, and Anti-Ranged (#14). */
export type CounterKind = 'swarm' | 'line' | 'armor' | 'elite' | 'ranged';
export const COUNTER_KINDS: readonly CounterKind[] = ['swarm', 'line', 'armor', 'elite', 'ranged'];
/** An intel file (§7.6): a score per kind, built by the run (R2b). A kind it leaves out scores 0. */
export type IntelProfile = Partial<Record<CounterKind, number>>;

/** A kit card (§8.10): a building the side owns. R3 adds how many of it may stand at once. */
export interface KitCard {
  building: string;
  copies?: number;
  /** A general's cap on how many of it stand at once, v1's `limits.*.maxOwned`, until R3 gives it copies (§7.8, D45). */
  maxOwned?: number;
}

export interface SideConfig {
  faction: string;
  controller: Controller;
  /** In a single battle, the faction roster, with no copy limit (§18.1 D45, plan Call 29). */
  kit: KitCard[];
  /** R3: building id → its augments (§11.13). */
  augments?: Record<string, string[]>;
  /** Until R3. A single battle has no upgrade levels and no relics; a run's battle has the run's (R2b). */
  upgrades?: Record<string, number>;
  relics: string[];
  /** M6's traits and strains. */
  traits?: string[];
  strains?: Record<string, string>;
  strainRanks?: Record<string, number>;
  commander?: string;
  power?: string;
  powerPolicy?: PowerPolicy;
  /** The plots the colony holds this battle (§4.6): the map's base plots unless set. */
  plots: number;
  /** This battle's Heartcap, which starts full (§4.5). */
  heartcapMaxHp: number;
  /** 300 + 75 per battle (§6.1). */
  startingGold: number;
  draft?: DraftPool;
  autoDraft?: DraftPolicy;
  aiWeights?: Record<string, number>;
  intel?: IntelProfile;
}

export interface BattleConfig {
  seed: number;
  battleIndex: number;
  mapId: string;
  player: SideConfig;
  enemy: SideConfig;
  /** Event effects, blights, the elite modifier, and the commanders' and generals' passives (§7.7, §11.10). */
  modifiers?: BattleModifier[];
  /** `drafts` opens a draft for each side with a pool in the planning after each round in `draftRounds` (§8.3). */
  flags: { merging: boolean; drafts: boolean; adaptiveGeneral: boolean; powers: boolean };
  scenario?: string;
  /**
   * `v3` plays the v3 prototype's rules (docs/v3-proto-plan.md, `src/sim/v3.ts`), a temporary switch that its S10
   * removes. Absent means v2's: `makeRoundConfig` never writes `v2`, so v2's configs and hashes are as before.
   */
  rules?: 'v2' | 'v3';
}

// ---- the library and the compiled sides (ids and numbers only, R2-Q8) ----

type Textless<T, K extends PropertyKey> = T extends unknown ? Omit<T, K & keyof T> : never;
export type LibraryBuilding = Textless<BuildingDef, 'name' | 'description'>;
export type LibraryUnit = Textless<UnitDef, 'name'>;
export type LibraryPower = Textless<PowerDef, 'name' | 'text'>;

/** The data a battle in rounds needs, copied into state without display text: the UI reads names and text from content by id. */
export interface Library {
  balance: BalanceDef;
  /** Both kits' buildings, and the units their squads field. */
  buildings: Record<string, LibraryBuilding>;
  units: Record<string, LibraryUnit>;
  /** The commander powers in this battle (present only with `flags.powers` and a side that has one). */
  powers?: Record<string, LibraryPower>;
  /**
   * A run's relics in this battle, with their rarity for drafts: those the sides hold, and with drafts on every relic a
   * drafting side's pool holds (R2b; present only when there is one).
   */
  relics?: Record<string, { effects: EffectBundle; rarity: Rarity }>;
  /** A run's upgrade tracks in this battle, by building id: those the sides have levels on, and with drafts on every track a drafting side could take (until R3). */
  upgrades?: Record<string, LibraryTrack>;
}

/** An upgrade track without its texts (§11.6): each level's rarity and effects, and `offered: false` on a level drafts skip (#27). */
export interface LibraryTrack {
  rarity: Rarity[];
  levels: { effects: EffectBundle; offered?: false }[];
}

/** A unit at its three merge tiers (§5.5, §5.6), or a tower's emplacement. */
export interface CompiledUnit {
  id: string;
  /** `structure` only on an emplacement (§11.2). */
  armor: Armor;
  damageType: DamageType;
  projectileSpeed: number;
  aggroRange: number;
  siege: boolean;
  slayer: boolean;
  /** Support healers never attack; they hold at their range and heal allies. */
  support: boolean;
  tags: string[];
  /** Index 0 is the base unit, 1 Bloomed, 2 Elder. An emplacement never merges, so its three are alike. */
  tiers: [CompiledTier, CompiledTier, CompiledTier];
  /**
   * A tower's emplacement (§4.4, §6.7, #10): it never moves or merges and counts no supply, it fires no
   * nearer than `minRange`, and with `clouds` its shells leave spore clouds (§5.3).
   */
  emplacement?: { minRange: number; clouds: boolean };
}

export interface CompiledBuilding {
  id: string;
  kind: BuildingKind;
  cost: number;
  /** What it fields each round (§4.4): a spawner's squad, or a tower's emplacement, one unit under the tower's own id. */
  squad?: { unit: string; count: number };
  /** An economy building's gold a round, and what it adds to the interest cap (§6.2). */
  economy?: { goldPerRound: number; interestCapAdd?: number };
}

/** The triggers a battle in rounds fires (§14.2, §14.6): every trigger the schema has, since v1's left it in R2b's T129. */
export type RoundTriggerOn = TriggerDef['on'];
/**
 * The actions rounds run (§14.2): `gainGold` pays its own side at once, `explode` bursts where it fired,
 * `cloud` leaves a spore cloud there or on the enemy's front rank, and `healHeartcap` heals its side's Heartcap.
 */
export type RoundAction = EffectAction;
export interface RoundTrigger { on: RoundTriggerOn; if?: TriggerDef['if']; do: RoundAction[] }

/**
 * A modifier a battle in rounds compiles to nothing (plan Call 19): one on a stat a battle doesn't read, R3's
 * corner combos or the run's. Its source is the battle modifier's, such as `relic:mycorrhizalLink`.
 */
export interface IgnoredEffect { source: string; stat: string }

export interface CompiledSide {
  /** Its squads' units, and its towers' emplacements under each tower's id. */
  units: Record<string, CompiledUnit>;
  /** Its kit. */
  buildings: Record<string, CompiledBuilding>;
  /** A round's stipend, and the interest cap before any Spore Exchange (§6.2). */
  stipend: number;
  interestCap: number;
  /** × its income, in basis points: 10000, or `enemyIncomeMult`'s for the general (§7.1). */
  incomeBp: number;
  comebackEnabled: boolean;
  /** Refunds in percent: in the planning phase a building was planted, and once it has fielded (§4.4). */
  sellRefundPlantedPct: number;
  sellRefundPct: number;
  /** A Truffle Cellar's extra gold on a loam plot, in percent (§6.2). */
  loamBonusPct: number;
  mergeRadius: number;
  knitTicks: number;
  /** × the Heartcap damage it takes, each in basis points and applied in turn (§6.7 step 3): Rot Ward's 8500. */
  heartcapTakenBp: number[];
  /** Its modifiers on a squad's count, which each squad resolves at its plot as it fields (§4.6, §14.2). */
  squadMods: ModifierDef[];
  /** Its modifiers on its power's effect, with their conditions, read when the power is (`powerEffectMult`, §6.6). */
  powerMods: ModifierDef[];
  /** Triggers from the battle's modifiers, in source order, holding only the actions rounds run. */
  triggers: RoundTrigger[];
  /** What this side's content compiles to nothing (plan Call 19). */
  ignored: IgnoredEffect[];
  /** A side that drafts (§8.3): its cards an offer, a reroll's cost (the base, + the step per reroll in the draft) and a skip's gold. */
  draft?: { cards: number; rerollBase: number; rerollStep: number; skipGold: number };
}

/** Rule constants, converted to ticks and integers when the battle is created. */
export interface Rules {
  tickRate: number;
  /** After this round a battle ends by Decision (§6.5). */
  maxRounds: number;
  /** A clash's 45 s cap and its 1 s muster, in ticks: the cap falls at `startTick + clashCapTicks` (§5.6, §6.7). */
  clashCapTicks: number;
  musterTicks: number;
  /** Tiles between the two front ranks (§4.6). */
  formationGapTiles: number;
  /** Heartcap damage per supply a lane's winner has left, with siege units counting `siegeHeartcapMult` times (§6.7). */
  heartcapDamagePerSupply: number;
  siegeHeartcapMult: number;
  /** Each lane's army of `minTypes` or more unit types arrives with shields of `shieldFrac` × each unit's max HP (§5.3, plan Call 30). */
  arrivalShield: { minTypes: number; shieldFrac: number };
  /** The most a Heartcap takes in a round (§6.7, X5): `maxHpBp` of its max HP, or `flat`, scaled by the storm with `stormScales`. */
  roundDamageCap: { maxHpBp?: number; flat?: number; stormScales?: boolean };
  /** A Decision after `maxRounds` (§6.5, X5). */
  decisionBy: 'shareOfMaxHp' | 'damage';
  /** Interest is 1 gold per `interestPer` banked (§6.2), up to each side's cap. */
  interestPer: number;
  /** Gold to the last round's loser (§6.2). */
  comebackGold: number;
  /** The storm by round (§6.4): from `startRound`, after `battle.sporestormStart`, +`stepBp` a round, at most `maxBp`. */
  storm: { startRound: number; stepBp: number; maxBp: number };
  // the kept combat (§5.2–§5.6), as v1 compiles it
  retargetEvery: number;
  leashMult: number;
  splashFalloff: number;
  matrix: Record<DamageType, Record<Armor, number>>;
  siegeMult: number;
  slayerMult: number;
  merge: { cooldownTicks: number; every: number };
  strongAt: number;
  weakAt: number;
  driftPerTick: number;
  separationPasses: number;
  /** A ranged unit with an enemy unit within `radius` runs its attack cooldown on `permille` ticks in 1000 (§5.3). */
  pin?: { radius: number; permille: number };
  /** The towers whose shells leave spore clouds, and the clouds (§5.3). */
  cloud?: CloudSpec & { buildings: string[] };
  /** Units whose splash hits other units at full damage (§5.3). */
  cleave?: { units: string[] };
  /** The cloud a `burst` unit leaves where it bursts (§5.3). */
  burst?: { cloud: CloudSpec };
}

// ---- the battle ----

/** The map a battle in rounds is fought on: its id, size, home columns and tiles (§4.1). No name (R2-Q8). */
export interface MapState {
  id: string;
  width: number;
  height: number;
  homeCols: number;
  tiles: string[];
  /** The order its colonies' plots open in (`openOrder`, §18.2 #19), the same on both sides: a plot gained mid-battle opens the next. */
  openOrder: number[];
}

/** A plot of a side's colony (§4.6), as `colonyPlots` gives it, with the building on it. */
export interface PlotState extends ColonyPlot {
  /** The building's entity id, or 0 when the plot is free. */
  building: number;
}

export interface BuildingState {
  id: number;
  side: Side;
  buildingId: string;
  /** An index into the side's plots. */
  plot: number;
  plantedRound: number;
  pricePaid: number;
  /** True once it has been through a clash: selling it then refunds 60% (§4.4). */
  fielded: boolean;
  mergeOn: boolean;
  /** A gold upgrade (§6.1, #67): its squad arrives Bloomed. What it cost, and whether it has fielded, which its refund reads. */
  upgrade?: { paid: number; fielded: boolean };
}

/** A squad in this clash (§4.6). */
export interface SquadState {
  /** Its building's entity id. */
  building: number;
  side: Side;
  lane: number;
  unitId: string;
  rank: number;
  file: number;
  /** Its slot in the formation box: 2×2 tiles from (col, row). */
  slot: Slot;
  /** Units and supply at the arrival. */
  units: number;
  supply: number;
  /** R3: the combos it took into this clash. */
  combos: string[];
  /** Its units' own stats, where something reaches this squad alone (T046). Absent otherwise: its units read their side's unit. */
  stats?: SquadStats;
}

/**
 * A squad's own unit stats (§5.6, §14.2, T046, A028): its side's unit with the patches that reach this squad
 * alone, compiled at Begin and never per tick. Its units read them through `sourceBuildingId`, so a unit knit
 * from two squads has its lowest-id parent's (R2-Q11). R3 adds augment and combo patches here (A131).
 */
export interface SquadStats {
  /** In R2a, the side's unit modifiers whose `rank` or `onLoam` holds at the squad's plot. */
  patches: ModifierDef[];
  /** The unit at its three tiers: the side's modifiers, then the patches. */
  tiers: [CompiledTier, CompiledTier, CompiledTier];
}

/** A lane's lock, written the tick it ends; the lane then freezes and scoring reads the lock, not the units (§6.7, A030). */
export interface LaneLock {
  ended: boolean;
  endTick: number;
  winner: Side | null;
  /** Decided at the cap on surviving supply, not by a wipe: `LaneResult.capped`. */
  capped: boolean;
  /** Plain surviving supply: merged units count their own, siege units once (§6.7). */
  survivors: Record<Side, number>;
  /** The supply toward Heartcap damage, with siege units counting double. */
  damageSupply: Record<Side, number>;
  /** The winner's damage supply less the loser's, never below 0, and 0 for a draw (§6.7, #22). */
  margin: number;
}

export interface ClashState {
  /** The clash's cap falls at `startTick + rules.clashCapTicks`. */
  startTick: number;
  lanes: LaneLock[];
  /** What each side fields this round, recorded at Begin as it stands after the muster; scoring puts it in the round's `RoundResult` (T051). */
  fielded: Record<Side, FieldedSquad[]>;
  /** The most Elders each side has had alive at once in this clash, the muster's included, for the round's stats (§5.7). */
  maxElders: Record<Side, number>;
  /** The units each side has put on the field this clash, merged ones included: the next one's `arrival`. */
  arrived: Record<Side, number>;
  /**
   * The enemy supply each side has killed in this clash, which Rhizome Tithe pays for (§11.10, R2-Q16): a merged
   * unit at its own supply, an emplacement at 0. Only in a battle where a side's power is a harvest.
   */
  killedSupply?: Record<Side, number>;
}

export interface LaneResult {
  winner: Side | null;
  survivors: Record<Side, number>;
  capped: boolean;
  ticks: number;
  /** What the lane's win dealt to the loser's Heartcap, after the storm and the loser's modifiers, before the round cap (A068). */
  damage: number;
}

export interface RoundResult {
  round: number;
  lanes: LaneResult[];
  /** Heartcap damage each side dealt, after the storm, the loser's damage-taken modifiers and the cap, before the HP floor (§6.7, R2-Q11). */
  damage: Record<Side, number>;
  /** The round's storm in basis points, 10000–20000 (§6.4), and whether the round cap cut any damage (§6.7). */
  stormBp: number;
  capped: boolean;
  /** Each Heartcap's HP after the round. */
  heartcaps: Record<Side, number>;
  /** What each side fielded, recorded at Begin as it stands after the muster (§14.4). */
  fielded: Record<Side, FieldedSquad[]>;
  /** Per side and building entity: damage dealt, and units left standing at the clash's end, for inspect and the report (§5.7, A064). */
  damageByBuilding: Record<Side, Record<number, number>>;
  survivorsByBuilding: Record<Side, Record<number, number>>;
  /** Each side's figures for the round (§5.7), closed once its `roundWon` triggers have fired. */
  stats: Record<Side, RoundStats>;
}

/** One entry of the fielded record, which the counter cycle (§7.4) and the intel file (§7.6) read. */
export interface FieldedSquad {
  unitId: string;
  tier: Tier;
  count: number;
  augments: string[];
  /** The lane it stood in, so the general's lane rule reads only the record (§7.3, A047). */
  lane: number;
}

export interface UnitState {
  id: number;
  /**
   * Its place in the order its side's units took the field this clash, from 0: the arrivals in plot order,
   * then each merged unit as it forms. Its staggered checks are phased by this, not its id, so they fall on
   * the same clash ticks in every clash of the same colonies, and alike on both sides of a mirror (§5.2, T149).
   */
  arrival: number;
  side: Side;
  lane: number;
  unitId: string;
  tier: Tier;
  x: number;
  y: number;
  px: number;
  py: number;
  /**
   * The y it arrived at in its slot (its file, §4.6), which it drifts back toward while it has no enemy to
   * seek (§5.2). A merged unit takes its parts' mean. v1's `spawnY`.
   */
  slotY: number;
  hp: number;
  maxHp: number;
  supply: number;
  cooldown: number;
  targetId: number;
  lastCombatTick: number;
  lastAttackTick: number;
  mergeOn: boolean;
  /** Set while the unit knits with two others (§5.6). */
  knit?: KnitState;
  /** Its squad's building. */
  sourceBuildingId: number;
  /** What is left of its arrival shield (§5.3, #8). Absent when it has none. */
  shield?: number;
  /** The tunneler and the Burster (§5.3). */
  burrowed?: boolean;
  burst?: boolean;
  /** R3: timed statuses, and its blows this clash for `everyNth` and `firstInClash` (§14.2). */
  statuses?: { kind: 'slow' | 'sunder'; mult: number; untilTick: number }[];
  blows?: number;
}

/** What the general planned in one round (§7.5, plan Call 12, A070). Each entry names its building and plot. */
export interface AiPlan {
  round: number;
  planted: { building: string; plot: number }[];
  /** `upgraded` marks a sale of a building with a gold upgrade (§6.1), which `reveal=last` stands again as it fielded. */
  sold: { building: string; plot: number; upgraded?: true }[];
  /** The spawners it upgraded with gold once its colony was full (§6.1), in order; absent when none. */
  upgraded?: { building: string; plot: number }[];
  income: number;
  banked: number;
  /** Under v3 only: its gold at the start of its turn, the round's income paid, which the other side sees (C3.1, Plan-Q2). */
  goldAtStart?: number;
  /** The counter that activated in this round's planning (§7.4), if one did. */
  counter?: CounterKind;
}

/** One counter the general activated (§7.4), a record by round for the Intent panel and the report. */
export interface CounterRecord {
  /** The round it activated in, the round of its analysis (#31). */
  round: number;
  /** The first round it read; it read up to the round before `round` (A051). */
  from: number;
  kind: CounterKind;
  /** The kinds' scores before the noise. */
  scores: Record<CounterKind, number>;
  /** The answer it listed when it listed no card of the counter set. */
  added?: string;
  /** What it sold for room, by building id. */
  sold: string[];
}

/** An adaptive general's counter cycle (§7.4, §7.6), with `flags.adaptiveGeneral` on. */
export interface CounterState {
  /** Its cycles in round order, each reading rounds `from` to `round` − 1: the boss's early one too (A051). */
  cycles: { round: number; from: number }[];
  /** The counters that activated, in order. The last is the doctrine in force until the next replaces it. */
  history: CounterRecord[];
  /** The opening doctrine from the intel file (§7.6): one kind until the first activation, or the boss's two for the whole battle. */
  opening?: { kinds: CounterKind[]; dual: boolean };
}

/** A card an AI profile buys (§7.2): its doctrine weight, and its data limits as rounds read them (R2-Q6). */
export interface AiWeight {
  building: string;
  weight: number;
  /** At most this many of it standing at once. */
  maxOwned?: number;
  /** Bought only from this round on (§7.2, §14.2). */
  afterRound?: number;
}

/**
 * An AI side's planning state (§7.1, §7.2): its profile, copied from `data/generals.json` or `data/bots.json`
 * so planning needs no content, the target it carries, its plan per round, and an adaptive general's counter
 * cycle.
 */
export interface AiState {
  profileId: string;
  /** Round 1's buys, in order, before any weighted pick. */
  opener: string[];
  /** The openers its round-1 plan draws `opener` from (§7.7, #69), while more than one fits its kit. */
  openers?: string[][];
  /** Only the cards its weights list (R2-Q4), by building id. */
  weights: AiWeight[];
  mergePolicy: MergePolicy;
  /** The Blightwright's: spawners go to the lane you fielded least in (§7.3). */
  laneStyle?: 'aggressive';
  /** A bot that leans toward the answer to the general's planned army (§12.2, X7, `ai/answer.ts`). */
  policy?: 'answer';
  /** A target out of reach, with the round it was picked: carried into the next planning phase once (§7.2). */
  target?: { building: string; round: number };
  /** One entry a round, so the Intent panel survives later commands and a fast-forward to a round. */
  plans: AiPlan[];
  /** A drafting side's weights for the pool's buildings outside its kit (§8.3): greedy drafts by them, and a picked blueprint's moves into `weights`. */
  pool?: AiWeight[];
  /** A side that leaves its drafts to the player (`autoDraft: 'none'`) plans once its open draft resolves: the round's income, which its plan records. */
  waiting?: number;
  counter?: CounterState;
}

export interface SideState {
  gold: number;
  /** This battle's Heartcap (§4.5). */
  heartcapHp: number;
  heartcapMaxHp: number;
  kit: KitCard[];
  /** R3. */
  augments: Record<string, string[]>;
  /** Until R3. */
  upgrades: Record<string, number>;
  relics: string[];
  /** The colony, ordered by lane, rank, file. */
  plots: PlotState[];
  /** Gold held when this side's planning ended, which interest reads (§6.2). */
  bankedAtBegin: number;
  /** In this clash (§6.6). */
  powerUsed: boolean;
  draft?: OpenDraft;
  draftsOpened: number;
  /** The cards it picked in this battle's drafts, in order (§8.3), which the run records; absent until its first pick. */
  drafted?: string[];
  ai?: AiState;
}

/**
 * A side's figures for one round (§5.7, A064): its share of each counter, and its own most and least. Each
 * round's is kept in its `RoundResult`, and a battle's figure is the sum of its rounds', or their most or
 * least (`foldRounds` in `stats.ts`). Ids and numbers only (R2-Q8).
 */
export interface RoundStats {
  /** Merges by the tier they made, at the muster and after it. */
  merges: { '2': number; '3': number };
  damageDealt: number;
  /** Building entity id → damage dealt by its units, clouds and bursts included. */
  damageByBuilding: Record<string, number>;
  /** Attacker kind (unit id, tower building id or `sporeCloud`) → damage dealt. */
  damageBySource: Record<string, number>;
  /** Unit tag → damage dealt by the buildings whose squads carry it (M6-Q1); a tower's emplacement has no tags. */
  damageByTag: Record<string, number>;
  /** Heartcap damage after the storm and the cap, before the HP floor (§6.7, R2-Q11). */
  heartcapDamageDealt: number;
  heartcapDamageTaken: number;
  /**
   * By source (§6.2): the opening's income, gold effects earned in a clash, paid at once (R2-Q20), gold effects
   * earned out of one, such as at a round's opening, and a skipped draft's gold (§8.3).
   */
  goldEarned: { stipend: number; economy: number; comeback: number; interest: number; clash: number; effects: number; drafts?: number };
  /** Building entity id → its economy gold. */
  goldByBuilding: Record<string, number>;
  healingDone: number;
  buildingsPlanted: number;
  buildingsSold: number;
  /** M6-Q1: economy buildings planted, and buildings sold after they had fielded (selling in the phase planted is free, §4.4). */
  economyPlanted: number;
  soldAfterFielding: number;
  /** Gold upgrades bought (§6.1), present once the side has bought one. */
  upgradesBought?: number;
  unitsLost: number;
  rejectedCommands: number;
  /** The most Elders alive at once. */
  maxEldersAlive: number;
  /** The gold banked at Begin, which interest reads (§6.2). */
  maxGoldBanked: number;
  /** M6-Q1: the most economy buildings on loam plots at once, as Begin fields the colony. */
  maxEconomyOnLoam: number;
  /** M6-Q1: the side's own Heartcap's lowest HP fraction, in basis points of its max HP, as the round leaves it. */
  lowestHeartcapBp: number;
  /** Commander power use, for a side with a power: uses, damage dealt, units lifted and gold paid (§6.6, §11.10). */
  powerUses?: number;
  powerDamage?: number;
  powerLifts?: number;
  powerGold?: number;
}

/** A side's figures for the battle so far (§5.7): the systems count into it as they run, and each round's record closes from it. */
export interface SideStats extends RoundStats {
  /** Building entity id → its building's id, for reports: a sold building keeps its entry. */
  buildingTypes: Record<string, string>;
  /** M6-Q1: the side's damage by unit tag in the round a Heartcap fell, empty without a Rout. */
  routRoundDamageByTag: Record<string, number>;
}

export type CommandBody =
  // planning: each executes when queued (§13.3 rule 7)
  | { type: 'plant'; buildingId: string; plot: number }
  | { type: 'sell'; entityId: number }
  | { type: 'toggleMerge'; entityId: number; on: boolean }
  | { type: 'upgrade'; entityId: number }
  | { type: 'beginClash' }
  | { type: 'draftPick'; cardId: string }
  | { type: 'draftReroll' }
  | { type: 'draftSkip' }
  // a clash: executes on its tick
  | { type: 'power'; x?: number; y?: number; lane?: number };
/**
 * A stamped command (§14.5, plan Call 7). It has no phase field, since its type implies it, and `tick` is
 * `state.tick`, cumulative over the battle's clashes.
 */
export type Command = { round: number; tick: number; side: Side; seq: number } & CommandBody;

export type SimEvent =
  // a round opens
  /** Every source the opening pays but interest; `clash`, when there was some, is the last clash's gold, already paid (R2-Q20). */
  | { t: 'income'; side: Side; amount: number; clash?: number }
  | { t: 'interest'; side: Side; amount: number }
  | { t: 'roundStarted'; round: number; stormBp: number }
  | { t: 'draftOpen'; side: Side; index: number }
  | { t: 'drafted'; side: Side; cardId: string | null; skipped: boolean }
  /** `sold` by building id; `counter` when one activated in this planning (§7.4). */
  | { t: 'generalPlanned'; side: Side; planted: number[]; sold: string[]; upgraded?: number[]; counter?: CounterKind }
  // planning
  | { t: 'buildingPlanted'; id: number }
  | { t: 'buildingSold'; id: number; side: Side; refund: number }
  | { t: 'mergeToggled'; id: number; on: boolean }
  | { t: 'buildingUpgraded'; id: number; side: Side; price: number }
  | { t: 'commandRejected'; side: Side; seq: number; reason: string }
  // the clash
  | { t: 'clashStarted'; round: number; supply: Record<Side, number> }
  /** A squad's units, on the clash's first tick. */
  | { t: 'arrived'; side: Side; ids: number[] }
  /**
   * A trio the muster knits inside Begin, after its `merged` (§5.6): the arrived units it's made of, by building
   * and index j in that squad (`MergePreview`'s trios), and the unit it made. The view animates the 1 s from it.
   */
  | { t: 'musterKnit'; side: Side; id: number; parts: { building: number; j: number }[]; tier: 2 | 3; x: number; y: number }
  | { t: 'hit'; target: number; src: number; amount: number; eff: Effectiveness; x: number; y: number; splash: boolean }
  | { t: 'died'; id: number; side: Side; unitId: string; x: number; y: number }
  | { t: 'healed'; target: number; src: number; amount: number; x: number; y: number }
  | { t: 'knitStart'; side: Side; ids: number[]; x: number; y: number }
  | { t: 'knitCancel'; side: Side; ids: number[] }
  | { t: 'merged'; side: Side; id: number; unitId: string; tier: 2 | 3; x: number; y: number }
  | { t: 'burst'; side: Side; id: number; x: number; y: number; radius: number }
  /** An effect's gold, credited at once: `clash` in a clash, else `effects` (§6.2, R2-Q20). */
  | { t: 'gold'; side: Side; amount: number; source: 'clash' | 'effects' }
  | { t: 'power'; side: Side; power: string; x?: number; y?: number; hits: number; lifts: number; gold?: number }
  /** R3: icon flashes (§13.6). */
  | { t: 'augmentActed' | 'comboActed'; side: Side; id: string; x: number; y: number }
  | { t: 'laneWon'; lane: number; winner: Side | null; survivors: Record<Side, number>; capped: boolean }
  /** A clash command still queued when its clash ended; not a rejection (plan Call 9). */
  | { t: 'commandDropped'; side: Side; seq: number }
  // scoring, on the clash's last tick: `side` took it
  | { t: 'heartcapDamaged'; side: Side; amount: number; stormBp: number; capped: boolean }
  /** A heal on the round's result, after its damage (Mending Moss, §6.7, #24): what it added, up to the max. */
  | { t: 'heartcapHealed'; side: Side; amount: number }
  // the aftermath's step, after the battle's last round
  | { t: 'battleEnded'; winner: Side; by: 'rout' | 'decision'; round: number };

export interface BattleState {
  v: 2;
  config: BattleConfig;
  phase: 'planning' | 'clash' | 'aftermath' | 'ended';
  /** 1 to `rules.maxRounds` (§6.5). */
  round: number;
  /** Clash ticks so far this battle; it doesn't move in planning or the aftermath. */
  tick: number;
  /** From Begin until the next round opens. */
  clash?: ClashState;
  /** One per finished round, in order, with what each side fielded. */
  rounds: RoundResult[];
  /** An AI stream a side, `ai.player` and `ai.enemy`, seeded from the battle index (§13.3, plan Call 10). */
  rng: { combat: Rng4; draft: Rng4; ai: Record<Side, Rng4> };
  nextId: number;
  nextSeq: Record<Side, number>;
  /** Orders hits that land on the same tick from the same source. */
  nextHitSeq: number;
  rules: Rules;
  library: Library;
  map: MapState;
  sides: Record<Side, SideState>;
  lanes: { rowStart: number; rowEnd: number }[];
  /** Sorted by id. */
  buildings: BuildingState[];
  /** This clash's, sorted by building id; empty in planning. */
  squads: SquadState[];
  /** Sorted by id; empty in planning. */
  units: UnitState[];
  /** Sorted by (tick, sourceId, seq). */
  hits: PendingHit[];
  /** Spore clouds, oldest first. */
  clouds?: CloudState[];
  /** This round's storm step: 0 before the storm's first round (§6.4). */
  sporestorm: number;
  /** Pending commands, sorted by (round, tick, side, seq). */
  queue: Command[];
  /** Every executed command, in execution order (replays). */
  log: Command[];
  /** This step's only. */
  events: SimEvent[];
  compiled: Record<Side, CompiledSide>;
  stats: Record<Side, SideStats>;
  /** Set when the last round is scored. */
  outcome?: { winner: Side; by: 'rout' | 'decision'; round: number };
}
