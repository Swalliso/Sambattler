// Compiles data (seconds, ratios) into the tick- and integer-based definitions stored in state.
// Milestone 1 has no strains, upgrades or relics, so a side's compiled set is its kit's base data.
import type { Content } from '../data/registry.ts';
import type { BattleConfig, CompiledBuilding, CompiledSide, CompiledUnit, Rules, SideConfig } from './state.ts';

export const secToTicks = (s: number, tickRate = 20): number => Math.round(s * tickRate);

export function compileRules(content: Content, config: BattleConfig): Rules {
  const b = content.balance;
  const tr = b.tickRate;
  const test = config.test ?? {};
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
    timeLimitTicks: secToTicks(test.timeLimitSeconds ?? b.timeLimitSeconds, tr),
    captureStep: 100,
    captureThreshold: Math.round(b.captureSeconds * tr * 100),
    captureDecay: Math.round(100 * b.captureDecayMult),
    captureRatio: b.captureRatio,
    retargetEvery: b.retargetEveryTicks,
    leashMult: b.leashMult,
    splashFalloff: b.splashFalloff,
    storm: {
      startTick: secToTicks(b.sporestorm.startSeconds, tr),
      everyTicks: secToTicks(b.sporestorm.everySeconds, tr),
      maxStacks: b.sporestorm.maxStacks,
      unitDamage: b.sporestorm.unitDamagePerStack,
      turretDamage: b.sporestorm.turretDamagePerStack,
      heartcapTaken: b.sporestorm.heartcapTakenPerStack,
    },
    matrix: b.matrix,
    siegeMult: b.tagMult.siegeVsStructure,
    slayerMult: b.tagMult.slayerVsElite,
    tierStatMult: b.tierStatMult,
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
      score: { ...b.ai.score },
    },
    test: {
      turrets: !test.noTurrets,
      territory: !test.noTerritory,
      heartcapTargets: !test.noHeartcapTargets,
    },
  };
}

export function compileUnit(content: Content, id: string): CompiledUnit {
  const u = content.units[id];
  if (!u) throw new Error(`unknown unit ${id}`);
  const tr = content.balance.tickRate;
  return {
    id: u.id,
    hp: u.hp,
    armor: u.armor,
    damage: u.damage,
    damageType: u.damageType,
    attackTicks: Math.max(1, secToTicks(u.attackInterval, tr)),
    range: u.range,
    projectileSpeed: u.projectileSpeed,
    speedPerTick: u.speed / tr,
    supply: u.supply,
    aggroRange: u.aggroRange,
    radius: u.radius,
    splashRadius: u.splashRadius ?? 0,
    siege: u.tags.includes('siege'),
    slayer: u.tags.includes('slayer'),
    tags: [...u.tags],
    resist: { slash: 1, pierce: 1, crush: 1 },
  };
}

export function compileBuilding(content: Content, id: string): CompiledBuilding {
  const b = content.buildings[id];
  if (!b) throw new Error(`unknown building ${id}`);
  const tr = content.balance.tickRate;
  const out: CompiledBuilding = { id: b.id, kind: b.kind, w: b.footprint.w, h: b.footprint.h, cost: b.cost, hp: b.hp };
  if (b.spawn) {
    const intervalTicks = secToTicks(b.spawn.interval, tr);
    out.spawn = {
      unit: b.spawn.unit,
      count: b.spawn.count,
      intervalHalfTicks: intervalTicks * 2,
      firstHalfTicks: Math.round(intervalTicks * 2 * content.balance.firstSpawnFraction),
    };
  }
  if (b.attack) {
    out.attack = {
      damage: b.attack.damage,
      damageType: b.attack.damageType,
      intervalTicks: Math.max(1, secToTicks(b.attack.interval, tr)),
      range: b.attack.range,
      minRange: b.attack.minRange ?? 0,
      splashRadius: b.attack.splashRadius ?? 0,
      projectileSpeed: b.attack.projectileSpeed,
    };
  }
  if (b.economy) out.economy = { goldPerTick: b.economy.goldPerTick };
  return out;
}

export function compileSide(content: Content, side: SideConfig): CompiledSide {
  const bal = content.balance;
  const buildings: Record<string, CompiledBuilding> = {};
  const units: Record<string, CompiledUnit> = {};
  for (const id of side.kit) {
    const cb = compileBuilding(content, id);
    buildings[id] = cb;
    if (cb.spawn && !(cb.spawn.unit in units)) units[cb.spawn.unit] = compileUnit(content, cb.spawn.unit);
  }
  return {
    units,
    buildings,
    supplyCap: bal.supplyCap,
    interestCap: bal.interestCap,
    stipend: bal.stipendPerTick,
    captureSpeed: 1,
    sellRefundPct: Math.round(bal.sellRefund * 100),
    supplyLineBp: Math.round(bal.supplyLinePerColumn * 10000),
    loamBonusPct: Math.round(bal.loamBonus * 100),
    comebackEnabled: true,
    turret: {
      damage: bal.turret.damage,
      damageType: bal.turret.damageType,
      intervalTicks: Math.max(1, secToTicks(bal.turret.interval, bal.tickRate)),
      range: bal.turret.range,
      projectileSpeed: bal.turret.projectileSpeed,
      perLane: bal.turret.perLane,
    },
  };
}
