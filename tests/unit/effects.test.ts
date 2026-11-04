// The modifier DSL (SPEC §14.1, §14.2, §14.6), on sides compiled by `compileRoundSides`: the order modifiers
// resolve in and the selectors, the schema's triggers, selectors and conditions, the actions rounds run, triggers'
// conditions, content rounds don't run listed by its source (plan Call 19), and `rank`, `onLoam` and
// `plantedThisRound` selecting squads by their plot. R2b's v2 cases (T070): the stats, selectors, triggers and
// actions §11.7's relics need, one path for clash gold (R2-Q20), the `requires` gates, and a case for each relic
// with a new effect. That each trigger fires once at its §14.6 step is tested with the step: `roundStart` in
// T054, `clashStart` in T042 and `roundWon` in T047.
import { describe, expect, it } from 'vitest';
import { EffectActionSchema, ModifierSchema, TriggerSchema } from '../../src/data/schema.ts';
import type { EffectBundle, ModifierDef, SelectorDef, TriggerDef } from '../../src/data/schema.ts';
import { generalKit, runPool } from '../../src/run/flow.ts';
import { createRun } from '../../src/run/runState.ts';
import { buildRoundLibrary, compileRoundSides } from '../../src/sim/compile.ts';
import { buildingMatcher, fireTriggers, powerEffectMult, resolveStat, unitMatcher } from '../../src/sim/effects.ts';
import type { Place, TriggerContext } from '../../src/sim/effects.ts';
import { formationBox } from '../../src/sim/formation.ts';
import {
  addBuilding, createBattle, DEFAULT_FLAGS, draftPool, emptyStats, formationOf, incomePreview, makeRoundConfig, openOrder, SIDES, step,
} from '../../src/sim/index.ts';
import type { BattleConfig, BattleModifier, BattleState, CompiledSide, Side, SideConfig } from '../../src/sim/index.ts';
import { endClash, scoreRound } from '../../src/sim/round.ts';
import { other } from '../../src/sim/state.ts';
import { deathSystem } from '../../src/sim/systems/combat.ts';
import { begin, command, content, finishRound, plant, plotAt } from '../helpers.ts';

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

type Colony = { building: string; lane: number; rank: number; file: number; merge?: boolean }[];
/** A building on a plot, its merge toggle off unless set, so a test's squads stay apart. */
const at = (building: string, lane: number, rank: number, file: number, merge = false): Colony[number] => ({ building, lane, rank, file, merge });

/** Round 1's planning, both sides human, with the player's relics, the battle's modifiers and both colonies standing, planted this round. */
function battleWith(opts: { relics?: string[]; modifiers?: BattleModifier[]; map?: string }, player: Colony = [], enemy: Colony = []): BattleState {
  const cfg = makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'human', ...(opts.map ? { mapId: opts.map } : {}) });
  cfg.player.relics = opts.relics ?? [];
  if (opts.modifiers) cfg.modifiers = [...(cfg.modifiers ?? []), ...opts.modifiers];
  const s = createBattle(content, cfg);
  for (const [side, colony] of [['player', player], ['enemy', enemy]] as const) {
    for (const c of colony) addBuilding(s, side, c.building, plotAt(s, side, c), 0).mergeOn = c.merge ?? false;
  }
  return s;
}

/** Both sides with 100 gold in round 1's planning, with the battle's modifiers, and no events or gold earned yet: what firing a trigger reads and writes. */
function scope(modifiers: BattleModifier[]): BattleState {
  const s = battleWith({ modifiers });
  for (const side of SIDES) { s.sides[side].gold = 100; s.stats[side] = emptyStats(); }
  s.events.length = 0;
  return s;
}
const AT: TriggerContext = { x: 10, y: 3, lane: 0, sourceBuildingId: 0 };
const golds = (s: BattleState) => [s.sides.player.gold, s.sides.enemy.gold];

const mod = (stat: ModifierDef['stat'], op: ModifierDef['op'], value: number, extra: Partial<ModifierDef> = {}): ModifierDef => ({ stat, op, value, ...extra });
const on = (side: Side | 'both', effects: EffectBundle): BattleModifier => ({ side, source: 'test', effects });

/** Plays rounds with nothing fielded until the battle's round is `round`, in its planning. */
function toRound(s: BattleState, round: number): BattleState {
  while (s.round < round) { finishRound(s); step(s); }
  return s;
}

