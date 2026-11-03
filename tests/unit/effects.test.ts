// The modifier DSL (SPEC §14.1, §14.2, §14.6), on sides compiled by `compileRoundSides`: the order modifiers
// resolve in and the selectors, the schema's new triggers and `rank` selector, `gainGold` paying its own side, triggers' conditions, content rounds
// don't run listed by its source (plan Call 19), and `rank` and `onLoam` selecting squads by their plot.
// That each trigger fires once at its §14.6 step is tested with the step: `roundStart` in T054,
// `clashStart` in T042 and `roundWon` in T047.
import { describe, expect, it } from 'vitest';
import { ModifierSchema, TriggerSchema } from '../../src/data/schema.ts';
import type { EffectBundle, ModifierDef, SelectorDef, TriggerDef } from '../../src/data/schema.ts';
import { buildRoundLibrary, compileRoundSides } from '../../src/sim/compile.ts';
import { buildingMatcher, fireTriggers, resolveStat, unitMatcher } from '../../src/sim/effects.ts';
import type { Place, TriggerContext, TriggerScope } from '../../src/sim/effects.ts';
import { createBattle, makeRoundConfig } from '../../src/sim/index.ts';
import type { BattleConfig, BattleModifier, CompiledSide, Side, SideConfig } from '../../src/sim/state.ts';
import { content } from '../helpers.ts';

/** A single battle on Bogwater Hollow: each faction's roster as its kit, with the given battle modifiers. */
function config(modifiers: BattleModifier[] = []): BattleConfig {
  const side = (faction: string, controller: SideConfig['controller']): SideConfig => ({
    faction, controller, kit: content.factions[faction]!.buildings.map((building) => ({ building })), relics: [],
    plots: 8, heartcapMaxHp: 3000, startingGold: 300,
  });
  return {
    seed: 1, battleIndex: 1, mapId: 'bogwater-hollow',
    player: side('velvet-bloom', { kind: 'human' }), enemy: side('gray-rot', { kind: 'general', id: 'mother-mold' }),
    flags: { merging: true, drafts: false, adaptiveGeneral: true, powers: true }, modifiers,
  };
}
const triggers = (side: Side, ...list: TriggerDef[]): BattleModifier => ({ side, source: 'test', effects: { triggers: list } });
const compile = (modifiers: BattleModifier[]): Record<Side, CompiledSide> => {
  const c = config(modifiers);
  return compileRoundSides(buildRoundLibrary(content, c), c);
};
/** Both sides with 100 gold, compiled with `modifiers`: just what firing a trigger reads and writes. */
function scope(modifiers: BattleModifier[], sporestorm = 0): TriggerScope {
  return {
    sporestorm, compiled: compile(modifiers),
    sides: { player: { gold: 100 }, enemy: { gold: 100 } },
    stats: { player: { goldEarned: { effects: 0 } }, enemy: { goldEarned: { effects: 0 } } },
    events: [],
  };
}
const AT: TriggerContext = { x: 10, y: 3, lane: 0, sourceBuildingId: 0 };
const golds = (s: TriggerScope) => [s.sides.player.gold, s.sides.enemy.gold];

const mod = (stat: ModifierDef['stat'], op: ModifierDef['op'], value: number, extra: Partial<ModifierDef> = {}): ModifierDef => ({ stat, op, value, ...extra });
const on = (side: Side | 'both', effects: EffectBundle): BattleModifier => ({ side, source: 'test', effects });

