// A battle in rounds' runtime state (SPEC §14.4, §14.5): plain, JSON-serializable data only (§13.3 rule 8).
// It stands beside v1's `src/sim/state.ts` until R2b moves it there (X2). Types whose meaning rounds keep
// come from v1's file and are re-exported, so rounds' modules import from here; the rest are §14.4's and
// §14.5's. The library and the compiled sides hold ids and numbers only, so rewording a card never moves a
// round golden (R2-Q8, A152).
import type { BalanceDef, BuildingDef, ModifierDef, PowerDef, TriggerDef, UnitDef } from '../../data/schema.ts';
import type { Slot } from '../formation.ts';
import type {
  Armor, BattleModifier, BuildingKind, CloudSpec, CloudState, CompiledTier, Controller, CounterKind, DamageType,
  DraftPolicy, DraftPool, Effectiveness, IntelProfile, KnitState, OpenDraft, PendingHit, PowerPolicy, Rng4, Side, Tier,
} from '../state.ts';
import type { ColonyPlot } from './colony.ts';

export { COUNTER_KINDS, POWER_SOURCE_ID, SIDES, other } from '../state.ts';
export type {
  Armor, BattleModifier, BuildingKind, CloudSpec, CloudState, CompiledTier, Controller, CounterKind, DamageType,
  DraftPolicy, DraftPool, Effectiveness, IntelProfile, KnitState, OpenDraft, PendingHit, PowerPolicy, Rng4, Side, Tier,
};

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
  /** Until R3. A single battle in R2a has no upgrade levels and no relics (plan Call 19). */
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
  /** R2a refuses `drafts` in a battle in rounds (plan Call 26). */
  flags: { merging: boolean; drafts: boolean; adaptiveGeneral: boolean; powers: boolean };
  scenario?: string;
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

/** The triggers a battle in rounds fires (§14.2, §14.6). */
export const ROUND_TRIGGERS = ['battleStart', 'roundStart', 'clashStart', 'unitDeath', 'merge', 'roundWon'] as const;
export type RoundTriggerOn = (typeof ROUND_TRIGGERS)[number];
/** The actions rounds run: `gainGold` pays its own side at once. */
export type RoundAction = { gainGold: number };
export interface RoundTrigger { on: RoundTriggerOn; if?: TriggerDef['if']; do: RoundAction[] }

/**
 * Content a battle in rounds compiles to nothing until R2b gives it a v2 effect (plan Call 19): a modifier
 * on a stat rounds retire, or a trigger or action rounds don't run. Its source is the battle modifier's,
 * such as `commander:vesper`.
 */
export type IgnoredEffect = { source: string } & ({ stat: string } | { trigger: string } | { action: string });

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
  /** Triggers from the battle's modifiers, in source order, holding only the actions rounds run. */
  triggers: RoundTrigger[];
  /** What this side's content compiles to nothing (plan Call 19). */
  ignored: IgnoredEffect[];
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
  /** The tunneler, the Burster and flyers (§5.3). */
  burrowed?: boolean;
  burst?: boolean;
  flying?: boolean;
  /** R3: timed statuses, and its blows this clash for `everyNth` and `firstInClash` (§14.2). */
  statuses?: { kind: 'slow' | 'sunder'; mult: number; untilTick: number }[];
  blows?: number;
}

/** What the general planned in one round (§7.5, plan Call 12, A070). Each entry names its building and plot. */
export interface AiPlan {
  round: number;
  planted: { building: string; plot: number }[];
  sold: { building: string; plot: number }[];
  income: number;
  banked: number;
  counter?: CounterKind;
}

/** An AI side's planning state. The general's plan (T068) adds its doctrine and counter schedule. */
export interface AiState {
  profileId: string;
  /** One entry a round, so the Intent panel survives later commands and a fast-forward to a round. */
  plans: AiPlan[];
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
  /** Gold a clash won, paid with the next round's income and lost if the battle ends first (§14.4, plan Call 25). */
  pendingGold: number;
  /** In this clash (§6.6). */
  powerUsed: boolean;
  draft?: OpenDraft;
  draftsOpened: number;
  ai?: AiState;
}

/** A side's counters for the battle (§5.7). T057 keeps them by round and adds M6-Q1's feat stats. */
export interface SideStats {
  merges: { '2': number; '3': number };
  damageDealt: number;
  /** Building entity id → damage dealt by its units, clouds and bursts included, and its type, for reports. */
  damageByBuilding: Record<string, number>;
  buildingTypes: Record<string, string>;
  /** Attacker kind (unit id or tower building id) → damage dealt. */
  damageBySource: Record<string, number>;
  heartcapDamageTaken: number;
  /** By source (§6.2): the opening's income, and effects' gold paid at once. Pending gold counts when it's paid. */
  goldEarned: { stipend: number; economy: number; comeback: number; interest: number; pending: number; effects: number };
  goldByBuilding: Record<string, number>;
  healingDone: number;
  buildingsPlanted: number;
  buildingsSold: number;
  unitsLost: number;
  maxEldersAlive: number;
  maxGoldBanked: number;
  rejectedCommands: number;
  /** Commander power use, for a side with a power: uses, damage dealt and trios merged. */
  powerUses?: number;
  powerDamage?: number;
  powerMerges?: number;
}

export type CommandBody =
  // planning: each executes when queued (§13.3 rule 7)
  | { type: 'plant'; buildingId: string; plot: number }
  | { type: 'sell'; entityId: number }
  | { type: 'toggleMerge'; entityId: number; on: boolean }
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
  | { t: 'income'; side: Side; amount: number }
  | { t: 'interest'; side: Side; amount: number }
  | { t: 'roundStarted'; round: number; stormBp: number }
  | { t: 'draftOpen'; side: Side; index: number }
  | { t: 'drafted'; side: Side; cardId: string | null; skipped: boolean }
  | { t: 'generalPlanned'; side: Side; planted: number[]; sold: string[]; counter?: CounterKind }
  // planning
  | { t: 'buildingPlanted'; id: number }
  | { t: 'buildingSold'; id: number; side: Side; refund: number }
  | { t: 'mergeToggled'; id: number; on: boolean }
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
  /** `pending`: into `pendingGold`. */
  | { t: 'effectGold'; side: Side; amount: number; pending?: boolean }
  | { t: 'power'; side: Side; power: string; x?: number; y?: number; hits: number; merges: number }
  /** R3: icon flashes (§13.6). */
  | { t: 'augmentActed' | 'comboActed'; side: Side; id: string; x: number; y: number }
  | { t: 'laneWon'; lane: number; winner: Side | null; survivors: Record<Side, number>; capped: boolean }
  /** A clash command still queued when its clash ended; not a rejection (plan Call 9). */
  | { t: 'commandDropped'; side: Side; seq: number }
  // scoring, on the clash's last tick: `side` took it
  | { t: 'heartcapDamaged'; side: Side; amount: number; stormBp: number; capped: boolean }
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