/** Locks a lane of the clash begun as lost by `side`, by `margin` (§6.7): what scoring reads. */
function lose(s: BattleState, side: Side, lane: number, margin: number): void {
  Object.assign(s.clash!.lanes[lane]!, { ended: true, winner: other(side), margin });
}

/** The ground bursts that effects have queued (`explode`): v1's, full damage within the radius, next tick. */
const bursts = (s: BattleState) => s.hits.filter((h) => h.sourceType === 'effect')
  .map(({ side, x, y, damage, damageType, splashRadius, tick }) => ({ side, x, y, damage, damageType, splashRadius, tick }));

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

  it('a building selector on a unit stat means the units its squad fields; tags and `melee` match too', () => {
    const c = compile([on('player', { modifiers: [
      mod('unit.speed', 'mul', 2, { where: { building: 'gillNest' } }), mod('unit.hp', 'mul', 2, { where: { tag: 'swarm' } }),
      mod('unit.damage', 'mul', 3, { where: { melee: true } }),
    ] })]);
    const base = compile([]).player.units;
    expect(c.player.units.gillArcher!.tiers[0].speedPerTick).toBeCloseTo(2 * base.gillArcher!.tiers[0].speedPerTick, 12);
    expect(c.player.units.capguard!.tiers[0].speedPerTick).toBe(base.capguard!.tiers[0].speedPerTick);
    expect(c.player.units.sporeling!.tiers[0].hp).toBe(2 * base.sporeling!.tiers[0].hp);
    expect(c.player.units.capguard!.tiers[0].hp).toBe(base.capguard!.tiers[0].hp);
    // `melee`: a unit without the `ranged` tag (Call 13)
    expect(c.player.units.capguard!.tiers[0].damage).toBeCloseTo(3 * base.capguard!.tiers[0].damage, 9);
    expect(c.player.units.gillArcher!.tiers[0].damage).toBe(base.gillArcher!.tiers[0].damage);
  });

  it('`side: opponent` modifiers land on the other side, and side stats compile into the side', () => {
    const c = compile([on('player', { modifiers: [mod('unit.hp', 'mul', 0.5, { side: 'opponent' }), mod('side.mergeRadius', 'add', 0.5), mod('side.knitTicks', 'mul', 0.5)] })]);
    const base = compile([]);
    expect(c.enemy.units.capguard!.tiers[0].hp).toBe(Math.round(base.enemy.units.capguard!.tiers[0].hp / 2));
    expect(c.player.units.capguard!.tiers[0].hp).toBe(base.player.units.capguard!.tiers[0].hp);
    expect(c.player.mergeRadius).toBe(base.player.mergeRadius + 0.5);
    expect(c.player.knitTicks).toBe(base.player.knitTicks / 2);
  });

  it("v2's side stats compile into the side: the income multiplier, the Heartcap's damage taken and the power's effect (§14.2)", () => {
    const c = compile([on('player', { modifiers: [mod('side.incomeMult', 'mul', 1.2), mod('side.heartcapDamageTaken', 'mul', 0.9), mod('side.heartcapDamageTaken', 'mul', 0.85)] })]);
    const base = compile([]);
    expect([c.player.incomeBp, base.player.incomeBp]).toEqual([12000, 10000]);
    expect(c.enemy.incomeBp).toBe(base.enemy.incomeBp);
    // each damage-taken modifier is applied in turn, in basis points (§6.7 step 3)
    expect([c.player.heartcapTakenBp, base.player.heartcapTakenBp]).toEqual([[9000, 8500], []]);
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
  it("accepts rounds' triggers, with a rank in their condition, and v1's retired ones only until T129", () => {
    for (const on of ['roundStart', 'clashStart', 'battleStart', 'roundWon', 'squadWiped', 'enemyUnitKilled', 'unitDeath', 'merge']) {
      expect(TriggerSchema.safeParse({ on, do: [{ gainGold: 5 }] }).success, on).toBe(true);
      expect(TriggerSchema.safeParse({ on, if: { rank: 0 }, do: [{ gainGold: 5 }] }).success, on).toBe(true);
    }
    expect(TriggerSchema.safeParse({ on: 'roundLost', do: [{ gainGold: 5 }] }).success).toBe(false);
  });

  it("accepts v2's actions: a cloud at the enemy's front rank or where it fired, and a heal on the Heartcap", () => {
    const ok = (a: object) => EffectActionSchema.safeParse(a).success;
    expect(ok({ cloud: { radius: 1.5, seconds: 4, damagePerSecond: 10, at: 'enemyFrontRank' } })).toBe(true);
    expect(ok({ cloud: { radius: 1, seconds: 2, damagePerSecond: 5 } })).toBe(true);
    expect(ok({ cloud: { radius: 1, seconds: 2, damagePerSecond: 5, at: 'everywhere' } })).toBe(false);
    expect(ok({ healHeartcap: 100 })).toBe(true);
    expect(ok({ healHeartcap: 0 })).toBe(false);
  });

  it('accepts a rank of 0 to 2, positional as onLoam is: where POSITIONAL_STATS allows, and with onLoam on unit stats (T046)', () => {
    const ok = (stat: string, where: object) => ModifierSchema.safeParse({ stat, op: 'mul', value: 1.2, where }).success;
    for (const rank of [0, 1, 2]) expect(ok('building.squadCount', { rank }), `rank ${rank}`).toBe(true);
    expect(ok('building.squadCount', { rank: 0, tag: 'swarm' })).toBe(true);
    expect(ok('building.squadCount', { rank: 3 })).toBe(false);
    expect(ok('building.squadCount', { rank: -1 })).toBe(false);
    for (const where of [{ rank: 0 }, { onLoam: true }, { rank: 1, tag: 'swarm', tier: 2 }]) expect(ok('unit.hp', where), JSON.stringify(where)).toBe(true);
    // v1's zone and adjacency left the schema (T129), and tower and other building stats take no plot
    for (const where of [{ zone: 'home' }, { adjacentOwnBuildingsGte: 2 }]) expect(ok('unit.damage', where), JSON.stringify(where)).toBe(false);
    for (const stat of ['tower.damage', 'building.goldPerRound']) expect(ok(stat, { rank: 0 }), stat).toBe(false);
  });

  it("selects a squad by its plot, its planting and the general's counter sets: on unit stats and a squad's count (§14.2)", () => {
    const ok = (stat: string, where: object) => ModifierSchema.safeParse({ stat, op: 'add', value: 1, where }).success;
    for (const where of [{ rank: 0 }, { onLoam: true }, { plantedThisRound: true }, { inCounterSet: true }, { melee: true, tag: 'swarm' }]) {
      expect(ok('building.squadCount', where), JSON.stringify(where)).toBe(true);
      expect(ok('unit.damage', where), JSON.stringify(where)).toBe(true);
    }
    expect(ok('tower.damage', { plantedThisRound: true })).toBe(false);
    expect(ok('building.goldPerRound', { inCounterSet: true })).toBe(false);
  });

  it('still refuses any "where" on a side.*, battle.* or run.* stat', () => {
    const ok = (stat: string, where: object) => ModifierSchema.safeParse({ stat, op: 'add', value: 1, where }).success;
    expect(ok('side.stipend', { rank: 0 })).toBe(false);
    expect(ok('side.mergeRadius', { tag: 'swarm' })).toBe(false);
    expect(ok('battle.sporestormStart', { rank: 1 })).toBe(false);
    expect(ok('battle.sporestormStart', { unit: 'sporeling' })).toBe(false);
    expect(ok('run.maxLives', { tag: 'swarm' })).toBe(false);
    expect(ModifierSchema.safeParse({ stat: 'run.maxLives', op: 'add', value: 1 }).success).toBe(true);
  });

  it("takes an `if` only on a stat read when it's used, and the Heartcap's damage taken only as a multiplier", () => {
    const ok = (m: object) => ModifierSchema.safeParse(m).success;
    expect(ok({ stat: 'side.powerEffectMult', op: 'mul', value: 1.5, if: { sporestormGte: 1 } })).toBe(true);
    expect(ok({ stat: 'side.powerEffectMult', op: 'mul', value: 1.5, if: { roundGte: 3 } })).toBe(true);
    expect(ok({ stat: 'unit.hp', op: 'mul', value: 1.5, if: { roundGte: 3 } })).toBe(false);
    expect(ok({ stat: 'side.powerEffectMult', op: 'mul', value: 1.5, if: { roundGte: 0 } })).toBe(false);
    expect(ok({ stat: 'side.heartcapDamageTaken', op: 'mul', value: 0.85 })).toBe(true);
    expect(ok({ stat: 'side.heartcapDamageTaken', op: 'add', value: -0.15 })).toBe(false);
  });
});

