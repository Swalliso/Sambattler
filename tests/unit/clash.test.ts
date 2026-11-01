// R1's clash check (SPEC §16 R1, §12.2): squads, the army cards, and an army from a bot spec and a
// gold budget (R1-Q2, R1-Q4); the fields, the line and the slots each building takes (R1-Q1, R1-Q9),
// and the arrival.
import { describe, expect, it } from 'vitest';
import type { Content } from '../../src/data/registry.ts';
import { formationBox, slotPositions } from '../../src/sim/formation.ts';
import { createBattle, makeConfig } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
import { counterBotSpec } from '../../tools/lib/balance.ts';
import { CLASH, armyFromBot, armyOf, assignSlots, clashArmyIds, clashField, lineOf, placeArmy, squadSize } from '../../tools/lib/clash.ts';
import type { Army, ClashField, Placement } from '../../tools/lib/clash.ts';
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
