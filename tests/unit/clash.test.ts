// R1's clash check (SPEC §16 R1, §12.2), on the round sim since R2b (T158): squads, the army cards, and an army
// from a bot spec and a gold budget (R1-Q2, R1-Q4); the fields, the line and the slots each building takes
// (R1-Q1, R1-Q9); the clash's record, read from the round's result; the pairings and the full colony. Then
// Begin, the muster and a lane's end in rounds (SPEC §4.7 steps 12–17, §5.6, §6.7, §14.6): the arrival in
// plot order, the arrival shield, the muster resolved inside Begin and its 20 still ticks, the fielded
// record, `clashStart`, each lane's end and its lock, and a frozen lane on Twin Roots (A024, A026, A030,
// A032, A047). Per-squad stats are here too, since Begin compiles them (T046, A028). Scoring is S7's.
import { describe, expect, it } from 'vitest';
import type { Content } from '../../src/data/registry.ts';
import type { EffectBundle, ScenarioDef } from '../../src/data/schema.ts';
import { createRun, generalKit } from '../../src/run/index.ts';
import { addBuilding, createBattle, createFromScenario, formationOf, makeRoundConfig, mergePreview, SIDES, step } from '../../src/sim/index.ts';
import type { BattleState, FieldedSquad, Flags, LaneLock, Side, SimEvent, UnitState } from '../../src/sim/index.ts';
import { insertHit } from '../../src/sim/hits.ts';
import { addCloud } from '../../src/sim/systems/clouds.ts';
import { mergeTriosNow } from '../../src/sim/systems/merging.ts';
import { tierDef } from '../../src/sim/world.ts';
import { CORE_SPAWNERS, battleOneGenerals, battleOneKit, battleOnePairings, core6Spec, counterBotSpec, pairingBotSpec, starterCandidates } from '../../tools/lib/balance.ts';
import {
  CLASH, MIRROR_SEED, armyFromBot, armyOf, assignSlots, clashArmyIds, clashField, clashRecord, fullColony, lineOf, overflowTable, pairLine, pairScore, playPair,
  playRoundClash, squadSize,
} from '../../tools/lib/clash.ts';
import type { Army, ClashField, ClashJob, ClashOpts, FieldId, Placement } from '../../tools/lib/clash.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { begin, content, plotAt, stepClash } from '../helpers.ts';

const ids = (a: Army): string[] => a.entries.map((e) => e.buildingId);

/** An army of these buildings in this order, merging on, as `armyFromBot` would field them. */
const army = (buildings: string[], c: Content = content): Army => armyOf(c, 'test', 0, buildings, true);

/** Where each placement stands, in build-list order: [lane, rank, file]. */
const where = (ps: Placement[]): [number, number, number][] => ps.map((p) => [p.lane, p.rank, p.file]);

