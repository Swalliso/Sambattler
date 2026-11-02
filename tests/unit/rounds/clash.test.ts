// Begin, the muster and a lane's end in rounds (SPEC §4.7 steps 12–17, §5.6, §6.7, §14.6): the arrival in
// plot order, the arrival shield, the muster resolved inside Begin and its 20 still ticks, the fielded
// record, `clashStart`, each lane's end and its lock, and a frozen lane on Twin Roots (A024, A026, A030,
// A032, A047). Per-squad stats are here too, since Begin compiles them (T046, A028). Scoring is S7's.
import { describe, expect, it } from 'vitest';
import type { EffectBundle, RoundScenarioDef } from '../../../src/data/schema.ts';
import { addBuilding, createBattle, createFromScenario, formationOf, makeRoundConfig, mergePreview, SIDES, step } from '../../../src/sim/rounds/index.ts';
import type { BattleState, FieldedSquad, Flags, LaneLock, Side, SimEvent, UnitState } from '../../../src/sim/rounds/index.ts';
import { insertHit } from '../../../src/sim/rounds/hits.ts';
import { addCloud } from '../../../src/sim/rounds/systems/clouds.ts';
import { mergeTriosNow } from '../../../src/sim/rounds/systems/merging.ts';
import { tierDef } from '../../../src/sim/rounds/world.ts';
import { begin, content, plotAt, stepClash } from '../../roundHelpers.ts';

type Colony = NonNullable<RoundScenarioDef['sides']['player']['colony']>;

/** A building on a plot of a colony, with its merge toggle on unless `merge` is false. */
const at = (building: string, lane: number, rank: number, file: number, merge = true): Colony[number] => ({ building, lane, rank, file, merge });

/** Round 1's planning with these colonies, both sides human: a scenario, so the enemy's needs no command (plan Call 8). */
function battle(player: Colony, enemy: Colony = [], opts: { map?: string; flags?: Partial<Flags> } = {}): BattleState {
  return createFromScenario(content, {
    id: 'clash', description: 'A clash test.', map: opts.map ?? 'bogwater-hollow', ...(opts.flags ? { flags: opts.flags } : {}),
    sides: { player: { colony: player }, enemy: { colony: enemy } },
  });
}

/** Round 1's planning on Bogwater Hollow, both sides human, with the player's battle effects and both colonies standing. */
function withEffects(effects: EffectBundle, player: Colony, enemy: Colony = []): BattleState {
  const config = makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'human' });
  config.modifiers = [{ side: 'player', source: 'test', effects }];
  const s = createBattle(content, config);
  for (const [side, colony] of [['player', player], ['enemy', enemy]] as const) {
    for (const c of colony) addBuilding(s, side, c.building, plotAt(s, side, c), 0).mergeOn = c.merge ?? true;
  }
  return s;
}

/** Nobody can move or attack: every unit type's speed 0, and every unit's cooldown longer than a clash. */
function hold(s: BattleState): void {
  for (const side of SIDES) for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  for (const u of s.units) u.cooldown = 1e9;
}

const lock = (s: BattleState, lane: number): LaneLock => s.clash!.lanes[lane]!;
const mine = (s: BattleState, side: Side): UnitState[] => s.units.filter((u) => u.side === side);
const supplyOf = (us: UnitState[]): number => us.reduce((n, u) => n + u.supply, 0);
const byKind = <T extends SimEvent['t']>(events: SimEvent[], t: T) => events.filter((e): e is Extract<SimEvent, { t: T }> => e.t === t);
const range = (from: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + i);

