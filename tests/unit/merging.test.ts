import { describe, expect, it } from 'vitest';
import {
  createBattle, createFromScenario, hashState, lanePresence, makeConfig, queueCommand, restore, runHeadless, snapshot, step,
} from '../../src/sim/index.ts';
import type { BattleState, UnitState } from '../../src/sim/index.ts';
import { slayerSpawnShare } from '../../src/sim/ai/controller.ts';
import { addUnit } from '../../src/sim/create.ts';
import { building, content, liveState, steps, unit } from '../helpers.ts';

/** A live flat-map battle with merging on, no turrets, and every unit standing still. */
function still(): BattleState {
  const s = liveState({ flags: { merging: true } });
  s.rules.test.turrets = false;
  for (const side of ['player', 'enemy'] as const) {
    for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  }
  return s;
}

const knitIds = (s: BattleState) => s.units.filter((u) => u.knit).map((u) => u.id);
const ofTier = (s: BattleState, tier: number) => s.units.filter((u) => u.tier === tier);
const trio = (s: BattleState, id = 'capguard', x = 12, y = 3.5, gap = 0.7): UnitState[] =>
  [0, 1, 2].map((i) => unit(s, 'player', id, x, y + i * gap));

describe('merging (SPEC §5.5–5.6)', () => {
  it('three idle identical units knit at the next check and bloom after the knit time', () => {
    const s = still();
    const parents = trio(s);
    steps(s, 9);
    expect(knitIds(s)).toEqual([]);
    steps(s, 1); // tick 10: detection
    expect(knitIds(s)).toEqual(parents.map((u) => u.id));
    expect(s.events.some((e) => e.t === 'knitStart')).toBe(true);
    steps(s, s.rules.merge.knitTicks - 1);
    expect(ofTier(s, 2)).toHaveLength(0);
    steps(s, 1); // tick 30: complete
    const [m] = ofTier(s, 2);
    expect(s.units).toHaveLength(1);
    expect(m!.unitId).toBe('capguard');
    expect(m!.maxHp).toBe(Math.round(220 * content.balance.tierStatMult));
    expect(s.stats.player.merges).toEqual({ '2': 1, '3': 0 });
    expect(s.events.some((e) => e.t === 'merged' && e.id === m!.id && e.tier === 2)).toBe(true);
  });

  it('eligibility: out of combat for 2 s, merge toggle on, below Elder, same type, tier and lane', () => {
    const s = still();
    const [a, b, c] = trio(s);
    a!.lastCombatTick = 10 - s.rules.merge.cooldownTicks + 1; // dealt or took damage 39 ticks before the check
    steps(s, 10);
    expect(knitIds(s)).toEqual([]);
    steps(s, 10); // tick 20: now 2 s clear
    expect(knitIds(s)).toEqual([a!.id, b!.id, c!.id]);

    const t = still();
    const [d] = trio(t);
    d!.mergeOn = false;
    unit(t, 'player', 'sporeling', 12, 4.2); // wrong type
    unit(t, 'player', 'capguard', 12.5, 4.2, 2); // wrong tier
    steps(t, 10);
    expect(knitIds(t)).toEqual([]);

    const e = still();
    for (const u of trio(e)) { u.tier = 3; }
    steps(e, 10);
    expect(knitIds(e)).toEqual([]);

    // lanes: units 1.2 tiles apart across a root wall never merge
    const l = createBattle(content, makeConfig(content, { seed: 1, mapId: 'test-3lane', player: 'human', enemy: 'human', flags: { merging: true } }));
    l.phase = 'live';
    l.rules.test.turrets = false;
    for (const u of Object.values(l.compiled.player.units)) for (const tt of u.tiers) tt.speedPerTick = 0;
    const lane0 = l.lanes[0]!, lane1 = l.lanes[1]!;
    addUnit(l, 'player', 'capguard', 0, 12, lane0.rowEnd + 0.65, 0);
    addUnit(l, 'player', 'capguard', 0, 12.7, lane0.rowEnd + 0.65, 0);
    addUnit(l, 'player', 'capguard', 1, 12.35, lane1.rowStart + 0.35, 0);
    steps(l, 10);
    expect(knitIds(l)).toEqual([]);
  });

  it('takes the two nearest within the merge radius (centre distance), ties to the lower id', () => {
    const s = still();
    const r = s.rules.merge.radius;
    const u = unit(s, 'player', 'sporeling', 10, 1);
    const far = unit(s, 'player', 'sporeling', 10 + r + 0.01, 1); // just outside
    const edge = unit(s, 'player', 'sporeling', 10, 1 + r); // exactly on the radius: in
    const near = unit(s, 'player', 'sporeling', 10.6, 1);
    steps(s, 10);
    expect(knitIds(s)).toEqual([u.id, edge.id, near.id]);
    expect(far.knit).toBeUndefined();

    const t = still();
    const v = unit(t, 'player', 'sporeling', 10, 4);
    const tie1 = unit(t, 'player', 'sporeling', 10.5, 4);
    unit(t, 'player', 'sporeling', 9.5, 4); // same distance as tie1, higher id
    const closest = unit(t, 'player', 'sporeling', 10, 4.4);
    steps(t, 10);
    expect(knitIds(t)).toEqual([v.id, tie1.id, closest.id]);
  });

  it('knitting units stop attacking and retargeting and walk to their centroid', () => {
    const s = liveState({ flags: { merging: true } });
    s.rules.test.turrets = false;
    const parents = trio(s, 'capguard', 12, 2.8, 0.7);
    steps(s, 10);
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

  it('a hit, a death or a merge toggle switched off cancels the knit and releases the survivors', () => {
    // hit
    const s = still();
    const parents = trio(s);
    steps(s, 10);
    unit(s, 'enemy', 'gillArcher', 16.5, 3.5);
    for (let i = 0; i < 19 && !s.events.some((e) => e.t === 'knitCancel'); i++) step(s);
    expect(s.events).toContainEqual({ t: 'knitCancel', side: 'player', ids: parents.map((u) => u.id) });
    expect(knitIds(s)).toEqual([]);
    expect(s.units.filter((u) => u.side === 'player')).toHaveLength(3);
    expect(s.stats.player.merges['2']).toBe(0);

    // death: the two survivors are released
    const d = still();
    const [a, b, c] = trio(d);
    steps(d, 10);
    b!.hp = 0;
    steps(d, 1);
    expect(d.events).toContainEqual({ t: 'knitCancel', side: 'player', ids: [a!.id, c!.id] });
    expect(a!.knit).toBeUndefined();
    expect(c!.knit).toBeUndefined();

    // toggle off from the building
    const g = still();
    const hall = building(g, 'player', 'capguardHall', 0, 0);
    const kids = trio(g);
    for (const u of kids) u.sourceBuildingId = hall.id;
    steps(g, 10);
    expect(knitIds(g)).toHaveLength(3);
    queueCommand(g, { tick: g.tick + 1, side: 'player', type: 'toggleMerge', entityId: hall.id, on: false });
    steps(g, 1);
    expect(knitIds(g)).toEqual([]);
    expect(kids.every((u) => !u.mergeOn)).toBe(true);
  });

  it('carries HP proportionally (no free heal) and inherits from the lowest-id parent', () => {
    const s = still();
    const hall = building(s, 'player', 'capguardHall', 0, 0);
    const [a, b, c] = trio(s);
    a!.hp = 110; b!.hp = 220; c!.hp = 55; // 385 of 660
    a!.sourceBuildingId = hall.id;
    a!.mergeOn = true;
    a!.lastCombatTick = -500; b!.lastCombatTick = -45; c!.lastCombatTick = -900;
    steps(s, 30);
    const m = ofTier(s, 2)[0]!;
    expect(m.hp).toBe(Math.round((m.maxHp * 385) / 660));
    expect(m.sourceBuildingId).toBe(hall.id);
    expect(m.lastCombatTick).toBe(-45);
    expect(m.x).toBeCloseTo(12, 9);
    expect(m.y).toBeCloseTo(3.5 + 0.7, 9);
  });

  it('supply: a Bloomed unit costs 2s (⅔ of its parts) and an Elder 4s; presence follows supply', () => {
    const s = still();
    trio(s);
    expect(s.sides.player.supplyUsed).toBe(6);
    steps(s, 30);
    expect(s.sides.player.supplyUsed).toBe(4);
    const m = ofTier(s, 2)[0]!;
    expect(m.supply).toBe(4);
    expect(lanePresence(s, 0).player[Math.floor(m.x)]).toBe(4);

    const e = createFromScenario(content, 'elder-ladder', {});
    expect(e.sides.player.supplyUsed).toBe(18);
    runHeadless(e, { until: 60 });
    const elder = ofTier(e, 3)[0]!;
    expect(elder.supply).toBe(8);
    expect(e.sides.player.supplyUsed).toBe(8);
    expect(e.stats.player.merges).toEqual({ '2': 3, '3': 1 });
    expect(e.stats.player.maxEldersAlive).toBe(1);
  });

  it('merged units get ×tierStatMult stats per tier, a larger body and their tier perks', () => {
    const s = still();
    const t = s.compiled.player.units;
    const cg = t.capguard!.tiers;
    const k = content.balance.tierStatMult;
    expect([cg[0].hp, cg[1].hp, cg[2].hp]).toEqual([220, Math.round(220 * k), Math.round(220 * k * k)]);
    [14, 14 * k, 14 * k * k].forEach((d, i) => expect(cg[i]!.damage).toBeCloseTo(d, 9));
    expect(cg[1].radius).toBeCloseTo(0.35 * 1.25, 9);
    expect(cg[2].radius).toBeCloseTo(0.35 * 1.5625 + 0.1, 9); // Elder perk: radius +0.1
    expect([cg[1].resist.pierce, cg[2].resist.pierce]).toEqual([0.85, 0.7]);
    const ga = t.gillArcher!.tiers;
    expect([ga[1].range, ga[2].range]).toEqual([5.75, 6.5]); // +0.75 / +1.5
    expect(ga[2].attackTicks).toBe(Math.round(1.2 * 0.9 * 20));
    const sp = t.sporeling!.tiers; // the Elder keeps the Bloomed speed perk and adds cleave
    expect(sp[2].speedPerTick).toBeCloseTo(sp[1].speedPerTick, 12);
    expect(sp[2].splashRadius).toBe(0.6);
    const vs = t.veilstalker!.tiers;
    const m = s.rules.slayerMult;
    expect([vs[0].slayerMult, vs[1].slayerMult]).toEqual([m, m]);
    expect(vs[2].slayerMult).toBe(content.units.veilstalker!.mergePerks['3'].slayerMult); // the Elder perk overrides it
    expect(t.capguard!.tiers[0].slayerMult).toBe(1);
    const sc = t.scythecap!.tiers;
    expect([sc[0].splashRadius, sc[1].splashRadius, sc[2].splashRadius]).toEqual([0.8, 1.0, 1.2]);

    // the Bloomed Capguard's pierce resistance applies: 14 × 1.5 × 0.85 = 17.85 → 18
    const r = still();
    const bloomed = unit(r, 'player', 'capguard', 12, 3.5, 2);
    const archer = unit(r, 'enemy', 'gillArcher', 16, 3.5);
    for (let i = 0; i < 40 && bloomed.hp === bloomed.maxHp; i++) step(r);
    expect(bloomed.maxHp - bloomed.hp).toBe(18);
    void archer;
  });

  it('Slayers deal the slayer multiplier to Bloomed and Elder units and prefer them as targets', () => {
    const s = still();
    const vs = unit(s, 'enemy', 'veilstalker', 13, 3.5);
    const base = unit(s, 'player', 'rootbreaker', 12.3, 3.5); // touching: nearer than the Bloomed one
    const bloomed = unit(s, 'player', 'rootbreaker', 12.6, 4.35, 2); // about 0.15 tiles away
    base.cooldown = bloomed.cooldown = 1e9;
    steps(s, 1);
    expect(vs.targetId).toBe(bloomed.id);
    const vsDmg = s.compiled.enemy.units.veilstalker!.tiers[0].damage;
    expect(bloomed.maxHp - bloomed.hp).toBe(Math.round(vsDmg * 1.5 * s.rules.slayerMult)); // melee lands at once
    expect(base.hp).toBe(base.maxHp);

    // the slayer bonus stacks with merge-perk resistances: a Bloomed Capguard resists pierce ×0.85
    const t = still();
    unit(t, 'enemy', 'veilstalker', 13, 3.5);
    const cg = unit(t, 'player', 'capguard', 12.4, 4.2, 2);
    cg.cooldown = 1e9;
    steps(t, 1);
    expect(cg.maxHp - cg.hp).toBe(Math.round(t.compiled.enemy.units.veilstalker!.tiers[0].damage * 1.5 * t.rules.slayerMult * 0.85));
  });

  it('a toggle updates every living unit its building spawned; new spawns inherit it', () => {
    const s = liveState({ flags: { merging: true } });
    s.rules.test.turrets = false;
    const burrow = building(s, 'player', 'sporelingBurrow', 0, 0);
    steps(s, 170); // first batch at tick 160
    const kids = s.units.filter((u) => u.sourceBuildingId === burrow.id);
    expect(kids).toHaveLength(2);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'toggleMerge', entityId: burrow.id, on: false });
    steps(s, 1);
    expect(burrow.mergeOn).toBe(false);
    expect(kids.every((u) => !u.mergeOn)).toBe(true);
    steps(s, 320);
    const later = s.units.filter((u) => u.sourceBuildingId === burrow.id && !kids.includes(u));
    expect(later.length).toBeGreaterThan(0);
    expect(later.every((u) => !u.mergeOn)).toBe(true);
    // units of a destroyed building keep their last value
    burrow.hp = 0;
    steps(s, 1);
    expect(s.units.filter((u) => u.sourceBuildingId === burrow.id).every((u) => !u.mergeOn)).toBe(true);
  });

  it('merging is off unless the battle flag is set', () => {
    const s = liveState({ flags: { merging: false } });
    s.rules.test.turrets = false;
    trio(s);
    steps(s, 60);
    expect(s.units).toHaveLength(3);
    expect(ofTier(s, 2)).toHaveLength(0);
  });

  it('stays deterministic: equal hashes across runs and through a snapshot taken mid-knit', () => {
    const cfg = () => makeConfig(content, { seed: 2, player: 'bot:balanced', enemy: 'bot:balanced-nomerge', flags: { merging: true } });
    const a = createBattle(content, cfg());
    const b = createBattle(content, cfg());
    runHeadless(a, { until: 6000 });
    runHeadless(b, { until: 6000 });
    expect(hashState(a)).toBe(hashState(b));
    expect(a.stats.player.merges['2']).toBeGreaterThan(0);

    const whole = createBattle(content, cfg());
    runHeadless(whole, { until: 6000 });
    const part = createBattle(content, cfg());
    let cut = 0;
    runHeadless(part, { until: 6000, onTick: (st) => { if (!cut && st.units.some((u) => u.knit)) cut = st.tick; } });
    expect(cut).toBeGreaterThan(0);
    const midway = createBattle(content, cfg());
    runHeadless(midway, { until: cut });
    expect(midway.units.some((u) => u.knit)).toBe(true);
    const resumed = restore(snapshot(midway));
    expect(hashState(resumed)).toBe(hashState(midway));
    runHeadless(resumed, { until: 6000 });
    expect(hashState(resumed)).toBe(hashState(whole));
  });
});

