// The kept combat rules (SPEC §5.2, §5.3, §6.7, §15.7): v1's combat, damage and healing cases in round form, plus
// an emplacement's body rules (§18.2 #10, A029). `tick` runs the
// kept systems in §14.6's clash order without the clash's own rules, the muster's still ticks and lane ends,
// which `step` adds and `clash.test.ts` tests.
import { describe, expect, it } from 'vitest';
import type { ScenarioDef } from '../../src/data/schema.ts';
import { addUnit, createFromScenario, formationOf, survivingSupply } from '../../src/sim/index.ts';
import type { Armor, BattleState, Content, DamageType, Flags, Side, Tier, UnitState } from '../../src/sim/index.ts';
import { attackSystem, burstAt, damageFor, deathSystem, resolveHitsSystem } from '../../src/sim/systems/combat.ts';
import { addCloud, cloudSystem } from '../../src/sim/systems/clouds.ts';
import { healingSystem } from '../../src/sim/systems/healing.ts';
import { mergingSystem } from '../../src/sim/systems/merging.ts';
import { movementSystem } from '../../src/sim/systems/movement.ts';
import { targetingSystem } from '../../src/sim/systems/targeting.ts';
import { clashTick } from '../../src/sim/world.ts';
import { content } from '../helpers.ts';

/** A clash on the flat test map with no units in it yet, both sides human, so only the test's units act. */
function clash(opts: { flags?: Partial<Flags>; from?: Content; enemyColony?: ScenarioDef['sides']['enemy']['colony'] } = {}): BattleState {
  return createFromScenario(opts.from ?? content, {
    id: 'combat', description: 'A combat test.', map: 'test-flat', ...(opts.flags ? { flags: opts.flags } : {}),
    sides: { player: {}, enemy: opts.enemyColony ? { colony: opts.enemyColony } : {} }, clash: { units: [] },
  });
}

const unit = (s: BattleState, side: Side, id: string, x: number, y: number, tier: Tier = 1): UnitState => addUnit(s, side, id, 0, x, y, 0, tier);

/** One clash tick through the kept systems, in §14.6's order: steps 1 and 5–11. */
function tick(s: BattleState): void {
  s.events.length = 0;
  s.tick++;
  for (const u of s.units) { u.px = u.x; u.py = u.y; }
  targetingSystem(s);
  movementSystem(s);
  attackSystem(s);
  resolveHitsSystem(s);
  if (s.clouds) cloudSystem(s);
  healingSystem(s);
  deathSystem(s);
  mergingSystem(s);
}

function steps(s: BattleState, n: number): void {
  for (let i = 0; i < n; i++) tick(s);
}

/** Retargets on one of `u`'s retarget ticks, which the clash's clock and its arrival phase (T149). */
function retarget(s: BattleState, u: UnitState): void {
  s.tick = s.clash!.startTick + 5 - (u.arrival % 5);
  targetingSystem(s);
}

/** Freezes a side's unit type: it neither moves nor attacks. */
function freeze(s: BattleState, side: Side, id: string): void {
  for (const t of s.compiled[side].units[id]!.tiers) t.speedPerTick = 0;
  for (const u of s.units) if (u.side === side && u.unitId === id) u.cooldown = 1e9;
}

/** Stops every unit type of both sides moving. */
function still(s: BattleState): void {
  for (const side of ['player', 'enemy'] as const) for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
}

const dealt = (x: { hp: number; maxHp: number }) => x.maxHp - x.hp;