describe('the modifier DSL: compile order and selectors (SPEC §14.1)', () => {
  it('sums every add, multiplies every mul, then the last set wins', () => {
    const mods = [mod('unit.hp', 'mul', 2), mod('unit.hp', 'add', 10), mod('unit.hp', 'add', 5), mod('unit.hp', 'mul', 1.5)];
    expect(resolveStat(100, mods, 'unit.hp')).toBe((100 + 15) * 3);
    expect(resolveStat(100, [...mods, mod('unit.hp', 'set', 7), mod('unit.hp', 'set', 9)], 'unit.hp')).toBe(9);
    expect(resolveStat(100, mods, 'unit.damage')).toBe(100);
  });

  it('returns the base untouched (bit-identical) when nothing matches', () => {
    const base = 0.1 + 0.2;
    expect(Object.is(resolveStat(base, [], 'unit.hp'), base)).toBe(true);
  });

  it('unit modifiers resolve before tier scaling, and tier selectors pick tiers', () => {
    const c = compile([on('player', { modifiers: [
      mod('unit.hp', 'mul', 1.5, { where: { unit: 'sporeling' } }),
      mod('unit.damage', 'mul', 2, { where: { unit: 'capguard', tier: 3 } }),
    ] })]);
    const base = compile([]);
    const mult = content.balance.tierStatMult;
    expect(c.player.units.sporeling!.tiers[0].hp).toBe(Math.round(base.player.units.sporeling!.tiers[0].hp * 1.5));
    expect(c.player.units.sporeling!.tiers[1].hp).toBe(Math.round(content.units.sporeling!.hp * 1.5 * mult));
    const cg = c.player.units.capguard!;
    expect(cg.tiers[1].damage).toBeCloseTo(content.units.capguard!.damage * mult, 9);
    expect(cg.tiers[2].damage).toBeCloseTo(content.units.capguard!.damage * mult * mult * 2, 9);
  });

  it('a building selector on a unit stat means the units its squad fields; tags match too', () => {
    const c = compile([on('player', { modifiers: [mod('unit.speed', 'mul', 2, { where: { building: 'gillNest' } }), mod('unit.hp', 'mul', 2, { where: { tag: 'swarm' } })] })]);
    const base = compile([]).player.units;
    expect(c.player.units.gillArcher!.tiers[0].speedPerTick).toBeCloseTo(2 * base.gillArcher!.tiers[0].speedPerTick, 12);
    expect(c.player.units.capguard!.tiers[0].speedPerTick).toBe(base.capguard!.tiers[0].speedPerTick);
    expect(c.player.units.sporeling!.tiers[0].hp).toBe(2 * base.sporeling!.tiers[0].hp);
    expect(c.player.units.capguard!.tiers[0].hp).toBe(base.capguard!.tiers[0].hp);
  });

  it('`side: opponent` modifiers land on the other side, and side stats compile into the side', () => {
    const c = compile([on('player', { modifiers: [mod('unit.hp', 'mul', 0.5, { side: 'opponent' }), mod('side.mergeRadius', 'add', 0.5), mod('side.knitTicks', 'mul', 0.5)] })]);
    const base = compile([]);
    expect(c.enemy.units.capguard!.tiers[0].hp).toBe(Math.round(base.enemy.units.capguard!.tiers[0].hp / 2));
    expect(c.player.units.capguard!.tiers[0].hp).toBe(base.player.units.capguard!.tiers[0].hp);
    expect(c.player.mergeRadius).toBe(base.player.mergeRadius + 0.5);
    expect(c.player.knitTicks).toBe(base.player.knitTicks / 2);
  });

  it('starting gold and Heartcap max HP apply once at creation, and battle.sporestormStart moves the storm for both sides', () => {
    const battle = (modifiers: BattleModifier[]) => {
      const cfg = makeRoundConfig(content, { seed: 1, enemy: 'human' });
      cfg.modifiers = modifiers;
      return createBattle(content, cfg);
    };
    const base = battle([]);
    const s = battle([on('enemy', { modifiers: [mod('side.heartcapMaxHp', 'mul', 1.3), mod('side.startingGold', 'add', 150)] }), on('both', { modifiers: [mod('battle.sporestormStart', 'add', 1)] })]);
    expect(s.sides.enemy.heartcapMaxHp).toBe(Math.round(base.sides.enemy.heartcapMaxHp * 1.3));
    expect(s.sides.enemy.heartcapHp).toBe(s.sides.enemy.heartcapMaxHp);
    expect(s.sides.enemy.gold).toBe(base.sides.enemy.gold + 150);
    expect(s.rules.storm.startRound).toBe(base.rules.storm.startRound + 1);
  });
});

