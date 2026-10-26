// zod schemas for every data file (SPEC §14). Milestone 2 subset: balance, factions, buildings,
// units, maps, sprites, generals, bots, scenarios and balance targets.
import { z } from 'zod';

export const Id = z.string().min(1).regex(/^[a-zA-Z0-9:_-]+$/, 'ids use letters, digits, : _ -');
export const DamageType = z.enum(['slash', 'pierce', 'crush']);
export const UnitArmor = z.enum(['light', 'medium', 'heavy']);
export const ArmorType = z.enum(['light', 'medium', 'heavy', 'structure']);
export const Tag = z.enum(['siege', 'slayer', 'ranged', 'swarm', 'support']);
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
  }).strict(),
  G3: z.object({ seeds: z.number().int().positive(), maxMonoWinRate: z.number() }).strict(),
  G4: z.object({ seeds: z.number().int().positive(), medianMinSeconds: Pos, medianMaxSeconds: Pos, maxDecisionShare: z.number(), botWinMin: z.number(), botWinMax: z.number() }).strict(),
  G5: z.object({ seeds: z.number().int().positive(), bonusGold: z.number().int(), minWinRate: z.number(), maxWinRate: z.number() }).strict(),
  G6: z.object({ seeds: z.number().int().positive(), scenario: Id, minBehindWinRate: z.number() }).strict(),
  /** Each check pits a bot against its own merge-off twin, so merging is the only difference. */
  G7: z.object({
    seeds: z.number().int().positive(),
    mirror: z.object({ mergeBot: Id, noMergeBot: Id, minWinRate: z.number(), maxWinRate: z.number() }).strict(),
    slayers: z.object({ mergeBot: Id, noMergeBot: Id, share: z.number(), maxWinRate: z.number() }).strict(),
  }).strict(),
  G11: z.object({ tickMeanMs: Pos, tickP99Ms: Pos, battleWallMs: Pos, benchTicks: z.number().int().positive(), quickTicks: z.number().int().positive() }).strict(),
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
  damage: z.number().positive(), damageType: DamageType, attackInterval: Pos,
  range: Pos, projectileSpeed: z.number().nonnegative(),
  speed: Pos, supply: z.union([z.literal(1), z.literal(2), z.literal(3)]), aggroRange: Pos, radius: Pos,
  splashRadius: Pos.optional(), tags: z.array(Tag),
  mergePerks: z.object({ '2': StatPatch, '3': StatPatch }).strict(),
}).strict();

export const BuildingSchema = z.object({
  id: Id, name: z.string().min(1), sprite: Id, description: z.string(), milestone: z.number().int().positive(),
  kind: z.enum(['spawner', 'tower', 'economy', 'utility']),
  footprint: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }).strict(),
  cost: z.number().int().positive(), hp: z.number().int().positive(),
  spawn: z.object({ unit: Id, count: z.number().int().positive(), interval: Pos, mergeForced: z.boolean().optional(), knitMult: Pos.optional() }).strict().optional(),
  attack: z.object({
    damage: Pos, damageType: DamageType, interval: Pos, range: Pos,
    minRange: z.number().nonnegative().optional(), splashRadius: Pos.optional(), projectileSpeed: z.number().nonnegative(),
  }).strict().optional(),
  economy: z.object({ goldPerTick: z.number().int().nonnegative(), interestCapAdd: z.number().int().optional() }).strict().optional(),
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

const Limit = z.object({ maxOwned: z.number().int().nonnegative().optional(), afterSeconds: Seconds.optional() }).strict();

export const GeneralSchema = z.object({
  id: Id, name: z.string(), sprite: Id, faction: Id, milestone: z.number().int().positive(), description: z.string().optional(),
  opener: z.array(Id), weights: z.record(Id, z.number().nonnegative()), limits: z.record(Id, Limit).optional(),
  laneStyle: z.enum(['defensive', 'aggressive']), appearsIn: z.array(z.number().int().positive()),
  /** Default auto: merging off on swarm buildings while the opponent's Slayer share is high (SPEC §7.2). */
  mergePolicy: MergePolicy.optional(),
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

export type BalanceDef = z.infer<typeof BalanceSchema>;
export type BalanceTargets = z.infer<typeof BalanceTargetsSchema>;
export type UnitDef = z.infer<typeof UnitSchema>;
export type BuildingDef = z.infer<typeof BuildingSchema>;
export type FactionDef = z.infer<typeof FactionSchema>;
export type MapDef = z.infer<typeof MapSchema>;
export type SpriteDef = z.infer<typeof SpriteSchema>;
export type GeneralDef = z.infer<typeof GeneralSchema>;
export type BotDef = z.infer<typeof BotSchema>;
export type ScenarioDef = z.infer<typeof ScenarioSchema>;
export type DamageTypeT = z.infer<typeof DamageType>;
export type ArmorTypeT = z.infer<typeof ArmorType>;
export type TagT = z.infer<typeof Tag>;