describe("R1's squads and army cards (SPEC §11.2, §16 R1)", () => {
  it("squadSize reads each spawner's data squad, §11.2's Squad column", () => {
    const squads: Record<string, number> = {
      sporelingBurrow: 8, capguardHall: 3, gillNest: 4, amanitaLodge: 2, hammercapForge: 4,
      rootbreakerDen: 3, scythecapGrove: 3, veilstalkerHollow: 6, morelWarren: 6, tendersRing: 3,
    };
    for (const [id, n] of Object.entries(squads)) expect(squadSize(content, id), id).toBe(n);
    expect(squadSize(content, 'bursterPod')).toBe(6);
    expect(squadSize(content, 'rhizomorphTunnel')).toBe(3);
  });

  it('only spawners have a squad', () => {
    expect(() => squadSize(content, 'puffballMortar')).toThrow(/fields no squad/);
  });

  it('the army cards are the roster without its economy and utility cards (A016)', () => {
    const roster = content.factions['velvet-bloom']!.buildings;
    expect(clashArmyIds(content)).toEqual(roster.filter((id) => !['truffleCellar', 'sporeExchange', 'rhizomeVault'].includes(id)));
    expect(clashArmyIds(content)).toContain('tendersRing');
    expect(clashArmyIds(content)).toContain('puffballMortar');
    expect(clashArmyIds(content)).toContain('bursterPod');
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

  it("bot:balanced skips its opener's Cellar, ignores afterRound, and stops only when nothing fits or the plots are full", () => {
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

  it("the line follows §7.3's tags: ranged and support spawners, and every tower, stand at the back (A006, T159)", () => {
    for (const id of ['tendersRing', 'gillNest', 'puffballMortar']) expect(lineOf(content, id), id).toBe('back');
    // a Burster rolls at the enemy's thickest knot, so it stands in front (T159, the user, 2026-11-03)
    for (const id of ['capguardHall', 'sporelingBurrow', 'amanitaLodge', 'rootbreakerDen', 'veilstalkerHollow', 'morelWarren', 'bursterPod']) {
      expect(lineOf(content, id), id).toBe('front');
    }
    expect(lineOf(content, 'rhizomorphTunnel')).toBe('front');
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
});

/** A clash of two armies (the first in the player's seat), seed 1, jitter 0. */
const job = (field: FieldId, a: Army, b: Army, opts: ClashOpts = {}, extra: Partial<ClashJob> = {}): ClashJob => ({
  field, seed: 1, seat: 'player', armies: [a, b], jitter: 0, opts, ...extra,
});

describe("the clash check's record on the round sim (SPEC §6.7, §12.2, §16 R1; R2b/T158)", () => {
  const a = () => armyFromBot(content, 'bot:mono:sporelingBurrow', 600, 1, 8), b = () => armyFromBot(content, 'bot:balanced', 600, 1, 8);

  it("reads its lanes and Heartcap damage from the round's result, as playRoundClash plays it from either seat", () => {
    for (const seat of SIDES) {
      const r = clashRecord(content, job('twin', a(), b(), {}, { seat }));
      const round = playRoundClash(content, { field: 'twin', seed: 1, seat, armies: [a(), b()] });
      const ab = (w: Side | 'draw') => (w === 'draw' ? null : w === seat ? 'a' : 'b');
      expect(r.lanes.map((l) => [ab(l.cap.winner), l.cap.ticks, l.cap.capped])).toEqual(round.lanes.map((l) => [l.winner, l.ticks, l.capped]));
      expect(r.lanes.map((l) => [l.cap.surviving[seat], l.cap.surviving[seat === 'player' ? 'enemy' : 'player']])).toEqual(round.lanes.map((l) => l.survivors));
      const other = seat === 'player' ? 'enemy' : 'player';
      expect([r.cap.heartcap[other].capped, r.cap.heartcap[seat].capped]).toEqual(round.damage);
      expect([r.cap.heartcap[other].uncapped, r.cap.heartcap[seat].uncapped]).toEqual(round.uncapped);
      expect(ab(r.cap.winner) ?? 'draw').toBe(round.winner);
      expect(r.cap.ticks).toBe(round.ticks);
    }
  });

  it("records each army's muster, its merges and §7.4's reading of what it fielded", () => {
    const r = clashRecord(content, job('one', army(['sporelingBurrow', 'sporelingBurrow']), army(['capguardHall'])));
    expect(r.armies.player.mustered.units).toBeLessThan(16); // two Burrows of 8 knit at the muster
    expect(r.armies.player.merges.muster['2']).toBeGreaterThan(0);
    expect(r.armies.player.kinds.top).toBe('swarm');
    expect(r.armies.enemy.mustered).toMatchObject({ units: 1, bloomed: 1, base: 0 }); // a Hall's 3 Capguards are one trio
    expect(r.armies.enemy.merges.muster).toEqual({ '2': 1, '3': 0 });
    expect(r.opts).toEqual({ merging: true, extraPlots: 0, lanesRule: 'line' });
  });

  it('draws no random number at jitter 0, so its seed never matters; with jitter it does', () => {
    const plain = clashRecord(content, job('one', a(), b()));
    expect(clashRecord(content, job('one', a(), b(), {}, { seed: 9 }))).toEqual({ ...plain, seed: 9 });
    const moved = (seed: number) => clashRecord(content, job('one', a(), b(), {}, { seed, jitter: 0.2 }));
    expect(moved(1)).not.toEqual({ ...moved(2), seed: 1 });
  });
});

describe("a matchup in both seats (`--checks clash --pair`, SPEC §12.2)", () => {
  it('plays each field, budget and seed in both seats with the same two armies, records in that order', () => {
    const rs = playPair(content, { a: 'bot:mono:capguardHall', b: 'bot:mono:gillNest', budgets: [300], fields: ['one', 'twin'], seeds: 2 });
    expect(rs.map((r) => [r.field, r.budget, r.seed, r.seat])).toEqual([
      ['one', 300, 1, 'player'], ['one', 300, 1, 'enemy'], ['one', 300, 2, 'player'], ['one', 300, 2, 'enemy'],
      ['twin', 300, 1, 'player'], ['twin', 300, 1, 'enemy'], ['twin', 300, 2, 'player'], ['twin', 300, 2, 'enemy'],
    ]);
    for (const r of rs) expect([r.armies[r.seat].controller, r.armies[r.seat === 'player' ? 'enemy' : 'player'].controller]).toEqual(['bot:mono:capguardHall', 'bot:mono:gillNest']);
    expect(rs[1]!.armies.enemy.entries).toEqual(rs[0]!.armies.player.entries);
    const score = pairScore(rs);
    expect(score.wins + score.draws + score.losses).toBe(8);
    expect(pairLine(rs[4]!)).toMatch(/^twin\s+300 {2}seed 1 {2}a=player {2}L0 .*; L1 .* \| damage to a .* \| clash (a|b|draw), round (a|b|draw) \| muster a \d+\+\d+, b \d+\+\d+$/);
  });

  it("a mirror builds its second army on seed 1,000 + s, so the two armies differ", () => {
    const [r] = playPair(content, { a: 'bot:balanced', b: 'bot:balanced', budgets: [900], fields: ['one'], seeds: 1 });
    expect(r!.armies.enemy.entries).toEqual(armyFromBot(content, 'bot:balanced', 900, MIRROR_SEED + 1, 8).entries);
    expect(r!.armies.enemy.entries).not.toEqual(r!.armies.player.entries);
  });
});

describe("R1's variants (SPEC §16 R1, §12.2; X4, §18.2 #51, R1-Q6)", () => {
  it('merging off: nothing knits, at the muster or after', () => {
    const r = clashRecord(content, job('one', army(['sporelingBurrow', 'sporelingBurrow']), army(['sporelingBurrow']), { merging: false }));
    for (const side of ['player', 'enemy'] as const) expect(r.armies[side].merges).toEqual({ muster: { '2': 0, '3': 0 }, field: { '2': 0, '3': 0 } });
    expect(r.armies.player.mustered).toMatchObject({ units: 16, base: 16, bloomed: 0, elders: 0 });
  });

  it("copies 3: no card fields more than 3 buildings, and a mono's other plots and gold go by bot:balanced's weights (#51)", () => {
    const most = (a: Army) => Math.max(...[...new Set(ids(a))].map((id) => ids(a).filter((x) => x === id).length));
    const mono = armyFromBot(content, 'bot:mono:sporelingBurrow', 1500, 1, 8, { copies: 3 });
    expect(ids(mono).slice(0, 3)).toEqual(['sporelingBurrow', 'sporelingBurrow', 'sporelingBurrow']);
    expect(ids(mono)).toHaveLength(8);
    expect(most(mono)).toBe(3);
    const balanced = Object.keys(content.bots.balanced!.weights);
    for (const id of ids(mono)) expect(balanced).toContain(id);
    for (let seed = 1; seed <= 10; seed++) expect(most(armyFromBot(content, 'bot:balanced', 1500, seed, 12, { copies: 3 }))).toBeLessThanOrEqual(3);
    expect(most(armyFromBot(content, 'bot:balanced', 1500, 7, 12))).toBeGreaterThan(3); // without the cap it holds more
  });

  it('core six: the core6 reference weighs the five core spawners and the candidate at 1 each, with the Burrow as its opener (R1-Q6)', () => {
    expect(CORE_SPAWNERS).toEqual(['sporelingBurrow', 'capguardHall', 'gillNest', 'amanitaLodge', 'hammercapForge']);
    for (const candidate of ['bursterPod', 'puffballMortar']) {
      const c = protoContent(core6Spec(candidate));
      expect(c.bots.core6).toMatchObject({ opener: ['sporelingBurrow'], weights: Object.fromEntries([...CORE_SPAWNERS, candidate].map((id) => [id, 1])), mergePolicy: 'on', fixedWeights: true });
      expect(ids(armyFromBot(c, 'bot:core6', 300, 1, 8))[0]).toBe('sporelingBurrow');
    }
  });
});

describe("battle 1's pairings (`--checks pairings`, SPEC §7.8, §8.1, §11.10; R2-Q13)", () => {
  it("pair each commander's starter with each adaptive, non-boss general that appears in battle 1: Old Mother Mold and the Lichen Baron", () => {
    expect(battleOneGenerals(content)).toEqual(['mother-mold', 'lichen-baron']);
    expect(battleOnePairings(content).map((p) => `${p.commander} ${p.general}`)).toEqual([
      'vesper mother-mold', 'vesper lichen-baron', 'armilla mother-mold', 'armilla lichen-baron', 'cordis mother-mold', 'cordis lichen-baron',
    ]);
  });

  it("a general's battle-1 kit is its opener's cards, economy filtered, as generalKit gives it at index 1", () => {
    expect(battleOneKit(content, 'mother-mold')).toEqual(['sporelingBurrow']);
    expect(battleOneKit(content, 'lichen-baron')).toEqual(['capguardHall']);
    const run = createRun(content, { seed: 1, commander: 'vesper' });
    for (const id of battleOneGenerals(content)) {
      const kit = generalKit(content, run, { kind: 'battle', map: 'bogwater-hollow', general: id }, 1).kit;
      expect(battleOneKit(content, id)).toEqual(kit.filter((b) => content.buildings[b]!.kind !== 'economy'));
    }
  });

  it("a starter's candidates are the monos and even pairs of its army cards", () => {
    expect(starterCandidates(content, 'vesper')).toEqual(['bot:mono:sporelingBurrow', 'bot:mono:capguardHall', 'bot:pair-sporelingBurrow-capguardHall']);
    expect(starterCandidates(content, 'armilla')).toEqual(['bot:mono:capguardHall', 'bot:mono:puffballMortar', 'bot:pair-capguardHall-puffballMortar']);
    expect(starterCandidates(content, 'cordis')).toEqual(['bot:mono:sporelingBurrow', 'bot:mono:gillNest', 'bot:pair-sporelingBurrow-gillNest']);
  });

  it("the general's battle-1 army builds from its opener and weights limited to its kit, merging as the general does", () => {
    const pc = protoContent([counterBotSpec(content), pairingBotSpec(content)].join(','));
    for (const [general, card] of [['mother-mold', 'sporelingBurrow'], ['lichen-baron', 'capguardHall']] as const) {
      for (const budget of [300, 600, 900]) {
        const a = armyFromBot(pc, `bot:kit1-${general}`, budget, 1, 8);
        expect(a.entries.length).toBeGreaterThan(0);
        expect(a.entries.every((e) => e.buildingId === card && e.mergeOn)).toBe(true);
      }
    }
    for (const c of battleOnePairings(content).flatMap((p) => starterCandidates(content, p.commander))) expect(armyFromBot(pc, c, 600, 1, 8).entries.length).toBeGreaterThan(0);
  });
});

describe('the full colony and the overflow table (SPEC §13.7, §4.6; R1-Q5, #7, #11; A004, A020, A200)', () => {
  const fc = fullColony(content);
  const squad = (id: string) => fc.squads.find((x) => x.buildingId === id)!;

  it("the biggest colonies on the data's squads: 12 Burrows of 8 on one lane, 96 units, and 12 Dens the most supply, 108", () => {
    expect(squad('sporelingBurrow')).toMatchObject({ squad: 8, supply: 1, swarm: true });
    const one = fc.fields.find((f) => f.field === 'one')!;
    expect(one).toMatchObject({ plots: 12, fits: true, levers: [] });
    expect(one.byUnits).toEqual({ buildingId: 'sporelingBurrow', units: 96, supply: 96 });
    expect(one.bySupply).toEqual({ buildingId: 'rootbreakerDen', units: 36, supply: 108 });
  });

  it("Twin Roots' 16 plots field 128 units a side, inside 150", () => {
    const twin = fc.fields.find((f) => f.field === 'twin')!;
    expect(twin).toMatchObject({ plots: 16, fits: true, levers: [], byUnits: { buildingId: 'sporelingBurrow', units: 128, supply: 128 } });
  });

  it("A200's sensitivity rows: every squad +1 (the Vault), the squad in front +2 (the Shrine), and Old Mother Mold's swarm squads +10% rounded up", () => {
    const row = (id: string) => fc.sensitivity.find((r) => r.id === id)!.fields.map((f) => `${f.field} ${f.buildingId} ${f.units} ${f.supply}`);
    expect(row('vault')).toEqual(['one sporelingBurrow 108 108', 'twin sporelingBurrow 144 144']);
    // the squads with a plot behind them: 8 of 12 on one lane, 10 of 16 on Twin Roots
    expect(row('shrine')).toEqual(['one sporelingBurrow 112 112', 'twin sporelingBurrow 148 148']);
    // a Burrow's 8 become 9
    expect(row('mold')).toEqual(['one sporelingBurrow 108 108', 'twin sporelingBurrow 144 144']);
    expect(fc.lines[0]).toMatch(/150 live units a side/);
  });

  it('the overflow table: each squad and its squad +1 and +2, flagging Hall 5, Forge 5 and Den 5 (A020)', () => {
    const t = overflowTable(content);
    const at = (id: string) => t.rows.find((r) => r.buildingId === id)!.sizes.map((x) => `${x.n}${x.overflows ? '*' : ''}`).join(' ');
    expect(t.rows.map((r) => r.buildingId)).toEqual(clashArmyIds(content).filter((id) => content.buildings[id]!.squad));
    expect(t.rows[0]!.sizes.map((x) => x.at)).toEqual(['squad', '+1', '+2']);
    expect(at('capguardHall')).toBe('3 4 5*');
    expect(at('hammercapForge')).toBe('4 5* 6*');
    expect(at('rootbreakerDen')).toBe('3 4 5*');
    expect(at('sporelingBurrow')).toBe('8 9 10');
    expect(t.lines.some((l) => l.includes('capguardHall') && l.includes('5*'))).toBe(true);
  });
});

// ---- Begin, the muster and a lane's end in rounds (R2a) ----

type Colony = NonNullable<ScenarioDef['sides']['player']['colony']>;

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
    expect(later.filter((e) => e.t === 'merged' || e.t === 'knitStart' || e.t === 'gold')).toEqual([]);
    expect(s.sides.player.gold - gold).toBe(trios.length);
  });

  it('fires clashStart triggers once, after the muster’s knits and before the clash’s first tick (T026)', () => {
    const s = withEffects({ triggers: [{ on: 'clashStart', do: [{ gainGold: 7 }] }] }, [at('sporelingBurrow', 0, 0, 1)], [at('capguardHall', 0, 0, 1)]);
    const gold = s.sides.player.gold;
    const kinds = begin(s).map((e) => e.t);
    expect(kinds[0]).toBe('clashStarted');
    expect(kinds.filter((t) => t === 'gold')).toHaveLength(1);
    expect(kinds.lastIndexOf('musterKnit')).toBeLessThan(kinds.indexOf('gold'));
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
