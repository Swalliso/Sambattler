// Compiles data (seconds, ratios) into the tick- and integer-based definitions stored in state, at
// battle start and after every draft pick (SPEC §14.1):
//
//   base data → (strain patch, M6) → modifiers: sum all `add`, multiply all `mul`, then `set`
//
// Unit modifiers resolve against the tier-1 base stats; tier scaling and merge perks apply on top
// (splash radius is the exception: a perk replaces it, and modifiers adjust the result). A side's
// compiled set covers its kit, with every unit resolved at all three merge tiers. Everything reads
// from the battle's `library`, never from content, so `step` can recompile.
import type { Content } from '../data/registry.ts';
import type { BalanceDef, ModifierDef, UnitDef } from '../data/schema.ts';
import { battleModifiers, buildingStat, collectEffects, resolveStat, unitMatcher } from './effects.ts';
import { SIDES } from './state.ts';
import type {
  BattleConfig, BattleModifier, CompiledBuilding, CompiledSide, CompiledTier, CompiledUnit, DamageType, Library, Loadout,
  Rules, Side, SideConfig, Tier,
} from './state.ts';

export const secToTicks = (s: number, tickRate = 20): number => Math.round(s * tickRate);

export function compileRules(b: BalanceDef, config: BattleConfig): Rules {
  const tr = b.tickRate;
  const test = config.test ?? {};
  const battle = battleModifiers(config.modifiers);
  return {
    tickRate: tr,
    waveTicks: secToTicks(b.waveSeconds, tr),
    incomeTicks: secToTicks(b.incomeTickSeconds, tr),
    interestPer: b.interestPer,
    comebackDivisor: b.comebackDivisor,
    comebackMax: b.comebackMax,
    fullRefundTicks: secToTicks(b.fullRefundSeconds, tr),
    besiegedTicks: secToTicks(b.besiegedSeconds, tr),
    besiegedHalfTicks: Math.round(2 * b.besiegedRate),
    normalHalfTicks: 2,
    besiegedIncomePct: Math.round(b.besiegedRate * 100),
    ...(b.besiegedBy && b.besiegedBy !== 'all' ? { suppressBy: b.besiegedBy } : {}),
    timeLimitTicks: secToTicks(test.timeLimitSeconds ?? b.timeLimitSeconds, tr),
    captureStep: 100,
    captureThreshold: Math.round(b.captureSeconds * tr * 100),
    captureDecay: Math.round(100 * b.captureDecayMult),
    captureRatio: b.captureRatio,
    retargetEvery: b.retargetEveryTicks,
    leashMult: b.leashMult,
    splashFalloff: b.splashFalloff,
    storm: {
      startTick: secToTicks(Math.max(0, resolveStat(b.sporestorm.startSeconds, battle, 'battle.sporestormStart')), tr),
      everyTicks: secToTicks(b.sporestorm.everySeconds, tr),
      maxStacks: b.sporestorm.maxStacks,
      unitDamage: b.sporestorm.unitDamagePerStack,
      turretDamage: b.sporestorm.turretDamagePerStack,
      heartcapTaken: b.sporestorm.heartcapTakenPerStack,
    },
    matrix: b.matrix,
    siegeMult: b.tagMult.siegeVsStructure,
    slayerMult: b.tagMult.slayerVsElite,
    merge: {
      cooldownTicks: secToTicks(b.mergeCombatCooldownSeconds, tr),
      every: b.mergeCheckEveryTicks,
    },
    draftWaves: [...b.draftWaves],
    strongAt: b.effectiveness.strongAtLeast,
    weakAt: b.effectiveness.weakAtMost,
    spawnOffset: b.movement.spawnOffset,
    spawnJitter: b.movement.spawnJitter,
    driftPerTick: b.movement.driftSpeed / tr,
    separationPasses: b.movement.separationPasses,
    ai: {
      thinkEvery: secToTicks(b.ai.thinkEverySeconds, tr),
      stickyTicks: secToTicks(b.ai.targetStickySeconds, tr),
      pressureWindow: b.ai.pressureWindowCols,
      pressureMin: b.ai.pressureMinPresence,
      threatRadius: b.ai.threatRadius,
      towerRangeThreat: b.ai.towerRangeThreat,
      noise: b.ai.placementNoise,
      economyEarlyTick: secToTicks(b.ai.economyEarly.beforeSeconds, tr),
      economyEarlyMult: b.ai.economyEarly.mult,
      economyLateTick: secToTicks(b.ai.economyLate.afterSeconds, tr),
      economyLateMult: b.ai.economyLate.mult,
      towerPressureMult: b.ai.towerPressureMult,
      mergeOffSlayerShare: b.ai.mergeOffSlayerShare,
      counter: {
        cycles: b.ai.counter.cycles.map((c) => ({ analyzeTick: secToTicks(c.analyzeSeconds, tr), activeTick: secToTicks(c.activeSeconds, tr) })),
        bossCycles: b.ai.counter.bossCycles.map((c) => ({ analyzeTick: secToTicks(c.analyzeSeconds, tr), activeTick: secToTicks(c.activeSeconds, tr) })),
        scoreNoise: b.ai.counter.scoreNoise,
        swarmEliteDiscount: b.ai.counter.swarmEliteDiscount,
        eliteScoreMult: b.ai.counter.eliteScoreMult,
        counterMult: b.ai.counter.counterMult,
        otherMult: b.ai.counter.otherMult,
        openingMult: b.ai.counter.openingMult,
        openingOtherMult: b.ai.counter.openingOtherMult,
        dualMult: b.ai.counter.dualMult,
        freeSlots: b.ai.counter.freeSlots,
        maxSells: b.ai.counter.maxSells,
      },
      score: { ...b.ai.score },
    },
    test: {
      turrets: !test.noTurrets,
      territory: !test.noTerritory,
      heartcapTargets: !test.noHeartcapTargets,
    },
  };
}