describe('Begin: the arrival (SPEC §4.7 steps 12–13, §14.6 planning step 3)', () => {
  it('records each side’s gold as bankedAtBegin, marks every planted building fielded, and enters the clash', () => {
    const s = battle([at('sporelingBurrow', 0, 0, 1), at('truffleCellar', 0, 1, 1)], [at('capguardHall', 0, 0, 1)]);
    s.sides.player.gold = 123;
    begin(s);
    expect([s.phase, s.sides.player.bankedAtBegin, s.sides.enemy.bankedAtBegin]).toEqual(['clash', 123, 300]);
    expect(s.buildings.map((b) => b.fielded)).toEqual([true, true, true]);
    expect(s.clash!.startTick).toBe(s.tick);
  });

  it('fields both armies on the same tick, taking ids in plot order (lane, rank, file), then j (A024)', () => {
    // planted out of plot order: building ids follow the colony's list, the arrival its plots
    const s = battle([at('gillNest', 0, 1, 2), at('sporelingBurrow', 0, 0, 3), at('capguardHall', 0, 0, 1)],
      [at('sporelingBurrow', 0, 0, 2), at('gillNest', 0, 1, 1)], { flags: { merging: false } });
    const plans = { player: formationOf(s, 'player'), enemy: formationOf(s, 'enemy') };
    expect(plans.player.map((p) => p.building)).toEqual([3, 2, 1]);
    const first = s.nextId, tick = s.tick;
    const events = begin(s);
    const expected = SIDES.flatMap((side) => plans[side].flatMap((p) => p.units.map((u) => [side, p.building, u.x, u.y])));
    expect(s.units.map((u) => [u.side, u.sourceBuildingId, u.x, u.y])).toEqual(expected);
    expect(s.units.map((u) => u.id)).toEqual(range(first, expected.length));
    // one `arrived` a squad, the player's squads first, all in Begin's one step: nothing has ticked
    let next = first;
    expect(byKind(events, 'arrived')).toEqual(SIDES.flatMap((side) => plans[side].map((p) => ({ t: 'arrived', side, ids: range((next += p.units.length) - p.units.length, p.units.length) }))));
    expect(s.tick).toBe(tick);
  });

  it('holds every unit still through the muster’s 20 ticks with no power queued, separation included (A026)', () => {
    const s = battle([at('capguardHall', 0, 0, 2), at('gillNest', 0, 1, 2), at('sporelingBurrow', 0, 0, 3)],
      [at('sporelingBurrow', 0, 0, 2), at('gillNest', 0, 1, 2)]);
    begin(s);
    // two of the player's units stand on each other, which separation would push apart
    const a = s.units.find((u) => u.unitId === 'capguard')!, b = s.units.find((u) => u.unitId === 'gillArcher' && u.side === 'player')!;
    b.x = b.px = a.x; b.y = b.py = a.y;
    const still = () => s.units.map((u) => [u.id, u.x, u.y, u.hp, u.shield ?? 0, u.targetId, u.cooldown]);
    const before = still();
    const events = stepClash(s, 20);
    expect(s.tick).toBe(s.clash!.startTick + 20);
    expect(still()).toEqual(before);
    expect(byKind(events, 'hit')).toEqual([]);
    // the clash moves on the 21st tick: separation and the march
    stepClash(s, 1);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0);
    expect(still()).not.toEqual(before);
  });

  it('fields an emplacement at its tower’s full HP each round, whatever the last clash left it (T041)', () => {
    const s = battle([at('puffballMortar', 0, 1, 2), at('capguardHall', 0, 0, 2)]);
    const full = s.library.buildings.puffballMortar!.hp;
    const mortar = () => s.units.find((u) => u.unitId === 'puffballMortar')!;
    begin(s);
    expect([mortar().hp, mortar().maxHp]).toEqual([full, full]);
    mortar().hp = 1;
    // the enemy fields nothing, so the lane ends on the first tick (E1), and the clash with it
    stepClash(s, 1);
    expect(s.phase).toBe('aftermath');
    step(s);
    expect([s.phase, s.round]).toEqual(['planning', 2]);
    begin(s);
    expect([mortar().hp, mortar().maxHp]).toEqual([full, full]);
  });
});

