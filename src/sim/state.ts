// Runtime state: plain, JSON-serializable data only (SPEC §13.3 rule 8, §14.4).

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

export type Controller =
  | { kind: 'human' }
  | { kind: 'general'; id: string }
  | { kind: 'bot'; id: string };

export interface SideConfig {
  faction: string;
  controller: Controller;
  kit: string[];
  heartcapHp: number;
  heartcapMaxHp: number;
  startingGold: number;
}

export interface BattleConfig {
  seed: number;
  battleIndex: number;
  mapId: string;
  player: SideConfig;
  enemy: SideConfig;
  flags: { merging: boolean; drafts: boolean; adaptiveGeneral: boolean; powers: boolean };
  scenario?: string;
  /** Test-harness rule switches used by balance duels; never set in play. */
  test?: { noTurrets?: boolean; noTerritory?: boolean; noHeartcapTargets?: boolean; timeLimitSeconds?: number };
}

/** Resolved, tick-based unit definition (SPEC §14.1 "compiled definitions"). */
export interface CompiledUnit {
  id: string;
  hp: number;
  armor: Exclude<Armor, 'structure'>;
  damage: number;
  damageType: DamageType;
  attackTicks: number;
  range: number;
  projectileSpeed: number;
  speedPerTick: number;
  supply: number;
  aggroRange: number;
  radius: number;
  splashRadius: number;
  siege: boolean;
  slayer: boolean;
  tags: string[];
  resist: Record<DamageType, number>;
}

export interface CompiledBuilding {
  id: string;
  kind: BuildingKind;
  w: number;
  h: number;
  cost: number;
  hp: number;
  spawn?: { unit: string; count: number; intervalHalfTicks: number; firstHalfTicks: number };
  attack?: {
    damage: number; damageType: DamageType; intervalTicks: number; range: number;
    minRange: number; splashRadius: number; projectileSpeed: number;
  };
  economy?: { goldPerTick: number };
}

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
  turret: { damage: number; damageType: DamageType; intervalTicks: number; range: number; projectileSpeed: number; perLane: number };
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
  tierStatMult: number;
  strongAt: number;
  weakAt: number;
  spawnOffset: number;
  spawnJitter: number;
  driftPerTick: number;
  separationPasses: number;
  ai: {
    thinkEvery: number; stickyTicks: number; pressureWindow: number; pressureMin: number; threatRadius: number;
    towerRangeThreat: number; noise: number; economyEarlyTick: number; economyEarlyMult: number;
    economyLateTick: number; economyLateMult: number; towerPressureMult: number;
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
  tier: 1 | 2 | 3;
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
}

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
  placedTick: number;
  pricePaid: number;
  mergeOn: boolean;
  holding: boolean;
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
  siege: boolean;
  slayer: boolean;
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
  | { type: 'power'; x?: number; y?: number; lane?: number }
  | { type: 'draftPick'; cardId: string }
  | { type: 'draftReroll' }
  | { type: 'draftSkip' };
export type Command = { tick: number; side: Side; seq: number } & CommandBody;

export type SimEvent =
  | { t: 'spawned'; id: number }
  | { t: 'died'; id: number; side: Side; unitId: string; x: number; y: number }
  | { t: 'hit'; target: number; src: number; amount: number; eff: Effectiveness; x: number; y: number; splash: boolean }
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
  | { t: 'ended'; winner: Side; by: 'rout' | 'decision' };

export interface AiWeight { building: string; weight: number; maxOwned: number; afterTick: number }
export interface AiState {
  profileId: string;
  opener: string[];
  weights: AiWeight[];
  spawnerDepthWeight: number;
  openerDone: boolean;
  target: string | null;
  targetSince: number;
}

export interface SideState {
  gold: number;
  supplyUsed: number;
  supplyCap: number;
  heartcapHp: number;
  heartcapMaxHp: number;
  turretCooldowns: number[];
  powerCooldown: number;
  kit: string[];
  ai?: AiState;
}

export interface SideStats {
  spawned: Record<string, number>;
  merges: { '2': number; '3': number };
  damageDealt: number;
  /** Building entity id → damage dealt by it or its units. Key "0" is the Heartcap turrets. */
  damageByBuilding: Record<string, number>;
  /** Attacker kind (unit id, tower building id or 'turret') → damage dealt. */
  damageBySource: Record<string, number>;
  heartcapDamageTaken: number;
  goldEarned: { stipend: number; economy: number; comeback: number; interest: number };
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
  map: MapState;
  sides: Record<Side, SideState>;
  lanes: LaneState[];
  units: UnitState[];
  buildings: BuildingState[];
  hits: PendingHit[];
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