/**
 * The library a battle needs: the given buildings (both kits plus any draft pool), the units they
 * spawn, their upgrade tracks, the given relics and the balance constants.
 */
export function buildLibrary(content: Content, buildingIds: Iterable<string>, relicIds: Iterable<string>): Library {
  const lib: Library = { balance: content.balance, buildings: {}, units: {}, upgrades: {}, relics: {} };
  for (const id of buildingIds) {
    const b = content.buildings[id];
    if (!b) throw new Error(`unknown building ${id}`);
    lib.buildings[id] = b;
    if (b.spawn) {
      const u = content.units[b.spawn.unit];
      if (!u) throw new Error(`unknown unit ${b.spawn.unit}`);
      lib.units[u.id] = u;
    }
    const track = content.upgrades[id];
    if (track) lib.upgrades[id] = track;
  }
  for (const id of relicIds) {
    const r = content.relics[id];
    if (!r) throw new Error(`unknown relic ${id}`);
    lib.relics[id] = r;
  }
  return lib;
}

/** A side's loadout as configured (before any draft pick). */
export function configLoadout(sc: SideConfig): Loadout {
  return { kit: [...sc.kit], upgrades: { ...(sc.upgrades ?? {}) }, relics: [...(sc.relics ?? [])] };
}

type Perk = UnitDef['mergePerks']['2'];

/** The merge perk in force at a tier: tier 3 keeps tier 2's perk and overrides the keys it redefines. */
export function perkAt(u: UnitDef, tier: Tier): Perk {
  if (tier === 1) return {};
  const p2 = u.mergePerks['2'];
  if (tier === 2) return p2;
  const p3 = u.mergePerks['3'];
  const out: Perk = { ...p2, ...p3 };
  if (p2.resist || p3.resist) out.resist = { ...p2.resist, ...p3.resist };
  return out;
}

