// Compiles a battle in rounds' data into what its state holds (SPEC §11.1, §11.2, §14.2, §14.4): the library,
// with ids and numbers only (R2-Q8); the rules, from the balance's round keys and the kept combat; and each
// side's compiled kit. A spawner fields its `squad`, a tower fields itself as one emplacement unit, an economy
// building pays its gold a round, and every squad's unit is resolved at all three merge tiers as v1 resolves
// it (§5.5, §5.6). A modifier on a stat a battle doesn't read (R3's corner combos, the run's) is listed.
import type { Content } from '../data/registry.ts';
import type { ModifierDef, UnitDef } from '../data/schema.ts';
import { battleModifiers, buildingMatcher, collectRoundEffects, onPlot, placeMatches, resolveStat, roundModifiers, unitMatcher } from './effects.ts';
import type { Place, RoundEffects } from './effects.ts';
import { SIDES } from './state.ts';
import { MAX_RADIUS } from './targets.ts';
import type {
  BattleConfig, CompiledBuilding, CompiledSide, CompiledTier, CompiledUnit, DamageType, KitCard, Library, LibraryUnit, Rules, Side, SquadStats, Tier,
} from './state.ts';
import type { RoundLoadout } from './effects.ts';

export const secToTicks = (s: number, tickRate = 20): number => Math.round(s * tickRate);

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

/** True if the side drafts in this battle (§8.3): drafts are on and it has a pool. The general never drafts. */
export function drafting(config: BattleConfig, side: Side): boolean {
  return config.flags.drafts && !!config[side].draft && config[side].controller.kind !== 'general';
}

/**
 * The library a battle in rounds needs: both kits' buildings, the units their squads field, the powers in
 * play and the balance constants, without any name, description or text (R2-Q8), so the UI reads those
 * from content by id. A run's battle also carries the relics and upgrade tracks its sides hold (R2b), whose
 * effects compile with the battle's modifiers (`roundModifiers`). A side that drafts (§8.3) adds its pool:
 * every building and relic it may be offered, and the tracks of its kit and its pool's buildings.
 */
