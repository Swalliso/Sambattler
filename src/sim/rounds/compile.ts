// Compiles a battle in rounds' data into what its state holds (SPEC §11.1, §11.2, §14.2, §14.4): the library,
// with ids and numbers only (R2-Q8); the rules, from `balance.rounds` and the kept combat; and each side's
// compiled kit. A spawner fields its `squad`, a tower fields itself as one emplacement unit, an economy
// building pays its gold a round, and every squad's unit is resolved at all three merge tiers as v1 resolves
// it (§5.5, §5.6). Modifiers on stats rounds retire compile to nothing and are listed (plan Call 19). It
// stands beside v1's `src/sim/compile.ts`, whose data-only helpers it imports, until R2b moves it there.
import type { Content } from '../../data/registry.ts';
import type { ModifierDef, UnitDef } from '../../data/schema.ts';
import { perkAt, secToTicks } from '../compile.ts';
import { MAX_RADIUS } from '../targets.ts';
import { battleModifiers, buildingMatcher, collectRoundEffects, resolveStat, unitMatcher } from './effects.ts';
import type { RoundEffects } from './effects.ts';
import { SIDES } from './state.ts';
import type {
  BattleConfig, CompiledBuilding, CompiledSide, CompiledTier, CompiledUnit, DamageType, KitCard, Library, LibraryUnit, Rules, Side, Tier,
} from './state.ts';

/**
 * The library a battle in rounds needs: both kits' buildings, the units their squads field, the powers in
 * play and the balance constants, without any name, description or text (R2-Q8), so the UI reads those
 * from content by id. R2a's single battles have no relics or upgrade levels (plan Call 19).
 */
export function buildRoundLibrary(content: Content, config: BattleConfig): Library {
  for (const s of SIDES) {
    const sc = config[s];
    if (sc.relics.length || Object.keys(sc.upgrades ?? {}).length) {
      throw new Error(`${s}: a battle in rounds takes no relics or upgrade levels until R2b (plan Call 19)`);
    }
  }
  const lib: Library = { balance: content.balance, buildings: {}, units: {} };
  for (const id of [...new Set(SIDES.flatMap((s) => config[s].kit.map((c) => c.building)))].sort()) {
    const b = content.buildings[id];
    if (!b) throw new Error(`unknown building ${id}`);
    const { name: _name, description: _description, ...building } = b;
    lib.buildings[id] = building;
    if (!b.squad) continue;
    const u = content.units[b.squad.unit];
    if (!u) throw new Error(`unknown unit ${b.squad.unit}`);
    const { name: _unitName, ...unit } = u;
    lib.units[u.id] = unit;
  }
  // only a battle with powers on carries their definitions
  const powers = Object.values(content.commanders).map((c) => c.power).filter((p) => SIDES.some((s) => config[s].power === p.id));
  for (const s of SIDES) if (config[s].power && !powers.some((p) => p.id === config[s].power)) throw new Error(`${s}: unknown power ${config[s].power}`);
  if (config.flags.powers && powers.length) {
    lib.powers = Object.fromEntries(powers.map(({ name: _name, text: _text, ...p }) => [p.id, p]));
  }
  return lib;
}