function compileTier(lib: Library, u: UnitDef, tier: Tier, mods: readonly ModifierDef[]): CompiledTier {
  const b = lib.balance;
  const tr = b.tickRate;
  const p = perkAt(u, tier);
  const match = unitMatcher(lib, u, tier);
  const m = (stat: string, base: number) => resolveStat(base, mods, stat, match);
  const stat = tier === 1 ? 1 : tier === 2 ? b.tierStatMult : b.tierStatMult * b.tierStatMult;
  const size = tier === 1 ? 1 : tier === 2 ? b.tierRadiusMult : b.tierRadiusMult * b.tierRadiusMult;
  const resist = (t: DamageType) => m(`unit.resist.${t}`, p.resist?.[t] ?? 1);
  return {
    hp: Math.round(m('unit.hp', u.hp) * stat * (p.hpMult ?? 1)),
    damage: m('unit.damage', u.damage) * stat * (p.damageMult ?? 1),
    attackTicks: Math.max(1, secToTicks(m('unit.attackInterval', u.attackInterval) * (p.attackIntervalMult ?? 1), tr)),
    range: m('unit.range', u.range) + (p.rangeAdd ?? 0),
    speedPerTick: (m('unit.speed', u.speed) * (p.speedMult ?? 1)) / tr,
    radius: u.radius * size + (p.radiusAdd ?? 0),
    splashRadius: m('unit.splashRadius', p.splashRadius ?? u.splashRadius ?? 0),
    slayerMult: u.tags.includes('slayer') ? (p.slayerMult ?? b.tagMult.slayerVsElite) : 1,
    resist: { slash: resist('slash'), pierce: resist('pierce'), crush: resist('crush') },
    supply: u.supply * b.tierSupplyMult[tier - 1]!,
    siegeMult: u.tags.includes('siege') ? m('unit.siegeMult', b.tagMult.siegeVsStructure) : 1,
    healAmount: u.heal ? Math.max(1, Math.round(m('unit.healAmount', u.heal.amount) * stat)) : 0,
    healTicks: u.heal ? Math.max(1, secToTicks(u.heal.interval, tr)) : 0,
    healTargets: u.heal ? (p.healTargets ?? u.heal.targets ?? 1) : 0,
    regenPct: Math.max(0, m('unit.regenPctPerSec', 0)),
  };
}

export function compileUnit(lib: Library, id: string, mods: readonly ModifierDef[] = []): CompiledUnit {
  const u = lib.units[id];
  if (!u) throw new Error(`unknown unit ${id}`);
  return {
    id: u.id,
    armor: u.armor,
    damageType: u.damageType,
    projectileSpeed: u.projectileSpeed,
    aggroRange: u.aggroRange,
    siege: u.tags.includes('siege'),
    slayer: u.tags.includes('slayer'),
    support: !!u.heal,
    tags: [...u.tags],
    tiers: [compileTier(lib, u, 1, mods), compileTier(lib, u, 2, mods), compileTier(lib, u, 3, mods)],
  };
}

export function compileBuilding(lib: Library, id: string, mods: readonly ModifierDef[] = []): CompiledBuilding {
  const b = lib.buildings[id];
  if (!b) throw new Error(`unknown building ${id}`);
  const bal = lib.balance;
  const tr = bal.tickRate;
  const stat = (key: string, base: number) => buildingStat(lib, b, mods, key, base);
  const out: CompiledBuilding = {
    id: b.id, kind: b.kind, w: b.footprint.w, h: b.footprint.h, cost: b.cost, hp: Math.round(stat('building.hp', b.hp).value),
  };
  if (b.spawn) {
    const interval = stat('building.spawnInterval', b.spawn.interval);
    const intervalTicks = secToTicks(interval.value, tr);
    const first = stat('building.firstSpawnFraction', bal.firstSpawnFraction).value;
    out.spawn = {
      unit: b.spawn.unit,
      count: Math.max(1, Math.round(stat('building.spawnCount', b.spawn.count).value)),
      intervalHalfTicks: intervalTicks * 2,
      firstHalfTicks: Math.round(intervalTicks * 2 * Math.max(0, first)),
    };
    if (interval.positional) out.spawn.positional = interval.positional;
  }
  if (b.attack) {
    out.attack = {
      damage: stat('tower.damage', b.attack.damage).value,
      damageType: b.attack.damageType,
      intervalTicks: Math.max(1, secToTicks(b.attack.interval, tr)),
      range: stat('tower.range', b.attack.range).value,
      minRange: b.attack.minRange ?? 0,
      splashRadius: stat('tower.splashRadius', b.attack.splashRadius ?? 0).value,
      projectileSpeed: b.attack.projectileSpeed,
    };
  }
  if (b.economy) {
    const gold = stat('building.goldPerTick', b.economy.goldPerTick);
    out.economy = { goldPerTick: Math.round(gold.value) };
    if (gold.positional) out.economy.positional = gold.positional;
    if (b.economy.interestCapAdd) out.economy.interestCapAdd = b.economy.interestCapAdd;
  }
  if (b.utility) out.utility = { ...b.utility };
  return out;
}