export function buildRoundLibrary(content: Content, config: BattleConfig): Library {
  const lib: Library = { balance: content.balance, buildings: {}, units: {} };
  const pools = SIDES.filter((s) => drafting(config, s)).map((s) => config[s].draft!);
  const kits = SIDES.flatMap((s) => config[s].kit.map((c) => c.building));
  const buildings = [...kits, ...pools.flatMap((p) => [...p.core, ...p.shared])];
  for (const id of [...new Set([...SIDES.flatMap((s) => config[s].relics), ...pools.flatMap((p) => p.relics)])].sort()) {
    const r = content.relics[id];
    if (!r) throw new Error(`unknown relic ${id}`);
    (lib.relics ??= {})[id] = { effects: r.effects, rarity: r.rarity };
  }
  const drafted = pools.length ? buildings.filter((id) => content.upgrades[id]) : [];
  for (const id of [...new Set([...SIDES.flatMap((s) => Object.keys(config[s].upgrades ?? {})), ...drafted])].sort()) {
    const t = content.upgrades[id];
    if (!t) throw new Error(`unknown upgrade track ${id}`);
    (lib.upgrades ??= {})[id] = {
      rarity: [...t.rarity], levels: t.levels.map((l) => ({ effects: l.effects, ...(l.offered === false ? { offered: false as const } : {}) })),
    };
  }
  for (const id of [...new Set(buildings)].sort()) {
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

/** The rules of a battle in rounds, from the balance's round keys and the kept combat, in ticks and integers. */
export function compileRoundRules(lib: Library, config: BattleConfig): Rules {
  const b = lib.balance, tr = b.tickRate;
  // `battle.sporestormStart` is a round number in rounds (§6.4)
  const startRound = Math.max(1, Math.round(resolveStat(b.sporestorm.startRound, battleModifiers(roundModifiers(lib, config)), 'battle.sporestormStart')));
  return {
    tickRate: tr,
    maxRounds: b.maxRounds,
    clashCapTicks: secToTicks(b.clashCapSeconds, tr),
    musterTicks: secToTicks(b.musterSeconds, tr),
    formationGapTiles: b.formationGapTiles,
    heartcapDamagePerSupply: b.heartcapDamagePerSupply,
    siegeHeartcapMult: b.siegeHeartcapMult,
    arrivalShield: { ...b.arrivalShield },
    roundDamageCap: { ...b.roundDamageCap },
    decisionBy: b.decision.by,
    interestPer: b.interestPer,
    comebackGold: b.comebackGold,
    storm: { startRound, stepBp: b.sporestorm.stepBp, maxBp: b.sporestorm.maxBp },
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

/**
 * Both sides' compiled kits, together, since a modifier may reach the opponent: from the config's loadouts, or
 * from `sides`' once a draft pick has changed one (§8.3).
 */
export function compileRoundSides(lib: Library, config: BattleConfig, sides: Record<Side, RoundLoadout> = config): Record<Side, CompiledSide> {
  const fx = collectRoundEffects(roundModifiers(lib, config, sides));
  const out = {} as Record<Side, CompiledSide>;
  for (const s of SIDES) out[s] = compileRoundSide(lib, s, sides[s].kit, fx[s], drafting(config, s));
  return out;
}

function compileRoundSide(lib: Library, side: Side, kit: readonly KitCard[], fx: RoundEffects, drafts: boolean): CompiledSide {
  const bal = lib.balance;
  const m = (stat: string, base: number) => resolveStat(base, fx.mods, stat);
  const buildings: Record<string, CompiledBuilding> = {};
  const units: Record<string, CompiledUnit> = {};
  for (const { building: id } of kit) {
    const cb = compileRoundBuilding(lib, id, fx.mods);
    buildings[id] = cb;
    if (cb.kind === 'tower') units[id] = compileEmplacement(lib, id, fx.mods);
    else if (cb.squad && !(cb.squad.unit in units)) units[cb.squad.unit] = compileRoundUnit(lib, cb.squad.unit, fx.mods);
  }
  return {
    units,
    buildings,
    stipend: Math.round(m('side.stipend', bal.stipendPerRound)),
    interestCap: Math.round(m('side.interestCap', bal.interestCap)),
    // the general's income starts at `enemyIncomeMult` (§7.1)
    incomeBp: Math.round(m('side.incomeMult', side === 'enemy' ? bal.enemyIncomeMult : 1) * 10000),
    comebackEnabled: m('side.comebackEnabled', 1) > 0,
    sellRefundPlantedPct: Math.round(bal.sellRefundPlanted * 100),
    sellRefundPct: Math.round(m('side.sellRefund', bal.sellRefund) * 100),
    loamBonusPct: Math.round(m('side.loamBonus', bal.loamBonus) * 100),
    mergeRadius: m('side.mergeRadius', bal.mergeRadius),
    knitTicks: secToTicks(m('side.knitTicks', bal.mergeKnitSeconds), bal.tickRate),
    heartcapTakenBp: fx.mods.filter((x) => x.stat === 'side.heartcapDamageTaken').map((x) => Math.round(x.value * 10000)),
    squadMods: fx.mods.filter((x) => x.stat === 'building.squadCount'),
    powerMods: fx.mods.filter((x) => x.stat === 'side.powerEffectMult'),
    triggers: fx.triggers,
    ignored: fx.ignored,
    ...(drafts ? {
      draft: {
        cards: Math.max(1, Math.round(m('side.draftCards', bal.draft.cards))), rerollBase: Math.max(0, Math.round(m('side.rerollCost', bal.reroll.base))),
        rerollStep: bal.reroll.step, skipGold: bal.skipGold,
      },
    } : {}),
  };
}

/**
 * A building as a battle in rounds fields it (§4.4): a spawner's squad, a tower's one emplacement, or its gold
 * a round with the side's `building.goldPerRound` modifiers, from an upgrade level (§11.6) or Fruiting Season
 * (§11.7). A squad's count takes its side's modifiers at its plot as it fields (`squadMods`).
 */
function compileRoundBuilding(lib: Library, id: string, mods: readonly ModifierDef[]): CompiledBuilding {
  const b = lib.buildings[id];
  if (!b) throw new Error(`unknown building ${id}`);
  const out: CompiledBuilding = { id, kind: b.kind, cost: b.cost };
  if (b.kind === 'spawner') {
    if (!b.squad) throw new Error(`spawner ${id} has no squad, so it fields nothing in rounds`);
    out.squad = { unit: b.squad.unit, count: b.squad.count };
  } else if (b.kind === 'tower') out.squad = { unit: id, count: 1 };
  if (b.economy) {
    const goldPerRound = Math.max(0, Math.round(resolveStat(b.economy.goldPerRound, mods, 'building.goldPerRound', buildingMatcher(lib, id))));
    out.economy = { goldPerRound, ...(b.economy.interestCapAdd ? { interestCapAdd: b.economy.interestCapAdd } : {}) };
  }
  return out;
}

/**
 * A unit at its three merge tiers (§5.5, §5.6). Its modifiers resolve against the tier-1 base stats, then
 * tier scaling and merge perks apply on top, as v1's `compileUnit` has it (a perk replaces the splash
 * radius, and modifiers adjust the result). A modifier that depends on a plot reaches it only on a squad's
 * plot, `place` (`squadStats`).
 */
export function compileRoundUnit(lib: Library, id: string, mods: readonly ModifierDef[] = [], place?: Place): CompiledUnit {
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
    tiers: [compileTier(lib, u, 1, mods, place), compileTier(lib, u, 2, mods, place), compileTier(lib, u, 3, mods, place)],
  };
}

/**
 * A squad's own unit stats (§5.6, §14.2, T046, A028), compiled at Begin: the side's unit modifiers whose
 * `rank` or `onLoam` holds at the squad's plot are its patches, and its tiers resolve the side's other
 * modifiers with the patches after them. Undefined when no patch reaches it, so its units read the side's
 * unit. R3 adds augment and combo patches to the same list rather than build a second path (A131).
 */
export function squadStats(lib: Library, unitId: string, mods: readonly ModifierDef[], place: Place): SquadStats | undefined {
  const patches = mods.filter((m) => m.stat.startsWith('unit.') && onPlot(m.where) && placeMatches(m.where!, place));
  if (!patches.length) return undefined;
  const sideWide = mods.filter((m) => !onPlot(m.where));
  return { patches, tiers: compileRoundUnit(lib, unitId, [...sideWide, ...patches], place).tiers };
}

function compileTier(lib: Library, u: LibraryUnit, tier: Tier, mods: readonly ModifierDef[], place?: Place): CompiledTier {
  const b = lib.balance;
  const tr = b.tickRate;
  const p = perkAt(u as UnitDef, tier); // it reads only the merge perks, and the library's unit has no name
  const match = unitMatcher(lib, u, tier, place);
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
    openingSpeedMult: m('unit.openingSpeed', 1),
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
 * A tower as its emplacement (§4.4, §6.7, #10): one unit under the tower's id, with the tower's attack, its
 * `attack.hp` and Structure armor, which never moves or merges and counts no supply. A tower whose shells leave
 * spore clouds reaches the clouds' range and aims them (§5.3). Its body is the largest a unit's may be, and
 * its range runs from its centre, as a tower's did (`systems/targeting.ts`, `systems/combat.ts`). Each round's
 * arrival fields it fresh, at the tower's full `hp`.
 */
function compileEmplacement(lib: Library, id: string, mods: readonly ModifierDef[]): CompiledUnit {
  const b = lib.buildings[id]!;
  const a = b.attack, hp = a?.hp;
  if (!a || hp === undefined) throw new Error(`tower ${id} has no attack or no attack.hp`);
  const bal = lib.balance;
  const m = (stat: string, base: number) => resolveStat(base, mods, stat, buildingMatcher(lib, id));
  const clouds = !!bal.sporeCloud?.buildings.includes(id);
  const range = m('tower.range', clouds && bal.sporeCloud!.range !== undefined ? bal.sporeCloud!.range : a.range);
  const tier = (): CompiledTier => ({
    hp, damage: m('tower.damage', a.damage), attackTicks: Math.max(1, secToTicks(a.interval, bal.tickRate)), range,
    speedPerTick: 0, openingSpeedMult: 1, radius: MAX_RADIUS, splashRadius: m('tower.splashRadius', a.splashRadius ?? 0), slayerMult: 1,
    resist: { slash: 1, pierce: 1, crush: 1 }, supply: 0, siegeMult: 1, healAmount: 0, healTicks: 0, healTargets: 0, regenPct: 0,
  });
  return {
    id, armor: 'structure', damageType: a.damageType, projectileSpeed: a.projectileSpeed, aggroRange: range,
    siege: false, slayer: false, support: false, tags: [], tiers: [tier(), tier(), tier()],
    emplacement: { minRange: a.minRange ?? 0, clouds },
  };
}
