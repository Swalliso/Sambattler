// The combat rework's settings (docs/ideas/combat-rework.md, P1 to P1c): pinned, call for help,
// spore clouds, the Rhizomorph, waves, mixed waves, cleave and the Burster. Every setting is absent from data/balance.json
// and its content exists only under its preset, so the shipped rules are unchanged; with a setting
// on, it behaves as described.
import { describe, expect, it } from 'vitest';
import { applyProto, applyProtoToBalance } from '../../src/data/proto.ts';
import { loadContent } from '../../src/data/registry.ts';
import { createRun } from '../../src/run/index.ts';
import { generalKit } from '../../src/run/flow.ts';
import { laneCover } from '../../src/sim/ai/controller.ts';
import { createBattle, makeConfig, queueCommand, runHeadless } from '../../src/sim/index.ts';
import type { BattleState, Content } from '../../src/sim/index.ts';
import { addBuilding } from '../../src/sim/create.ts';
import { addCloud } from '../../src/sim/systems/clouds.ts';
import { lanePresence } from '../../src/sim/systems/territory.ts';
import { protoContent, readRawContent } from '../../tools/lib/content.ts';
import { building, content, liveState, setBorders, steps, unit } from '../helpers.ts';
import type { UnitState } from '../../src/sim/index.ts';

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

describe('the combat rework settings are off by default', () => {
  it('balance.json sets none of them, so compiled rules carry none', () => {
    const b = content.balance;
    expect(b.pinned).toBeUndefined();
    expect(b.callForHelp).toBeUndefined();
    expect(b.sporeCloud).toBeUndefined();
    const s = liveState();
    expect(s.rules.pin).toBeUndefined();
    expect(s.rules.help).toBeUndefined();
    expect(s.rules.cloud).toBeUndefined();
  });

  it('the presets compile', () => {
    for (const p of ['pinned', 'callforhelp', 'sporecloud', 'rhizomorph', 'waves', 'mixedwave', 'cleave', 'burster', 'rework']) expect(() => protoContent(p)).not.toThrow();
    const all = protoState(protoContent('rework'));
    expect([all.rules.pin, all.rules.help, all.rules.cloud, all.rules.waves, all.rules.mixed].every(Boolean)).toBe(true);
    expect(all.compiled.player.buildings.rhizomorphTunnel).toBeDefined();
    expect(protoState(protoContent('pinned')).rules.pin).toEqual({ radius: 1, permille: 350 });
    expect(protoState(protoContent('callforhelp')).rules.help).toEqual({ radius: 5 });
  });
});