describe('targeting in rounds (SPEC §5.2)', () => {
  it('takes the preferred class first, then the nearest by edge distance, ties to the lower id', () => {
    const s = clash();
    const me = unit(s, 'player', 'capguard', 10, 4);
    unit(s, 'enemy', 'sporeling', 13, 4);
    const near = unit(s, 'enemy', 'sporeling', 12, 4);
    retarget(s, me);
    expect(me.targetId).toBe(near.id);
    // equidistant: the lower id
    const s2 = clash();
    const a = unit(s2, 'player', 'capguard', 10, 4);
    const first = unit(s2, 'enemy', 'sporeling', 12, 3);
    unit(s2, 'enemy', 'sporeling', 12, 5);
    retarget(s2, a);
    expect(a.targetId).toBe(first.id);
    // a slayer prefers a Bloomed unit to a nearer base one
    const s3 = clash();
    const vs = unit(s3, 'player', 'veilstalker', 10, 4);
    unit(s3, 'enemy', 'sporeling', 11, 4);
    const bloomed = unit(s3, 'enemy', 'sporeling', 13, 4, 2);
    retarget(s3, vs);
    expect(vs.targetId).toBe(bloomed.id);
  });

  it('keeps its target within aggro × 1.25, and drops it beyond for the nearest', () => {
    const s = clash();
    const me = unit(s, 'player', 'capguard', 10, 4);
    const t = unit(s, 'enemy', 'sporeling', 13, 4);
    retarget(s, me);
    expect(me.targetId).toBe(t.id);
    const closer = unit(s, 'enemy', 'sporeling', 11.5, 2);
    t.x = 14.4; // edge 3.8, within 4 × 1.25: kept, though `closer` is nearer
    s.tick += 5;
    targetingSystem(s);
    expect(me.targetId).toBe(t.id);
    t.x = 16.5; // edge 5.9 > 5: dropped
    s.tick += 5;
    targetingSystem(s);
    expect(me.targetId).toBe(closer.id);
  });

  it('never takes a planted building or a Heartcap as its target', () => {
    const s = clash({ enemyColony: [{ building: 'truffleCellar', lane: 0, rank: 0, file: 1 }] });
    expect(s.buildings).toHaveLength(1);
    const me = unit(s, 'player', 'capguard', 30, 4); // the enemy's Heartcap edge, x 32, is within its aggro
    steps(s, 40);
    expect(me.targetId).toBe(0);
    expect(s.hits).toEqual([]);
  });

  it("siege units have no preference: a Rootbreaker fights the nearest enemy, not an emplacement's Structure", () => {
    const s = clash();
    const rb = unit(s, 'player', 'rootbreaker', 10, 4);
    const cg = unit(s, 'enemy', 'capguard', 12, 4); // edge 1.2
    unit(s, 'enemy', 'puffballMortar', 13.5, 4); // edge 2.25, within aggro 4
    retarget(s, rb);
    expect(rb.targetId).toBe(cg.id);
  });

  it('a surfaced tunneler prefers a ranged unit to a nearer one', () => {
    const s = clash();
    const rh = unit(s, 'player', 'rhizomorph', 10, 4);
    unit(s, 'enemy', 'capguard', 11, 4);
    const archer = unit(s, 'enemy', 'gillArcher', 13, 4); // edge 2.45, within aggro 4
    retarget(s, rh);
    expect(rh.targetId).toBe(archer.id);
  });

  it('a cloud Mortar aims each shell at the densest knot in its band, not the nearest unit', () => {
    const s = clash();
    unit(s, 'player', 'puffballMortar', 2, 4);
    unit(s, 'enemy', 'sporeling', 5, 4); // the nearest, alone
    const pack = [[7.5, 3], [7.5, 4], [7.5, 5], [8.2, 4]].map(([x, y]) => unit(s, 'enemy', 'sporeling', x!, y!));
    freeze(s, 'enemy', 'sporeling');
    tick(s);
    expect(s.hits.find((h) => h.sourceType === 'puffballMortar')!.targetId).toBe(pack[1]!.id);
  });
});

describe('the tunneler in rounds (SPEC §5.2)', () => {
  /** A Rhizomorph burrowed at x 5 with a wall of frozen enemy Capguards at x 12, plus what `extra` adds. */
  function tunnelRun(extra: (s: BattleState) => void, ticks: number) {
    const s = clash();
    const rhizo = unit(s, 'player', 'rhizomorph', 5, 4);
    rhizo.burrowed = true;
    for (const y of [1, 2.5, 4, 5.5, 7]) unit(s, 'enemy', 'capguard', 12, y);
    freeze(s, 'enemy', 'capguard');
    extra(s);
    let targeted = false, maxX = rhizo.x, surfacedAt = -1;
    for (let i = 0; i < ticks; i++) {
      tick(s);
      if (rhizo.burrowed && s.units.some((u) => u.targetId === rhizo.id)) targeted = true;
      if (rhizo.burrowed) maxX = rhizo.x;
      if (!rhizo.burrowed && surfacedAt < 0) surfacedAt = s.tick;
    }
    return { s, rhizo, targeted, surfacedAt, maxX };
  }

  const archersAt = (s: BattleState, at: [number, number][]) => {
    const out = at.map(([x, y]) => unit(s, 'enemy', 'gillArcher', x, y));
    freeze(s, 'enemy', 'gillArcher');
    return out;
  };

  it('tunnels unseen under the enemy line and surfaces beside the nearest ranged unit, its target', () => {
    const { rhizo, targeted, surfacedAt, s } = tunnelRun((st) => { archersAt(st, [[17, 3], [21, 5]]); }, 260);
    expect(targeted).toBe(false);
    expect(surfacedAt).toBeGreaterThan(150);
    const archer = s.units.find((u) => u.unitId === 'gillArcher' && u.x === 17)!;
    expect(Math.hypot(archer.x - rhizo.x, archer.y - rhizo.y)).toBeLessThan(1.2);
    expect(rhizo.targetId).toBe(archer.id);
  });

  it('with no ranged unit behind the front, it surfaces at the front', () => {
    const { rhizo, maxX } = tunnelRun(() => {}, 200);
    expect(rhizo.burrowed).toBe(false);
    expect(maxX).toBeGreaterThan(10.5);
    expect(maxX).toBeLessThan(12);
  });

  it("skips a ranged unit within an enemy emplacement's band, and comes up at the front instead", () => {
    const covered = tunnelRun((st) => {
      archersAt(st, [[17, 4]]);
      unit(st, 'enemy', 'puffballMortar', 21, 5).cooldown = 1e9; // the archer stands 4.1 tiles from its centre
    }, 300);
    expect(covered.rhizo.burrowed).toBe(false);
    expect(covered.maxX).toBeLessThan(12);
    const open = tunnelRun((st) => { archersAt(st, [[17, 4]]); }, 300);
    expect(open.rhizo.burrowed).toBe(false);
    expect(open.maxX).toBeGreaterThan(15);
  });
});