describe('the schema in rounds (SPEC §14.2)', () => {
  it('accepts roundStart, clashStart and roundWon triggers, with a rank in their condition', () => {
    for (const on of ['roundStart', 'clashStart', 'roundWon']) {
      expect(TriggerSchema.safeParse({ on, do: [{ gainGold: 5 }] }).success, on).toBe(true);
      expect(TriggerSchema.safeParse({ on, if: { rank: 0 }, do: [{ gainGold: 5 }] }).success, on).toBe(true);
    }
    expect(TriggerSchema.safeParse({ on: 'roundLost', do: [{ gainGold: 5 }] }).success).toBe(false);
  });

  it('accepts a rank of 0 to 2, positional as onLoam is: where POSITIONAL_STATS allows, and with onLoam on unit stats (T046)', () => {
    const ok = (stat: string, where: object) => ModifierSchema.safeParse({ stat, op: 'mul', value: 1.2, where }).success;
    for (const rank of [0, 1, 2]) expect(ok('building.goldPerTick', { rank }), `rank ${rank}`).toBe(true);
    expect(ok('building.spawnInterval', { rank: 0, tag: 'swarm' })).toBe(true);
    expect(ok('building.goldPerTick', { rank: 3 })).toBe(false);
    expect(ok('building.goldPerTick', { rank: -1 })).toBe(false);
    for (const where of [{ rank: 0 }, { onLoam: true }, { rank: 1, tag: 'swarm', tier: 2 }]) expect(ok('unit.hp', where), JSON.stringify(where)).toBe(true);
    // a unit stat still takes no zone or adjacency, and tower and other building stats no plot
    for (const where of [{ zone: 'home' }, { adjacentOwnBuildingsGte: 2 }]) expect(ok('unit.damage', where), JSON.stringify(where)).toBe(false);
    for (const stat of ['tower.damage', 'building.spawnCount']) expect(ok(stat, { rank: 0 }), stat).toBe(false);
  });

  it('still refuses any "where" on a side.* or battle.* stat', () => {
    const ok = (stat: string, where: object) => ModifierSchema.safeParse({ stat, op: 'add', value: 1, where }).success;
    expect(ok('side.stipend', { rank: 0 })).toBe(false);
    expect(ok('side.mergeRadius', { tag: 'swarm' })).toBe(false);
    expect(ok('battle.sporestormStart', { rank: 1 })).toBe(false);
    expect(ok('battle.sporestormStart', { unit: 'sporeling' })).toBe(false);
  });
});

describe('triggers in rounds (SPEC §14.2, §14.6)', () => {
  it('a gainGold action pays its own side once per firing, and only for its own kind', () => {
    const s = scope([triggers('player', { on: 'roundWon', do: [{ gainGold: 7 }] }), triggers('enemy', { on: 'roundStart', do: [{ gainGold: 3 }] })]);
    fireTriggers(s, 'player', 'roundWon', AT);
    expect(golds(s)).toEqual([107, 100]);
    expect(s.stats.player.goldEarned.effects).toBe(7);
    expect(s.events).toEqual([{ t: 'effectGold', side: 'player', amount: 7 }]);
    fireTriggers(s, 'player', 'roundWon', AT);
    expect(golds(s)).toEqual([114, 100]);
    fireTriggers(s, 'player', 'roundStart', AT);
    fireTriggers(s, 'enemy', 'roundWon', AT);
    expect(golds(s)).toEqual([114, 100]);
    fireTriggers(s, 'enemy', 'roundStart', AT);
    expect(golds(s)).toEqual([114, 103]);
    expect(s.stats.enemy.goldEarned.effects).toBe(3);
  });

  it('each of its actions runs, and every trigger of the kind fires', () => {
    const s = scope([triggers('player', { on: 'clashStart', do: [{ gainGold: 2 }, { gainGold: 5 }] }, { on: 'clashStart', do: [{ gainGold: 1 }] })]);
    fireTriggers(s, 'player', 'clashStart', AT);
    expect(golds(s)).toEqual([108, 100]);
    expect(s.events).toHaveLength(3);
  });

  it("a trigger's condition reads its cause: the unit, its tag and tier, its squad's plot, and the storm's step", () => {
    const s = scope([triggers('player',
      { on: 'unitDeath', if: { tag: 'swarm', tier: 1 }, do: [{ gainGold: 1 }] },
      { on: 'merge', if: { unit: 'capguard', rank: 0 }, do: [{ gainGold: 10 }] },
      { on: 'unitDeath', if: { sporestormGte: 2 }, do: [{ gainGold: 100 }] },
    )]);
    const sporeling = { ...AT, unitId: 'sporeling', tier: 1, tags: content.units.sporeling!.tags };
    fireTriggers(s, 'player', 'unitDeath', sporeling);
    fireTriggers(s, 'player', 'unitDeath', { ...sporeling, tier: 2 });
    fireTriggers(s, 'player', 'unitDeath', { ...AT, unitId: 'capguard', tier: 1, tags: content.units.capguard!.tags });
    expect(golds(s)).toEqual([101, 100]);
    const capguard = { ...AT, unitId: 'capguard', tier: 2, tags: content.units.capguard!.tags };
    fireTriggers(s, 'player', 'merge', { ...capguard, place: { rank: 1, terrain: 'soil' } });
    fireTriggers(s, 'player', 'merge', capguard);
    expect(golds(s)).toEqual([101, 100]);
    fireTriggers(s, 'player', 'merge', { ...capguard, place: { rank: 0, terrain: 'soil' } });
    expect(golds(s)).toEqual([111, 100]);
    s.sporestorm = 2;
    fireTriggers(s, 'player', 'unitDeath', AT);
    expect(golds(s)).toEqual([211, 100]);
  });

  it("a trigger rounds don't fire, or an action they don't run, compiles to nothing and is listed (plan Call 19)", () => {
    const compiled = compile([{
      side: 'player', source: 'relic:test',
      effects: { triggers: [{ on: 'waveStart', do: [{ gainGold: 1 }] }, { on: 'merge', do: [{ gainGold: 2 }, { repairHeartcapPct: 0.1 }] }, { on: 'unitDeath', do: [{ explode: { damage: 10, damageType: 'crush', radius: 1 } }] }] },
    }]);
    expect(compiled.player.triggers).toEqual([{ on: 'merge', do: [{ gainGold: 2 }] }]);
    expect(compiled.player.ignored).toEqual([
      { source: 'relic:test', trigger: 'waveStart' }, { source: 'relic:test', action: 'repairHeartcapPct' }, { source: 'relic:test', action: 'explode' },
    ]);
    expect(compiled.enemy.triggers).toEqual([]);
  });
});

