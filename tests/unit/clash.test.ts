// R1's clash check (SPEC §16 R1, §12.2): squads, the army cards, and an army from a bot spec and a
// gold budget (R1-Q2, R1-Q4); the fields, the line and the slots each building takes (R1-Q1, R1-Q9);
// the arrival; and one clash, from the muster to §6.7's lane ends and scoring (R1-Q3).
import { describe, expect, it } from 'vitest';
import type { Content } from '../../src/data/registry.ts';
import { addBuilding, addUnit } from '../../src/sim/create.ts';
import { findTrios, formationBox, musterKnits, slotPositions } from '../../src/sim/formation.ts';
import type { MusterUnit } from '../../src/sim/formation.ts';
import { createBattle, makeConfig } from '../../src/sim/index.ts';
import type { BattleState, Side, UnitState } from '../../src/sim/index.ts';
import { counterBotSpec } from '../../tools/lib/balance.ts';
import {
  CLASH, armyFromBot, armyOf, assignSlots, clashArmyIds, clashField, lineOf, placeArmy, playClash, squadSize,
} from '../../tools/lib/clash.ts';
import type { Army, ClashField, ClashJob, ClashOpts, ClashRecord, FieldId, Placement } from '../../tools/lib/clash.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

const ids = (a: Army): string[] => a.entries.map((e) => e.buildingId);

/** An army of these buildings in this order, merging on, as `armyFromBot` would field them. */
const army = (buildings: string[], c: Content = content): Army => armyOf(c, 'test', 0, buildings, true);

/** Where each placement stands, in build-list order: [lane, rank, file]. */
const where = (ps: Placement[]): [number, number, number][] => ps.map((p) => [p.lane, p.rank, p.file]);

/** A live battle on a field's map with no AI side, as a clash runs. */
function fieldState(field: ClashField, c: Content = content): BattleState {
  const s = createBattle(c, makeConfig(c, { seed: 1, mapId: field.mapId, player: 'human', enemy: 'human' }));
  s.phase = 'live';
  return s;
}

describe("R1's squads and army cards (SPEC §11.2, §16 R1)", () => {
  it("squadSize at 60 s reproduces §11.2's Squad column", () => {
    const squads: Record<string, number> = {
      sporelingBurrow: 8, capguardHall: 4, gillNest: 4, amanitaLodge: 2, hammercapForge: 4,
      rootbreakerDen: 3, scythecapGrove: 3, veilstalkerHollow: 6, morelWarren: 6, tendersRing: 3,
    };
    for (const [id, n] of Object.entries(squads)) expect(squadSize(content, id), id).toBe(n);
    expect(squadSize(protoContent('burster'), 'bursterPod')).toBe(6);
    expect(squadSize(protoContent('rhizomorph'), 'rhizomorphTunnel')).toBe(3);
  });

  it('squadSize counts whole batches, halves rounded up, and only spawners have one', () => {
    expect(squadSize(content, 'amanitaLodge', 45)).toBe(2); // 1 × round(1.5)
    expect(squadSize(content, 'veilstalkerHollow', 45)).toBe(6); // 2 × round(2.5)
    expect(squadSize(content, 'sporelingBurrow', 75)).toBe(10); // 2 × round(4.6875)
    expect(() => squadSize(content, 'puffballMortar')).toThrow(/spawns nothing/);
  });

  it('the army cards are the roster without its economy and utility cards (A016)', () => {
    const roster = content.factions['velvet-bloom']!.buildings;
    expect(clashArmyIds(content)).toEqual(roster.filter((id) => !['truffleCellar', 'sporeExchange', 'rhizomeVault'].includes(id)));
    expect(clashArmyIds(content)).toContain('tendersRing');
    expect(clashArmyIds(content)).toContain('puffballMortar');
    expect(clashArmyIds(protoContent('burster'))).toContain('bursterPod');
  });
});