describe('movement in rounds (SPEC §5.2)', () => {
  it('an idle unit steps toward the nearest enemy it could target, at its speed', () => {
    const s = clash();
    const sp = unit(s, 'player', 'sporeling', 10, 1);
    sp.y = 2; // off its slot's y, which the seek ignores
    const cg = unit(s, 'enemy', 'capguard', 18, 5); // edge ≈ 7.94, beyond aggro 4
    freeze(s, 'enemy', 'capguard');
    const speed = s.compiled.player.units.sporeling!.tiers[0].speedPerTick;
    for (let i = 0; i < 5; i++) {
      const x0 = sp.x, y0 = sp.y, d = Math.hypot(cg.x - x0, cg.y - y0);
      tick(s);
      expect(sp.targetId).toBe(0);
      expect(sp.x - x0).toBeCloseTo(((cg.x - x0) / d) * speed, 12);
      expect(sp.y - y0).toBeCloseTo(((cg.y - y0) / d) * speed, 12);
    }
  });

  it("with no enemy it could target, it advances, drifting back toward its slot's y at 0.3 tiles a second, and stops at the far edge", () => {
    const s = clash();
    const sp = unit(s, 'player', 'sporeling', 10, 1);
    sp.y = 2;
    unit(s, 'enemy', 'capguard', 18, 5).burrowed = true; // a burrowed unit is no candidate
    freeze(s, 'enemy', 'capguard');
    const speed = s.compiled.player.units.sporeling!.tiers[0].speedPerTick;
    tick(s);
    expect(sp.x).toBeCloseTo(10 + speed, 12);
    expect(sp.y).toBeCloseTo(2 - 0.3 / 20, 12);
    // positions clamp to the lane and to [0, W]: its body stops at x = W
    sp.x = 31.7;
    steps(s, 3);
    expect(sp.x).toBe(s.map.width - 0.25);
  });

  it('a support unit seeks nothing, and each unit moves at its own speed (no pace rule, #12)', () => {
    const s = clash();
    const tender = unit(s, 'player', 'tender', 10, 2);
    unit(s, 'enemy', 'capguard', 18, 5);
    freeze(s, 'enemy', 'capguard');
    tick(s);
    expect([tender.x, tender.y]).toEqual([10 + s.compiled.player.units.tender!.tiers[0].speedPerTick, 2]);
    const p = clash();
    const fast = unit(p, 'player', 'sporeling', 10, 2);
    const slow = unit(p, 'player', 'capguard', 10, 5);
    unit(p, 'enemy', 'capguard', 18, 4).burrowed = true;
    freeze(p, 'enemy', 'capguard');
    tick(p);
    expect(fast.x).toBeCloseTo(10 + 1.5 / 20, 12);
    expect(slow.x).toBeCloseTo(10 + 0.75 / 20, 12);
  });

  it('separation pushes overlapping units apart by half the overlap each, over 2 passes', () => {
    const s = clash();
    still(s);
    const a = unit(s, 'player', 'sporeling', 10, 4);
    const b = unit(s, 'player', 'sporeling', 10.3, 4);
    movementSystem(s);
    expect(a.x).toBeCloseTo(9.9, 12);
    expect(b.x).toBeCloseTo(10.4, 12);
    // a second pass resolves what the first leaves
    expect(s.rules.separationPasses).toBe(2);
    const closest = (passes: number) => {
      const st = clash();
      still(st);
      st.rules.separationPasses = passes;
      const us = [4, 4.1, 4.2].map((y) => unit(st, 'player', 'sporeling', 10, y));
      movementSystem(st);
      return Math.min(...us.flatMap((u, i) => us.slice(i + 1).map((v) => Math.hypot(u.x - v.x, u.y - v.y))));
    };
    expect(closest(2)).toBeGreaterThan(closest(1));
  });

  it('pushes a mirror-image crowd apart in mirror image, the same whatever the units’ ids (T147)', () => {
    // three Capguards a side crowd the field's middle, each player one the mirror of an enemy one
    const at: [number, number][] = [[-0.25, 4], [-0.125, 4.25], [-0.375, 3.875]];
    const crowd = (enemyFirst: boolean) => {
      const s = clash();
      still(s);
      const mid = s.map.width / 2;
      const add = (side: Side) => at.map(([dx, y]) => unit(s, side, 'capguard', side === 'player' ? mid + dx : mid - dx, y));
      const [first, second] = enemyFirst ? [add('enemy'), add('player')] : [add('player'), add('enemy')];
      movementSystem(s);
      const [player, enemy] = enemyFirst ? [second, first] : [first, second];
      return { mid, player: player.map((u) => [u.x, u.y]), enemy: enemy.map((u) => [u.x, u.y]) };
    };
    const a = crowd(false);
    expect(crowd(true)).toEqual(a);
    a.player.forEach(([x, y], i) => {
      expect(a.enemy[i]![0]! - a.mid).toBeCloseTo(a.mid - x!, 12);
      expect(a.enemy[i]![1]).toBeCloseTo(y!, 12);
    });
  });

  it('splits an exact stack by a mirror-image rule that no id decides: across sides toward each one’s own side, on one side toward each one’s slot (T147)', () => {
    const stack = (sides: [Side, Side], slotY?: [number, number]) => {
      const s = clash();
      still(s);
      const us = sides.map((side, i) => {
        const u = unit(s, side, 'capguard', 16, 4);
        if (slotY) u.slotY = slotY[i]!;
        return u;
      });
      movementSystem(s);
      return us.map((u) => [u.x, u.y]);
    };
    const close = (got: number[][], want: number[][]) => got.forEach((p, i) => p.forEach((v, k) => expect(v).toBeCloseTo(want[i]![k]!, 6)));
    // Capguards 0.7 apart in all, half the overlap each
    close(stack(['player', 'enemy']), [[15.65, 4], [16.35, 4]]);
    close(stack(['enemy', 'player']), [[16.35, 4], [15.65, 4]]);
    close(stack(['player', 'player'], [5, 3]), [[16, 4.35], [16, 3.65]]);
    close(stack(['enemy', 'enemy'], [3, 5]), [[16, 3.65], [16, 4.35]]);
    // two of a side with the same slot are alike, so neither moves
    expect(stack(['player', 'player'], [4, 4])).toEqual([[16, 4], [16, 4]]);
  });
});

