// The modifier DSL in rounds (SPEC §14.2, §14.6), on sides compiled by `compileRoundSides`: the schema's
// new triggers and `rank` selector, `gainGold` paying its own side, triggers' conditions, content rounds
// don't run listed by its source (plan Call 19), and `rank` and `onLoam` selecting squads by their plot.
// That each trigger fires once at its §14.6 step is tested with the step: `roundStart` in T054,
// `clashStart` in T042 and `roundWon` in T047.
import { describe, expect, it } from 'vitest';
import { ModifierSchema, TriggerSchema } from '../../../src/data/schema.ts';
import type { ModifierDef, SelectorDef, TriggerDef } from '../../../src/data/schema.ts';
import { buildRoundLibrary, compileRoundSides } from '../../../src/sim/rounds/compile.ts';
import { buildingMatcher, fireTriggers, resolveStat, unitMatcher } from '../../../src/sim/rounds/effects.ts';
import type { Place, TriggerContext, TriggerScope } from '../../../src/sim/rounds/effects.ts';
import type { BattleConfig, BattleModifier, CompiledSide, Side, SideConfig } from '../../../src/sim/rounds/state.ts';
import { content } from '../../helpers.ts';

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
      effects: { triggers: [{ on: 'waveStart', do: [{ gainGold: 1 }] }, { on: 'merge', do: [{ gainGold: 2 }, { repairHeartcapPct: 0.1 }] }, { on: 'unitDeath', do: [{ readyPower: true }] }] },
    }]);
    expect(compiled.player.triggers).toEqual([{ on: 'merge', do: [{ gainGold: 2 }] }]);
    expect(compiled.player.ignored).toEqual([
      { source: 'relic:test', trigger: 'waveStart' }, { source: 'relic:test', action: 'repairHeartcapPct' }, { source: 'relic:test', action: 'readyPower' },
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