describe('pinned (balance pinned)', () => {
  /** Shots an archer fires at a sturdy frozen Capguard 3 tiles away in `ticks`, with a frozen enemy `pinner` at `gap` tiles (edge distance). */
  function shots(pinned: boolean, gap: number | null, ticks = 400, shooter = 'gillArcher'): number {
    const s = liveState({ test: NO_FIELD, flags: { merging: false } });
    if (pinned) s.rules.pin = { radius: 1, permille: 350 };
    const a = unit(s, 'player', shooter, 10, 2);
    const target = unit(s, 'enemy', 'capguard', shooter === 'gillArcher' ? 13.6 : 10.85, 2);
    target.hp = target.maxHp = 1e6;
    if (gap !== null) {
      const p = unit(s, 'enemy', 'capguard', 10 + 0.25 + 0.35 + gap, 3.2);
      p.hp = p.maxHp = 1e6;
      p.y = 2; // straight ahead, so the edge distance is exactly `gap`
    }
    freeze(s, 'enemy', 'capguard');
    s.compiled.player.units[shooter]!.tiers[0].speedPerTick = 0;
    let n = 0;
    for (let i = 0; i < ticks; i++) { steps(s, 1); if (a.lastAttackTick === s.tick) n++; }
    return n;
  }

  it('a ranged unit with an enemy unit within 1 tile attacks at 0.35× its rate', () => {
    const free = shots(true, null);
    expect(free).toBe(shots(false, null));
    expect(free).toBe(17); // every 24 ticks over 20 s
    const held = shots(true, 0.5);
    expect(held / free).toBeGreaterThan(0.3);
    expect(held / free).toBeLessThan(0.4);
    expect(shots(false, 0.5)).toBe(free); // off: the same as today
  });

  it('only within the radius, and only ranged units', () => {
    expect(shots(true, 1.5)).toBe(shots(false, 1.5));
    expect(shots(true, 0.5, 400, 'capguard')).toBe(shots(false, 0.5, 400, 'capguard'));
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

describe('spore clouds (balance sporeCloud)', () => {
  it('the Mortar reaches 7 tiles under the setting, 6 without; battles without it carry no clouds', () => {
    expect(liveState().compiled.player.buildings.puffballMortar!.attack!.range).toBe(6);
    expect(liveState().clouds).toBeUndefined();
    const s = protoState(protoContent('sporecloud'));
    expect(s.compiled.player.buildings.puffballMortar!.attack!.range).toBe(7);
    expect(s.rules.cloud).toEqual({ buildings: ['puffballMortar'], radius: 1.5, ticks: 120, pulseTicks: 20, damage: 10, aiCover: 1 });
    expect(s.clouds).toEqual([]);
  });

  it('a cloud deals 10 a second for 6 s, ignoring armor, to the enemy units inside it only', () => {
    const s = protoState(protoContent('sporecloud'));
    const knight = unit(s, 'enemy', 'amanitaKnight', 10, 3);
    const archer = unit(s, 'enemy', 'gillArcher', 10.8, 3.6);
    const outside = unit(s, 'enemy', 'sporeling', 13, 3);
    const friend = unit(s, 'player', 'capguard', 9.2, 2.2);
    const cellar = building(s, 'enemy', 'truffleCellar', 9, 4);
    for (const [side, id] of [['enemy', 'amanitaKnight'], ['enemy', 'gillArcher'], ['enemy', 'sporeling'], ['player', 'capguard']] as const) freeze(s, side, id);
    addCloud(s, 'player', 0, 10, 3, 0, s.rules.cloud!);
    steps(s, 200);
    expect(knight.maxHp - knight.hp).toBe(60); // heavy armor doesn't matter
    expect(archer.maxHp - archer.hp).toBe(60);
    expect(outside.hp).toBe(outside.maxHp);
    expect(friend.hp).toBe(friend.maxHp);
    expect(cellar.hp).toBe(cellar.maxHp);
    expect(s.clouds).toEqual([]);
    expect(s.stats.player.damageBySource.sporeCloud).toBe(120);
  });

  it("a Mortar's shell leaves a cloud where it lands; without the setting it leaves none", () => {
    for (const on of [true, false]) {
      const s = on ? protoState(protoContent('sporecloud')) : liveState({ test: NO_FIELD });
      building(s, 'player', 'puffballMortar', 4, 2);
      const knight = unit(s, 'enemy', 'amanitaKnight', 10, 3);
      freeze(s, 'enemy', 'amanitaKnight');
      steps(s, 60);
      if (!on) { expect(s.clouds).toBeUndefined(); continue; }
      expect(s.clouds).toHaveLength(1);
      expect(s.clouds![0]).toMatchObject({ side: 'player', lane: 0, x: knight.x, y: knight.y });
    }
  });

  it('a cloud tower aims each shell at the densest cluster in range; without the setting, at the nearest unit', () => {
    for (const on of [true, false]) {
      const s = on ? protoState(protoContent('sporecloud')) : liveState({ test: NO_FIELD });
      building(s, 'player', 'puffballMortar', 1, 3); // centre (2, 4)
      const lone = unit(s, 'enemy', 'sporeling', 5, 4);
      const pack = [[7.5, 3], [7.5, 4], [7.5, 5], [8.2, 4]].map(([x, y]) => unit(s, 'enemy', 'sporeling', x!, y!));
      freeze(s, 'enemy', 'sporeling');
      steps(s, 1);
      const shell = s.hits.find((h) => h.sourceType === 'puffballMortar')!;
      expect(shell.targetId).toBe(on ? pack[1]!.id : lone.id);
    }
  });

  it('the AI scores a cloud tower by the lane it reaches past its border', () => {
    const s = protoState(protoContent('sporecloud'));
    setBorders(s, 6, 25);
    expect(laneCover(s, 'player', 0, 5, 7)).toBe(5);
    expect(laneCover(s, 'player', 0, 1, 3)).toBe(0);
    expect(laneCover(s, 'enemy', 0, 27, 7)).toBe(5);
  });
});

describe('proto specs can add content', () => {
  it('presets carry content paths; new units and buildings are added and validate; + appends once', () => {
    const { raw, problems } = applyProto(readRawContent(), 'rhizomorph,faction.velvet-bloom.buildings+:["rhizomorphTunnel","gillNest"]');
    expect(problems).toEqual([]);
    const c = loadContent(raw);
    expect(c.units.rhizomorph).toMatchObject({ hp: 140, armor: 'medium', damage: 16, damageType: 'slash', attackInterval: 1, speed: 1.2, supply: 2, tags: ['burrow'] });
    expect(c.buildings.rhizomorphTunnel).toMatchObject({ cost: 160, spawn: { unit: 'rhizomorph', count: 1, interval: 18 }, aiWeight: 1 });
    const roster = c.factions['velvet-bloom']!.buildings;
    expect(roster.filter((id) => id === 'rhizomorphTunnel')).toHaveLength(1);
    expect(roster.filter((id) => id === 'gillNest')).toHaveLength(1);
    expect(c.factions['gray-rot']!.buildings).toEqual(roster);
    expect(raw['factions/velvet-bloom/faction.json']).not.toBe(readRawContent()['factions/velvet-bloom/faction.json']);
    // without the preset, none of it exists
    expect(content.units.rhizomorph).toBeUndefined();
    expect(content.buildings.rhizomorphTunnel).toBeUndefined();
    expect(content.factions['velvet-bloom']!.buildings).not.toContain('rhizomorphTunnel');
    expect(applyProtoToBalance(content.balance, 'rhizomorph').problems[0]).toMatch(/patches content/);
  });
});

describe('the Rhizomorph (preset rhizomorph)', () => {
  const rc = protoContent('rhizomorph');

  it('bots and generals buy its tunnel at weight 1, mono bots never; generals field it in runs', () => {
    const weight = (s: BattleState, side: 'player' | 'enemy') => s.sides[side].ai!.weights.find((w) => w.building === 'rhizomorphTunnel')?.weight;
    const b = createBattle(rc, makeConfig(rc, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:balanced', enemy: 'general:mother-mold' }));
    expect(weight(b, 'player')).toBe(1);
    expect(weight(b, 'enemy')).toBe(1);
    expect(b.sides.player.kit).toContain('rhizomorphTunnel');
    const mono = createBattle(rc, makeConfig(rc, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:mono:gillNest', enemy: 'bot:balanced' }));
    expect(weight(mono, 'player')).toBeUndefined();
    const plain = createBattle(content, makeConfig(content, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:balanced', enemy: 'bot:balanced' }));
    expect(weight(plain, 'player')).toBeUndefined();
    // a test bot (the counter check's answers) keeps to its own weights
    const tc = protoContent('rhizomorph,bot.pairtest:{"opener":["gillNest"],"weights":{"gillNest":1,"sporelingBurrow":1},"mergePolicy":"on","fixedWeights":true}');
    expect(weight(createBattle(tc, makeConfig(tc, { seed: 1, mapId: 'bogwater-hollow', player: 'bot:pairtest', enemy: 'bot:balanced' })), 'player')).toBeUndefined();
    const run = createRun(rc, { seed: 3, commander: 'vesper' });
    for (const node of run.route.flat().filter((n) => n.general)) {
      expect(generalKit(rc, run, node, 2).kit).toContain('rhizomorphTunnel');
      expect(generalKit(content, run, node, 2).kit).not.toContain('rhizomorphTunnel');
    }
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
    const s = protoState(protoContent('mixedwave,sporecloud'));
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

describe('cleave (preset cleave)', () => {
  const radii = (s: BattleState) => s.compiled.player.units.scythecap!.tiers.map((t) => t.splashRadius);

  it('is off by default; the preset widens the Scythecap to 1, 1.2 and 1.4 tiles at full damage', () => {
    expect(content.balance.cleave).toBeUndefined();
    expect(liveState().rules.cleave).toBeUndefined();
    expect(radii(liveState())).toEqual([0.8, 1, 1.2]);
    const s = protoState(protoContent('cleave'));
    expect(s.rules.cleave).toEqual({ units: ['scythecap'] });
    expect(radii(s)).toEqual([1, 1.2, 1.4]);
  });

  it("a Scythecap's swing hits the units within 1 tile of its target at full damage; buildings still take the falloff", () => {
    const swing = (on: boolean) => {
      const s = on ? protoState(protoContent('cleave')) : liveState({ test: NO_FIELD });
      const scy = unit(s, 'player', 'scythecap', 9, 4);
      freeze(s, 'player', 'scythecap');
      scy.cooldown = 0;
      const target = unit(s, 'enemy', 'sporeling', 9.8, 4);
      const near = unit(s, 'enemy', 'sporeling', 10.5, 4); // 0.45 tiles from the target's edge
      const far = unit(s, 'enemy', 'sporeling', 11.6, 4); // 1.55 tiles
      const cellar = building(s, 'enemy', 'truffleCellar', 10, 4); // 0.2 tiles from the target
      freeze(s, 'enemy', 'sporeling');
      steps(s, 2);
      return { target: target.maxHp - target.hp, near: near.maxHp - near.hp, far: far.maxHp - far.hp, cellar: cellar.maxHp - cellar.hp };
    };
    const on = swing(true), off = swing(false);
    expect(on.target).toBeGreaterThan(0);
    expect(on.near).toBe(on.target);
    expect(off.near).toBe(Math.max(1, Math.round(off.target * 0.5)));
    expect(on.far).toBe(0);
    expect(on.cellar).toBe(off.cellar);
    expect(on.cellar).toBeGreaterThan(0);
  });
});

describe('the Burster (preset burster)', () => {
  const bc = protoContent('burster');

  it('is off by default; the preset adds the Burster, its Pod and burst clouds; bots buy the Pod, mono and test bots never', () => {
    expect(content.units.burster).toBeUndefined();
    expect(content.balance.burst).toBeUndefined();
    expect(liveState().rules.burst).toBeUndefined();
    expect(bc.units.burster).toMatchObject({ hp: 50, armor: 'light', damage: 40, speed: 1.6, supply: 1, aggroRange: 5, splashRadius: 1.5, tags: ['burst'] });
    expect(bc.buildings.bursterPod).toMatchObject({ cost: 130, spawn: { unit: 'burster', count: 1, interval: 10 }, aiWeight: 1 });
    const s = protoState(bc);
    expect(s.rules.burst).toEqual({ cloud: { radius: 1.5, ticks: 80, damage: 10, pulseTicks: 20 } });
    expect(s.rules.cloud).toBeUndefined();
    expect(s.clouds).toEqual([]);
    const weight = (st: BattleState) => st.sides.player.ai!.weights.find((w) => w.building === 'bursterPod')?.weight;
    const battle = (c: Content, player: string) => createBattle(c, makeConfig(c, { seed: 1, mapId: 'bogwater-hollow', player, enemy: 'bot:balanced' }));
    expect(weight(battle(bc, 'bot:balanced'))).toBe(1);
    expect(weight(battle(bc, 'bot:mono:gillNest'))).toBeUndefined();
    const tc = protoContent('burster,bot.pairtest:{"opener":["gillNest"],"weights":{"gillNest":1},"mergePolicy":"on","fixedWeights":true}');
    expect(weight(battle(tc, 'bot:pairtest'))).toBeUndefined();
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

  it('bursts on reaching it: 40 damage through any armor within 1.5 tiles, then a 4 s cloud; never buildings or friends', () => {
    const s = protoState(bc);
    const b = unit(s, 'player', 'burster', 8, 4);
    const knight = unit(s, 'enemy', 'amanitaKnight', 8.9, 4);
    const capguard = unit(s, 'enemy', 'capguard', 9.9, 4.5);
    const far = unit(s, 'enemy', 'sporeling', 12.5, 4); // past 1.5 tiles of both, so the Knight (nearer) is the knot's pick
    const friend = unit(s, 'player', 'capguard', 9.4, 3.2);
    const cellar = building(s, 'enemy', 'truffleCellar', 9, 5);
    for (const [side, id] of [['enemy', 'amanitaKnight'], ['enemy', 'capguard'], ['enemy', 'sporeling'], ['player', 'capguard']] as const) freeze(s, side, id);
    let at = -1;
    for (let i = 0; i < 20 && at < 0; i++) { steps(s, 1); if (s.events.some((e) => e.t === 'burst')) at = s.tick; }
    expect(at).toBeGreaterThan(0);
    expect(s.units.includes(b)).toBe(false);
    expect([knight.maxHp - knight.hp, capguard.maxHp - capguard.hp, far.maxHp - far.hp, friend.maxHp - friend.hp]).toEqual([40, 40, 0, 0]);
    expect(cellar.hp).toBe(cellar.maxHp);
    expect(s.clouds).toHaveLength(1);
    expect(s.clouds![0]).toMatchObject({ side: 'player', radius: 1.5, damage: 10, untilTick: at + 80, x: knight.x, y: knight.y });
    steps(s, 80);
    expect([knight.maxHp - knight.hp, capguard.maxHp - capguard.hp, far.maxHp - far.hp]).toEqual([80, 80, 0]);
    expect(s.clouds).toEqual([]);
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

describe('the Elder Sporeling splash check', () => {
  it("a proto path removes the Elder Sporeling's splash perk", () => {
    const s = protoState(protoContent('rework,unit.sporeling.mergePerks.3.splashRadius:null'));
    expect(s.compiled.player.units.sporeling!.tiers.map((t) => t.splashRadius)).toEqual([0, 0, 0]);
    expect(protoState(protoContent('rework')).compiled.player.units.sporeling!.tiers[2]!.splashRadius).toBe(0.6);
  });
});