describe('the arrival shield (SPEC §5.3, #8, plan Call 30)', () => {
  it('shields each lane’s army of 2 or more unit types before the muster; emplacements neither count nor take one', () => {
    // Twin Roots: the player's lane 0 mixes Sporelings and Gill Archers, its lane 1 is Sporelings and a Mortar
    const s = battle([at('sporelingBurrow', 0, 0, 1), at('gillNest', 0, 1, 2), at('puffballMortar', 0, 1, 1), at('sporelingBurrow', 1, 0, 1), at('puffballMortar', 1, 1, 2)],
      [at('sporelingBurrow', 0, 0, 1), at('puffballMortar', 0, 1, 2)], { map: 'twin-roots' });
    begin(s);
    const frac = s.rules.arrivalShield.shieldFrac;
    const shielded = mine(s, 'player').filter((u) => u.lane === 0 && u.unitId !== 'puffballMortar');
    expect(shielded.some((u) => u.tier === 2)).toBe(true);
    for (const u of shielded) {
      // a knit keeps its parts' shields in proportion, as its HP
      const part = s.compiled.player.units[u.unitId]!.tiers[0].hp, partShield = Math.round(part * frac);
      expect(u.shield, `${u.unitId} ${u.tier}`).toBe(u.tier === 1 ? Math.round(u.maxHp * frac) : Math.round((u.maxHp * 3 * partShield) / (3 * part)));
    }
    // a Mortar takes none, and a lane of one unit type and a Mortar has none: so the enemy's lane 0 too
    for (const u of s.units.filter((x) => !shielded.includes(x))) expect(u.shield, `${u.side} ${u.unitId} lane ${u.lane}`).toBeUndefined();
  });
});