/** The rules of a battle in rounds, from `balance.rounds` and the kept combat, in ticks and integers. */
export function compileRoundRules(lib: Library, config: BattleConfig): Rules {
  const b = lib.balance, r = b.rounds, tr = b.tickRate;
  // `battle.sporestormStart` is a round number in rounds (§6.4)
  const startRound = Math.max(1, Math.round(resolveStat(r.sporestorm.startRound, battleModifiers(config.modifiers), 'battle.sporestormStart')));
  return {
    tickRate: tr,
    maxRounds: r.maxRounds,
    clashCapTicks: secToTicks(r.clashCapSeconds, tr),
    musterTicks: secToTicks(r.musterSeconds, tr),
    formationGapTiles: r.formationGapTiles,
    heartcapDamagePerSupply: r.heartcapDamagePerSupply,
    siegeHeartcapMult: r.siegeHeartcapMult,
    arrivalShield: { ...r.arrivalShield },
    roundDamageCap: { ...r.roundDamageCap },
    decisionBy: r.decision.by,
    interestPer: r.interestPer,
    comebackGold: r.comebackGold,
    storm: { startRound, stepBp: r.sporestorm.stepBp, maxBp: r.sporestorm.maxBp },
    retargetEvery: b.retargetEveryTicks,
    leashMult: b.leashMult,
    splashFalloff: b.splashFalloff,
    matrix: b.matrix,
    siegeMult: b.tagMult.siegeVsStructure,
    slayerMult: b.tagMult.slayerVsElite,
    merge: { cooldownTicks: secToTicks(b.mergeCombatCooldownSeconds, tr), every: b.mergeCheckEveryTicks },
    strongAt: b.effectiveness.strongAtLeast,
    weakAt: b.effectiveness.weakAtMost,
    driftPerTick: b.movement.driftSpeed / tr,
    separationPasses: b.movement.separationPasses,
    ...(b.pinned ? { pin: { radius: b.pinned.radius, permille: Math.round(b.pinned.rateMult * 1000) } } : {}),
    ...(b.sporeCloud ? {
      cloud: {
        buildings: [...b.sporeCloud.buildings], radius: b.sporeCloud.radius, ticks: secToTicks(b.sporeCloud.seconds, tr),
        pulseTicks: Math.max(1, secToTicks(b.sporeCloud.pulseSeconds ?? 1, tr)),
        damage: Math.max(1, Math.round(b.sporeCloud.damagePerSecond * (b.sporeCloud.pulseSeconds ?? 1))),
      },
    } : {}),
    ...(b.cleave ? { cleave: { units: [...b.cleave.units] } } : {}),
    ...(b.burst ? {
      burst: {
        cloud: {
          radius: b.burst.cloud.radius, ticks: secToTicks(b.burst.cloud.seconds, tr), pulseTicks: secToTicks(1, tr),
          damage: Math.max(1, Math.round(b.burst.cloud.damagePerSecond)),
        },
      },
    } : {}),
  };
}

/** Both sides' compiled kits, together, since a modifier may reach the opponent. */
export function compileRoundSides(lib: Library, config: BattleConfig): Record<Side, CompiledSide> {
  const fx = collectRoundEffects(config.modifiers);
  const out = {} as Record<Side, CompiledSide>;
  for (const s of SIDES) out[s] = compileRoundSide(lib, s, config[s].kit, fx[s]);
  return out;
}

function compileRoundSide(lib: Library, side: Side, kit: readonly KitCard[], fx: RoundEffects): CompiledSide {
  const bal = lib.balance, r = bal.rounds;
  const m = (stat: string, base: number) => resolveStat(base, fx.mods, stat);
  const buildings: Record<string, CompiledBuilding> = {};
  const units: Record<string, CompiledUnit> = {};
  for (const { building: id } of kit) {
    const cb = compileRoundBuilding(lib, id);
    buildings[id] = cb;
    if (cb.kind === 'tower') units[id] = compileEmplacement(lib, id, fx.mods);
    else if (cb.squad && !(cb.squad.unit in units)) units[cb.squad.unit] = compileRoundUnit(lib, cb.squad.unit, fx.mods);
  }
  return {
    units,
    buildings,
    stipend: Math.round(m('side.stipend', r.stipendPerRound)),
    interestCap: Math.round(m('side.interestCap', r.interestCap)),
    incomeBp: side === 'enemy' ? Math.round(r.enemyIncomeMult * 10000) : 10000,
    comebackEnabled: m('side.comebackEnabled', 1) > 0,
    sellRefundPlantedPct: Math.round(r.sellRefundPlanted * 100),
    sellRefundPct: Math.round(m('side.sellRefund', bal.sellRefund) * 100),
    loamBonusPct: Math.round(m('side.loamBonus', bal.loamBonus) * 100),
    mergeRadius: m('side.mergeRadius', bal.mergeRadius),
    knitTicks: secToTicks(m('side.knitTicks', bal.mergeKnitSeconds), bal.tickRate),
    triggers: fx.triggers,
    ignored: fx.ignored,
  };
}

