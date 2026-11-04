// A battle in rounds' library and compiled sides (SPEC §11.2, §14.2, §14.4, §13.3): squads from each
// building's `squad`, towers as emplacement units, gold a round, the rules from `balance.rounds`, content on
// retired stats compiled to nothing and listed (plan Call 19), and no display text (R2-Q8). These need no
// battle: only a config, as `createBattle` (T027) will pass it.
import { describe, expect, it } from 'vitest';
import type { Content } from '../../src/data/registry.ts';
import type { StatKeyT } from '../../src/data/schema.ts';
import { secToTicks } from '../../src/sim/compile.ts';
import { buildRoundLibrary, compileRoundRules, compileRoundSides } from '../../src/sim/compile.ts';
import { SIDES } from '../../src/sim/state.ts';
import type { BattleConfig, BattleModifier, CompiledSide, Side, SideConfig } from '../../src/sim/state.ts';
import { content } from '../helpers.ts';

/** A single battle on Bogwater Hollow: each faction's roster as its kit (§18.1 D45), against Old Mother Mold. */
function config(modifiers: BattleModifier[] = []): BattleConfig {
  const side = (faction: string, controller: SideConfig['controller'], heartcapMaxHp: number): SideConfig => ({
    faction, controller, kit: content.factions[faction]!.buildings.map((building) => ({ building })), relics: [],
    plots: 8, heartcapMaxHp, startingGold: content.balance.startingGold,
  });
  return {
    seed: 1, battleIndex: 1, mapId: 'bogwater-hollow',
    player: side('velvet-bloom', { kind: 'human' }, content.balance.heartcapPlayerHp),
    enemy: side('gray-rot', { kind: 'general', id: 'mother-mold' }, content.balance.heartcapEnemyHp.base),
    flags: { merging: true, drafts: false, adaptiveGeneral: true, powers: true },
    ...(modifiers.length ? { modifiers } : {}),
  };
}
/** A commander's passive on your side, or a general's on its own, as battle modifiers (§7.7, §11.10). */
const commander = (id: string): BattleModifier => ({ side: 'player', source: `commander:${id}`, effects: content.commanders[id]!.passive.effects });
const general = (id: string): BattleModifier => ({ side: 'enemy', source: `general:${id}`, effects: content.generals[id]!.passive! });
const compile = (modifiers: BattleModifier[] = [], c = config(modifiers), from: Content = content): Record<Side, CompiledSide> =>
  compileRoundSides(buildRoundLibrary(from, c), c);
const roster = content.factions['velvet-bloom']!.buildings;

describe("rounds' library holds ids and numbers only (R2-Q8, A152)", () => {
  it('has no name, description or text anywhere, and holds both kits with their squads\' units and the powers', () => {
    const c = config();
    c.player.commander = 'cordis';
    c.player.power = content.commanders.cordis!.power.id;
    const lib = buildRoundLibrary(content, c);
    const keys = new Set<string>();
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { keys.add(k); walk(v); }
    };
    walk(lib);
    for (const k of ['name', 'description', 'text']) expect(keys.has(k), k).toBe(false);
    expect(Object.keys(lib.buildings)).toEqual([...roster].sort());
    for (const id of roster) {
      const squad = content.buildings[id]!.squad;
      if (squad) expect(lib.units[squad.unit], id).toBeDefined();
    }
    expect(Object.keys(lib.powers ?? {})).toEqual(['puppetBloom']);
  });

  it("rewording a building or a unit leaves the library as it was", () => {
    const c = config();
    const reworded: Content = {
      ...content,
      buildings: { ...content.buildings, gillNest: { ...content.buildings.gillNest!, name: 'Archer Den', description: 'Other words.' } },
      units: { ...content.units, gillArcher: { ...content.units.gillArcher!, name: 'Gill Bowman' } },
    };
    expect(buildRoundLibrary(reworded, c)).toEqual(buildRoundLibrary(content, c));
  });

  it("compiles a run's relics and upgrade levels with the battle's modifiers: kept stats apply, retired ones are listed (R2b, plan Call 19)", () => {
    const c = config();
    c.player.relics = ['hardySpores', 'deepCellars'];
    c.player.upgrades = { sporelingBurrow: 3, truffleCellar: 3 };
    c.enemy.upgrades = { gillNest: 1 };
    const lib = buildRoundLibrary(content, c);
    expect(Object.keys(lib.relics!)).toEqual(['deepCellars', 'hardySpores']);
    expect(Object.keys(lib.upgrades!)).toEqual(['gillNest', 'sporelingBurrow', 'truffleCellar']);
    expect(JSON.stringify(lib)).not.toContain(content.relics.hardySpores!.text); // ids and numbers only (R2-Q8)
    const plain = compile(), run = compileRoundSides(lib, c);
    const hp = (s: Side, unit: string, sides = run) => sides[s].units[unit]!.tiers[0].hp;
    expect(hp('player', 'sporeling') / hp('player', 'sporeling', plain)).toBeCloseTo(1.08 * 1.15, 1);
    expect(hp('player', 'capguard') / hp('player', 'capguard', plain)).toBeCloseTo(1.08, 1);
    expect(run.player.interestCap).toBe(plain.player.interestCap + 10);
    // the Burrow's level 3 and the Cellar's level 2 do nothing in rounds, so they list nothing (#27)
    expect(run.player.ignored).toEqual([]);
    expect(run.player.buildings.truffleCellar!.economy!.goldPerRound).toBe(plain.player.buildings.truffleCellar!.economy!.goldPerRound + 24);
    expect(run.enemy.units.gillArcher!.tiers[0].range).toBeGreaterThan(plain.enemy.units.gillArcher!.tiers[0].range); // its level 1: range +0.75
    // a single battle holds neither, so its library and hash are as before
    expect(buildRoundLibrary(content, config())).not.toHaveProperty('relics');
    expect(() => buildRoundLibrary(content, { ...c, player: { ...c.player, relics: ['nope'] } })).toThrow(/unknown relic/);
  });
});