describe('the muster inside Begin (SPEC §5.6, plan Call 4)', () => {
  it('knits what mergePreview promised, and records what each side fields as it then stands, by lane, type, tier and count (§14.4, A047)', () => {
    const s = battle([at('sporelingBurrow', 0, 0, 1), at('sporelingBurrow', 0, 1, 1), at('capguardHall', 1, 0, 1), at('puffballMortar', 1, 1, 2)],
      [at('gillNest', 1, 0, 1), at('sporelingBurrow', 0, 0, 3, false)], { map: 'twin-roots' });
    const preview = { player: mergePreview(s, 'player'), enemy: mergePreview(s, 'enemy') };
    begin(s);
    const tierKey = ['base', 'bloomed', 'elders'] as const;
    for (const side of SIDES) {
      const counts: Record<number, Record<string, number>> = {};
      for (const u of mine(s, side)) {
        const c = (counts[u.sourceBuildingId] ??= { elders: 0, bloomed: 0, base: 0 });
        c[tierKey[u.tier - 1]!]!++;
      }
      expect(counts, side).toEqual(preview[side].byBuilding);
      const fielded: FieldedSquad[] = [];
      for (const u of mine(s, side)) {
        const f = fielded.find((x) => x.lane === u.lane && x.unitId === u.unitId && x.tier === u.tier);
        if (f) f.count++; else fielded.push({ unitId: u.unitId, tier: u.tier, count: 1, augments: [], lane: u.lane });
      }
      const order = (a: FieldedSquad, b: FieldedSquad) => a.lane - b.lane || (a.unitId < b.unitId ? -1 : a.unitId > b.unitId ? 1 : 0) || a.tier - b.tier;
      expect(s.clash!.fielded[side], side).toEqual(fielded.sort(order));
    }
    expect(s.clash!.fielded.player).toContainEqual({ unitId: 'sporeling', tier: 3, count: 1, augments: [], lane: 0 });
    expect(s.clash!.fielded.enemy).toContainEqual({ unitId: 'sporeling', tier: 1, count: 8, augments: [], lane: 0 });
  });

  it('pays a muster merge’s side effects once: its id, its merged and musterKnit events, stats.merges and merge triggers (A032)', () => {
    const s = withEffects({ triggers: [{ on: 'merge', do: [{ gainGold: 1 }] }] },
      [at('sporelingBurrow', 0, 0, 1), at('sporelingBurrow', 0, 0, 2)], [at('capguardHall', 0, 0, 1, false)]);
    const { trios } = mergePreview(s, 'player');
    const gold = s.sides.player.gold, first = s.nextId;
    const events = begin(s);
    const arrived = byKind(events, 'arrived').flatMap((e) => e.ids);
    const merged = byKind(events, 'merged');
    // each merged unit's id follows the arrival's, in the muster's order, so its key is its id (plan Call 4)
    expect(merged.map((e) => [e.id, e.tier])).toEqual(trios.map((t, i) => [first + arrived.length + i, t.tier]));
    expect(byKind(events, 'musterKnit').map(({ parts, tier, x, y }) => ({ parts, tier, x, y }))).toEqual(trios.map(({ parts, tier, x, y }) => ({ parts, tier, x, y })));
    expect(s.stats.player.merges).toEqual({ '2': trios.filter((t) => t.tier === 2).length, '3': trios.filter((t) => t.tier === 3).length });
    expect(s.sides.player.gold - gold).toBe(trios.length);
    expect(s.nextId).toBe(first + arrived.length + trios.length);
    // the muster's ticks knit nothing more and pay nothing more
    const later = stepClash(s, 40);
    expect(later.filter((e) => e.t === 'merged' || e.t === 'knitStart' || e.t === 'effectGold')).toEqual([]);
    expect(s.sides.player.gold - gold).toBe(trios.length);
  });

  it('fires clashStart triggers once, after the muster’s knits and before the clash’s first tick (T026)', () => {
    const s = withEffects({ triggers: [{ on: 'clashStart', do: [{ gainGold: 7 }] }] }, [at('sporelingBurrow', 0, 0, 1)], [at('capguardHall', 0, 0, 1)]);
    const gold = s.sides.player.gold;
    const kinds = begin(s).map((e) => e.t);
    expect(kinds[0]).toBe('clashStarted');
    expect(kinds.filter((t) => t === 'effectGold')).toHaveLength(1);
    expect(kinds.lastIndexOf('musterKnit')).toBeLessThan(kinds.indexOf('effectGold'));
    expect(kinds.lastIndexOf('arrived')).toBeLessThan(kinds.indexOf('merged'));
    expect([s.tick, s.sides.player.gold - gold]).toEqual([s.clash!.startTick, 7]);
    stepClash(s, 40);
    expect(s.sides.player.gold - gold).toBe(7);
  });
});