describe('damage in rounds (SPEC §5.3)', () => {
  const r = clash().rules;
  const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
  const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];

  it('the matrix, siege ×2 against Structure only, slayer against tier 2 and up, rounded to at least 1', () => {
    const expected: Record<DamageType, number[]> = { slash: [15, 10, 5, 5], pierce: [10, 15, 8, 5], crush: [8, 8, 15, 15] };
    for (const t of TYPES) ARMORS.forEach((a, i) => expect(damageFor(r, 10, t, 1, 1, a, 1, 1), `${t} vs ${a}`).toBe(expected[t][i]));
    expect(damageFor(r, 28, 'crush', r.siegeMult, 1, 'structure', 1, 1)).toBe(84);
    expect(damageFor(r, 28, 'crush', r.siegeMult, 1, 'medium', 1, 1)).toBe(21);
    expect(damageFor(r, 18, 'pierce', 1, 1.75, 'medium', 2, 1)).toBe(47);
    expect(damageFor(r, 18, 'pierce', 1, 1.75, 'medium', 1, 1)).toBe(27);
    expect(damageFor(r, 7, 'slash', 1, 1, 'structure', 1, 1)).toBe(4);
    expect(damageFor(r, 0.1, 'slash', 1, 1, 'heavy', 1, 1)).toBe(1);
    expect(damageFor(r, 20, 'slash', 1, 1, 'medium', 1, 0.85)).toBe(17); // a merge perk's resistance
  });

  it('ranged hits land after ceil(distance / speed × 20) ticks; melee lands on the same tick', () => {
    const s = clash();
    still(s);
    const archer = unit(s, 'player', 'gillArcher', 10, 4);
    const target = unit(s, 'enemy', 'capguard', 15, 4); // edge 4.4
    tick(s);
    const hit = s.hits.find((h) => h.sourceId === archer.id)!;
    expect(hit.tick - hit.fireTick).toBe(Math.ceil((4.4 / 8) * 20));
    const hp0 = target.hp;
    while (s.tick < hit.tick) tick(s);
    expect(target.hp).toBe(hp0 - 21); // 14 pierce × 1.5 against medium
    const m = clash();
    still(m);
    unit(m, 'player', 'capguard', 10, 4);
    const victim = unit(m, 'enemy', 'sporeling', 10.9, 4);
    tick(m);
    expect(victim.hp).toBe(72 - 21); // 14 slash × 1.5 against light
  });

  it('deaths are removed after every hit resolves, with their events', () => {
    const s = clash();
    still(s);
    unit(s, 'player', 'capguard', 10, 4);
    const v = unit(s, 'enemy', 'sporeling', 10.9, 4);
    v.hp = 5;
    tick(s);
    expect(s.units.find((u) => u.id === v.id)).toBeUndefined();
    expect(s.events.some((e) => e.t === 'died' && e.id === v.id)).toBe(true);
    expect(s.stats.enemy.unitsLost).toBe(1);
  });

  it('splash: the primary target takes full damage, the others within the radius 50%', () => {
    const s = clash();
    still(s);
    unit(s, 'player', 'puffballMortar', 5, 4);
    const primary = unit(s, 'enemy', 'capguard', 9, 4);
    const side = unit(s, 'enemy', 'capguard', 9, 3.2);
    const outside = unit(s, 'enemy', 'capguard', 9, 6.5);
    for (let i = 0; i < 60 && primary.hp === primary.maxHp; i++) tick(s);
    expect(dealt(primary)).toBe(18); // 24 crush × 0.75
    expect(dealt(side)).toBe(9);
    expect(dealt(outside)).toBe(0);
  });

  /** Attacks `shooter` makes in 400 ticks at a sturdy frozen Capguard, with a frozen enemy `pinner` `gap` tiles away (edge distance), or none. */
  function shots(gap: number | null, shooter = 'gillArcher', pinner = 'capguard'): number {
    const s = clash({ flags: { merging: false } });
    const a = unit(s, 'player', shooter, 10, 2);
    const target = unit(s, 'enemy', 'capguard', shooter === 'gillArcher' ? 13.6 : 10.85, 2);
    target.hp = target.maxHp = 1e6;
    if (gap !== null) {
      const p = unit(s, 'enemy', pinner, 10 + 0.25 + s.compiled.enemy.units[pinner]!.tiers[0].radius + gap, 2);
      p.hp = p.maxHp = 1e6;
    }
    still(s);
    for (const u of s.units) if (u.side === 'enemy') u.cooldown = 1e9;
    let n = 0;
    for (let i = 0; i < 400; i++) { tick(s); if (a.lastAttackTick === s.tick) n++; }
    return n;
  }

  it('pinning: a ranged unit with an enemy unit within 1 tile attacks at ×0.35 its rate; only within the radius, only ranged units', () => {
    expect(r.pin).toEqual({ radius: 1, permille: 350 });
    const free = shots(null);
    expect(free).toBe(17); // every 24 ticks over 20 s
    const held = shots(0.5);
    expect(held / free).toBeGreaterThan(0.3);
    expect(held / free).toBeLessThan(0.4);
    expect(shots(1.5)).toBe(free);
    expect(shots(0.5, 'capguard')).toBe(shots(null, 'capguard'));
  });

  it('a spore cloud deals 10 a second for 6 s, ignoring armor, to the enemy units inside it only', () => {
    const s = clash();
    const knight = unit(s, 'enemy', 'amanitaKnight', 10, 3);
    const archer = unit(s, 'enemy', 'gillArcher', 10.8, 3.6);
    const outside = unit(s, 'enemy', 'sporeling', 13, 3);
    const friend = unit(s, 'player', 'capguard', 9.2, 2.2);
    for (const [side, id] of [['enemy', 'amanitaKnight'], ['enemy', 'gillArcher'], ['enemy', 'sporeling'], ['player', 'capguard']] as const) freeze(s, side, id);
    addCloud(s, 'player', 0, 10, 3, 0, s.rules.cloud!);
    steps(s, 200);
    expect([dealt(knight), dealt(archer)]).toEqual([60, 60]); // heavy armor doesn't matter
    expect([dealt(outside), dealt(friend)]).toEqual([0, 0]);
    expect(s.clouds).toEqual([]);
    expect(s.stats.player.damageBySource.sporeCloud).toBe(120);
  });

  it("cleave: a Scythecap's swing deals full damage within 1.0, 1.2 and 1.4 tiles by tier", () => {
    expect(r.cleave).toEqual({ units: ['scythecap'] });
    expect(clash().compiled.player.units.scythecap!.tiers.map((t) => t.splashRadius)).toEqual([1, 1.2, 1.4]);
    const swing = (cleave: boolean) => {
      const s = clash();
      if (!cleave) delete s.rules.cleave;
      const scy = unit(s, 'player', 'scythecap', 9, 4);
      freeze(s, 'player', 'scythecap');
      scy.cooldown = 0;
      const target = unit(s, 'enemy', 'sporeling', 9.8, 4);
      const near = unit(s, 'enemy', 'sporeling', 10.5, 4); // 0.45 tiles from the target's edge
      const far = unit(s, 'enemy', 'sporeling', 11.6, 4); // 1.55 tiles
      freeze(s, 'enemy', 'sporeling');
      steps(s, 2);
      return { target: dealt(target), near: dealt(near), far: dealt(far) };
    };
    const on = swing(true), off = swing(false);
    expect(on.target).toBe(24);
    expect(on.near).toBe(on.target);
    expect(off.near).toBe(12); // a plain splash's falloff
    expect(on.far).toBe(0);
  });

  it('a burst deals 40 through any armor within 1.5 tiles, then a 4 s cloud; never friends', () => {
    const s = clash();
    const b = unit(s, 'player', 'burster', 8, 4);
    const knight = unit(s, 'enemy', 'amanitaKnight', 8.9, 4);
    const capguard = unit(s, 'enemy', 'capguard', 9.9, 4.5);
    const far = unit(s, 'enemy', 'sporeling', 12.5, 4);
    const friend = unit(s, 'player', 'capguard', 9.4, 3.2);
    for (const [side, id] of [['enemy', 'amanitaKnight'], ['enemy', 'capguard'], ['enemy', 'sporeling'], ['player', 'capguard']] as const) freeze(s, side, id);
    let at = -1;
    for (let i = 0; i < 20 && at < 0; i++) { tick(s); if (s.events.some((e) => e.t === 'burst')) at = s.tick; }
    expect(at).toBeGreaterThan(0);
    expect(s.units.includes(b)).toBe(false);
    expect([dealt(knight), dealt(capguard), dealt(far), dealt(friend)]).toEqual([40, 40, 0, 0]);
    expect(s.clouds).toHaveLength(1);
    expect(s.clouds![0]).toMatchObject({ side: 'player', radius: 1.5, damage: 10, untilTick: at + 80, x: knight.x, y: knight.y });
    steps(s, 80);
    expect([dealt(knight), dealt(capguard), dealt(far)]).toEqual([80, 80, 0]);
    expect(s.clouds).toEqual([]);
  });

  it('a burst sets off a Burster it fells, which bursts in turn', () => {
    const s = clash();
    const mine = unit(s, 'player', 'burster', 10, 4);
    const theirs = unit(s, 'enemy', 'burster', 11, 4);
    const victim = unit(s, 'enemy', 'capguard', 10.6, 3);
    const friend = unit(s, 'player', 'capguard', 11.8, 4.6);
    for (const id of ['burster', 'capguard']) { freeze(s, 'player', id); freeze(s, 'enemy', id); }
    theirs.hp = 30;
    mine.hp = 0;
    tick(s);
    expect(s.events.filter((e) => e.t === 'burst').map((e) => (e as { id: number }).id)).toEqual([mine.id, theirs.id]);
    expect([dealt(victim), dealt(friend)]).toEqual([40, 40]);
    expect(s.units.map((u) => u.unitId)).toEqual(['capguard', 'capguard']);
    expect(s.clouds).toHaveLength(2);
  });

  it('healing: the ally missing the most HP within range, ties to the lower id, never above its max', () => {
    const s = clash();
    still(s);
    const t = unit(s, 'player', 'tender', 10, 3);
    const a = unit(s, 'player', 'capguard', 11, 3);
    const b = unit(s, 'player', 'capguard', 11, 4);
    const far = unit(s, 'player', 'capguard', 14, 3); // beyond range 2.5
    a.hp -= 20; b.hp -= 20; far.hp -= 50;
    const every = s.compiled.player.units.tender!.tiers[0].healTicks;
    const untilHeal = () => { do tick(s); while ((clashTick(s) + t.arrival) % every !== 0); };
    untilHeal();
    expect([dealt(a), dealt(b), dealt(far)]).toEqual([12, 20, 50]); // 8 a heal, to the lower id
    b.hp -= 10;
    untilHeal();
    expect([dealt(a), dealt(b)]).toEqual([12, 22]);
    a.hp = a.maxHp - 3; b.hp = b.maxHp;
    untilHeal();
    expect(a.hp).toBe(a.maxHp);
    expect(s.stats.player.healingDone).toBe(19);
  });

  it('healing never heals an enemy, and a healer never attacks', () => {
    const s = clash();
    still(s);
    unit(s, 'player', 'tender', 10, 3);
    const a = unit(s, 'player', 'capguard', 11, 3);
    const foe = unit(s, 'enemy', 'capguard', 9, 1.2); // inside the Tender's range, outside a's reach
    freeze(s, 'enemy', 'capguard');
    a.hp -= 3; foe.hp -= 50;
    const foeHp = foe.hp;
    steps(s, 40);
    expect(a.hp).toBe(a.maxHp);
    expect(foe.hp).toBe(foeHp);
    expect(s.stats.player.damageDealt).toBe(0);
  });

  it('an Elder Tender heals two allies a heal', () => {
    const s = clash();
    still(s);
    const t = unit(s, 'player', 'tender', 10, 3, 3);
    const a = unit(s, 'player', 'capguard', 11, 3);
    const b = unit(s, 'player', 'capguard', 11, 4);
    a.hp -= 100; b.hp -= 100;
    const every = s.compiled.player.units.tender!.tiers[2].healTicks;
    do tick(s); while ((clashTick(s) + t.arrival) % every !== 0);
    expect(dealt(a)).toBeLessThan(100);
    expect(dealt(b)).toBeLessThan(100);
  });

  it("regenerates out of combat only (Elder's Patience)", () => {
    const s = clash();
    still(s);
    s.compiled.player.units.capguard!.tiers[2].regenPct = 0.02;
    const e = unit(s, 'player', 'capguard', 10, 3, 3);
    e.hp -= 500;
    e.lastCombatTick = s.tick; // just fought
    steps(s, 20);
    expect(dealt(e)).toBe(500); // still inside the quiet window
    steps(s, s.rules.merge.cooldownTicks);
    expect(dealt(e)).toBeLessThanOrEqual(500 - Math.floor(e.maxHp * 0.02));
  });
});