/** A building as a battle in rounds fields it (§4.4): a spawner's squad, a tower's one emplacement, or its gold a round. */
function compileRoundBuilding(lib: Library, id: string): CompiledBuilding {
  const b = lib.buildings[id];
  if (!b) throw new Error(`unknown building ${id}`);
  const out: CompiledBuilding = { id, kind: b.kind, cost: b.cost };
  if (b.kind === 'spawner') {
    if (!b.squad) throw new Error(`spawner ${id} has no squad, so it fields nothing in rounds`);
    out.squad = { unit: b.squad.unit, count: b.squad.count };
  } else if (b.kind === 'tower') out.squad = { unit: id, count: 1 };
  if (b.economy) {
    if (b.economy.goldPerRound === undefined) throw new Error(`economy building ${id} has no goldPerRound`);
    out.economy = { goldPerRound: b.economy.goldPerRound, ...(b.economy.interestCapAdd ? { interestCapAdd: b.economy.interestCapAdd } : {}) };
  }
  return out;
}

/**
 * A unit at its three merge tiers (§5.5, §5.6). Its modifiers resolve against the tier-1 base stats, then
 * tier scaling and merge perks apply on top, as v1's `compileUnit` has it (a perk replaces the splash
 * radius, and modifiers adjust the result). A modifier that depends on a plot doesn't reach it here.
 */
export function compileRoundUnit(lib: Library, id: string, mods: readonly ModifierDef[] = []): CompiledUnit {
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

function compileTier(lib: Library, u: LibraryUnit, tier: Tier, mods: readonly ModifierDef[]): CompiledTier {
  const b = lib.balance;
  const tr = b.tickRate;
  const p = perkAt(u as UnitDef, tier); // it reads only the merge perks, and the library's unit has no name
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

/**
 * A tower as its emplacement (§4.4, §6.7, #10): one unit under the tower's id, with the tower's attack and
 * `hp` and Structure armor, which never moves or merges and counts no supply. A tower whose shells leave
 * spore clouds reaches the clouds' range (§5.3). Its body is the largest a unit's may be.
 */
function compileEmplacement(lib: Library, id: string, mods: readonly ModifierDef[]): CompiledUnit {
  const b = lib.buildings[id]!;
  const a = b.attack;
  if (!a) throw new Error(`tower ${id} has no attack`);
  const bal = lib.balance;
  const m = (stat: string, base: number) => resolveStat(base, mods, stat, buildingMatcher(lib, id));
  const clouds = !!bal.sporeCloud?.buildings.includes(id);
  const range = m('tower.range', clouds && bal.sporeCloud!.range !== undefined ? bal.sporeCloud!.range : a.range);
  const tier = (): CompiledTier => ({
    hp: b.hp, damage: m('tower.damage', a.damage), attackTicks: Math.max(1, secToTicks(a.interval, bal.tickRate)), range,
    speedPerTick: 0, radius: MAX_RADIUS, splashRadius: m('tower.splashRadius', a.splashRadius ?? 0), slayerMult: 1,
    resist: { slash: 1, pierce: 1, crush: 1 }, supply: 0, siegeMult: 1, healAmount: 0, healTicks: 0, healTargets: 0, regenPct: 0,
  });
  return {
    id, armor: 'structure', damageType: a.damageType, projectileSpeed: a.projectileSpeed, aggroRange: range,
    siege: false, slayer: false, support: false, tags: [], tiers: [tier(), tier(), tier()],
    emplacement: { minRange: a.minRange ?? 0, clouds },
  };
}