describe('a lane’s end (SPEC §6.7, §14.6 clash step 12, A030)', () => {
  it('ends a lane only one side fields on the first tick, won with its whole damage supply, or with none for emplacements only (E1, E6)', () => {
    const s = battle([at('rootbreakerDen', 0, 0, 1), at('puffballMortar', 1, 1, 2)], [], { map: 'twin-roots', flags: { merging: false } });
    begin(s);
    const start = s.clash!.startTick;
    const events = stepClash(s, 1);
    const supply = supplyOf(mine(s, 'player').filter((u) => u.lane === 0));
    expect(supply).toBe(9);
    expect(lock(s, 0)).toEqual({
      ended: true, endTick: start + 1, winner: 'player', capped: false,
      survivors: { player: 9, enemy: 0 }, damageSupply: { player: 18, enemy: 0 }, margin: 18,
    });
    expect(lock(s, 1)).toEqual({
      ended: true, endTick: start + 1, winner: 'player', capped: false,
      survivors: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, margin: 0,
    });
    expect(byKind(events, 'laneWon')).toEqual([
      { t: 'laneWon', lane: 0, winner: 'player', survivors: { player: 9, enemy: 0 }, capped: false },
      { t: 'laneWon', lane: 1, winner: 'player', survivors: { player: 0, enemy: 0 }, capped: false },
    ]);
    // every lane has ended, so the step hands the clash over to scoring and the aftermath (T051)
    expect(s.phase).toBe('aftermath');
    // the winners still stand
    expect(mine(s, 'player')).toHaveLength(4);
  });

  it('draws a lane neither side fields, on the first tick (E2), and one both sides lose on the same tick (E4)', () => {
    const empty = battle([], []);
    begin(empty);
    stepClash(empty, 1);
    const drawn = { ended: true, winner: null, capped: false, survivors: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, margin: 0 };
    expect(lock(empty, 0)).toEqual({ ...drawn, endTick: empty.clash!.startTick + 1 });
    const s = battle([at('capguardHall', 0, 0, 1)], [at('capguardHall', 0, 0, 1)]);
    begin(s);
    stepClash(s, 30);
    expect(lock(s, 0).ended).toBe(false);
    for (const u of s.units) u.hp = 0;
    const events = stepClash(s, 1);
    expect(lock(s, 0)).toEqual({ ...drawn, endTick: s.tick });
    expect(byKind(events, 'laneWon')).toEqual([{ t: 'laneWon', lane: 0, winner: null, survivors: { player: 0, enemy: 0 }, capped: false }]);
  });

  it('falls at exactly startTick + 900, the muster’s 20 ticks counted, and a tie in surviving supply is drawn (#13, E3)', () => {
    const s = battle([at('capguardHall', 0, 0, 1)], [at('capguardHall', 0, 0, 1)], { flags: { merging: false } });
    // a later round's clash starts at the tick the last one ended (plan Call 7)
    s.tick = 50;
    begin(s);
    hold(s);
    expect(s.clash!.startTick).toBe(50);
    stepClash(s, 899);
    expect([s.tick, lock(s, 0).ended, s.phase]).toEqual([949, false, 'clash']);
    const events = stepClash(s, 1);
    expect(lock(s, 0)).toEqual({
      ended: true, endTick: 950, winner: null, capped: true,
      survivors: { player: 6, enemy: 6 }, damageSupply: { player: 6, enemy: 6 }, margin: 0,
    });
    expect(byKind(events, 'laneWon')).toEqual([{ t: 'laneWon', lane: 0, winner: null, survivors: { player: 6, enemy: 6 }, capped: true }]);
    expect(s.phase).toBe('aftermath');
  });

  it('gives a lane at the cap to more surviving supply, siege counted once, with the margin in damage supply, never below 0 (#22)', () => {
    // lane 0: 6 Capguards (12) against 3 (6); lane 1: 6 Capguards (12) against 3 Rootbreakers (9, siege: 18 damage supply)
    const s = battle([at('capguardHall', 0, 0, 1), at('capguardHall', 0, 0, 3), at('capguardHall', 1, 0, 1), at('capguardHall', 1, 0, 2)],
      [at('capguardHall', 0, 0, 1), at('rootbreakerDen', 1, 0, 1)], { map: 'twin-roots', flags: { merging: false } });
    begin(s);
    hold(s);
    stepClash(s, 900);
    expect(lock(s, 0)).toMatchObject({ winner: 'player', capped: true, survivors: { player: 12, enemy: 6 }, damageSupply: { player: 12, enemy: 6 }, margin: 6 });
    expect(lock(s, 1)).toMatchObject({ winner: 'player', capped: true, survivors: { player: 12, enemy: 9 }, damageSupply: { player: 12, enemy: 18 }, margin: 0 });
  });

  it('draws a lane at the cap where both sides have only emplacements left (E5)', () => {
    const s = battle([at('puffballMortar', 0, 1, 1)], [at('puffballMortar', 0, 1, 1)]);
    begin(s);
    hold(s);
    stepClash(s, 900);
    expect(lock(s, 0)).toMatchObject({ ended: true, winner: null, capped: true, survivors: { player: 0, enemy: 0 }, margin: 0 });
    expect(s.units).toHaveLength(2);
  });

  it('holds an ended lane still on Twin Roots while the other fights: no moves, hits and clouds dropped, no heals or merges (R2-Q11)', () => {
    // lane 0: only the player fields, so it ends on the first tick (E1); lane 1 fights on
    const s = battle([at('sporelingBurrow', 0, 0, 1, false), at('tendersRing', 0, 1, 1), at('gillNest', 1, 0, 1)],
      [at('sporelingBurrow', 1, 0, 1)], { map: 'twin-roots' });
    begin(s);
    const lane0 = () => s.units.filter((u) => u.lane === 0);
    const target = lane0().find((u) => u.unitId === 'sporeling')!;
    // a hit in flight and a spore cloud over lane 0, both due after the lock
    insertHit(s, {
      tick: s.tick + 10, sourceId: 0, seq: s.nextHitSeq++, side: 'enemy', targetId: target.id, x: target.x, y: target.y, fromX: 20, fromY: target.y,
      fireTick: s.tick, lane: 0, damage: 40, damageType: 'pierce', splashRadius: 0, siegeMult: 1, slayerMult: 1, sourceBuildingId: 0, sourceType: 'gillArcher', ranged: true,
    });
    addCloud(s, 'enemy', 0, target.x, target.y, 0, s.rules.cloud!);
    stepClash(s, 1);
    expect(s.clash!.lanes.map((l) => [l.ended, l.winner])).toEqual([[true, 'player'], [false, null]]);
    expect([s.hits.filter((h) => h.lane === 0), (s.clouds ?? []).filter((c) => c.lane === 0)]).toEqual([[], []]);
    // a hurt Sporeling beside a Tender, and the base Sporelings free to knit
    target.hp -= 30;
    for (const u of lane0()) if (u.unitId === 'sporeling') u.mergeOn = true;
    const held = () => lane0().map((u) => [u.id, u.x, u.y, u.hp, u.tier, u.targetId, u.cooldown, !!u.knit]);
    const before = held();
    const lane1 = s.units.filter((u) => u.lane === 1).map((u) => [u.id, u.x, u.y]);
    const ids = new Set(lane0().map((u) => u.id));
    const events = stepClash(s, 80);
    expect(held()).toEqual(before);
    expect(events.filter((e) => (e.t === 'healed' && ids.has(e.target)) || (e.t === 'knitStart' && e.ids.some((id) => ids.has(id))) || (e.t === 'hit' && ids.has(e.target)))).toEqual([]);
    // lane 1 fought on
    expect(s.units.filter((u) => u.lane === 1).map((u) => [u.id, u.x, u.y])).not.toEqual(lane1);
  });
});

