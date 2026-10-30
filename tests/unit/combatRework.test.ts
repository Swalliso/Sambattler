// The combat rework's settings (docs/ideas/combat-rework.md, P1): pinned, call for help, spore
// clouds, the Rhizomorph and waves. Every setting is absent from data/balance.json and its content
// exists only under its preset, so the shipped rules are unchanged; with a setting on, it behaves as
// described.
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
    for (const p of ['pinned', 'callforhelp', 'sporecloud', 'rhizomorph', 'waves', 'rework']) expect(() => protoContent(p)).not.toThrow();
    const all = protoState(protoContent('rework'));
    expect([all.rules.pin, all.rules.help, all.rules.cloud, all.rules.waves].every(Boolean)).toBe(true);
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
    addCloud(s, 'player', 0, 10, 3, 0);
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
    const run = createRun(rc, { seed: 3, commander: 'vesper' });
    for (const node of run.route.flat().filter((n) => n.general)) {
      expect(generalKit(rc, run, node, 2).kit).toContain('rhizomorphTunnel');
      expect(generalKit(content, run, node, 2).kit).not.toContain('rhizomorphTunnel');
    }
  });

  /** A Rhizomorph burrowed at x 5 with frozen enemy Capguards in a wall at x 12, plus what `extra` adds. */
  function tunnelRun(extra: (s: BattleState) => void, ticks: number) {
    const s = protoState(rc);
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
      { t: 'release', side: 'player', units: 2, held: [] }, { t: 'release', side: 'enemy', units: 1, held: [] },
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
    expect(s.events.find((e) => e.t === 'release')).toEqual({ t: 'release', side: 'player', units: 0, held: [0] });
    steps(s, 400);
    expect(pb.stored).toBe(0);
    expect(s.units).toHaveLength(6); // spawns at 8, 24 and 40 s, out together at 40 s
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