describe('merge policies (SPEC §7.2)', () => {
  it('a merge-off bot switches its spawners off with ordinary toggle commands', () => {
    const s = createBattle(content, makeConfig(content, { seed: 2, player: 'bot:balanced-nomerge', enemy: 'bot:balanced', flags: { merging: true } }));
    runHeadless(s, { until: 1200 });
    const toggles = s.log.filter((c) => c.type === 'toggleMerge');
    expect(toggles.length).toBeGreaterThan(0);
    expect(toggles.every((c) => c.side === 'player')).toBe(true);
    const spawners = s.buildings.filter((b) => b.side === 'player' && s.compiled.player.buildings[b.buildingId]!.spawn);
    expect(spawners.length).toBeGreaterThan(0);
    expect(spawners.every((b) => !b.mergeOn)).toBe(true);
    expect(s.buildings.filter((b) => b.side === 'enemy').every((b) => b.mergeOn)).toBe(true);
    expect(s.stats.player.merges['2']).toBe(0);
  });

  it("the general's auto policy turns swarm merging off while the player's Slayer share is above 25%", () => {
    const s = createBattle(content, makeConfig(content, { seed: 1, player: 'human', enemy: 'general:scripted', flags: { merging: true } }));
    s.phase = 'live';
    const burrow = building(s, 'enemy', 'sporelingBurrow', 28, 0);
    const hall = building(s, 'enemy', 'capguardHall', 28, 4);
    building(s, 'player', 'capguardHall', 0, 0);
    s.tick = 19;
    steps(s, 2);
    expect(slayerSpawnShare(s, 'player')).toBe(0);
    expect(burrow.mergeOn).toBe(true);
    building(s, 'player', 'veilstalkerHollow', 0, 2); // 1/16 vs 2/15 → 32% of the supply rate
    expect(slayerSpawnShare(s, 'player')).toBeGreaterThan(0.25);
    steps(s, 20);
    expect(burrow.mergeOn).toBe(false);
    expect(hall.mergeOn).toBe(true);
    s.buildings.splice(s.buildings.findIndex((b) => b.buildingId === 'veilstalkerHollow'), 1);
    steps(s, 20);
    expect(burrow.mergeOn).toBe(true);
  });
});
