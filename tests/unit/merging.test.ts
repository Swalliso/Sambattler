// Merging on the field (SPEC §5.5–5.6): knitting, its eligibility, the nearest trio, cancels, HP and supply,
// the tiers' stats and perks, and Slayers against merged units, in a clash through the kept systems. The muster's
// knits are formation.test.ts's and clash.test.ts's, and the merge toggles and policies ai.test.ts's.
import { describe, expect, it } from 'vitest';
import { addUnit, createFromScenario, hashState, restore, snapshot } from '../../src/sim/index.ts';
import type { BattleState, Flags, Side, Tier, UnitState } from '../../src/sim/index.ts';
import { SIDES } from '../../src/sim/state.ts';
import { attackSystem, deathSystem, resolveHitsSystem } from '../../src/sim/systems/combat.ts';
import { healingSystem } from '../../src/sim/systems/healing.ts';
import { mergingSystem } from '../../src/sim/systems/merging.ts';
import { movementSystem } from '../../src/sim/systems/movement.ts';
import { targetingSystem } from '../../src/sim/systems/targeting.ts';
import { clashTick } from '../../src/sim/world.ts';
import { content } from '../helpers.ts';

/** A clash with no units in it yet, both sides human, so only the test's units act. */
function clash(opts: { map?: string; flags?: Partial<Flags> } = {}): BattleState {
  return createFromScenario(content, {
    id: 'merging', description: 'A merging test.', map: opts.map ?? 'test-flat', flags: { merging: true, ...opts.flags },
    sides: { player: {}, enemy: {} }, clash: { units: [] },
  });
}

/** A clash where every unit stands still. */
function still(opts: { map?: string; flags?: Partial<Flags> } = {}): BattleState {
  const s = clash(opts);
  for (const side of SIDES) for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  return s;
}

/** One clash tick through the kept systems, in §14.6's order. */
function tick(s: BattleState): void {
  s.events.length = 0;
  s.tick++;
  for (const u of s.units) { u.px = u.x; u.py = u.y; }
  targetingSystem(s);
  movementSystem(s);
  attackSystem(s);
  resolveHitsSystem(s);
  healingSystem(s);
  deathSystem(s);
  mergingSystem(s);
}

const steps = (s: BattleState, n: number): void => { for (let i = 0; i < n; i++) tick(s); };
/** Ticks to the next tick on which merging looks for new trios. */
const toCheck = (s: BattleState): void => { do tick(s); while (clashTick(s) % s.rules.merge.every !== 0); };
const unit = (s: BattleState, side: Side, id: string, x: number, y: number, tier: Tier = 1, lane = 0): UnitState => addUnit(s, side, id, lane, x, y, 0, tier);
const knitIds = (s: BattleState) => s.units.filter((u) => u.knit).map((u) => u.id);
const ofTier = (s: BattleState, tier: number) => s.units.filter((u) => u.tier === tier);
const trio = (s: BattleState, id = 'capguard', x = 12, y = 3.5, gap = 0.7): UnitState[] => [0, 1, 2].map((i) => unit(s, 'player', id, x, y + i * gap));