describe('merging and the arrival shield on the field (SPEC §5.3, §5.6)', () => {
  it('three idle identical units knit and bloom after the knit time, keeping their HP and shields in proportion', () => {
    const s = clash();
    still(s);
    const parts = [3, 3.7, 4.4].map((y) => unit(s, 'player', 'capguard', 10, y));
    for (const p of parts) p.shield = 44; // 20% of 220
    parts[0]!.hp = 110;
    steps(s, s.rules.merge.every + s.compiled.player.knitTicks);
    expect(s.units).toHaveLength(1);
    const m = s.units[0]!;
    expect([m.tier, m.maxHp, m.x]).toEqual([2, 616, 10]);
    expect(m.hp).toBe(Math.round((616 * 550) / 660));
    expect(m.shield).toBe(Math.round((616 * 132) / 660));
    expect(m.slotY).toBeCloseTo(3.7, 12);
    expect(s.stats.player.merges['2']).toBe(1);
  });

  it("a cloud's pulse spends the shield before HP", () => {
    const s = clash();
    const v = unit(s, 'enemy', 'capguard', 10, 3);
    freeze(s, 'enemy', 'capguard');
    v.shield = 15;
    addCloud(s, 'player', 0, 10, 3, 0, s.rules.cloud!);
    steps(s, 40); // two pulses of 10
    expect(v.shield).toBeUndefined();
    expect(dealt(v)).toBe(5);
  });
});

