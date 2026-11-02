// The combat rework's settings (docs/archive/v1/ideas/combat-rework.md, P1 to P2): call for help, waves,
// mixed waves, the storm that grows waves, the swarm read and flyers. Each is absent from data/balance.json and
// its content exists only under its preset, so the shipped rules are unchanged; with a setting on, it behaves
// as described. R1's chosen set (pinning, spore clouds, cleave, the Burster and the Rhizomorph) is default data
// since R2a S1 (SPEC §15.7): its damage cases are in damage.test.ts and combat.test.ts, and the rest run here on
// the shipped content.
import { describe, expect, it } from 'vitest';
import { applyProto, applyProtoToBalance } from '../../src/data/proto.ts';
import { loadContent } from '../../src/data/registry.ts';
import { analyzeMix, createBattle, hashState, makeConfig, queueCommand, runHeadless, topKind } from '../../src/sim/index.ts';
import type { BattleState, Content, CounterState } from '../../src/sim/index.ts';
import { addBuilding } from '../../src/sim/create.ts';
import { addCloud } from '../../src/sim/systems/clouds.ts';
import { lanePresence } from '../../src/sim/systems/territory.ts';
import { findUnit } from '../../src/sim/world.ts';
import { shownEffectiveness } from '../../src/render/renderer.ts';
import { flyerHitters, versusFlyers } from '../../src/ui/matrixHints.ts';
import { protoContent, readRawContent } from '../../tools/lib/content.ts';
import { runBattle } from '../../tools/lib/run.ts';
import { building, content, liveState, steps, unit } from '../helpers.ts';
import type { SimEvent, Tier, UnitState } from '../../src/sim/index.ts';

const NO_FIELD = { noTurrets: true, noTerritory: true, noHeartcapTargets: true };