describe('merging on the field (SPEC §5.5–5.6)', () => {
  it('three idle identical units knit at the next check and bloom after the knit time', () => {
    const s = still();
    const parents = trio(s);
    expect(knitIds(s)).toEqual([]);
    toCheck(s);
    expect(knitIds(s)).toEqual(parents.map((u) => u.id));
    expect(s.events.some((e) => e.t === 'knitStart')).toBe(true);
    steps(s, s.compiled.player.knitTicks - 1);
    expect(ofTier(s, 2)).toHaveLength(0);
    steps(s, 1);
    const [m] = ofTier(s, 2);
    expect(s.units).toHaveLength(1);
    expect(m!.unitId).toBe('capguard');
    expect(m!.maxHp).toBe(Math.round(content.units.capguard!.hp * content.balance.tierStatMult));
    expect(s.stats.player.merges).toEqual({ '2': 1, '3': 0 });
    expect(s.events.some((e) => e.t === 'merged' && e.id === m!.id && e.tier === 2)).toBe(true);
  });

  it('eligibility: out of combat for 2 s, merge toggle on, below Elder, same type, tier and lane', () => {
    const s = still();
    const [a, b, c] = trio(s);
    a!.lastCombatTick = s.tick; // just fought
    toCheck(s);
    expect(knitIds(s)).toEqual([]);
    while (s.tick - a!.lastCombatTick < s.rules.merge.cooldownTicks) toCheck(s);
    if (!knitIds(s).length) toCheck(s);
    expect(knitIds(s)).toEqual([a!.id, b!.id, c!.id]);

    const t = still();
    const [d] = trio(t);
    d!.mergeOn = false;
    unit(t, 'player', 'sporeling', 12, 4.2); // another type
    unit(t, 'player', 'capguard', 12.5, 4.2, 2); // another tier
    toCheck(t);
    expect(knitIds(t)).toEqual([]);

    const e = still();
    for (const u of trio(e)) u.tier = 3;
    toCheck(e);
    expect(knitIds(e)).toEqual([]);

    // lanes: units 1.2 tiles apart across a root wall never merge
    const l = still({ map: 'test-3lane' });
    const lane0 = l.lanes[0]!, lane1 = l.lanes[1]!;
    unit(l, 'player', 'capguard', 12, lane0.rowEnd + 0.65);
    unit(l, 'player', 'capguard', 12.7, lane0.rowEnd + 0.65);
    unit(l, 'player', 'capguard', 12.35, lane1.rowStart + 0.35, 1, 1);
    toCheck(l);
    expect(knitIds(l)).toEqual([]);
  });

  it('takes the two nearest within the merge radius (centre distance), ties to the lower id', () => {
    const s = still();
    const r = s.compiled.player.mergeRadius;
    const u = unit(s, 'player', 'sporeling', 10, 1);
    const far = unit(s, 'player', 'sporeling', 10 + r + 0.01, 1); // just outside
    const edge = unit(s, 'player', 'sporeling', 10, 1 + r); // exactly on the radius: in
    const near = unit(s, 'player', 'sporeling', 10.6, 1);
    toCheck(s);
    expect(knitIds(s)).toEqual([u.id, edge.id, near.id]);
    expect(far.knit).toBeUndefined();

    const t = still();
    const v = unit(t, 'player', 'sporeling', 10, 4);
    const tie1 = unit(t, 'player', 'sporeling', 10.5, 4);
    unit(t, 'player', 'sporeling', 9.5, 4); // as near as tie1, a higher id
    const closest = unit(t, 'player', 'sporeling', 10, 4.4);
    toCheck(t);
    expect(knitIds(t)).toEqual([v.id, tie1.id, closest.id]);
  });

  it('knitting units stop attacking and retargeting and walk to their centroid', () => {
    const s = clash();
    const parents = trio(s, 'capguard', 12, 2.8, 0.7);
    toCheck(s);
    const cx = parents.reduce((a, u) => a + u.knit!.x, 0) / 3;
    expect(parents.every((u) => u.knit && u.targetId === 0)).toBe(true);
    const before = Math.abs(parents[0]!.y - parents[0]!.knit!.y);
    const enemy = unit(s, 'enemy', 'sporeling', 13.2, 3.5); // well inside aggro and almost in reach
    enemy.cooldown = 1e9;
    for (const u of Object.values(s.compiled.enemy.units)) for (const t of u.tiers) t.speedPerTick = 0;
    steps(s, 5);
    expect(parents.every((u) => u.targetId === 0)).toBe(true);
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(Math.abs(parents[0]!.y - parents[0]!.knit!.y)).toBeLessThan(before);
    expect(parents[0]!.knit!.x).toBeCloseTo(cx, 9);
  });

  it('a hit or a death cancels the knit and releases the survivors', () => {
    const s = still();
    const parents = trio(s);
    toCheck(s);
    unit(s, 'enemy', 'gillArcher', 16.5, 3.5);
    for (let i = 0; i < 19 && !s.events.some((e) => e.t === 'knitCancel'); i++) tick(s);
    expect(s.events).toContainEqual({ t: 'knitCancel', side: 'player', ids: parents.map((u) => u.id) });
    expect(knitIds(s)).toEqual([]);
    expect(s.units.filter((u) => u.side === 'player')).toHaveLength(3);
    expect(s.stats.player.merges['2']).toBe(0);

    const d = still();
    const [a, b, c] = trio(d);
    toCheck(d);
    b!.hp = 0;
    tick(d);
    expect(d.events).toContainEqual({ t: 'knitCancel', side: 'player', ids: [a!.id, c!.id] });
    expect(a!.knit).toBeUndefined();
    expect(c!.knit).toBeUndefined();
  });

  it('carries HP proportionally (no free heal) and inherits from the lowest-id parent', () => {
    const s = still();
    const [a, b, c] = trio(s);
    const hp = a!.maxHp;
    a!.hp = hp / 2; b!.hp = hp; c!.hp = hp / 4;
    a!.sourceBuildingId = 7;
    a!.lastCombatTick = -500; b!.lastCombatTick = -45; c!.lastCombatTick = -900;
    toCheck(s);
    steps(s, s.compiled.player.knitTicks);
    const m = ofTier(s, 2)[0]!;
    expect(m.hp).toBe(Math.round((m.maxHp * 1.75) / 3));
    expect(m.sourceBuildingId).toBe(7);
    expect(m.lastCombatTick).toBe(-45);
    expect(m.x).toBeCloseTo(12, 9);
    expect(m.y).toBeCloseTo(3.5 + 0.7, 9);
  });

  it('supply: a Bloomed unit costs 2s (⅔ of its parts) and an Elder 4s', () => {
    const s = still();
    const s1 = content.units.capguard!.supply;
    trio(s);
    toCheck(s);
    steps(s, s.compiled.player.knitTicks);
    expect(ofTier(s, 2)[0]!.supply).toBe(2 * s1);
    expect(unit(s, 'player', 'capguard', 4, 3, 3).supply).toBe(4 * s1);
  });

  it('merged units get ×tierStatMult stats per tier and their tier perks, on the same body (§18.2 #53)', () => {
    const s = still();
    const t = s.compiled.player.units;
    const cg = t.capguard!.tiers;
    const k = content.balance.tierStatMult;
    const hp = content.units.capguard!.hp, dmg = content.units.capguard!.damage;
    expect([cg[0].hp, cg[1].hp, cg[2].hp]).toEqual([hp, Math.round(hp * k), Math.round(hp * k * k)]);
    [dmg, dmg * k, dmg * k * k].forEach((d, i) => expect(cg[i]!.damage).toBeCloseTo(d, 9));
    expect(content.balance.tierRadiusMult).toBe(1);
    expect(cg[1].radius).toBeCloseTo(0.35, 9);
    expect(cg[2].radius).toBeCloseTo(0.35 + 0.1, 9); // Elder perk: radius +0.1
    expect([cg[1].resist.pierce, cg[2].resist.pierce]).toEqual([0.85, 0.7]);
    const ga = t.gillArcher!.tiers;
    expect([ga[1].range, ga[2].range]).toEqual([5.75, 6.5]); // +0.75 / +1.5
    expect(ga[2].attackTicks).toBe(Math.round(1.2 * 0.9 * 20));
    const sp = t.sporeling!.tiers; // the Elder keeps the Bloomed speed perk and adds cleave
    expect(sp[2].splashRadius).toBe(0.6);
    const vs = t.veilstalker!.tiers;
    const m = s.rules.slayerMult;
    expect([vs[0].slayerMult, vs[1].slayerMult]).toEqual([m, m]);
    expect(vs[2].slayerMult).toBe(content.units.veilstalker!.mergePerks['3'].slayerMult); // the Elder perk overrides it
    expect(t.capguard!.tiers[0].slayerMult).toBe(1);
    const sc = t.scythecap!.tiers;
    expect([sc[0].splashRadius, sc[1].splashRadius, sc[2].splashRadius]).toEqual([1, 1.2, 1.4]); // cleave's (§5.3)

    // the Bloomed Capguard's pierce resistance applies: its damage × 1.5 × 0.85
    const r = still();
    const bloomed = unit(r, 'player', 'capguard', 12, 3.5, 2);
    unit(r, 'enemy', 'gillArcher', 16, 3.5);
    for (let i = 0; i < 40 && bloomed.hp === bloomed.maxHp; i++) tick(r);
    expect(bloomed.maxHp - bloomed.hp).toBe(Math.round(r.compiled.enemy.units.gillArcher!.tiers[0].damage * 1.5 * 0.85));
  });

  it('Slayers deal the slayer multiplier to Bloomed and Elder units and prefer them as targets', () => {
    const s = still();
    const vs = unit(s, 'enemy', 'veilstalker', 13, 3.5);
    const base = unit(s, 'player', 'rootbreaker', 12.3, 3.5); // touching: nearer than the Bloomed one
    const bloomed = unit(s, 'player', 'rootbreaker', 12.6, 4.35, 2); // about 0.15 tiles away
    base.cooldown = bloomed.cooldown = 1e9;
    for (let i = 0; i < 10 && bloomed.hp === bloomed.maxHp; i++) tick(s);
    expect(vs.targetId).toBe(bloomed.id);
    const vsDmg = s.compiled.enemy.units.veilstalker!.tiers[0].damage;
    expect(bloomed.maxHp - bloomed.hp).toBe(Math.round(vsDmg * 1.5 * s.rules.slayerMult)); // melee lands at once
    expect(base.hp).toBe(base.maxHp);

    // the slayer bonus stacks with merge-perk resistances: a Bloomed Capguard resists pierce ×0.85
    const t = still();
    unit(t, 'enemy', 'veilstalker', 13, 3.5);
    const cg = unit(t, 'player', 'capguard', 12.4, 4.2, 2);
    cg.cooldown = 1e9;
    for (let i = 0; i < 10 && cg.hp === cg.maxHp; i++) tick(t);
    expect(cg.maxHp - cg.hp).toBe(Math.round(t.compiled.enemy.units.veilstalker!.tiers[0].damage * 1.5 * t.rules.slayerMult * 0.85));
  });

  it('merging is off unless the battle flag is set', () => {
    const s = still({ flags: { merging: false } });
    trio(s);
    steps(s, 60);
    expect(s.units).toHaveLength(3);
    expect(ofTier(s, 2)).toHaveLength(0);
  });

  it('stays deterministic through a snapshot taken mid-knit', () => {
    const s = still();
    trio(s);
    toCheck(s);
    expect(knitIds(s)).toHaveLength(3);
    const resumed = restore(snapshot(s));
    expect(hashState(resumed)).toBe(hashState(s));
    steps(s, s.compiled.player.knitTicks);
    steps(resumed, resumed.compiled.player.knitTicks);
    expect(ofTier(resumed, 2)).toHaveLength(1);
    expect(hashState(resumed)).toBe(hashState(s));
  });
});