describe('compiled sides in rounds (SPEC §11.2, §14.2)', () => {
  it("a squad's count comes from `squad`, not from v1's spawn", () => {
    const { player, enemy } = compile();
    for (const id of roster) {
      const b = content.buildings[id]!;
      if (b.kind !== 'spawner') continue;
      expect(player.buildings[id]!.squad, id).toEqual({ unit: b.squad!.unit, count: b.squad!.count });
      expect(enemy.buildings[id]!.squad, id).toEqual(player.buildings[id]!.squad);
    }
    expect(player.buildings.sporelingBurrow!.squad).toEqual({ unit: 'sporeling', count: 8 });
    expect(player.buildings.capguardHall!.squad!.count).toBe(3); // R1's review gate (#7)
    // each squad's unit at all three tiers
    expect(player.units.sporeling!.tiers.map((t) => t.supply)).toEqual(content.balance.tierSupplyMult);
    // an economy or utility building fields nothing
    for (const id of ['truffleCellar', 'sporeExchange', 'rhizomeVault']) expect(player.buildings[id]!.squad, id).toBeUndefined();
  });

  it('refuses a spawner with no squad', () => {
    const bare: Content = { ...content, buildings: { ...content.buildings, gillNest: { ...content.buildings.gillNest!, squad: undefined } } };
    expect(() => compile([], config(), bare)).toThrow(/gillNest.*squad/);
  });

  it("a tower compiles to an emplacement unit with structure armor and its building's hp", () => {
    const { player } = compile();
    const mortar = content.buildings.puffballMortar!, attack = mortar.attack!;
    expect(player.buildings.puffballMortar!.squad).toEqual({ unit: 'puffballMortar', count: 1 });
    const e = player.units.puffballMortar!;
    expect(e.armor).toBe('structure');
    expect([e.damageType, e.projectileSpeed]).toEqual([attack.damageType, attack.projectileSpeed]);
    // the Mortar's shells leave spore clouds, and reach the clouds' range (§5.3, §11.2)
    expect(e.emplacement).toEqual({ minRange: attack.minRange, clouds: true });
    for (const t of e.tiers) {
      expect(t.hp).toBe(mortar.hp);
      expect([t.damage, t.attackTicks, t.range, t.splashRadius]).toEqual([attack.damage, secToTicks(attack.interval), content.balance.sporeCloud!.range, attack.splashRadius]);
      expect([t.supply, t.speedPerTick, t.healAmount]).toEqual([0, 0, 0]);
    }
  });

  it("an economy building's gold comes from goldPerRound; the Spore Exchange also raises the interest cap", () => {
    const { player } = compile();
    expect(player.buildings.truffleCellar!.economy).toEqual({ goldPerRound: 50 });
    expect(player.buildings.sporeExchange!.economy).toEqual({ goldPerRound: 12, interestCapAdd: 10 });
  });

  it("holds the rules from balance.rounds: the stipend, the interest cap, the refunds and the general's income", () => {
    const { player, enemy } = compile();
    const r = content.balance.rounds;
    for (const s of [player, enemy]) {
      expect([s.stipend, s.interestCap, s.sellRefundPlantedPct, s.sellRefundPct]).toEqual([r.stipendPerRound, r.interestCap, 100, 60]);
      expect([s.comebackEnabled, s.loamBonusPct]).toEqual([true, 50]);
    }
    expect([player.incomeBp, enemy.incomeBp]).toEqual([10000, Math.round(r.enemyIncomeMult * 10000)]);
  });

  it('a modifier on a retired stat compiles to nothing and is listed, and no passive or elite uses one (plan Call 19, §7.7, §11.10)', () => {
    const plain = compile();
    // v1's passives' stats, which R2b's S7 rewrote
    const retired: [Side, StatKeyT][] = [
      ['player', 'building.spawnInterval'], ['player', 'side.captureSpeed'], ['enemy', 'building.hp'], ['enemy', 'side.turretDamage'],
      ['enemy', 'building.firstSpawnFraction'],
    ];
    for (const [side, stat] of retired) {
      const mod: BattleModifier = { side, source: `test:${stat}`, effects: { modifiers: [{ stat, op: 'mul', value: 2 }] } };
      const sides = compile([mod]);
      expect(sides[side].ignored, stat).toEqual([{ source: mod.source, stat }]);
      for (const s of SIDES) expect({ ...sides[s], ignored: [] }, stat).toEqual(plain[s]);
    }
    expect(plain.player.ignored).toEqual([]);
    const all: BattleModifier[] = [
      ...Object.keys(content.commanders).map(commander), ...Object.keys(content.generals).filter((id) => content.generals[id]!.passive).map(general),
      ...Object.values(content.elites).filter((e) => e.effects).map((e): BattleModifier => ({ side: 'enemy', source: `elite:${e.id}`, effects: e.effects! })),
    ];
    for (const mod of all) for (const s of SIDES) expect(compile([mod])[s].ignored, mod.source).toEqual([]);
  });

  it("Cordis's merged units have +10% HP and her merge radius is 2, with the plain knit time (§11.10, R2-Q7)", () => {
    const b = content.balance;
    const plain = compile().player, cordis = compile([commander('cordis')]).player;
    expect([plain.knitTicks, plain.mergeRadius]).toEqual([secToTicks(b.mergeKnitSeconds), b.mergeRadius]);
    expect([cordis.knitTicks, cordis.mergeRadius]).toEqual([secToTicks(b.mergeKnitSeconds), 2]);
    const hp = (side: CompiledSide) => side.units.sporeling!.tiers.map((t) => t.hp);
    const [p, c] = [hp(plain), hp(cordis)];
    expect(c[0]).toBe(p[0]);
    expect([c[1]! / p[1]!, c[2]! / p[2]!].map((x) => +x.toFixed(2))).toEqual([1.1, 1.1]);
    expect(cordis.ignored).toEqual([]);
  });

  it("the Blightwright's speed reaches its siege units only, and the Gray Rot's seat has no trait (M7-Q1)", () => {
    const plain = compile(), blight = compile([general('blightwright')]);
    const speed = (sides: Record<Side, CompiledSide>, s: Side, u: string) => sides[s].units[u]!.tiers[0].speedPerTick;
    expect(speed(blight, 'enemy', 'rootbreaker')).toBeCloseTo(speed(plain, 'enemy', 'rootbreaker') * 1.15, 12);
    expect(speed(blight, 'enemy', 'capguard')).toBe(speed(plain, 'enemy', 'capguard'));
    expect(blight.player).toEqual(plain.player);
    // with no passive, the enemy seat's units are yours
    expect(plain.enemy.units).toEqual(plain.player.units);
  });
});

describe('the rules in rounds (SPEC §5.6, §6.4, §6.7, §11.1)', () => {
  it('holds the clash cap and the muster in ticks, and the storm by round, which battle.sporestormStart moves', () => {
    const c = config(), r = content.balance.rounds;
    const rules = compileRoundRules(buildRoundLibrary(content, c), c);
    expect([rules.clashCapTicks, rules.musterTicks, rules.maxRounds]).toEqual([900, 20, r.maxRounds]);
    expect(rules.storm).toEqual({ startRound: 5, stepBp: 2000, maxBp: 20000 });
    expect([rules.roundDamageCap, rules.decisionBy, rules.interestPer]).toEqual([{ flat: 750 }, 'shareOfMaxHp', 10]);
    const early = config([{ side: 'both', source: 'test', effects: { modifiers: [{ stat: 'battle.sporestormStart', op: 'set', value: 4 }] } }]);
    expect(compileRoundRules(buildRoundLibrary(content, early), early).storm.startRound).toBe(4);
  });
});