describe('rank and onLoam select squads by their plot (SPEC §4.6, §14.2)', () => {
  const lib = buildRoundLibrary(content, config());
  const capguard = lib.units.capguard!;
  const front: Place = { rank: 0, terrain: 'soil' }, backLoam: Place = { rank: 1, terrain: 'loam' };
  const mods: ModifierDef[] = [
    { stat: 'unit.hp', op: 'mul', value: 1.5, where: { rank: 0 } },
    { stat: 'unit.damage', op: 'mul', value: 2, where: { onLoam: true } },
    { stat: 'unit.speed', op: 'mul', value: 3, where: { rank: 1, tag: 'swarm' } },
  ];
  const stat = (key: string, base: number, place?: Place, unit = capguard) => resolveStat(base, mods, key, unitMatcher(lib, unit, 1, place));

  it("a unit's stat takes the modifiers its squad's plot meets", () => {
    expect([stat('unit.hp', capguard.hp, front), stat('unit.hp', capguard.hp, backLoam)]).toEqual([capguard.hp * 1.5, capguard.hp]);
    expect([stat('unit.damage', capguard.damage, backLoam), stat('unit.damage', capguard.damage, front)]).toEqual([capguard.damage * 2, capguard.damage]);
    // the kept selectors still hold beside a plot's: a back-rank swarm only
    const sporeling = lib.units.sporeling!;
    expect(stat('unit.speed', sporeling.speed, backLoam, sporeling)).toBe(sporeling.speed * 3);
    expect(stat('unit.speed', capguard.speed, backLoam)).toBe(capguard.speed);
    expect(stat('unit.speed', sporeling.speed, front, sporeling)).toBe(sporeling.speed);
  });

  it('without a plot, a modifier that needs one reaches nothing: a side compiles without it, for each squad to take at its plot (T046)', () => {
    expect([stat('unit.hp', capguard.hp), stat('unit.damage', capguard.damage)]).toEqual([capguard.hp, capguard.damage]);
    const plain = config(), placed = config([{ side: 'player', source: 'test', effects: { modifiers: mods } }]);
    const units = (c: BattleConfig) => compileRoundSides(buildRoundLibrary(content, c), c).player.units;
    expect(units(placed)).toEqual(units(plain));
  });

  it("a building's selector reads its plot too, and v1's zone and adjacency, retired with territory, never match", () => {
    const loam: SelectorDef = { onLoam: true };
    expect([buildingMatcher(lib, 'truffleCellar', backLoam)(loam), buildingMatcher(lib, 'truffleCellar', front)(loam), buildingMatcher(lib, 'truffleCellar')(loam)])
      .toEqual([true, false, false]);
    expect(buildingMatcher(lib, 'sporelingBurrow', front)({ rank: 0, tag: 'swarm' })).toBe(true);
    expect(buildingMatcher(lib, 'capguardHall', front)({ rank: 0, tag: 'swarm' })).toBe(false);
    for (const w of [{ zone: 'home' }, { adjacentOwnBuildingsGte: 1 }] as SelectorDef[]) {
      expect(unitMatcher(lib, capguard, 1, front)(w)).toBe(false);
      expect(buildingMatcher(lib, 'capguardHall', front)(w)).toBe(false);
    }
  });
});