describe("R1's armies from build lists (SPEC §12.2, §16 R1; R1-Q2)", () => {
  it('a mono army holds as many of its card as the gold and the plots allow', () => {
    const two = armyFromBot(content, 'bot:mono:sporelingBurrow', 300, 1, 8);
    expect(ids(two)).toEqual(['sporelingBurrow', 'sporelingBurrow']);
    expect(two.spent).toBe(220);
    const capped = armyFromBot(content, 'bot:mono:sporelingBurrow', 1500, 1, 8); // the one-lane field's 8 plots
    expect(ids(capped)).toEqual(Array<string>(8).fill('sporelingBurrow'));
    expect(capped.spent).toBe(880);
    expect(armyFromBot(content, 'bot:mono:sporelingBurrow', 1500, 1, 12).spent).toBe(1320); // the late-run colony's 4 more
    expect(ids(armyFromBot(content, 'bot:mono:amanitaLodge', 300, 1, 8))).toEqual(['amanitaLodge']);
  });

  it("an army's entries: each spawner's squad from §11.2, and the Mortar as an emplacement", () => {
    const burrow = { buildingId: 'sporelingBurrow', kind: 'squad', unitId: 'sporeling', count: 8, mergeOn: true };
    expect(armyFromBot(content, 'bot:mono:sporelingBurrow', 300, 1, 8)).toEqual({
      controller: 'bot:mono:sporelingBurrow', budget: 300, spent: 220, entries: [burrow, burrow], supply: 16, units: 16,
    });
    const mortar = armyFromBot(content, 'bot:mono:puffballMortar', 300, 1, 8);
    expect(mortar.entries).toEqual([{ buildingId: 'puffballMortar', kind: 'emplacement', count: 1, mergeOn: false }]);
    expect([mortar.spent, mortar.supply, mortar.units]).toEqual([160, 0, 0]);
    const ring = armyFromBot(content, 'bot:mono:tendersRing', 300, 1, 8);
    expect(ring.entries).toEqual([{ buildingId: 'tendersRing', kind: 'squad', unitId: 'tender', count: 3, mergeOn: true }]);
    expect([ring.supply, ring.units]).toEqual([3, 3]);
  });

  it("bot:balanced skips its opener's Cellar, ignores afterSeconds, and stops only when nothing fits or the plots are full", () => {
    const cards = clashArmyIds(content);
    const cheapest = Math.min(...Object.keys(content.bots.balanced!.weights).filter((id) => cards.includes(id)).map((id) => content.buildings[id]!.cost));
    let den = false;
    for (const budget of [300, 600, 900, 1200, 1500]) {
      for (let seed = 1; seed <= 50; seed++) {
        const a = armyFromBot(content, 'bot:balanced', budget, seed, 8);
        expect(ids(a)[0]).toBe('sporelingBurrow');
        expect(ids(a)).not.toContain('truffleCellar');
        expect(a.spent).toBeLessThanOrEqual(budget);
        expect(a.entries.length === 8 || budget - a.spent < cheapest).toBe(true);
        if (budget === 600 && ids(a).includes('rootbreakerDen')) den = true; // its limit says "after 3:00"
      }
    }
    expect(den).toBe(true);
  });

  it('maxOwned holds', () => {
    let most = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const mortars = ids(armyFromBot(content, 'bot:turtle', 1500, seed, 8)).filter((id) => id === 'puffballMortar').length;
      expect(mortars).toBeLessThanOrEqual(4);
      most = Math.max(most, mortars);
    }
    expect(most).toBe(4);
  });

  it('an army depends only on the bot, the budget and the seed, so it is the same in both seats and against every opponent', () => {
    const first = armyFromBot(content, 'bot:balanced', 900, 7, 8);
    armyFromBot(content, 'bot:mono:gillNest', 900, 7, 8);
    armyFromBot(content, 'general:scripted', 600, 3, 12);
    expect(armyFromBot(content, 'bot:balanced', 900, 7, 8)).toEqual(first);
    const distinct = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) distinct.add(ids(armyFromBot(content, 'bot:balanced', 900, seed, 8)).join());
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it('general:scripted builds an army too: its Cellar skipped, its squads merging ("auto" reads as on)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const a = armyFromBot(content, 'general:scripted', 600, seed, 8);
      expect(ids(a)[0]).toBe('sporelingBurrow');
      expect(ids(a)).not.toContain('truffleCellar');
      for (const e of a.entries) if (e.kind === 'squad') expect(e.mergeOn).toBe(true);
    }
  });

  it("the counter check's pair bots build their opener, and a merge-off bot's squads don't merge", () => {
    const cc = protoContent(counterBotSpec(content));
    expect(ids(armyFromBot(cc, 'bot:pair-capguardHall-gillNest', 300, 1, 8))).toEqual(['capguardHall', 'gillNest']);
    const off = armyFromBot(content, 'bot:balanced-nomerge', 900, 1, 8);
    expect(off.entries.length).toBeGreaterThan(0);
    for (const e of off.entries) if (e.kind === 'squad') expect(e.mergeOn).toBe(false);
  });
});