describe('per-squad stats (SPEC §5.6, §14.2, T046, A028, A131)', () => {
  it('a front-rank modifier reaches rank-0 squads only, and an onLoam one the squads on loam', () => {
    const s = withEffects({
      modifiers: [{ stat: 'unit.hp', op: 'mul', value: 1.5, where: { rank: 0 } }, { stat: 'unit.damage', op: 'mul', value: 2, where: { onLoam: true } }],
    }, [at('capguardHall', 0, 0, 1, false), at('capguardHall', 0, 1, 1, false), at('capguardHall', 0, 1, 2, false), at('puffballMortar', 0, 0, 2)],
    [at('capguardHall', 0, 0, 1, false)]);
    expect(s.sides.player.plots[plotAt(s, 'player', { lane: 0, rank: 1, file: 2 })]!.terrain).toBe('loam');
    begin(s);
    const base = s.compiled.player.units.capguard!.tiers[0];
    const of = (building: number) => s.units.filter((u) => u.sourceBuildingId === building).map((u) => [u.maxHp, u.hp, tierDef(s, u).damage]);
    const [front, back, loam, mortar, theirs] = [1, 2, 3, 4, 5];
    expect(of(front)).toEqual(Array(3).fill([Math.round(base.hp * 1.5), Math.round(base.hp * 1.5), base.damage]));
    expect(of(back)).toEqual(Array(3).fill([base.hp, base.hp, base.damage]));
    expect(of(loam)).toEqual(Array(3).fill([base.hp, base.hp, base.damage * 2]));
    expect(of(theirs)).toEqual(Array(3).fill([base.hp, base.hp, base.damage]));
    // a unit modifier never reaches an emplacement, which has its tower's stats
    expect(of(mortar).map(([hp]) => hp)).toEqual([s.library.buildings.puffballMortar!.hp]);
    // each squad's table: its side's unit plus the patches that reach it alone (A131)
    const patches = (b: number) => s.squads.find((q) => q.building === b)!.stats?.patches;
    expect([patches(front), patches(back), patches(loam), patches(theirs)]).toEqual([
      [{ stat: 'unit.hp', op: 'mul', value: 1.5, where: { rank: 0 } }], undefined, [{ stat: 'unit.damage', op: 'mul', value: 2, where: { onLoam: true } }], undefined,
    ]);
  });

  it('a knit of front and back parts takes the lowest-id parent’s squad stats, with HP carried by the ratio (R2-Q11)', () => {
    const effects: EffectBundle = {
      modifiers: [{ stat: 'unit.hp', op: 'mul', value: 1.5, where: { rank: 0 } }],
      // a merge trigger reads its merged unit's squad's plot
      triggers: [{ on: 'merge', if: { rank: 1 }, do: [{ gainGold: 1 }] }],
    };
    const s = withEffects(effects, [at('sporelingBurrow', 0, 0, 1), at('sporelingBurrow', 0, 1, 1)]);
    const { trios } = mergePreview(s, 'player');
    const gold = s.sides.player.gold;
    begin(s);
    const [front, back] = [1, 2];
    expect(trios.some((t) => t.parts.some((p) => p.building === front) && t.parts.some((p) => p.building === back))).toBe(true);
    const own = s.squads.find((q) => q.building === front)!.stats!.tiers, sideWide = s.compiled.player.units.sporeling!.tiers;
    for (const u of mine(s, 'player')) {
      const t = (u.sourceBuildingId === front ? own : sideWide)[u.tier - 1]!;
      expect([u.maxHp, u.hp], `${u.id} tier ${u.tier}`).toEqual([t.hp, t.hp]);
    }
    expect(mine(s, 'player').find((u) => u.tier === 3)?.sourceBuildingId).toBe(front);
    // a trio's first part is its lowest-id parent's
    expect(s.sides.player.gold - gold).toBe(trios.filter((t) => t.parts[0]!.building === back).length);

    // on the field: a hurt front Sporeling and two back ones knit into the front squad's Bloomed
    const f = withEffects(effects, [at('sporelingBurrow', 0, 0, 1, false), at('sporelingBurrow', 0, 1, 1, false)]);
    begin(f);
    const lead = f.units.find((u) => u.sourceBuildingId === front)!;
    const [b1, b2] = f.units.filter((u) => u.sourceBuildingId === back);
    lead.hp = 100;
    b1!.hp = 50;
    expect([lead.maxHp, b1!.maxHp, b2!.maxHp]).toEqual([own[0]!.hp, sideWide[0]!.hp, sideWide[0]!.hp]);
    mergeTriosNow(f, [[lead, b1!, b2!]]);
    const m = f.units[f.units.length - 1]!;
    expect([m.tier, m.sourceBuildingId, m.maxHp]).toEqual([2, front, own[1]!.hp]);
    expect(m.hp).toBe(Math.round((own[1]!.hp * (100 + 50 + b2!.hp)) / (own[0]!.hp + 2 * sideWide[0]!.hp)));
  });
});