describe('emplacements (SPEC §4.4, §6.7, §18.2 #10, A029)', () => {
  it("compile: a tower is one unit with its attack, hp and minRange, Structure armor, no supply and a body of at most 0.8", () => {
    const s = clash();
    const m = s.compiled.player.units.puffballMortar!;
    expect(m).toMatchObject({ id: 'puffballMortar', armor: 'structure', damageType: 'crush', projectileSpeed: 6, siege: false, slayer: false });
    expect(m.emplacement).toEqual({ minRange: 1.5, clouds: true });
    for (const t of m.tiers) {
      expect(t).toMatchObject({ hp: 500, damage: 24, attackTicks: 60, range: 7, speedPerTick: 0, splashRadius: 1, supply: 0 });
      expect(t.radius).toBeLessThanOrEqual(0.8);
    }
    expect(s.compiled.player.buildings.puffballMortar!.squad).toEqual({ unit: 'puffballMortar', count: 1 });
    const placed = unit(s, 'player', 'puffballMortar', 6, 4);
    expect([placed.hp, placed.maxHp, placed.supply]).toEqual([500, 500, 0]);
  });

  it("fields at its slot's centre", () => {
    const s = createFromScenario(content, {
      id: 'mortar', description: 'A Mortar.', map: 'test-flat',
      sides: { player: { colony: [{ building: 'puffballMortar', lane: 0, rank: 0, file: 1 }] }, enemy: {} },
    });
    const [plan] = formationOf(s, 'player');
    expect(plan).toMatchObject({ emplacement: true, eligible: false, unitId: 'puffballMortar' });
    expect(plan!.units).toEqual([{ x: plan!.slot.col + 1, y: plan!.slot.row + 1 }]);
  });

  it('fires from its centre within its band: no nearer than minRange 1.5, up to 7 tiles with clouds and 6 without', () => {
    const noClouds: Content = { ...content, balance: { ...content.balance, sporeCloud: { ...content.balance.sporeCloud!, buildings: [] } } };
    /** Damage a frozen enemy Capguard takes in 60 ticks, straight ahead of a Mortar at (5, 4) and `edge` tiles from its centre. */
    const shelled = (edge: number, from = content) => {
      const s = clash({ from });
      unit(s, 'player', 'puffballMortar', 5, 4);
      const cg = unit(s, 'enemy', 'capguard', 5 + edge + 0.35, 4);
      freeze(s, 'enemy', 'capguard');
      steps(s, 60);
      return dealt(cg);
    };
    expect(shelled(6.9)).toBeGreaterThan(0);
    expect(shelled(7.3)).toBe(0); // 6.5 tiles from its body's edge: the range runs from its centre
    expect(shelled(1.8)).toBeGreaterThan(0); // 1.0 from its body's edge, but in its band from its centre
    expect(shelled(1.2)).toBe(0);
    // a unit aimed at in its band that steps inside minRange before the shell flies is spared
    const s = clash();
    const mortar = unit(s, 'player', 'puffballMortar', 5, 4);
    unit(s, 'enemy', 'sporeling', 5 + 1.52 + 0.25, 4);
    steps(s, 40);
    expect(mortar.lastAttackTick).toBe(-1);
    expect(clash({ from: noClouds }).compiled.player.units.puffballMortar!.emplacement).toEqual({ minRange: 1.5, clouds: false });
    expect(shelled(5.9, noClouds)).toBeGreaterThan(0);
    expect(shelled(6.5, noClouds)).toBe(0);
  });

  it('never moves, even when overlapped: the other unit takes the whole overlap', () => {
    const s = clash();
    const m = unit(s, 'player', 'puffballMortar', 16, 4);
    m.cooldown = 1e9;
    const foe = unit(s, 'enemy', 'capguard', 16.5, 4);
    const friend = unit(s, 'player', 'sporeling', 15.6, 4);
    freeze(s, 'enemy', 'capguard');
    tick(s);
    expect([m.x, m.y]).toEqual([16, 4]);
    expect(foe.x).toBeCloseTo(16 + 0.8 + 0.35, 12);
    expect(16 - friend.x).toBeGreaterThanOrEqual(0.8 + 0.25 - 1e-9);
    steps(s, 40);
    expect([m.x, m.y]).toEqual([16, 4]);
  });

  it('counts no supply', () => {
    const s = clash();
    unit(s, 'player', 'puffballMortar', 16, 4);
    expect(survivingSupply(s, 'player', 0)).toBe(0);
    unit(s, 'player', 'capguard', 10, 4);
    expect(survivingSupply(s, 'player', 0)).toBe(2);
  });

  it('siege deals ×2 to it, against its Structure armor', () => {
    const struck = (attacker: string) => {
      const s = clash();
      const m = unit(s, 'enemy', 'puffballMortar', 16, 4);
      m.cooldown = 1e9;
      unit(s, 'player', attacker, 16 - 0.8 - s.compiled.player.units[attacker]!.tiers[0].radius - 0.1, 4);
      tick(s);
      return dealt(m);
    };
    expect(struck('rootbreaker')).toBe(84); // 28 crush × 1.5 × 2
    expect(struck('hammercap')).toBe(38); // 25 crush × 1.5
  });

  it('never merges, pins nothing and is never healed', () => {
    const s = clash();
    for (const y of [3, 4.5, 6]) unit(s, 'player', 'puffballMortar', 3, y); // the middle one has the other two within 1.5
    steps(s, 40);
    expect(s.units.filter((u) => u.knit || u.tier > 1)).toEqual([]);
    expect(s.events.some((e) => e.t === 'knitStart')).toBe(false);
    // a Mortar within 1 tile of an archer leaves its rate alone
    const archer = (pinner: boolean) => {
      const st = clash({ flags: { merging: false } });
      const a = unit(st, 'player', 'gillArcher', 10, 2);
      unit(st, 'enemy', 'capguard', 13.6, 2).hp = 1e6;
      if (pinner) unit(st, 'enemy', 'puffballMortar', 10 + 0.25 + 0.8 + 0.5, 2).hp = 1e6;
      still(st);
      for (const u of st.units) if (u.side === 'enemy') u.cooldown = 1e9;
      let n = 0;
      for (let i = 0; i < 400; i++) { tick(st); if (a.lastAttackTick === st.tick) n++; }
      return n;
    };
    expect(archer(true)).toBe(archer(false));
    // a Tender passes over it, though it's missing the most
    const h = clash();
    still(h);
    const t = unit(h, 'player', 'tender', 10, 3);
    const m = unit(h, 'player', 'puffballMortar', 9, 5); // 1.44 tiles from the Tender, within its reach
    const cg = unit(h, 'player', 'capguard', 11, 3);
    m.hp -= 100; cg.hp -= 20;
    const every = h.compiled.player.units.tender!.tiers[0].healTicks;
    do tick(h); while ((clashTick(h) + t.arrival) % every !== 0);
    expect([dealt(m), dealt(cg)]).toEqual([100, 12]);
  });

  it('clouds, bursts and powers hit it', () => {
    const s = clash();
    const m = unit(s, 'enemy', 'puffballMortar', 10, 4);
    m.cooldown = 1e9;
    addCloud(s, 'player', 0, 11, 4, 0, s.rules.cloud!); // its body is inside
    steps(s, 120);
    expect(dealt(m)).toBe(60);
    const b = clash();
    const bm = unit(b, 'enemy', 'puffballMortar', 10, 4);
    bm.cooldown = 1e9;
    const burster = unit(b, 'player', 'burster', 8.85, 4); // 0.05 from its body: in reach at once
    freeze(b, 'player', 'burster');
    burster.cooldown = 0;
    tick(b);
    expect(b.events.some((e) => e.t === 'burst')).toBe(true);
    expect(dealt(bm)).toBe(40); // through its Structure armor
    // the Spore Burst's strike, through the matrix
    const p = clash();
    const pm = unit(p, 'enemy', 'puffballMortar', 10, 4);
    expect(burstAt(p, 'player', 10.5, 4, 1, 50, 'crush', 'sporeBurst')).toBe(1);
    expect(dealt(pm)).toBe(75);
  });
});