describe("R1's fields and formation by role (SPEC §4.6, §7.3, §16 R1; R1-Q1, R1-Q4, R1-Q9)", () => {
  it('the fields are test-flat, Twin Roots and test-3lane, with 8, 12 and 12 base plots a side, and 4 more on the first two', () => {
    const one = clashField(content, 'one'), twin = clashField(content, 'twin'), three = clashField(content, 'three');
    expect([one.mapId, twin.mapId, three.mapId]).toEqual(['test-flat', 'twin-roots', 'test-3lane']);
    expect([one.plots, twin.plots, three.plots]).toEqual([8, 12, 12]);
    expect([clashField(content, 'one', { extraPlots: 4 }).plots, clashField(content, 'twin', { extraPlots: 4 }).plots]).toEqual([12, 16]);
    for (const f of [one, twin, three]) {
      expect(f.geom.gapTiles).toBe(CLASH.gapTiles);
      expect(f.open.every((p) => p.rank < 2)).toBe(true);
    }
    // the three-lane screen: 3 lanes of 2 files and 2 ranks, nothing on each lane's leftover row (R1-Q9)
    for (const lane of [0, 1, 2]) expect(three.open.filter((p) => p.lane === lane)).toHaveLength(4);
    expect(() => clashField(content, 'one', { extraPlots: 5 })).toThrow(/extra plots/);
  });

  it("the line follows §7.3's tags: ranged, support and burst spawners, and every tower, stand at the back (A006)", () => {
    for (const id of ['tendersRing', 'gillNest', 'puffballMortar']) expect(lineOf(content, id), id).toBe('back');
    expect(lineOf(protoContent('burster'), 'bursterPod')).toBe('back');
    for (const id of ['capguardHall', 'sporelingBurrow', 'amanitaLodge', 'rootbreakerDen', 'veilstalkerHollow', 'morelWarren']) {
      expect(lineOf(content, id), id).toBe('front');
    }
    expect(lineOf(protoContent('rhizomorph'), 'rhizomorphTunnel')).toBe('front');
    expect(() => lineOf(content, 'truffleCellar')).toThrow(/army card/);
  });

  it('on one lane each rank fills centre-out, files 2, 3, 1, 4, in build-list order (A012)', () => {
    const one = clashField(content, 'one');
    const mixed = army(['capguardHall', 'gillNest', 'sporelingBurrow', 'tendersRing', 'amanitaLodge', 'hammercapForge', 'puffballMortar']);
    expect(where(assignSlots(content, mixed, one))).toEqual([[0, 0, 2], [0, 1, 2], [0, 0, 3], [0, 1, 3], [0, 0, 1], [0, 0, 4], [0, 1, 1]]);
    // a fifth front-line squad takes the first free back-rank slot; the back line comes after it
    expect(where(assignSlots(content, army([...Array<string>(5).fill('capguardHall'), 'gillNest']), one)))
      .toEqual([[0, 0, 2], [0, 0, 3], [0, 0, 1], [0, 0, 4], [0, 1, 2], [0, 1, 3]]);
    // a back-line squad whose rank is full takes the third rank, closed without extra plots, so the front
    expect(where(assignSlots(content, army([...Array<string>(4).fill('gillNest'), 'puffballMortar']), one)))
      .toEqual([[0, 1, 2], [0, 1, 3], [0, 1, 1], [0, 1, 4], [0, 0, 2]]);
    expect(() => assignSlots(content, army(Array<string>(9).fill('sporelingBurrow')), one)).toThrow(/plots/);
  });

  it('the third rank opens only with extra plots: files 2, 3, 1, 4 on one lane; file 2 of each lane, then file 1, on Twin Roots (R1-Q4)', () => {
    const third = (f: ClashField) => f.open.filter((p) => p.rank === 2).map((p) => [p.lane, p.file]);
    expect(third(clashField(content, 'one', { extraPlots: 4 }))).toEqual([[0, 2], [0, 3], [0, 1], [0, 4]]);
    expect(third(clashField(content, 'one', { extraPlots: 2 }))).toEqual([[0, 2], [0, 3]]);
    expect(third(clashField(content, 'twin', { extraPlots: 4 }))).toEqual([[0, 2], [1, 2], [0, 1], [1, 1]]);
    const late = clashField(content, 'one', { extraPlots: 4 });
    expect(where(assignSlots(content, army(Array<string>(12).fill('sporelingBurrow')), late)).map(([, r, f]) => [r, f])).toEqual([
      [0, 2], [0, 3], [0, 1], [0, 4], [1, 2], [1, 3], [1, 1], [1, 4], [2, 2], [2, 3], [2, 1], [2, 4],
    ]);
    // a back-line squad spills to the third rank before the front
    expect(where(assignSlots(content, army([...Array<string>(5).fill('gillNest')]), late)).at(-1)).toEqual([0, 2, 2]);
  });

  it('on Twin Roots each building goes to the lane with fewer of its line, then fewer in all, then the top lane (A002)', () => {
    const twin = clashField(content, 'twin');
    expect(where(assignSlots(content, army(['capguardHall', 'gillNest']), twin))).toEqual([[0, 0, 2], [1, 1, 2]]);
    expect(where(assignSlots(content, army(['capguardHall', 'gillNest', 'capguardHall', 'gillNest']), twin)))
      .toEqual([[0, 0, 2], [1, 1, 2], [1, 0, 2], [0, 1, 2]]);
    // mono Lodge at 300 is one Lodge: it fills only the top lane, and the other is empty
    expect(where(assignSlots(content, armyFromBot(content, 'bot:mono:amanitaLodge', 300, 1, twin.plots), twin))).toEqual([[0, 0, 2]]);
    // a full lane falls back to the other: 12 Halls fill both lanes, 6 each
    const halls = assignSlots(content, army(Array<string>(12).fill('capguardHall')), twin);
    expect([0, 1].map((l) => halls.filter((p) => p.lane === l).length)).toEqual([6, 6]);
    expect(where(halls).slice(0, 6)).toEqual([[0, 0, 2], [1, 0, 2], [0, 0, 1], [1, 0, 1], [0, 0, 3], [1, 0, 3]]);
  });

  it("with the lanes rule `general`, §7.3's round-1 rule: the lane with less planned supply, then the lower lane", () => {
    const twin = clashField(content, 'twin');
    const mixed = army(['capguardHall', 'gillNest', 'capguardHall', 'gillNest']);
    expect(where(assignSlots(content, mixed, twin, { lanesRule: 'general' })).map(([l]) => l)).toEqual([0, 1, 0, 1]);
  });

  it('placeArmy creates units in slot order (lane, rank, file), then by j, whatever order the placements come in (A024)', () => {
    const one = clashField(content, 'one');
    // the Nest takes the back rank's file 2, then the front rank's files 2, 3, 1 go to a Burrow, the Hall and a Burrow
    const ps = assignSlots(content, army(['gillNest', 'sporelingBurrow', 'capguardHall', 'sporelingBurrow']), one);
    expect(where(ps)).toEqual([[0, 1, 2], [0, 0, 2], [0, 0, 3], [0, 0, 1]]);
    const units = (s: BattleState) => s.units.map((u) => [u.id, u.unitId, u.x, u.y]);
    const a = fieldState(one), b = fieldState(one);
    const squadOf = placeArmy(a, 'player', ps);
    placeArmy(b, 'player', [...ps].reverse());
    expect(units(b)).toEqual(units(a));
    // in id order: front rank file 1 (the second Burrow), 2 (the first), 3 (the Hall), then back rank file 2 (the Nest)
    expect([...new Set(a.units.map((u) => squadOf.get(u.id)))]).toEqual([3, 1, 2, 0]);
    expect(a.units.map((u) => u.id)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });

  it("placeArmy stands each unit at its slot's layout, its squad's mergeOn on it; Rhizomorphs burrowed; a Mortar on its slot", () => {
    const rc = protoContent('rhizomorph');
    const one = clashField(rc, 'one');
    const s = fieldState(one, rc);
    const a = army(['sporelingBurrow', 'rhizomorphTunnel', 'puffballMortar', 'capguardHall'], rc);
    a.entries[0]!.mergeOn = false;
    a.entries[3] = { ...a.entries[3]!, count: 5 }; // 5 Capguards overflow their slot (§4.6) and touch the lane's top
    const placed: Record<Side, Placement[]> = { player: assignSlots(rc, a, one), enemy: assignSlots(rc, a, one) };
    const squadOf = { player: placeArmy(s, 'player', placed.player), enemy: placeArmy(s, 'enemy', placed.enemy) };
    for (const side of ['player', 'enemy'] as const) {
      const box = formationBox(one.geom, side, 2);
      for (const p of placed[side]) {
        const slot = box.find((b) => b.lane === p.lane && b.rank === p.rank && b.file === p.file)!;
        if (p.entry.kind === 'emplacement') {
          const towers = s.buildings.filter((b) => b.side === side);
          expect(towers.map((b) => [b.buildingId, b.lane, b.col, b.row])).toEqual([['puffballMortar', 0, slot.col, slot.row]]);
          continue;
        }
        const units = s.units.filter((u) => u.side === side && u.unitId === p.entry.unitId);
        const r = rc.units[p.entry.unitId!]!.radius;
        const at = slotPositions(p.entry.count, slot, side).map(({ x, y }) => [x, Math.min(Math.max(y, r), 8 - r)]);
        expect(units.map((u) => [u.x, u.y])).toEqual(at);
        for (const u of units) {
          expect(u.mergeOn).toBe(p.entry.mergeOn);
          expect(u.burrowed).toBe(p.entry.unitId === 'rhizomorph' ? true : undefined);
          expect(u.sourceBuildingId).toBe(0);
          expect(squadOf[side].get(u.id)).toBe(placed[side].indexOf(p));
        }
      }
      expect(s.stats[side].spawned).toEqual({ sporeling: 8, rhizomorph: 3, capguard: 5 });
    }
    expect(s.units.find((u) => u.unitId === 'capguard')!.y).toBe(0.35); // clamped by addUnit, as the lane's edge allows
  });
});

/** An army that fields nothing, for a side a test stages by hand. */
const none = (): Army => armyOf(content, 'none', 0, [], true);

/** A clash of two armies (the first in the player's seat), seed 1, jitter 0. */
const job = (field: FieldId, a: Army, b: Army, opts: ClashOpts = {}, extra: Partial<ClashJob> = {}): ClashJob => ({
  field, seed: 1, seat: 'player', armies: [a, b], jitter: 0, opts, ...extra,
});

/** A unit placed by hand in a stage hook. */
interface Staged { side: Side; unitId: string; x: number; y: number; lane?: number; hp?: number; mergeOn?: boolean }

/** A stage hook that adds these units, in order. A huge `hp` keeps a unit alive to the cap. */
const stageUnits = (...units: Staged[]) => (s: BattleState): void => {
  for (const p of units) {
    const u = addUnit(s, p.side, p.unitId, p.lane ?? 0, p.x, p.y, 0);
    if (p.hp !== undefined) { u.hp = p.hp; u.maxHp = Math.max(u.maxHp, p.hp); }
    if (p.mergeOn === false) u.mergeOn = false;
  }
};

/** A side's units as muster records, as the clash reads them at the arrival. */
const records = (s: BattleState, side: Side): MusterUnit[] => s.units.filter((u) => u.side === side).map((u: UnitState) => ({
  key: u.id, side, lane: u.lane, unitId: u.unitId, tier: u.tier, x: u.x, y: u.y, mergeOn: u.mergeOn, eligible: !u.burrowed, source: u.sourceBuildingId,
}));

const lane0 = (r: ClashRecord) => r.lanes[0]!;

describe('one clash: the muster, the lane ends and the clock (SPEC §5.6, §6.7, §16 R1; R1-Q3)', () => {
  const one = 'one' as const;

  it('E1: a lane where only one side fields anything locks at tick 0, won with its whole damage supply after the muster', () => {
    const r = playClash(content, job(one, army(['sporelingBurrow']), none()));
    for (const reading of [lane0(r).cap, lane0(r).capAfterMuster]) {
      // 8 Sporelings knit to 2 Bloomed + 2 base at the muster: 6 supply, 150 raw
      expect(reading).toEqual({ case: 'E1', winner: 'player', ticks: 0, capped: false, surviving: { player: 6, enemy: 0 }, damageSupply: { player: 6, enemy: 0 }, raw: 150 });
    }
    expect(r.cap).toMatchObject({ ticks: 0, capped: false, winner: 'player', round: 'player', heartcap: { enemy: { uncapped: 150, capped: 150 } } });
  });

  it('E2: a lane where neither side fields anything is drawn, with no damage', () => {
    const r = playClash(content, job('twin', army(['capguardHall']), army(['capguardHall'])));
    expect(r.lanes[1]!.cap).toEqual({ case: 'E2', winner: 'draw', ticks: 0, capped: false, surviving: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, raw: 0 });
    expect(r.lanes[1]!.capAfterMuster).toEqual(r.lanes[1]!.cap);
    expect(r.lanes[0]!.cap.ticks).toBeGreaterThan(CLASH.musterTicks); // the Halls in the top lane fight it out
  });

  it('E3: equal surviving supply at the cap is a draw; one clash gives both readings, at tick 900 and 920 (#13)', () => {
    // Tenders only heal, and never seek an enemy: both live to the cap
    const r = playClash(content, job(one, none(), none()), { stage: stageUnits({ side: 'player', unitId: 'tender', x: 10, y: 4 }, { side: 'enemy', unitId: 'tender', x: 22, y: 4 }) });
    expect(lane0(r).cap).toEqual({ case: 'E3', winner: 'draw', ticks: CLASH.capTicks, capped: true, surviving: { player: 1, enemy: 1 }, damageSupply: { player: 1, enemy: 1 }, raw: 0 });
    expect(lane0(r).capAfterMuster).toMatchObject({ case: 'E3', winner: 'draw', ticks: CLASH.capTicks + CLASH.musterTicks, capped: true });
    expect([r.cap.ticks, r.capAfterMuster.ticks]).toEqual([900, 920]);
    expect(r.cap).toMatchObject({ capped: true, winner: 'draw', round: 'draw' });
  });

  it('E4: two Sporelings at 1 HP in contact, cooldowns equal, die on the same tick, and the lane is drawn', () => {
    const r = playClash(content, job(one, none(), none()), {
      stage: stageUnits({ side: 'player', unitId: 'sporeling', x: 15.6, y: 4, hp: 1 }, { side: 'enemy', unitId: 'sporeling', x: 16.4, y: 4, hp: 1 }),
    });
    expect(lane0(r).cap).toMatchObject({ case: 'E4', winner: 'draw', capped: false, surviving: { player: 0, enemy: 0 }, raw: 0 });
    // a lane's length counts the muster's 20 ticks: this one ended on the clash's first steps
    expect(lane0(r).cap.ticks).toBeGreaterThan(CLASH.musterTicks);
    expect(lane0(r).cap.ticks).toBeLessThan(CLASH.musterTicks + 10);
    expect(lane0(r).capAfterMuster).toEqual(lane0(r).cap);
  });

  it('E5: only Mortars left on both sides at the cap is a draw, and emplacements alone held the lane (#10)', () => {
    // two Mortars 8 tiles apart, out of each other's 6-tile range
    const r = playClash(content, job(one, none(), none()), {
      stage: (s) => { addBuilding(s, 'player', 'puffballMortar', 0, 11, 3, 160); addBuilding(s, 'enemy', 'puffballMortar', 0, 19, 3, 160); },
    });
    expect(lane0(r).cap).toEqual({ case: 'E5', winner: 'draw', ticks: 900, capped: true, surviving: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, raw: 0 });
    expect(lane0(r).emplacementsHeld).toBe(true);
  });

  it('E6: a side left with only a Mortar against nothing wins with 0 supply and deals no damage', () => {
    const r = playClash(content, job(one, none(), none()), {
      stage: (s) => {
        addBuilding(s, 'player', 'puffballMortar', 0, 11, 3, 160);
        stageUnits({ side: 'enemy', unitId: 'sporeling', x: 16, y: 4, hp: 1 })(s);
      },
    });
    expect(lane0(r).cap).toMatchObject({ case: 'E6', winner: 'player', capped: false, surviving: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, raw: 0 });
    expect(lane0(r).cap.ticks).toBeLessThan(CLASH.capTicks);
    expect(lane0(r).emplacementsHeld).toBe(false);
    expect(r.cap).toMatchObject({ winner: 'player', round: 'draw', heartcap: { enemy: { uncapped: 0, capped: 0 } } });
  });

  it('a surviving Rootbreaker counts 3 toward surviving supply and 6 toward damage supply (150 raw)', () => {
    const r = playClash(content, job(one, none(), none()), { stage: stageUnits({ side: 'player', unitId: 'rootbreaker', x: 12, y: 4 }) });
    expect(lane0(r).cap).toMatchObject({ case: 'E1', winner: 'player', surviving: { player: 3, enemy: 0 }, damageSupply: { player: 6, enemy: 0 }, raw: 150 });
  });

  it("at the cap the margin is the winner's damage supply less the loser's, never below 0 (#22's first guess)", () => {
    const BIG = 1e9; // nobody dies before the cap
    const siege = playClash(content, job(one, none(), none()), {
      stage: stageUnits(
        { side: 'player', unitId: 'rootbreaker', x: 12, y: 3, hp: BIG }, { side: 'player', unitId: 'rootbreaker', x: 12, y: 5, hp: BIG },
        { side: 'enemy', unitId: 'capguard', x: 20, y: 3, hp: BIG }, { side: 'enemy', unitId: 'capguard', x: 20, y: 5, hp: BIG },
      ),
    });
    expect(lane0(siege).cap).toMatchObject({ case: 'cap', winner: 'player', capped: true, surviving: { player: 6, enemy: 4 }, damageSupply: { player: 12, enemy: 4 }, raw: 200 });
    const floor = playClash(content, job(one, none(), none()), {
      stage: stageUnits(
        { side: 'player', unitId: 'capguard', x: 12, y: 3, hp: BIG }, { side: 'player', unitId: 'capguard', x: 12, y: 5, hp: BIG },
        { side: 'enemy', unitId: 'rootbreaker', x: 20, y: 4, hp: BIG },
      ),
    });
    // the Capguards win the lane on supply, 4 to 3, but the Rootbreaker's damage supply is 6
    expect(lane0(floor).cap).toMatchObject({ case: 'cap', winner: 'player', surviving: { player: 4, enemy: 3 }, damageSupply: { player: 4, enemy: 6 }, raw: 0 });
    expect(lane0(floor).emplacementsHeld).toBe(false);
  });

  it("each Heartcap's damage is capped at 500 over the lanes it lost; the clash goes by lanes, then uncapped damage, the round by capped damage (R1-Q3)", () => {
    // Twin Roots: 12 Rootbreakers win the top lane alone (1,800 raw), 8 win the bottom (1,200), merging off
    const rbs = (side: Side, lane: number, n: number): Staged[] =>
      Array.from({ length: n }, (_, i) => ({ side, lane, unitId: 'rootbreaker', x: side === 'player' ? 8 + (i % 4) : 20 + (i % 4), y: lane * 7 + 1 + Math.floor(i / 4) * 1.5 }));
    const r = playClash(content, job('twin', none(), none(), { merging: false }), { stage: stageUnits(...rbs('player', 0, 12), ...rbs('enemy', 1, 8)) });
    expect(r.lanes.map((l) => [l.cap.case, l.cap.winner, l.cap.raw])).toEqual([['E1', 'player', 1800], ['E1', 'enemy', 1200]]);
    expect(r.cap.heartcap).toEqual({ player: { uncapped: 1200, capped: 500 }, enemy: { uncapped: 1800, capped: 500 } });
    expect(r.cap).toMatchObject({ lanesWon: { player: 1, enemy: 1 }, winner: 'player', round: 'draw' });

    // three lanes: two small lanes beat one big one, whatever the damage
    const three = playClash(content, job('three', none(), none(), { merging: false }), {
      stage: stageUnits(
        { side: 'player', unitId: 'sporeling', x: 10, y: 2, lane: 0 }, { side: 'player', unitId: 'sporeling', x: 10, y: 8, lane: 1 },
        ...Array.from({ length: 4 }, (_, i): Staged => ({ side: 'enemy', unitId: 'rootbreaker', x: 20, y: 12.5 + i, lane: 2 })),
      ),
    });
    expect(three.cap).toMatchObject({ lanesWon: { player: 2, enemy: 1 }, winner: 'player', round: 'enemy' });
    expect(three.cap.heartcap).toEqual({ player: { uncapped: 600, capped: 500 }, enemy: { uncapped: 50, capped: 50 } });
  });

  it('the muster: two Burrows side by side record { 2: 5, 3: 1 } and field 1 Elder + 2 Bloomed + 1 base, each merged unit with its key as its id', () => {
    const r = playClash(content, job(one, army(['sporelingBurrow', 'sporelingBurrow']), none()));
    expect(r.armies.player.merges.muster).toEqual({ '2': 5, '3': 1 });
    expect(r.armies.player.mustered).toEqual({ units: 4, supply: 9, base: 1, bloomed: 2, elders: 1 });
    expect(r.armies.enemy.merges.muster).toEqual({ '2': 0, '3': 0 });
  });

  it("before tick 20 nobody moves or attacks: the clash starts from the muster's own units, and with jitter 0 no field knit is left to start", () => {
    const a = army(['sporelingBurrow', 'sporelingBurrow', 'capguardHall', 'gillNest']), b = army(['sporelingBurrow', 'capguardHall', 'capguardHall']);
    const expected: Partial<Record<Side, MusterUnit[]>> = {};
    let seen = 0;
    playClash(content, job(one, a, b), {
      stage: (s) => {
        let firstKey = s.nextId;
        for (const side of ['player', 'enemy'] as const) {
          const res = musterKnits(records(s, side), {
            firstKey, mergeRadius: s.compiled[side].mergeRadius, width: s.map.width,
            radiusOf: (id, tier) => s.compiled[side].units[id]!.tiers[tier - 1]!.radius, lanes: s.lanes.map((l) => ({ top: l.rowStart, bottom: l.rowEnd })),
          });
          firstKey += res.passes.reduce((n, pass) => n + pass.length, 0);
          expected[side] = res.units;
        }
      },
      mustered: (s) => {
        seen++;
        expect(s.tick).toBe(CLASH.musterTicks);
        for (const side of ['player', 'enemy'] as const) {
          expect(records(s, side)).toEqual(expected[side]);
          expect(findTrios(records(s, side), s.compiled[side].mergeRadius)).toEqual([]);
        }
      },
    });
    expect(seen).toBe(1);
    expect(expected.player!.some((u) => u.tier === 3)).toBe(true);
  });

  it('the jitter moves each unit up to ±j tiles per axis after the muster, clamped to its lane, from its own stream; 0 draws nothing', () => {
    const a = army(['sporelingBurrow', 'capguardHall', 'gillNest', 'amanitaLodge']), b = army(['capguardHall', 'sporelingBurrow', 'hammercapForge']);
    const at = (j: number, seat: Side = 'player', seed = 1): Map<number, [number, number]> => {
      const pos = new Map<number, [number, number]>();
      playClash(content, job(one, a, b, {}, { jitter: j, seat, seed }), { mustered: (s) => { for (const u of s.units) pos.set(u.id, [u.x, u.y]); } });
      return pos;
    };
    const still = at(0), moved = at(0.2);
    expect([...moved.keys()]).toEqual([...still.keys()]);
    let changed = 0;
    for (const [id, [x, y]] of moved) {
      const [x0, y0] = still.get(id)!;
      expect(Math.abs(x - x0)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(y - y0)).toBeLessThanOrEqual(0.2);
      if (x !== x0 || y !== y0) changed++;
    }
    expect(changed).toBe(moved.size);
    expect(at(0.2)).toEqual(moved);
    expect(at(0.2, 'player', 2)).not.toEqual(moved);
    expect(at(0, 'player', 2)).toEqual(still); // the seed moves nothing without jitter
  });

  it("the clash runs on v1's sim with no AI side, turrets, territory or Heartcap targets, to tick 920, with v2's two switches on unless asked", () => {
    const rules: Record<string, unknown>[] = [];
    const look = (opts: ClashOpts) => playClash(content, job(one, army(['capguardHall']), army(['gillNest']), opts), {
      mustered: (s) => {
        expect(s.sides.player.ai).toBeUndefined();
        expect(s.sides.enemy.ai).toBeUndefined();
        expect(s.rules.timeLimitTicks).toBeGreaterThan(CLASH.capTicks + CLASH.musterTicks);
        rules.push({ ...s.rules.test });
      },
    });
    const first = look({});
    expect(look({})).toEqual(first);
    look({ v1Movement: true });
    look({ v1Targeting: true });
    const base = { turrets: false, territory: false, heartcapTargets: false };
    expect(rules).toEqual([
      { ...base, noBuildingPreference: true, idleSeek: true }, { ...base, noBuildingPreference: true, idleSeek: true },
      { ...base, noBuildingPreference: true }, { ...base, idleSeek: true },
    ]);
  });
});