describe('triggers in rounds (SPEC §14.2, §14.6)', () => {
  it('a gainGold action pays its own side once per firing, and only for its own kind', () => {
    const s = scope([triggers('player', { on: 'roundWon', do: [{ gainGold: 7 }] }), triggers('enemy', { on: 'roundStart', do: [{ gainGold: 3 }] })]);
    fireTriggers(s, 'player', 'roundWon', AT);
    expect(golds(s)).toEqual([107, 100]);
    // out of a clash, an effect's gold counts as `effects` (R2-Q20)
    expect(s.stats.player.goldEarned.effects).toBe(7);
    expect(s.events).toEqual([{ t: 'gold', side: 'player', amount: 7, source: 'effects' }]);
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

  it("every trigger compiles with its actions, on its own side: v1's triggers and actions left the schema (T129)", () => {
    const compiled = compile([{
      side: 'player', source: 'relic:test',
      effects: { triggers: [{ on: 'merge', do: [{ gainGold: 2 }, { explode: { damage: 10, damageType: 'crush', radius: 1 } }] }] },
    }]);
    expect(compiled.player.triggers).toEqual([{ on: 'merge', do: [{ gainGold: 2 }, { explode: { damage: 10, damageType: 'crush', radius: 1 } }] }]);
    expect([compiled.player.ignored, compiled.enemy.triggers]).toEqual([[], []]);
  });

  it('enemyUnitKilled fires for the killer’s side at each enemy death in a clash, the killed unit as its cause', () => {
    const s = battleWith({ modifiers: [triggers('player', { on: 'enemyUnitKilled', if: { unit: 'sporeling' }, do: [{ gainGold: 1 }] })] },
      [at('capguardHall', 0, 0, 1), at('capguardHall', 0, 0, 2)], [at('sporelingBurrow', 0, 0, 2)]);
    begin(s);
    const gold = s.sides.player.gold;
    const events = finishRound(s);
    const killed = events.filter((e) => e.t === 'died' && e.side === 'enemy' && e.unitId === 'sporeling').length;
    expect(killed).toBeGreaterThan(0);
    expect(s.sides.player.gold - gold).toBe(killed);
  });
});

describe('rank, onLoam and plantedThisRound select squads by their plot (SPEC §4.6, §14.2)', () => {
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

  it("a building's selector reads its plot too", () => {
    const loam: SelectorDef = { onLoam: true };
    expect([buildingMatcher(lib, 'truffleCellar', backLoam)(loam), buildingMatcher(lib, 'truffleCellar', front)(loam), buildingMatcher(lib, 'truffleCellar')(loam)])
      .toEqual([true, false, false]);
    expect(buildingMatcher(lib, 'sporelingBurrow', front)({ rank: 0, tag: 'swarm' })).toBe(true);
    expect(buildingMatcher(lib, 'capguardHall', front)({ rank: 0, tag: 'swarm' })).toBe(false);
    expect(buildingMatcher(lib, 'capguardHall', { ...front, planted: true })({ plantedThisRound: true })).toBe(true);
    expect(buildingMatcher(lib, 'capguardHall', front)({ plantedThisRound: true })).toBe(false);
  });

  it('a rank-0 modifier changes only front-rank squads’ units, and the formation preview equals the arrival (Thick Caps, A028)', () => {
    const s = battleWith({ relics: ['thickCaps'] }, [at('capguardHall', 0, 0, 1), at('capguardHall', 0, 1, 1)]);
    const preview = formationOf(s, 'player').map((p) => ({ building: p.building, units: p.units.length, rank: p.rank }));
    begin(s);
    const squads = s.squads.filter((q) => q.side === 'player');
    expect(squads.map((q) => ({ building: q.building, units: q.units, rank: q.rank }))).toEqual(preview);
    const hp = (rank: number) => [...new Set(s.units.filter((u) => u.sourceBuildingId === squads.find((q) => q.rank === rank)!.building).map((u) => u.maxHp))];
    expect([hp(0), hp(1)]).toEqual([[Math.round(content.units.capguard!.hp * 1.15)], [s.compiled.player.units.capguard!.tiers[0].hp]]);
  });

  it('onLoam matches a loam plot: a squad count on loam reaches only the squad standing there', () => {
    const s = battleWith({ modifiers: [on('player', { modifiers: [mod('building.squadCount', 'add', 2, { where: { onLoam: true } })] })] },
      [at('capguardHall', 0, 1, 1), at('capguardHall', 0, 1, 2)]);
    const count = content.buildings.capguardHall!.squad!.count;
    expect(formationOf(s, 'player').map((p) => p.units.length)).toEqual([count, count + 2]);
  });

  it('plantedThisRound adds a unit only in the clash right after planting, and a plant’s preview shows it (Fresh Spores)', () => {
    const s = battleWith({ relics: ['freshSpores'] }, [at('capguardHall', 0, 0, 1)]);
    const count = content.buildings.capguardHall!.squad!.count;
    const fielded = () => s.squads.filter((q) => q.side === 'player').map((q) => q.units);
    expect(formationOf(s, 'player').map((p) => p.units.length)).toEqual([count + 1]);
    begin(s);
    expect(fielded()).toEqual([count + 1]);
    finishRound(s);
    step(s);
    expect(formationOf(s, 'player').map((p) => p.units.length)).toEqual([count]);
    const plot = plotAt(s, 'player', { lane: 0, rank: 0, file: 2 });
    expect(formationOf(s, 'player', { plant: { buildingId: 'capguardHall', plot } }).map((p) => p.units.length)).toEqual([count, count + 1]);
    plant(s, 'player', 'capguardHall', { lane: 0, rank: 0, file: 2 });
    begin(s);
    expect(fielded()).toEqual([count, count + 1]);
  });
});

describe('conditions and the storm (SPEC §6.4, §11.7, A090)', () => {
  it("a modifier's `if` gates it by round, and the Sporestorm Sigil's by the storm: on from round 5, or round 4 under Mold Bloom", () => {
    const s = battleWith({ relics: ['sporestormSigil'], modifiers: [on('enemy', { modifiers: [mod('side.powerEffectMult', 'mul', 2, { if: { roundGte: 3 } })] })] });
    const seen: number[][] = [];
    for (let r = 1; r <= 6; r++) seen.push([toRound(s, r).round, powerEffectMult(s, 'player'), powerEffectMult(s, 'enemy')]);
    expect(seen).toEqual([[1, 1, 1], [2, 1, 1], [3, 1, 2], [4, 1, 2], [5, 1.5, 2], [6, 1.5, 2]]);
    // Mold Bloom moves the storm to round 4 (`battle.sporestormStart` −1, §8.7), and the Sigil with it
    const bloom = battleWith({ relics: ['sporestormSigil'], modifiers: [on('both', { modifiers: [mod('battle.sporestormStart', 'add', -1)] })] });
    expect([powerEffectMult(toRound(bloom, 3), 'player'), powerEffectMult(toRound(bloom, 4), 'player')]).toEqual([1, 1.5]);
  });

  it('Rot-Eater pays +1 gold an enemy unit killed from the storm’s first round: 5, or 4 under Mold Bloom', () => {
    const paid = (s: BattleState) => {
      const gold = s.sides.player.gold;
      fireTriggers(s, 'player', 'enemyUnitKilled', { ...AT, unitId: 'sporeling', tier: 1, tags: content.units.sporeling!.tags });
      return s.sides.player.gold - gold;
    };
    const s = battleWith({ relics: ['rotEater'] });
    expect([paid(toRound(s, 4)), paid(toRound(s, 5))]).toEqual([0, 1]);
    const bloom = battleWith({ relics: ['rotEater'], modifiers: [on('both', { modifiers: [mod('battle.sporestormStart', 'add', -1)] })] });
    expect([paid(toRound(bloom, 3)), paid(toRound(bloom, 4))]).toEqual([0, 1]);
  });
});

describe("the Heartcap's round result (SPEC §6.7, #24)", () => {
  it('Rot Ward: your Heartcap takes 15% less from each lost round, before the cap: a 500 loss becomes 425 (8500 bp, floored)', () => {
    const s = battleWith({ relics: ['rotWard'] });
    expect(s.compiled.player.heartcapTakenBp).toEqual([8500]);
    begin(s);
    lose(s, 'player', 0, 5);
    const r = scoreRound(s);
    expect([r.lanes[0]!.damage, r.damage.enemy, s.sides.player.heartcapMaxHp - s.sides.player.heartcapHp]).toEqual([425, 425, 425]);
    // the other way round, nothing changes
    const plain = battleWith({ relics: ['rotWard'] });
    begin(plain);
    lose(plain, 'enemy', 0, 5);
    expect(scoreRound(plain).damage.player).toBe(500);
  });

  it("Mending Moss: a won round's heal of 100 lands after its damage, never above max, and the damage it recorded stands", () => {
    const s = battleWith({ relics: ['mendingMoss'], map: 'twin-roots' });
    const max = s.sides.player.heartcapMaxHp;
    begin(s);
    lose(s, 'player', 1, 3);
    lose(s, 'enemy', 0, 5);
    endClash(s);
    const r = s.rounds.at(-1)!;
    // the round's damage, and so a Decision, reads 300 taken; the Heartcap stands at 300 − 100 below max
    expect([r.damage.player, r.damage.enemy, s.stats.player.heartcapDamageTaken]).toEqual([500, 300, 300]);
    expect([s.sides.player.heartcapHp, r.heartcaps.player]).toEqual([max - 200, max - 200]);
    expect(s.events.filter((e) => e.t === 'heartcapHealed')).toEqual([{ t: 'heartcapHealed', side: 'player', amount: 100 }]);
    // the next won rounds top it up to max and no further; a lost round heals nothing (round 5's storm makes 300 360)
    for (const [loser, hp] of [['enemy', max - 100], ['enemy', max], ['enemy', max], ['player', max - 360]] as const) {
      step(s);
      begin(s);
      lose(s, loser, 0, 3);
      endClash(s);
      expect(s.sides.player.heartcapHp, `round ${s.round}`).toBe(hp);
    }
  });
});

describe('squads, deaths and clouds (SPEC §11.7, A099)', () => {
  it("Martyr's Bloom bursts once where a squad's last unit dies, by source building: 60 crush within 2.0 tiles, next tick", () => {
    const s = battleWith({ relics: ['martyrsBloom'] }, [at('capguardHall', 0, 0, 1), at('capguardHall', 0, 0, 2)]);
    begin(s);
    const [a, b] = s.squads.filter((q) => q.side === 'player').map((q) => s.units.filter((u) => u.sourceBuildingId === q.building));
    // all of one squad at once, and the other one unit at a time
    for (const u of a!) u.hp = 0;
    b![0]!.hp = 0;
    deathSystem(s);
    const last = a!.at(-1)!;
    expect(bursts(s)).toEqual([{ side: 'player', x: last.x, y: last.y, damage: 60, damageType: 'crush', splashRadius: 2, tick: s.tick + 1 }]);
    for (const u of b!.slice(1, -1)) u.hp = 0;
    deathSystem(s);
    expect(bursts(s)).toHaveLength(1);
    b!.at(-1)!.hp = 0;
    deathSystem(s);
    expect(bursts(s).at(-1)).toMatchObject({ x: b!.at(-1)!.x, y: b!.at(-1)!.y, damage: 60 });
    expect(bursts(s)).toHaveLength(2);
  });

  it("a squad absorbed whole at the muster doesn't burst: a squad is its units by source building after the muster", () => {
    const s = battleWith({ relics: ['martyrsBloom'] }, [at('capguardHall', 0, 0, 1), at('capguardHall', 0, 0, 2)]);
    begin(s);
    // the muster credits a knit to its lowest part's building (`mergeTriosNow`): here the second squad's units all went to the first
    const [a, b] = s.squads.filter((q) => q.side === 'player').map((q) => q.building);
    for (const u of s.units) if (u.sourceBuildingId === b) u.sourceBuildingId = a!;
    for (const u of s.units) if (u.side === 'player') u.hp = 0;
    deathSystem(s);
    expect(bursts(s)).toHaveLength(1);
  });

  it("Spore Cloud's death burst runs in rounds: 10 crush within 1.0 tile where each unit fell", () => {
    const s = battleWith({ relics: ['sporeCloud'] }, [at('capguardHall', 0, 0, 1)]);
    begin(s);
    const dead = s.units.filter((u) => u.side === 'player').slice(0, 2);
    for (const u of dead) u.hp = 0;
    deathSystem(s);
    expect(bursts(s)).toEqual(dead.map((u) => ({ side: 'player', x: u.x, y: u.y, damage: 10, damageType: 'crush', splashRadius: 1, tick: s.tick + 1 })));
  });

  it("Forward Spores: as each clash starts, a cloud lands on the middle of each lane's enemy front rank: 1.5 tiles, 4 s, 10 a second", () => {
    const s = battleWith({ relics: ['forwardSpores'], map: 'twin-roots' });
    begin(s);
    const front = formationBox({ width: s.map.width, lanes: s.lanes, gapTiles: s.rules.formationGapTiles }, 'enemy', 1);
    expect(s.clouds!.map(({ side, lane, x, y, radius, damage, pulseTicks, fromTick, untilTick }) => ({ side, lane, x, y, radius, damage, pulseTicks, fromTick, untilTick })))
      .toEqual(s.lanes.map((l, lane) => ({
        side: 'player', lane, x: front.find((slot) => slot.lane === lane)!.col + 1, y: (l.rowStart + l.rowEnd + 1) / 2,
        radius: 1.5, damage: 10, pulseTicks: 20, fromTick: s.tick, untilTick: s.tick + 80,
      })));
  });
});

describe('clash gold takes one path (SPEC §6.2, R2-Q20)', () => {
  it('gold earned in a clash is credited at once with a gold event of source clash, and arrives as one "from the clash" row in the next income', () => {
    const s = battleWith({ relics: ['sporeTithe'] }, [at('sporelingBurrow', 0, 0, 1, true)]);
    const gold = s.sides.player.gold;
    const events = begin(s);
    const paid = events.filter((e) => e.t === 'gold');
    const earned = paid.reduce((n, e) => n + (e.t === 'gold' ? e.amount : 0), 0);
    // the muster's knits pay +4 each, at once
    expect(earned).toBeGreaterThan(0);
    expect(paid.every((e) => e.t === 'gold' && e.side === 'player' && e.source === 'clash' && e.amount === 4)).toBe(true);
    expect([s.sides.player.gold - gold, s.stats.player.goldEarned.clash, incomePreview(s, 'player').clash]).toEqual([earned, earned, earned]);
    finishRound(s);
    const held = s.sides.player.gold, next = incomePreview(s, 'player');
    expect(next.clash).toBe(s.stats.player.goldEarned.clash);
    step(s);
    // the opening shows it as a row, and pays only its own sources: the clash's gold isn't paid twice
    expect(s.events.find((e) => e.t === 'income' && e.side === 'player')).toEqual({ t: 'income', side: 'player', amount: next.total - next.interest, clash: next.clash });
    expect(s.sides.player.gold).toBe(held + next.total);
    expect([s.stats.player.goldEarned.clash, incomePreview(s, 'player').clash]).toEqual([next.clash, 0]);
  });
});

describe('the `requires` gates (SPEC §8.4, §11.7, A083, #26)', () => {
  it("Mycorrhizal Link and the Rhizome Vault wait for R3's combos: no draft, spoils or event offers them, so Armilla's core offers five", () => {
    const pool = draftPool(content, 'velvet-bloom', 'armilla', DEFAULT_FLAGS);
    expect(pool.core).toEqual(content.commanders.armilla!.core.filter((id) => id !== 'rhizomeVault'));
    expect(pool.core).toHaveLength(5);
    expect(pool.shared).not.toContain('rhizomeVault');
    expect(pool.relics).not.toContain('mycorrhizalLink');
    expect(pool.relics).toContain('sporestormSigil');
    expect(draftPool(content, 'velvet-bloom', 'armilla', { ...DEFAULT_FLAGS, powers: false }).relics).not.toContain('sporestormSigil');
    // spoils and events draw from the run's pool
    const run = createRun(content, { seed: 1, commander: 'armilla' });
    const runs = runPool(content, run);
    expect([...runs.core, ...runs.shared, ...runs.relics].filter((id) => id === 'rhizomeVault' || id === 'mycorrhizalLink')).toEqual([]);
  });

  it("the Vault never joins a kit: a general's, whether it names it or fields its whole roster, nor a single battle's", () => {
    const run = createRun(content, { seed: 1 });
    const g = content.generals.scripted!;
    const { preferred: _preferred, ...roster } = g;
    for (const def of [{ ...g, opener: [...g.opener, 'rhizomeVault'], preferred: ['rhizomeVault', ...g.preferred!] }, roster]) {
      const c = { ...content, generals: { ...content.generals, scripted: def } };
      for (const kind of ['battle', 'boss'] as const) {
        expect(generalKit(c, run, { kind, map: 'stumpfield', general: 'scripted' }, 4).kit, kind).not.toContain('rhizomeVault');
      }
    }
    const single = makeRoundConfig(content, { seed: 1 });
    for (const side of SIDES) expect(single[side].kit.map((k) => k.building), side).not.toContain('rhizomeVault');
  });
});

describe("§11.7's relics in rounds (T075)", () => {
  const relic = (id: string) => battleWith({ relics: [id] });
  const plain = battleWith({});

  it('Fruiting Season: economy buildings +12 gold a round; Root Stipend: the stipend +24 a round', () => {
    const fruit = relic('fruitingSeason').compiled.player.buildings, base = plain.compiled.player.buildings;
    expect([fruit.truffleCellar!.economy!.goldPerRound, fruit.sporeExchange!.economy!.goldPerRound])
      .toEqual([base.truffleCellar!.economy!.goldPerRound + 12, base.sporeExchange!.economy!.goldPerRound + 12]);
    expect(fruit.capguardHall!.economy).toBeUndefined();
    expect(relic('rootStipend').compiled.player.stipend).toBe(plain.compiled.player.stipend + 24);
  });

  it('Quick Roots: your melee units move 25% faster until their first attack in each clash, and ranged units as ever', () => {
    const quick = relic('quickRoots').compiled.player.units, base = plain.compiled.player.units;
    expect(quick.capguard!.tiers.map((t) => t.openingSpeedMult)).toEqual([1.25, 1.25, 1.25]);
    expect(quick.capguard!.tiers[0].speedPerTick).toBe(base.capguard!.tiers[0].speedPerTick);
    expect([quick.gillArcher!.tiers[0].openingSpeedMult, base.capguard!.tiers[0].openingSpeedMult]).toEqual([1, 1]);
    // a step's move in the clash, before its first attack and after it
    const colony = [at('capguardHall', 0, 0, 2)], enemy = [at('gillNest', 0, 1, 3)];
    const firstMove = (relics: string[], attacked = false) => {
      const s = battleWith({ relics }, colony, enemy);
      begin(s);
      const u = s.units.find((v) => v.side === 'player')!;
      if (attacked) u.lastAttackTick = s.tick;
      for (let i = 0; i < 40; i++) {
        const x = u.x;
        step(s);
        if (u.x !== x) return Math.abs(u.x - x);
      }
      return 0;
    };
    const walk = firstMove([]);
    expect(walk).toBeGreaterThan(0);
    expect(firstMove(['quickRoots']) / walk).toBeCloseTo(1.25, 9);
    expect(firstMove(['quickRoots'], true)).toBeCloseTo(walk, 12);
  });

  it("Mycelial Web: your colony gains 1 plot, the next closed one by #19's order, and never more than the map holds", () => {
    const map = content.maps['bogwater-hollow']!;
    const open = (s: BattleState) => s.sides.player.plots.flatMap((p, i) => (p.open ? [i] : []));
    const web = relic('mycelialWeb');
    const order = openOrder(map);
    expect(open(web)).toEqual([...order.slice(0, open(plain).length + 1)].sort((x, y) => x - y));
    expect(web.sides.enemy.plots.filter((p) => p.open)).toHaveLength(plain.sides.enemy.plots.filter((p) => p.open).length);
    const full = makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'human' });
    full.player.plots = order.length;
    full.player.relics = ['mycelialWeb'];
    expect(createBattle(content, full).sides.player.plots.every((p) => p.open)).toBe(true);
  });

  it('Mycelial Web picked in a draft opens its plot at once, in the same planning phase', () => {
    const s = toRound(createBattle(content, makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'human', flags: { drafts: true } })), 3);
    const open = () => s.sides.player.plots.flatMap((p, i) => (p.open ? [i] : []));
    const before = open();
    s.sides.player.draft!.offer[0] = { id: 'relic:mycelialWeb', type: 'relic', rarity: 'uncommon' };
    command(s, 'player', { type: 'draftPick', cardId: 'relic:mycelialWeb' });
    expect([s.phase, s.sides.player.relics]).toEqual(['planning', ['mycelialWeb']]);
    expect(open()).toEqual([...before, s.map.openOrder[before.length]!].sort((x, y) => x - y));
  });

  it('the Sporestorm Sigil keeps `requires: powers`, and Mycorrhizal Link compiles to nothing until R3 (A138)', () => {
    expect(content.relics.sporestormSigil!.requires).toBe('powers');
    expect(content.relics.mycorrhizalLink!.requires).toBe('combos');
    expect(relic('mycorrhizalLink').compiled.player.ignored).toEqual([{ source: 'relic:mycorrhizalLink', stat: 'side.comboCorners' }]);
  });
});