export function compileSide(lib: Library, lo: Loadout, mods: readonly ModifierDef[], triggers: CompiledSide['triggers'] = []): CompiledSide {
  const bal = lib.balance;
  const m = (stat: string, base: number) => resolveStat(base, mods, stat);
  const buildings: Record<string, CompiledBuilding> = {};
  const units: Record<string, CompiledUnit> = {};
  for (const id of lo.kit) {
    const cb = compileBuilding(lib, id, mods);
    buildings[id] = cb;
    if (cb.spawn && !(cb.spawn.unit in units)) units[cb.spawn.unit] = compileUnit(lib, cb.spawn.unit, mods);
  }
  return {
    units,
    buildings,
    supplyCap: Math.round(m('side.supplyCap', bal.supplyCap)),
    interestCap: Math.round(m('side.interestCap', bal.interestCap)),
    stipend: Math.round(m('side.stipend', bal.stipendPerTick)),
    captureSpeed: m('side.captureSpeed', 1),
    sellRefundPct: Math.round(m('side.sellRefund', bal.sellRefund) * 100),
    supplyLineBp: Math.round(m('side.supplyLineRate', bal.supplyLinePerColumn) * 10000),
    loamBonusPct: Math.round(m('side.loamBonus', bal.loamBonus) * 100),
    comebackEnabled: m('side.comebackEnabled', 1) > 0,
    mergeRadius: m('side.mergeRadius', bal.mergeRadius),
    knitTicks: secToTicks(m('side.knitTicks', bal.mergeKnitSeconds), bal.tickRate),
    rerollBase: Math.max(0, Math.round(m('side.rerollCost', bal.reroll.base))),
    rerollStep: bal.reroll.step,
    skipGold: bal.skipGold,
    draftCards: Math.max(1, Math.round(m('side.draftCards', bal.draft.cards))),
    turret: {
      damage: m('side.turretDamage', bal.turret.damage),
      damageType: bal.turret.damageType,
      intervalTicks: Math.max(1, secToTicks(bal.turret.interval, bal.tickRate)),
      range: bal.turret.range,
      projectileSpeed: bal.turret.projectileSpeed,
      perLane: bal.turret.perLane,
    },
    triggers: [...triggers],
  };
}

/** Compiles both sides together (a modifier may target the opponent). */
export function compileSides(lib: Library, loadouts: Record<Side, Loadout>, battle: BattleModifier[] = []): Record<Side, CompiledSide> {
  const fx = collectEffects(lib, loadouts, battle);
  const out = {} as Record<Side, CompiledSide>;
  for (const s of SIDES) out[s] = compileSide(lib, loadouts[s], fx[s].mods, fx[s].triggers);
  return out;
}

/**
 * A side stat a battle applies once, at creation (starting gold, Heartcap max HP): resolved from
 * the side's own modifiers against the configured base.
 */
export function creationStat(lib: Library, loadouts: Record<Side, Loadout>, battle: BattleModifier[] | undefined, side: Side, stat: string, base: number): number {
  return resolveStat(base, collectEffects(lib, loadouts, battle)[side].mods, stat);
}