/** A live battle on the flat test map from proto content, with both sides idle. */
function protoState(c: Content, test: BattleState['config']['test'] = NO_FIELD): BattleState {
  const s = createBattle(c, makeConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', ...(test ? { test } : {}) }));
  s.phase = 'live';
  return s;
}

/** Freezes a side's unit type: it neither moves nor attacks. */
function freeze(s: BattleState, side: 'player' | 'enemy', id: string): void {
  for (const t of s.compiled[side].units[id]!.tiers) t.speedPerTick = 0;
  for (const u of s.units) if (u.side === side && u.unitId === id) u.cooldown = 1e9;
}

describe("the combat rework's other settings are off by default", () => {
  it("leaves today's battles exactly as on develop: a unit Vesper's Spore Burst kills still gets that tick's attack", () => {
    // P1c gated nothing here at first, and this battle's final hash moved (d1d1102d0bb7c0d6); develop's is below.
    // R2a S1 moved it once more, with R1's chosen set as default data (T014)
    const { state } = runBattle(content, {
      seed: 24, map: 'bogwater-hollow', player: 'bot:balanced', commander: 'vesper', powerPolicy: 'auto',
      flags: { merging: true, adaptiveGeneral: true, powers: true },
    });
    expect(hashState(state)).toBe('deb526d3e6620de7');
  });

  it('balance.json sets none of them, so compiled rules carry none', () => {
    const b = content.balance;
    for (const k of ['callForHelp', 'waves', 'mixedWave', 'stormWaves', 'flying'] as const) expect(b[k], k).toBeUndefined();
    const s = liveState();
    for (const k of ['help', 'waves', 'mixed', 'stormWaves', 'flying'] as const) expect(s.rules[k], k).toBeUndefined();
  });

  it('the presets compile', () => {
    for (const p of ['callforhelp', 'waves', 'mixedwave', 'stormwaves', 'swarmread', 'flyers', 'rework']) expect(() => protoContent(p)).not.toThrow();
    const all = protoState(protoContent('rework'));
    expect([all.rules.pin, all.rules.help, all.rules.waves, all.rules.mixed, all.rules.burst, all.rules.stormWaves].every(Boolean)).toBe(true);
    expect(all.compiled.player.buildings.rhizomorphTunnel).toBeDefined();
    expect(protoState(protoContent('callforhelp')).rules.help).toEqual({ radius: 5 });
  });
});

describe("R1's chosen set, default data since R2a (SPEC §1.3 #11, §16 R2)", () => {
  it("is pinning, the Mortar's clouds, the Burster, cleave and the Rhizomorph, with no waves, call for help, mixed waves, flyers or storm", () => {
    const s = protoState(content);
    for (const k of ['pin', 'cloud', 'burst', 'cleave'] as const) expect(s.rules[k], k).toBeDefined();
    for (const k of ['waves', 'help', 'mixed', 'flying', 'stormWaves'] as const) expect(s.rules[k], k).toBeUndefined();
    expect(s.rules.pin).toEqual({ radius: 1, permille: 350 });
    expect(s.rules.cloud).toEqual({ buildings: ['puffballMortar'], radius: 1.5, ticks: 120, pulseTicks: 20, damage: 10 });
    expect(s.compiled.player.buildings.puffballMortar!.attack!.range).toBe(7);
    expect(s.clouds).toEqual([]);
    for (const f of ['velvet-bloom', 'gray-rot']) expect(content.factions[f]!.buildings.slice(-2)).toEqual(['bursterPod', 'rhizomorphTunnel']);
    expect(s.compiled.player.units.sporeling!.tiers[2]!.splashRadius).toBe(0.6); // the Elder keeps its splash
  });
});

describe('call for help (balance callForHelp)', () => {
  /**
   * E1's failure: an enemy archer that can't move shoots a Truffle Cellar from 5 tiles while the
   * player holds the lane, so its Capguard waits at the rally line beyond its aggro range.
   */
  function siege(help: boolean, ticks: number, opts: { busy?: boolean } = {}) {
    const s = liveState({ test: NO_FIELD, flags: { merging: false }, borders: [6, 25] });
    if (help) s.rules.help = { radius: 5 };
    s.sides.player.stance![0] = { hold: true, since: 0, readyAt: 0 };
    const cellar = building(s, 'player', 'truffleCellar', 4, 1);
    const guard = unit(s, 'player', 'capguard', 3, 2);
    const archer = unit(s, 'enemy', 'gillArcher', 6 + 5 + 0.25, 2);
    s.compiled.enemy.units.gillArcher!.tiers[0].speedPerTick = 0;
    if (opts.busy) {
      // a frozen enemy Capguard right beside the guard keeps it fighting
      const foe = unit(s, 'enemy', 'capguard', 3, 3.2);
      foe.hp = foe.maxHp = 1e6;
      freeze(s, 'enemy', 'capguard');
    }
    steps(s, ticks);
    return { s, cellar, guard, archer };
  }

  it('a unit with no target near a building under fire takes the attacker, and closes on it beyond its leash', () => {
    const { guard, archer } = siege(true, 40);
    expect(archer.targetId).not.toBe(guard.id); // still shooting the Cellar
    expect(guard.targetId).toBe(archer.id);
    const later = siege(true, 400);
    expect(later.s.units.some((u) => u.unitId === 'gillArcher')).toBe(false); // the guard reached and killed it
  });

  it('off: the held Capguard waits at its rally line while the archer shoots the Cellar', () => {
    const { s, cellar, guard } = siege(false, 400);
    expect(guard.targetId).toBe(0);
    expect(guard.x).toBeLessThan(6);
    expect(cellar.hp).toBeLessThan(cellar.maxHp);
    expect(s.units.some((u) => u.unitId === 'gillArcher')).toBe(true);
  });

  it('a unit that is already fighting keeps its own target', () => {
    const { guard, archer } = siege(true, 40, { busy: true });
    expect(guard.targetId).not.toBe(0);
    expect(guard.targetId).not.toBe(archer.id);
  });
});

describe('spore clouds (default data since R2a)', () => {
  it("a Mortar's shell leaves a cloud where it lands", () => {
    const s = protoState(content);
    building(s, 'player', 'puffballMortar', 4, 2);
    const knight = unit(s, 'enemy', 'amanitaKnight', 10, 3);
    freeze(s, 'enemy', 'amanitaKnight');
    steps(s, 60);
    expect(s.clouds).toHaveLength(1);
    expect(s.clouds![0]).toMatchObject({ side: 'player', lane: 0, x: knight.x, y: knight.y });
  });

  it('a cloud tower aims each shell at the densest cluster in range, not the nearest unit', () => {
    const s = protoState(content);
    building(s, 'player', 'puffballMortar', 1, 3); // centre (2, 4)
    unit(s, 'enemy', 'sporeling', 5, 4); // the nearest, alone
    const pack = [[7.5, 3], [7.5, 4], [7.5, 5], [8.2, 4]].map(([x, y]) => unit(s, 'enemy', 'sporeling', x!, y!));
    freeze(s, 'enemy', 'sporeling');
    steps(s, 1);
    expect(s.hits.find((h) => h.sourceType === 'puffballMortar')!.targetId).toBe(pack[1]!.id);
  });
});

describe('proto specs can add content', () => {
  it('presets carry content paths; new units and buildings are added and validate; + appends once', () => {
    const { raw, problems } = applyProto(readRawContent(), 'flyers,faction.velvet-bloom.buildings+:["driftStalk","gillNest"]');
    expect(problems).toEqual([]);
    const c = loadContent(raw);
    expect(c.units.driftling).toMatchObject({ hp: 70, armor: 'light', damage: 8, damageType: 'slash', attackInterval: 1, speed: 1.4, supply: 1, tags: ['flying'] });
    expect(c.buildings.driftStalk).toMatchObject({ cost: 160, spawn: { unit: 'driftling', count: 2, interval: 18 }, squad: { unit: 'driftling', count: 6 } });
    const roster = c.factions['velvet-bloom']!.buildings;
    expect(roster.filter((id) => id === 'driftStalk')).toHaveLength(1);
    expect(roster.filter((id) => id === 'gillNest')).toHaveLength(1);
    expect(c.factions['gray-rot']!.buildings).toEqual(roster);
    expect(raw['factions/velvet-bloom/faction.json']).not.toBe(readRawContent()['factions/velvet-bloom/faction.json']);
    // without the preset, none of it exists
    expect(content.units.driftling).toBeUndefined();
    expect(content.buildings.driftStalk).toBeUndefined();
    expect(content.factions['velvet-bloom']!.buildings).not.toContain('driftStalk');
    expect(applyProtoToBalance(content.balance, 'flyers').problems[0]).toMatch(/patches content/);
  });
});

describe('the Rhizomorph (default data since R2a)', () => {
  const rc = content;

  it("bots and generals weigh its tunnel 1 in data (R2-Q5); mono and test bots don't", () => {
    const weight = (s: BattleState, side: 'player' | 'enemy') => s.sides[side].ai!.weights.find((w) => w.building === 'rhizomorphTunnel')?.weight;
    const b = createBattle(rc, makeConfig(rc, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:balanced', enemy: 'general:mother-mold' }));
    expect(weight(b, 'player')).toBe(1);
    expect(weight(b, 'enemy')).toBe(1);
    expect(b.sides.player.kit).toContain('rhizomorphTunnel');
    const mono = createBattle(rc, makeConfig(rc, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:mono:gillNest', enemy: 'bot:balanced' }));
    expect(weight(mono, 'player')).toBeUndefined();
    // a test bot (the counter check's answers) keeps to its own weights
    const tc = protoContent('bot.pairtest:{"opener":["gillNest"],"weights":{"gillNest":1,"sporelingBurrow":1},"mergePolicy":"on","fixedWeights":true}');
    expect(weight(createBattle(tc, makeConfig(tc, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:pairtest', enemy: 'bot:balanced' })), 'player')).toBeUndefined();
  });

  /** A Rhizomorph burrowed at x 5 with frozen enemy Capguards in a wall at x 12, plus what `extra` adds. */
  function tunnelRun(extra: (s: BattleState) => void, ticks: number) {
    return tunnelRunWith(NO_FIELD, extra, ticks);
  }

  function tunnelRunWith(test: BattleState['config']['test'], extra: (s: BattleState) => void, ticks: number) {
    const s = protoState(rc, test);
    const rhizo = unit(s, 'player', 'rhizomorph', 5, 4);
    rhizo.burrowed = true;
    for (const y of [1, 2.5, 4, 5.5, 7]) unit(s, 'enemy', 'capguard', 12, y);
    freeze(s, 'enemy', 'capguard');
    extra(s);
    let targeted = false, maxX = rhizo.x;
    let surfacedAt = -1;
    for (let i = 0; i < ticks; i++) {
      steps(s, 1);
      if (rhizo.burrowed && s.units.some((u) => u.targetId === rhizo.id)) targeted = true;
      if (rhizo.burrowed) maxX = rhizo.x;
      if (!rhizo.burrowed && surfacedAt < 0) surfacedAt = s.tick;
    }
    return { s, rhizo, targeted, surfacedAt, maxX };
  }

  it('spawns underground from its tunnel', () => {
    const s = protoState(rc);
    addBuilding(s, 'player', 'rhizomorphTunnel', 0, 1, 3, 160);
    steps(s, 181);
    const r = s.units.find((u) => u.unitId === 'rhizomorph')!;
    expect(r.burrowed).toBe(true);
    expect(s.units.filter((u) => u.unitId !== 'rhizomorph').every((u) => u.burrowed === undefined)).toBe(true);
  });

  it('tunnels at 1.2 tiles a second under the enemy line, unseen, and surfaces beside an archer behind it', () => {
    const { s, rhizo, targeted, surfacedAt } = tunnelRun((st) => {
      const a = unit(st, 'enemy', 'gillArcher', 17, 3);
      unit(st, 'enemy', 'gillArcher', 21, 5);
      st.compiled.enemy.units.gillArcher!.tiers[0].speedPerTick = 0;
      a.cooldown = 0;
    }, 260);
    expect(targeted).toBe(false);
    expect(surfacedAt).toBeGreaterThan(150);
    expect(rhizo.burrowed).toBe(false);
    const near = s.units.find((u) => u.unitId === 'gillArcher' && Math.hypot(u.x - rhizo.x, u.y - rhizo.y) < 1.2);
    expect(near?.x).toBe(17);
    expect(rhizo.targetId).toBe(near!.id); // it prefers the ranged unit it came up beside
  });

  it('moves at its speed underground', () => {
    const { rhizo } = tunnelRun((st) => { unit(st, 'enemy', 'gillArcher', 25, 4); }, 20);
    expect(rhizo.burrowed).toBe(true);
    expect(rhizo.x).toBeCloseTo(5 + 1.2, 5);
  });

  it('with no ranged unit or spawner behind the front, it surfaces at the front', () => {
    const { rhizo, maxX } = tunnelRun(() => {}, 200);
    expect(rhizo.burrowed).toBe(false);
    expect(maxX).toBeLessThan(12);
    expect(maxX).toBeGreaterThan(10.5);
  });

  it('heads for a spawner behind the front', () => {
    const { s, rhizo } = tunnelRun((st) => { addBuilding(st, 'enemy', 'amanitaLodge', 0, 22, 0, 260).timer = 1e9; }, 400);
    expect(rhizo.burrowed).toBe(false);
    expect(rhizo.x).toBeGreaterThan(21);
    expect(s.units.filter((u) => u.side === 'enemy').every((u) => u.targetId !== rhizo.id || !rhizo.burrowed)).toBe(true);
  });

  it('prefers a ranged unit to a nearer spawner', () => {
    const { s, rhizo } = tunnelRun((st) => {
      addBuilding(st, 'enemy', 'amanitaLodge', 0, 13, 0, 260).timer = 1e9;
      unit(st, 'enemy', 'gillArcher', 20, 5);
      st.compiled.enemy.units.gillArcher!.tiers[0].speedPerTick = 0;
    }, 400);
    expect(rhizo.burrowed).toBe(false);
    expect(rhizo.x).toBeGreaterThan(18.5); // it came up beside the archer at x 20, not the Lodge at x 13–15
    expect(s.units.some((u) => u.unitId === 'gillArcher')).toBe(false);
  });

  it("skips a ranged unit or spawner an enemy tower or Heartcap turret covers, and comes up at the front instead", () => {
    // the turrets at the enemy's Heartcap (x 32) reach 9 tiles; the Mortar covers 1.5–6 tiles from (21, 5)
    const turrets = { noTerritory: true, noHeartcapTargets: true };
    const { rhizo, maxX } = tunnelRunWith(turrets, (st) => {
      unit(st, 'enemy', 'gillArcher', 25, 4); // under the turrets
      unit(st, 'enemy', 'gillArcher', 17, 4); // 4 tiles from the Mortar
      building(st, 'enemy', 'puffballMortar', 20, 4).cooldown = 1e9;
      addBuilding(st, 'enemy', 'amanitaLodge', 0, 28, 2, 260).timer = 1e9; // under the turrets
      st.compiled.enemy.units.gillArcher!.tiers[0].speedPerTick = 0;
      for (const u of st.units) if (u.unitId === 'gillArcher') u.cooldown = 1e9;
    }, 300);
    expect(rhizo.burrowed).toBe(false);
    expect(maxX).toBeLessThan(12);
    // uncovered, the same archer is its target
    const open = tunnelRunWith(turrets, (st) => {
      unit(st, 'enemy', 'gillArcher', 17, 4);
      st.compiled.enemy.units.gillArcher!.tiers[0].speedPerTick = 0;
      for (const u of st.units) if (u.unitId === 'gillArcher') u.cooldown = 1e9;
    }, 300);
    expect(open.rhizo.burrowed).toBe(false);
    expect(open.maxX).toBeGreaterThan(15);
  });

  it('holds no ground and merges with no one while underground', () => {
    const s = protoState(rc, { noTurrets: true, noHeartcapTargets: true });
    const r = unit(s, 'player', 'rhizomorph', 10.5, 4);
    r.burrowed = true;
    expect(lanePresence(s, 0).player[10]).toBe(0);
    r.burrowed = false;
    expect(lanePresence(s, 0).player[10]).toBe(2);
  });
});

describe('waves (balance waves)', () => {
  const wc = protoContent('waves');

  /** A live waves battle on the flat map with idle sides, merging off, plus optional battle modifiers. */
  function waveState(modifiers?: BattleState['config']['modifiers'], c: Content = wc): BattleState {
    const config = makeConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', test: NO_FIELD, flags: { merging: false } });
    if (modifiers) config.modifiers = modifiers;
    const s = createBattle(c, config);
    s.phase = 'live';
    return s;
  }

  it('is off by default: spawns walk straight out', () => {
    expect(content.balance.waves).toBeUndefined();
    const s = liveState({ test: NO_FIELD });
    expect(s.rules.waves).toBeUndefined();
    expect(s.compiled.player.waveBeatTicks).toBeUndefined();
    const b = building(s, 'player', 'sporelingBurrow', 1, 3);
    steps(s, 160);
    expect(s.units).toHaveLength(2);
    expect(b.stored).toBeUndefined();
    expect(s.units[0]!.wave).toBeUndefined();
  });

  it('spawns wait inside, counting toward supply, and both sides release on the same 20 s beat', () => {
    const s = waveState();
    expect(s.rules.waves).toEqual({ rangedGap: 1, matchPace: true });
    expect(s.compiled.player.waveBeatTicks).toBe(400);
    const pb = addBuilding(s, 'player', 'sporelingBurrow', 0, 1, 3, 110);
    addBuilding(s, 'enemy', 'gillNest', 0, 29, 3, 150);
    steps(s, 160);
    expect(s.units).toHaveLength(0);
    expect(pb.stored).toBe(2);
    expect(s.sides.player.supplyUsed).toBe(2);
    steps(s, 239);
    expect(s.units).toHaveLength(0);
    steps(s, 1);
    expect(s.tick).toBe(400);
    expect(s.events.filter((e) => e.t === 'release')).toEqual([
      { t: 'release', side: 'player', units: 2, held: [], shielded: [] }, { t: 'release', side: 'enemy', units: 1, held: [], shielded: [] },
    ]);
    expect(s.units.map((u) => [u.side, u.unitId, u.wave])).toEqual([['player', 'sporeling', 1], ['player', 'sporeling', 1], ['enemy', 'gillArcher', 1]]);
    expect(pb.stored).toBe(0);
    expect(s.sides.player.supplyUsed).toBe(2);
  });

  it('holding a lane keeps its wave home for one beat, and the beat spends the hold', () => {
    const s = waveState();
    const pb = addBuilding(s, 'player', 'sporelingBurrow', 0, 1, 3, 110);
    steps(s, 300);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'stance', lane: 0, hold: true });
    steps(s, 100);
    expect(s.units).toHaveLength(0);
    expect(s.sides.player.stance![0]!.hold).toBe(false);
    expect(s.events.find((e) => e.t === 'release')).toEqual({ t: 'release', side: 'player', units: 0, held: [0], shielded: [] });
    steps(s, 400);
    expect(pb.stored).toBe(0);
    expect(s.units).toHaveLength(6); // spawns at 8, 24 and 40 s, out together at 40 s
  });

  it("a hold lasts one beat: after a held beat the lane can't hold again until the next beat sends both waves", () => {
    const s = waveState();
    addBuilding(s, 'player', 'sporelingBurrow', 0, 1, 3, 110);
    queueCommand(s, { tick: 301, side: 'player', type: 'stance', lane: 0, hold: true });
    steps(s, 400); // tick 400: the held beat
    expect(s.sides.player.stance![0]!.readyAt).toBe(801);
    queueCommand(s, { tick: 700, side: 'player', type: 'stance', lane: 0, hold: true }); // past the 10 s cooldown
    steps(s, 400);
    expect(s.stats.player.rejectedCommands).toBe(1);
    expect(s.sides.player.stance![0]!.hold).toBe(false);
    expect(s.units).toHaveLength(6); // both waves left at 40 s
    queueCommand(s, { tick: 801, side: 'player', type: 'stance', lane: 0, hold: true });
    steps(s, 1);
    expect(s.sides.player.stance![0]!.hold).toBe(true);
  });

  it('a spawner behind the front one leaves early, so its units pass the front door on the beat', () => {
    // Burrow door at x 3.3, Capguard Hall door at x 10.3: 7 tiles apart
    for (const matchPace of [true, false]) {
      const s = waveState(undefined, protoContent(`waves,waves.matchPace:${matchPace}`));
      addBuilding(s, 'player', 'sporelingBurrow', 0, 1, 3, 110);
      addBuilding(s, 'player', 'capguardHall', 0, 8, 3, 150);
      const lead = Math.round(7 / ((matchPace ? 0.75 : 1.5) / 20)); // at the Capguards' pace, or their own
      steps(s, 400 - lead - 1);
      expect(s.units).toHaveLength(0);
      steps(s, 1);
      expect(s.units.map((u) => [u.unitId, u.wave])).toEqual([['sporeling', 1], ['sporeling', 1]]);
      steps(s, lead);
      expect(s.tick).toBe(400);
      const sporelings = s.units.filter((u) => u.unitId === 'sporeling');
      for (const u of sporelings) expect(Math.abs(u.x - 10.3)).toBeLessThan(0.25);
      expect(s.units.filter((u) => u.unitId === 'capguard')).toHaveLength(1);
      expect(s.events.find((e) => e.t === 'release' && e.side === 'player')).toMatchObject({ units: 3 });
    }
  });

  it('a hold under waves lasts until the beat, not 30 s', () => {
    const s = waveState();
    s.sides.player.stance![0] = { hold: true, since: 0, readyAt: 0 };
    s.sides.player.stance![0]!.since = -1000;
    steps(s, 10);
    expect(s.sides.player.stance![0]!.hold).toBe(true);
  });

  it('a spawner sold or destroyed lets its waiting units out', () => {
    for (const how of ['sold', 'destroyed'] as const) {
      const s = waveState();
      const pb = addBuilding(s, 'player', 'sporelingBurrow', 0, 1, 3, 110);
      steps(s, 170);
      if (how === 'sold') queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'sell', entityId: pb.id });
      else pb.hp = 0;
      steps(s, 1);
      expect(s.buildings).toHaveLength(0);
      expect(s.units.map((u) => [u.unitId, u.wave])).toEqual([['sporeling', undefined], ['sporeling', undefined]]);
      expect(s.sides.player.supplyUsed).toBe(2);
    }
  });

  it('a wave marches at its slowest idle unit’s pace, ranged units a tile behind their melee', () => {
    const march = (c: Content) => {
      const s = waveState(undefined, c);
      addBuilding(s, 'player', 'sporelingBurrow', 0, 1, 0, 110);
      addBuilding(s, 'player', 'capguardHall', 0, 1, 3, 150);
      addBuilding(s, 'player', 'gillNest', 0, 1, 6, 150);
      steps(s, 400);
      const at = s.units.map((u) => u.x);
      steps(s, 100);
      const moved = (id: string) => { const i = s.units.findIndex((u) => u.unitId === id); return s.units[i]!.x - at[i]!; };
      const x = (id: string) => s.units.find((u) => u.unitId === id)!.x;
      return { sporeling: moved('sporeling'), capguard: moved('capguard'), gap: x('capguard') - x('gillArcher') };
    };
    const paced = march(wc);
    expect(paced.capguard).toBeCloseTo(100 * 0.75 / 20, 5);
    expect(paced.sporeling).toBeCloseTo(paced.capguard, 1);
    expect(paced.gap).toBeGreaterThan(0.99);
    const free = march(protoContent('waves,waves.matchPace:false'));
    expect(free.sporeling).toBeGreaterThan(1.9 * free.capguard);
  });

  it('the AI never holds under waves', () => {
    const s = createBattle(wc, makeConfig(wc, { seed: 2, mapId: 'bogwater-hollow', player: 'bot:balanced', enemy: 'general:mother-mold' }));
    queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
    let holds = 0, releases = 0;
    runHeadless(s, { until: 2400, onTick: (st) => {
      for (const e of st.events) { if (e.t === 'stance' && e.hold) holds++; if (e.t === 'release') releases++; }
    } });
    expect(holds).toBe(0);
    expect(releases).toBe(12); // both sides, every 20 s for 2 minutes
  });

  it('the beat and the wave size are modifier stats', () => {
    const s = waveState([{ side: 'player', source: 'test', effects: { modifiers: [
      { stat: 'side.waveBeat', op: 'set', value: 10 }, { stat: 'side.waveSize', op: 'mul', value: 2 },
    ] } }]);
    expect(s.compiled.player.waveBeatTicks).toBe(200);
    expect(s.compiled.enemy.waveBeatTicks).toBe(400);
    expect(s.compiled.player.waveSize).toBe(2);
    addBuilding(s, 'player', 'sporelingBurrow', 0, 1, 3, 110);
    steps(s, 200);
    expect(s.units).toHaveLength(4); // two waiting, released twice over at 10 s
    expect(s.sides.player.supplyUsed).toBe(4);
  });
});

describe('mixed waves (balance mixedWave)', () => {
  const mc = protoContent('mixedwave');

  /** A live mixed-waves battle on the flat map with idle sides and merging off; `ids` are player spawners in lane 0. */
  function mixedState(ids: string[], c: Content = mc): BattleState {
    const s = createBattle(c, makeConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', test: NO_FIELD, flags: { merging: false } }));
    s.phase = 'live';
    ids.forEach((id, i) => addBuilding(s, 'player', id, 0, 1, i * 2, 150));
    return s;
  }

  it('is off by default and needs waves', () => {
    expect(content.balance.mixedWave).toBeUndefined();
    expect(liveState().rules.mixed).toBeUndefined();
    expect(protoState(protoContent('waves')).rules.mixed).toBeUndefined();
    expect(protoState(protoContent('mixedWave:{"minTypes":3,"shieldFrac":0.2}')).rules.mixed).toBeUndefined();
    expect(protoState(mc).rules.mixed).toEqual({ minTypes: 2, shieldFrac: 0.2 });
  });

  it("a lane's wave of enough unit types sets out with shields of 20% of each unit's max HP; fewer get none", () => {
    const three = protoContent('mixedwave,mixedWave.minTypes:3');
    const s = mixedState(['sporelingBurrow', 'capguardHall', 'gillNest'], three);
    steps(s, 400);
    expect(s.units.map((u) => [u.unitId, u.shield])).toEqual([['sporeling', 14], ['sporeling', 14], ['capguard', 44], ['gillArcher', 22]]);
    expect(s.events.find((e) => e.t === 'release' && e.side === 'player')).toMatchObject({ shielded: [0] });
    const two = mixedState(['sporelingBurrow', 'gillNest'], three);
    steps(two, 400);
    expect(two.units.every((u) => u.shield === undefined)).toBe(true);
    const preset = mixedState(['sporelingBurrow', 'gillNest']); // the preset's 2 types
    steps(preset, 400);
    expect(preset.units.map((u) => u.shield)).toEqual([14, 14, 22]);
    const one = mixedState(['sporelingBurrow']);
    steps(one, 400);
    expect(one.units.every((u) => u.shield === undefined)).toBe(true);
  });

  it('a shield takes damage of every kind before HP, and breaks once spent', () => {
    const s = protoState(protoContent('mixedwave'));
    const v = unit(s, 'enemy', 'capguard', 10, 3);
    freeze(s, 'enemy', 'capguard');
    v.shield = 15;
    addCloud(s, 'player', 0, 10, 3, 0, s.rules.cloud!);
    steps(s, 20); // one pulse of 10
    expect([v.shield, v.hp]).toEqual([5, v.maxHp]);
    steps(s, 20);
    expect([v.shield, v.hp]).toEqual([undefined, v.maxHp - 5]);
    const archer = unit(s, 'player', 'gillArcher', 6, 3);
    const w = unit(s, 'enemy', 'sporeling', 9, 3);
    freeze(s, 'enemy', 'sporeling');
    w.shield = 100;
    archer.cooldown = 0;
    steps(s, 40);
    expect(w.hp).toBe(w.maxHp);
    expect(w.shield).toBeLessThan(100);
  });

  it("a merge keeps the trio's shields in proportion, as it does their HP", () => {
    const s = liveState({ flags: { merging: true }, test: NO_FIELD });
    s.rules.mixed = { minTypes: 3, shieldFrac: 0.2 };
    for (const t of s.compiled.player.units.capguard!.tiers) t.speedPerTick = 0;
    const trio: UnitState[] = [0, 1, 2].map((i) => unit(s, 'player', 'capguard', 12, 3.5 + i * 0.7));
    trio[0]!.shield = 44; trio[1]!.shield = 44;
    steps(s, 10 + s.compiled.player.knitTicks);
    const m = s.units.find((u) => u.tier === 2)!;
    expect(m.shield).toBe(Math.round((m.maxHp * 88) / 660));
  });
});

describe('the Burster (default data since R2a)', () => {
  const bc = content;

  it("its Pod, which bots and generals weigh 1 in data (R2-Q5); mono and test bots don't", () => {
    expect(bc.units.burster).toMatchObject({ hp: 50, armor: 'light', damage: 40, speed: 1.6, supply: 1, aggroRange: 5, splashRadius: 1.5, tags: ['burst'] });
    expect(bc.buildings.bursterPod).toMatchObject({ cost: 130, spawn: { unit: 'burster', count: 1, interval: 10 }, squad: { unit: 'burster', count: 6 } });
    const s = protoState(bc);
    expect(s.rules.burst).toEqual({ cloud: { radius: 1.5, ticks: 80, damage: 10, pulseTicks: 20 } });
    const weight = (st: BattleState, side: 'player' | 'enemy' = 'player') => st.sides[side].ai!.weights.find((w) => w.building === 'bursterPod')?.weight;
    const battle = (c: Content, player: string) => createBattle(c, makeConfig(c, { seed: 1, mapId: 'bogwater-hollow', player, enemy: 'general:mother-mold' }));
    expect(weight(battle(bc, 'bot:balanced'))).toBe(1);
    expect(weight(battle(bc, 'bot:balanced'), 'enemy')).toBe(1);
    expect(weight(battle(bc, 'bot:mono:gillNest'))).toBeUndefined();
    const tc = protoContent('bot.pairtest:{"opener":["gillNest"],"weights":{"gillNest":1},"mergePolicy":"on","fixedWeights":true}');
    expect(weight(battle(tc, 'bot:pairtest'))).toBeUndefined();
    // every data bot and every general, as R1 measured them under aiWeight
    for (const p of [...Object.values(bc.bots), ...Object.values(bc.generals)]) expect([p.weights.bursterPod, p.weights.rhizomorphTunnel], p.id).toEqual([1, 1]);
  });

  it('heads for the enemy unit in its aggro range with the most enemy units within 1.5 tiles', () => {
    const s = protoState(bc);
    const b = unit(s, 'player', 'burster', 5, 4);
    unit(s, 'enemy', 'sporeling', 7.5, 4); // the nearest, alone
    const knot = [[9.5, 2], [9.5, 2.6], [10, 2.3]].map(([x, y]) => unit(s, 'enemy', 'sporeling', x!, y!));
    freeze(s, 'enemy', 'sporeling');
    steps(s, 1);
    expect(b.targetId).toBe(knot[1]!.id); // the knot's nearest member
  });

  it('bursts where it dies, and a burst can set off another Burster', () => {
    const s = protoState(bc);
    const mine = unit(s, 'player', 'burster', 10, 4);
    const theirs = unit(s, 'enemy', 'burster', 11, 4);
    const victim = unit(s, 'enemy', 'capguard', 10.6, 3);
    const friend = unit(s, 'player', 'capguard', 11.8, 4.6);
    for (const id of ['burster', 'capguard'] as const) { freeze(s, 'player', id); freeze(s, 'enemy', id); }
    theirs.hp = 30;
    mine.hp = 0;
    steps(s, 1);
    expect(s.events.filter((e) => e.t === 'burst').map((e) => (e as { id: number }).id)).toEqual([mine.id, theirs.id]);
    expect(victim.maxHp - victim.hp).toBe(40);
    expect(friend.maxHp - friend.hp).toBe(40); // the enemy Burster's burst
    expect(s.units.map((u) => u.unitId)).toEqual(['capguard', 'capguard']);
    expect(s.clouds).toHaveLength(2);
  });

  it('never merges', () => {
    const s = protoState(bc, { noTurrets: true, noTerritory: true, noHeartcapTargets: true });
    s.config.flags.merging = true;
    for (const t of s.compiled.player.units.burster!.tiers) t.speedPerTick = 0;
    for (const i of [0, 1, 2]) unit(s, 'player', 'burster', 12, 3.5 + i * 0.7);
    steps(s, 40);
    expect(s.units.filter((u) => u.knit)).toEqual([]);
    expect(s.units.every((u) => u.tier === 1)).toBe(true);
  });
});

describe('the package (preset rework)', () => {
  it("is P1d's base, plus the storm, the swarm read and flyers under rule C: mixed waves at two types, the Burster, no Elder splash, at 20 s", () => {
    const rc = protoContent('rework');
    const s = protoState(rc);
    expect(s.rules.pin).toBeDefined();
    expect(s.rules.help).toBeDefined();
    expect(s.rules.mixed).toEqual({ minTypes: 2, shieldFrac: 0.2 });
    expect(s.compiled.player.waveBeatTicks).toBe(400);
    expect(s.rules.burst).toBeDefined();
    expect(s.rules.stormWaves).toEqual({ perStack: 0.2 });
    // P3 played it without the Mortar's clouds and cleave, which are default data since R2a
    expect(s.rules.cloud).toBeDefined();
    expect(s.rules.cleave).toEqual({ units: ['scythecap'] });
    expect(s.compiled.player.units.sporeling!.tiers.map((t) => t.splashRadius)).toEqual([0, 0, 0]);
    expect(s.rules.flying).toEqual({ reachSupply: 1, meleeMult: 0.5, mergedReach: false, cloudsReach: true, holdsGround: false });
    for (const f of ['velvet-bloom', 'gray-rot']) expect(rc.factions[f]!.buildings.slice(-3)).toEqual(['bursterPod', 'rhizomorphTunnel', 'driftStalk']);
    // the shipped unit keeps its Elder splash
    expect(liveState().compiled.player.units.sporeling!.tiers[2]!.splashRadius).toBe(0.6);
  });

  it("the Burster's bursts leave clouds, and since R2a the Mortar's shells do too, at 7 tiles", () => {
    const rc = protoContent('rework');
    const s = protoState(rc);
    expect(s.compiled.player.buildings.puffballMortar!.attack!.range).toBe(7);
    expect(s.clouds).toEqual([]);
    building(s, 'player', 'puffballMortar', 4, 2);
    const shelled = unit(s, 'enemy', 'amanitaKnight', 10, 3);
    freeze(s, 'enemy', 'amanitaKnight');
    steps(s, 60);
    expect(shelled.hp).toBeLessThan(shelled.maxHp);
    expect(s.clouds).toHaveLength(1);

    const b = protoState(rc);
    const knight = unit(b, 'enemy', 'amanitaKnight', 10, 3);
    freeze(b, 'enemy', 'amanitaKnight');
    unit(b, 'player', 'burster', 8.5, 3);
    let at = -1;
    for (let i = 0; i < 40 && at < 0; i++) { steps(b, 1); if (b.events.some((e) => e.t === 'burst')) at = b.tick; }
    expect(at).toBeGreaterThan(0);
    expect(b.clouds).toHaveLength(1);
    expect(b.clouds![0]).toMatchObject({ side: 'player', radius: 1.5, damage: 10, untilTick: at + 80 });
    steps(b, 80);
    expect(b.clouds).toEqual([]);
    expect(knight.maxHp - knight.hp).toBe(80); // 40 from the burst, 40 from 4 s of cloud
  });
});

describe('a storm that grows waves (preset stormwaves)', () => {
  const sc = protoContent('waves,stormwaves');

  function stormState(stacks: number, ids: string[]): BattleState {
    const s = createBattle(sc, makeConfig(sc, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', test: NO_FIELD, flags: { merging: false } }));
    s.phase = 'live';
    s.sporestorm = stacks;
    ids.forEach((id, i) => addBuilding(s, 'player', id, 0, 1, i * 2, 150));
    return s;
  }

  it('is off by default and needs waves', () => {
    expect(content.balance.stormWaves).toBeUndefined();
    expect(liveState().rules.stormWaves).toBeUndefined();
    expect(protoState(protoContent('stormWaves:{"perStack":0.2}')).rules.stormWaves).toBeUndefined();
    expect(protoState(sc).rules.stormWaves).toEqual({ perStack: 0.2 });
  });

  it('each stack makes a wave 20% bigger: twice the size at five stacks', () => {
    const s = stormState(5, ['sporelingBurrow']);
    steps(s, 400);
    expect(s.units).toHaveLength(4); // 2 waiting, released ×2
    const calm = stormState(0, ['sporelingBurrow']);
    steps(calm, 400);
    expect(calm.units).toHaveLength(2);
  });

  it('a spawner carries the fraction to its next release, so one stack adds a fifth over time', () => {
    const s = stormState(1, ['gillNest']); // one archer every 15 s: 5 by 28.5 s
    steps(s, 1600);
    expect(s.units).toHaveLength(6); // 1, 2, 1 and 2 at the four beats: 5 × 1.2
    expect(s.buildings[0]!.waveCarry).toBe(0);
  });

  it('extra units need free supply; the cap holds them back', () => {
    const s = stormState(5, ['sporelingBurrow']);
    s.sides.player.supplyCap = 3;
    let capped = 0;
    for (let i = 0; i < 400; i++) { steps(s, 1); for (const e of s.events) if (e.t === 'waveCapped') capped += e.units; }
    expect(s.units).toHaveLength(3);
    expect(capped).toBe(1);
  });
});

describe("the general's swarm read (preset swarmread)", () => {
  /** A counter state that saw each spawner make 8 units a wave, 7 of them knit into merges. */
  function mergeHeavy(ids: number[]): CounterState {
    const t: CounterState = { schedule: [], history: [], current: -1, track: {}, waveIds: [], samples: [] };
    for (const id of ids) t.track[String(id)] = { spawned: { 0: 8, 1: 8 }, merged: { 0: 7, 1: 7 } };
    return t;
  }
  const read = (c: Content, ids: string[]) => {
    const s = protoState(c);
    s.tick = 2400;
    const bs = ids.map((id, i) => building(s, 'player', id, 0, i * 2));
    return analyzeMix(s, 'player', mergeHeavy(bs.map((b) => b.id)));
  };

  it('is off by default: a merge-heavy Sporeling swarm reads as Elite (SPEC §7.4)', () => {
    expect(content.balance.ai.counter.swarmMaxSupply).toBeUndefined();
    expect(liveState().rules.ai.counter.swarmMaxSupply).toBeUndefined();
    expect(topKind(read(content, ['sporelingBurrow', 'sporelingBurrow']).scores)).toBe('elite');
  });

  it("under rework, 1-supply units' merges leave the Elite share: the swarm reads as Swarm, merging Capguards still as Elite", () => {
    const rc = protoContent('rework');
    expect(protoState(rc).rules.ai.counter.swarmMaxSupply).toBe(1);
    const swarm = read(rc, ['sporelingBurrow', 'sporelingBurrow']);
    expect(swarm.shares.elite).toBe(0);
    expect(swarm.scores.swarm).toBe(1);
    expect(topKind(swarm.scores)).toBe('swarm');
    expect(topKind(read(rc, ['veilstalkerHollow', 'veilstalkerHollow']).scores)).toBe('swarm');
    const capguards = read(rc, ['capguardHall', 'capguardHall']);
    expect(capguards.shares.elite).toBeCloseTo(7 / 8, 9);
    expect(topKind(capguards.scores)).toBe('elite');
  });
});

describe('flyers (preset flyers)', () => {
  const fc = protoContent('flyers');
  // the design's first pick, reach, which the preset's rule C replaced for the playtest
  const REACH = 'flyers,flying.reachSupply:2,flying.meleeMult:1';

  it("is off by default; the preset adds the Driftling and its Drift Stalk, which R2-Q5's bots and the generals buy at weight 1, and mono bots never", () => {
    expect(content.units.driftling).toBeUndefined();
    expect(content.balance.flying).toBeUndefined();
    expect(liveState().rules.flying).toBeUndefined();
    expect(fc.units.driftling).toMatchObject({ hp: 70, armor: 'light', damage: 8, damageType: 'slash', range: 1, speed: 1.4, supply: 1, aggroRange: 5, tags: ['flying'] });
    expect(fc.buildings.driftStalk).toMatchObject({ cost: 160, spawn: { unit: 'driftling', count: 2, interval: 18 }, squad: { unit: 'driftling', count: 6 } });
    for (const f of ['velvet-bloom', 'gray-rot']) expect(fc.factions[f]!.buildings).toContain('driftStalk');
    const s = protoState(fc);
    expect(s.rules.flying).toEqual({ reachSupply: 1, meleeMult: 0.5, mergedReach: false, cloudsReach: true, holdsGround: false });
    expect(unit(s, 'player', 'driftling', 5, 4).flying).toBe(true);
    expect(unit(s, 'player', 'sporeling', 6, 4).flying).toBeUndefined();
    const weight = (st: BattleState) => st.sides.player.ai!.weights.find((w) => w.building === 'driftStalk')?.weight;
    const battle = (c: Content, player: string) => createBattle(c, makeConfig(c, { seed: 1, mapId: 'bogwater-hollow', player, enemy: 'bot:balanced' }));
    expect(weight(battle(fc, 'bot:balanced'))).toBe(1);
    expect(weight(battle(fc, 'bot:mono:gillNest'))).toBeUndefined();
    for (const p of [...Object.values(fc.bots), ...Object.values(fc.generals)]) expect(p.weights.driftStalk, p.id).toBe(1);
  });

  it('under rule C every unit targets a flyer, the small fry too', () => {
    const s = protoState(fc);
    const d = unit(s, 'enemy', 'driftling', 10, 4);
    freeze(s, 'enemy', 'driftling');
    const all = [unit(s, 'player', 'sporeling', 8, 2), unit(s, 'player', 'veilstalker', 8, 5), unit(s, 'player', 'capguard', 8, 6), unit(s, 'player', 'gillArcher', 6, 4)];
    steps(s, 1);
    expect(all.map((u) => u.targetId)).toEqual([d.id, d.id, d.id, d.id]);
  });

  it('under reach only reach targets a flyer: big melee units, archers and other flyers; never the small fry, merged or not', () => {
    const s = protoState(protoContent(REACH));
    const d = unit(s, 'enemy', 'driftling', 10, 4);
    freeze(s, 'enemy', 'driftling');
    const small = [unit(s, 'player', 'sporeling', 8, 2), unit(s, 'player', 'sporeling', 8, 3, 3), unit(s, 'player', 'veilstalker', 8, 5)];
    const reach = [unit(s, 'player', 'capguard', 8, 6), unit(s, 'player', 'gillArcher', 6, 4), unit(s, 'player', 'driftling', 8, 7)];
    steps(s, 1);
    expect(small.map((u) => u.targetId)).toEqual([0, 0, 0]);
    expect(reach.map((u) => u.targetId)).toEqual([d.id, d.id, d.id]);
    // the softer variant: a merged unit's own supply counts (a Bloomed Sporeling is 2)
    const m = protoState(protoContent(`${REACH},flying.mergedReach:true`));
    const d2 = unit(m, 'enemy', 'driftling', 10, 4);
    freeze(m, 'enemy', 'driftling');
    const bloomed = unit(m, 'player', 'sporeling', 8, 3, 2), base = unit(m, 'player', 'sporeling', 8, 5);
    steps(m, 1);
    expect([bloomed.targetId, base.targetId]).toEqual([d2.id, 0]);
  });

  it("Heartcap turrets reach a flyer; the Mortar's lob neither targets one nor splashes it, though its cloud does", () => {
    const t = protoState(fc, { noTerritory: true, noHeartcapTargets: true });
    const d = unit(t, 'enemy', 'driftling', 3, 4);
    freeze(t, 'enemy', 'driftling');
    steps(t, 40);
    expect(d.hp).toBeLessThan(d.maxHp);

    const s = protoState(fc);
    const mortar = building(s, 'player', 'puffballMortar', 4, 2);
    const near = unit(s, 'enemy', 'driftling', 8, 3); // nearer than the Capguard
    const cap = unit(s, 'enemy', 'capguard', 10, 3);
    const beside = unit(s, 'enemy', 'driftling', 10.5, 3.6); // inside the shell's splash
    for (const id of ['driftling', 'capguard'] as const) freeze(s, 'enemy', id);
    steps(s, 1);
    expect(mortar.targetId).toBe(cap.id);
    for (let i = 0; i < 80 && cap.hp === cap.maxHp; i++) steps(s, 1);
    expect(cap.hp).toBeLessThan(cap.maxHp);
    expect([near.hp, beside.hp]).toEqual([near.maxHp, beside.maxHp]);
    // the shell's cloud, the shipped rule since R2a, reaches a flyer in it (cloudsReach)
    steps(s, 40);
    expect([near.hp < near.maxHp, beside.hp < beside.maxHp]).toEqual([false, true]);
  });

  it("splash follows its attacker's reach: under reach an Elder Sporeling's skips a flyer, a Scythecap's catches one", () => {
    const swing = (attacker: string, tier: 1 | 3) => {
      const s = protoState(protoContent(REACH));
      const target = unit(s, 'enemy', 'capguard', 10, 4);
      const flyer = unit(s, 'enemy', 'driftling', 10.3, 4.55);
      const ground = unit(s, 'enemy', 'sporeling', 10.3, 3.45);
      for (const id of ['capguard', 'driftling', 'sporeling'] as const) freeze(s, 'enemy', id);
      unit(s, 'player', attacker, 9.3, 4, tier);
      steps(s, 10);
      return [target, ground, flyer].map((u) => u.maxHp - u.hp > 0);
    };
    expect(swing('sporeling', 3)).toEqual([true, true, false]);
    expect(swing('scythecap', 1)).toEqual([true, true, true]);
  });

  it('spore clouds reach a flyer unless cloudsReach is off; a burst never does', () => {
    for (const reach of [true, false]) {
      const s = protoState(protoContent(`flyers${reach ? '' : ',flying.cloudsReach:false'}`));
      const d = unit(s, 'enemy', 'driftling', 10, 3);
      freeze(s, 'enemy', 'driftling');
      addCloud(s, 'player', 0, 10, 3, 0, s.rules.burst!.cloud);
      steps(s, 100);
      expect(d.maxHp - d.hp).toBe(reach ? 40 : 0);
    }
    const s = protoState(protoContent('flyers'));
    const b = unit(s, 'player', 'burster', 10, 4);
    const flyer = unit(s, 'enemy', 'driftling', 10.6, 4);
    const ground = unit(s, 'enemy', 'sporeling', 10, 4.8);
    for (const id of ['driftling', 'sporeling'] as const) freeze(s, 'enemy', id);
    freeze(s, 'player', 'burster');
    b.hp = 0;
    steps(s, 1);
    expect(s.events.some((e) => e.t === 'burst')).toBe(true);
    expect([ground.maxHp - ground.hp, flyer.maxHp - flyer.hp]).toEqual([40, 0]);
  });

  it('a flyer passes over ground units, keeps apart from other flyers, and holds no ground unless holdsGround', () => {
    for (const holds of [false, true]) {
      const s = protoState(protoContent(`flyers${holds ? ',flying.holdsGround:true' : ''}`));
      const g = unit(s, 'player', 'capguard', 10.5, 4);
      const a = unit(s, 'player', 'driftling', 10.5, 4);
      const b = unit(s, 'player', 'driftling', 10.6, 4);
      for (const id of ['capguard', 'driftling'] as const) freeze(s, 'player', id);
      steps(s, 1);
      expect([g.x, g.y]).toEqual([10.5, 4]);
      expect(b.x - a.x).toBeGreaterThan(0.4);
      expect(lanePresence(s, 0).player[10]).toBe(holds ? 4 : 2);
    }
  });

  it('a call for help against a flyer brings only the friends that can hit it (under reach)', () => {
    const s = protoState(protoContent(`callforhelp,${REACH}`));
    const d = unit(s, 'enemy', 'driftling', 10, 4);
    const victim = unit(s, 'player', 'sporeling', 9.4, 4);
    const sporeling = unit(s, 'player', 'sporeling', 5, 2); // outside their aggro, inside the call
    const capguard = unit(s, 'player', 'capguard', 5, 6);
    for (const id of ['sporeling', 'capguard'] as const) freeze(s, 'player', id);
    steps(s, 2);
    expect(victim.hp).toBeLessThan(victim.maxHp);
    expect([victim.targetId, sporeling.targetId, capguard.targetId]).toEqual([0, 0, d.id]);
  });

  it('under waves, an idle flyer hovers over its melee front and never counts as the front', () => {
    const s = protoState(protoContent('waves,flyers'));
    const cap = unit(s, 'player', 'capguard', 8, 3);
    const ahead = unit(s, 'player', 'driftling', 12, 5);
    steps(s, 20);
    expect(ahead.x).toBe(12);
    expect(cap.x).toBeGreaterThan(8);
    const t = protoState(protoContent('waves,flyers'));
    const archer = unit(t, 'player', 'gillArcher', 6, 3);
    unit(t, 'player', 'driftling', 8, 5);
    freeze(t, 'player', 'driftling');
    steps(t, 40);
    expect(archer.x).toBeGreaterThan(7); // an archer stays 1 tile behind a melee front, not behind a flyer
  });

  it("meleeMult (×0.5 under rule C) scales a ground unit's melee hit on a flyer; an archer's shot and a flyer's cut are unchanged", () => {
    const hit = (spec: string, attacker: string) => {
      const s = protoState(protoContent(spec));
      const d = unit(s, 'enemy', 'driftling', 10, 4);
      freeze(s, 'enemy', 'driftling');
      unit(s, 'player', attacker, attacker === 'gillArcher' ? 7 : 9.4, 4);
      steps(s, 15);
      return d.maxHp - d.hp;
    };
    for (const a of ['capguard', 'sporeling', 'gillArcher', 'driftling']) {
      const full = hit('flyers,flying.meleeMult:1', a), half = hit('flyers', a);
      expect(full).toBeGreaterThan(0);
      if (a === 'capguard' || a === 'sporeling') expect(Math.abs(half - full / 2)).toBeLessThanOrEqual(0.5);
      else expect(half).toBe(full);
    }
  });

  it("a ground unit's melee hit on a flyer sparks for what it deals: a Sporeling's slash reads weak, not strong", () => {
    // the sim classes a hit on matrix × tag, before the flyer's ×0.5; the renderer shows the class after it
    const first = (s: BattleState, target: UnitState, attacker: UnitState) => {
      const last = new Map<number, UnitState>();
      for (let i = 0; i < 60; i++) {
        last.clear();
        for (const u of s.units) last.set(u.id, u);
        steps(s, 1);
        const e = s.events.find((x) => x.t === 'hit' && x.target === target.id && x.src === attacker.id);
        if (e?.t === 'hit') return { sim: e.eff, shown: shownEffectiveness(s, e, last), unread: shownEffectiveness(s, e, new Map()), felled: !s.units.includes(target) };
      }
      throw new Error(`${attacker.unitId} never hit the ${target.unitId}`);
    };
    const onFlyer = (spec: string, attacker: string, tier: Tier = 1, flyerTier: Tier = 1, flyerHp = 0) => {
      const s = protoState(protoContent(spec));
      const d = unit(s, 'enemy', 'driftling', 10, 4, flyerTier);
      freeze(s, 'enemy', 'driftling');
      if (flyerHp) d.hp = flyerHp;
      return first(s, d, unit(s, 'player', attacker, attacker === 'gillArcher' ? 7 : 9.4, 4, tier));
    };
    expect(onFlyer('flyers', 'sporeling')).toMatchObject({ sim: 'strong', shown: 'weak' }); // Slash vs Light, 1.5 × 0.5
    expect(onFlyer('flyers', 'capguard')).toMatchObject({ sim: 'strong', shown: 'weak' });
    expect(onFlyer('flyers', 'veilstalker')).toMatchObject({ sim: 'normal', shown: 'weak' }); // Pierce, 1 × 0.5
    expect(onFlyer('flyers', 'veilstalker', 1, 2)).toMatchObject({ sim: 'strong', shown: 'strong' }); // its slayer ×3 on a Bloomed flyer: 1.5
    expect(onFlyer('flyers', 'gillArcher')).toMatchObject({ sim: 'normal', shown: 'normal' }); // a shot keeps its class
    expect(onFlyer('flyers', 'driftling')).toMatchObject({ sim: 'strong', shown: 'strong' }); // and so does a flyer's cut
    expect(onFlyer('flyers,flying.meleeMult:1', 'sporeling')).toMatchObject({ sim: 'strong', shown: 'strong' });
    // a killing blow: the flyer has left the field, and only the tick before's units still name it
    expect(onFlyer('flyers', 'sporeling', 1, 1, 1)).toEqual({ sim: 'strong', shown: 'weak', unread: 'strong', felled: true });
    // the default game has no flyers: every hit keeps the sim's class
    const s = liveState();
    const archer = unit(s, 'enemy', 'gillArcher', 10, 4);
    freeze(s, 'enemy', 'gillArcher');
    expect(first(s, archer, unit(s, 'player', 'sporeling', 9.4, 4))).toMatchObject({ sim: 'strong', shown: 'strong' });
  });

  it('a flyer born and felled in the same tick is read from its events', () => {
    const s = protoState(fc);
    const d = unit(s, 'enemy', 'driftling', 10, 4), a = unit(s, 'player', 'sporeling', 9.4, 4);
    s.units.splice(s.units.indexOf(d), 1);
    const hit: Extract<SimEvent, { t: 'hit' }> = { t: 'hit', target: d.id, src: a.id, amount: 6, eff: 'strong', x: 10, y: 4, splash: false };
    s.events = [{ t: 'spawned', id: d.id }, hit, { t: 'died', id: d.id, side: 'enemy', unitId: 'driftling', x: 10, y: 4 }];
    expect(shownEffectiveness(s, hit, new Map())).toBe('weak');
    s.events.shift(); // with no birth to give its tier it can't be read, and the sim's class stands
    expect(shownEffectiveness(s, hit, new Map())).toBe('strong');
  });

  it('over a battle only ground melee hits on flyers change class, killing blows too, and the sim never notices', () => {
    const c = protoContent('rework');
    const make = () => createBattle(c, makeConfig(c, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:mono:driftStalk', enemy: 'bot:balanced' }));
    const s = make();
    queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
    const last = new Map<number, UnitState>();
    const changed: Record<string, number> = {};
    let blows = 0;
    while (s.phase !== 'ended') {
      steps(s, 1);
      for (const e of s.events) {
        if (e.t !== 'hit') continue;
        const shown = shownEffectiveness(s, e, last);
        if (shown === e.eff) continue;
        const target = findUnit(s, e.target) ?? last.get(e.target), src = findUnit(s, e.src) ?? last.get(e.src);
        const def = src && s.compiled[src.side].units[src.unitId]!;
        expect(!!target?.flying && def?.projectileSpeed === 0 && !def.tags.includes('flying')).toBe(true);
        changed[`${e.eff} → ${shown}`] = (changed[`${e.eff} → ${shown}`] ?? 0) + 1;
        if (!s.units.includes(target!)) blows++;
      }
      last.clear();
      for (const u of s.units) last.set(u.id, u);
    }
    expect(changed['strong → weak']).toBeGreaterThan(0);
    expect(Object.keys(changed).every((k) => k.endsWith('→ weak'))).toBe(true);
    expect(blows).toBeGreaterThan(0);
    const ref = make();
    runHeadless(ref, { until: 'end' });
    expect(hashState(s)).toBe(hashState(ref));
  });

  it('the cards say who can hit a flyer, under rule C or reach', () => {
    const vs = (st: BattleState, ids: string[]) => ids.map((id) => versusFlyers(st, st.compiled.player.units[id]!));
    const c = protoState(protoContent('flyers'));
    expect(flyerHitters(c)).toBe("melee hits it for ×0.5, and lobbed shells and bursts can't hit it");
    expect(vs(c, ['sporeling', 'capguard', 'gillArcher', 'driftling', 'burster'])).toEqual(
      ['hits them for ×0.5', 'hits them for ×0.5', 'can hit them', 'can hit them', "its burst can't hit them, its cloud can"]);
    const r = protoState(protoContent(REACH));
    expect(flyerHitters(r)).toBe('only units of 2+ supply, archers, turrets, other flyers, spore clouds and powers can hit it');
    expect(vs(r, ['sporeling', 'capguard', 'gillArcher', 'burster'])).toEqual(["can't reach them", 'can hit them', 'can hit them', "its burst can't hit them, its cloud can"]);
  });
});

describe('the Elder Sporeling splash check', () => {
  it("a proto path removes the Elder Sporeling's splash perk", () => {
    const s = protoState(protoContent('waves,unit.sporeling.mergePerks.3.splashRadius:null'));
    expect(s.compiled.player.units.sporeling!.tiers.map((t) => t.splashRadius)).toEqual([0, 0, 0]);
    expect(protoState(protoContent('waves')).compiled.player.units.sporeling!.tiers[2]!.splashRadius).toBe(0.6);
  });
});
