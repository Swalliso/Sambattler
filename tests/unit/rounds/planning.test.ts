// Planning in rounds (SPEC §4.2, §4.4, §4.7, §14.5, §14.6): `plant`, `sell`, `toggleMerge` and `beginClash`'s
// planning half run when queued and are checked again as they run, so each refusal is a `commandRejected`
// with a reason, counted in `rejectedCommands`, that a replay of the log reproduces (plan Call 8, A034). The
// kit is a single battle's faction roster with no copy limit until R3, and the general keeps `maxOwned`
// (§7.8, §18.1 D45, plan Call 29).
import { describe, expect, it } from 'vitest';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import {
  commandStamp, createFromScenario, hashState, inKit, kitOf, legalPlots, makeRoundConfig, plantProblem, priceOf, queueCommand, SIDES, sellValue, step,
} from '../../../src/sim/rounds/index.ts';
import type { BattleState, CommandBody, SimEvent } from '../../../src/sim/rounds/index.ts';
import { plant as plantAtOnce } from '../../../src/sim/rounds/planning.ts';
import { newClash } from '../../../src/sim/rounds/round.ts';
import { command, content, plant, planningState, plotAt, sell, toggle } from '../../roundHelpers.ts';

const reasons = (events: SimEvent[]): string[] => events.flatMap((e) => (e.t === 'commandRejected' ? [e.reason] : []));
const front = (file: number) => ({ lane: 0, rank: 0, file });
const back = (file: number) => ({ lane: 0, rank: 1, file });

/** A round scenario on Bogwater Hollow, both sides human unless overridden. */
const scenario = (sides: RoundScenarioDef['sides'], over: Partial<RoundScenarioDef> = {}): RoundScenarioDef => ({
  id: 'planning', description: 'A planning test.', map: 'bogwater-hollow', sides, ...over,
});
/** The general's Sporeling Burrow in its front rank's file 1. */
const enemyBurrow = (): BattleState => createFromScenario(content, scenario({ player: {}, enemy: { colony: [{ building: 'sporelingBurrow', ...front(1) }] } }));

function toClash(s: BattleState): void {
  s.phase = 'clash';
  s.clash = newClash(s);
}

describe('planning commands and their refusals (§4.4, §14.5, plan Call 8)', () => {
  it('plants on a free plot: the price at once, the building on its plot, and buildingPlanted', () => {
    const s = planningState();
    expect(plant(s, 'player', 'sporelingBurrow', front(2))).toEqual([{ t: 'buildingPlanted', id: 1 }]);
    const plot = plotAt(s, 'player', front(2));
    expect(s.buildings).toEqual([{ id: 1, side: 'player', buildingId: 'sporelingBurrow', plot, plantedRound: 1, pricePaid: 110, fielded: false, mergeOn: true }]);
    expect(s.sides.player.plots[plot]!.building).toBe(1);
    expect([s.sides.player.gold, s.stats.player.buildingsPlanted, s.stats.player.rejectedCommands]).toEqual([190, 1, 0]);
  });

  it('refuses every planning command in a clash (wrongPhase)', () => {
    const s = planningState();
    plant(s, 'player', 'sporelingBurrow', front(1));
    toClash(s);
    const bodies: CommandBody[] = [
      { type: 'plant', buildingId: 'gillNest', plot: plotAt(s, 'player', front(2)) }, { type: 'sell', entityId: 1 },
      { type: 'toggleMerge', entityId: 1, on: false }, { type: 'beginClash' },
    ];
    for (const body of bodies) queueCommand(s, { ...commandStamp(s), side: 'player', ...body });
    step(s);
    expect(reasons(s.events)).toEqual(['wrongPhase', 'wrongPhase', 'wrongPhase', 'wrongPhase']);
    expect([s.buildings.length, s.buildings[0]!.mergeOn, s.sides.player.gold, s.stats.player.rejectedCommands]).toEqual([1, true, 190, 4]);
  });

  it("names a plot of the commanding side's own colony, so no command reaches another side's plot", () => {
    const s = planningState();
    const n = s.sides.player.plots.length;
    for (const plot of [n, -1, 1.5]) expect(reasons(command(s, 'player', { type: 'plant', buildingId: 'sporelingBurrow', plot }))).toEqual(['noSuchPlot']);
    expect(plantProblem(s, 'player', 'sporelingBurrow', n)).toBe('noSuchPlot');
    // the same number in the general's colony is its own plot, which a plant of yours leaves as it was
    const theirs = JSON.stringify(s.sides.enemy.plots);
    plant(s, 'player', 'sporelingBurrow', front(1));
    expect(JSON.stringify(s.sides.enemy.plots)).toBe(theirs);
    expect(s.stats.player.rejectedCommands).toBe(3);
  });

  it("refuses a sale or a toggle of another side's building", () => {
    const s = enemyBurrow();
    const theirs = s.buildings[0]!;
    expect(reasons(sell(s, 'player', theirs.id))).toEqual(['notYourBuilding']);
    expect(reasons(toggle(s, 'player', theirs.id, false))).toEqual(['notYourBuilding']);
    expect([s.buildings, theirs.mergeOn, s.sides.player.gold, s.stats.player.rejectedCommands]).toEqual([[theirs], true, 300, 2]);
  });

  it('refuses a taken plot, a stump plot and a closed plot', () => {
    const s = planningState({ map: 'stumpfield' });
    plant(s, 'player', 'sporelingBurrow', front(1));
    expect(reasons(plant(s, 'player', 'gillNest', front(1)))).toEqual(['plotTaken']);
    expect(reasons(plant(s, 'player', 'gillNest', front(2)))).toEqual(['stumpPlot']); // Stumpfield's front file 2 (§11.9)
    expect(reasons(plant(s, 'player', 'gillNest', { lane: 0, rank: 2, file: 2 }))).toEqual(['plotClosed']); // the third rank, until gained (§4.6)
    expect([s.buildings.length, s.sides.player.gold, s.stats.player.rejectedCommands]).toEqual([1, 190, 3]);
  });

  it('refuses a card not in the kit', () => {
    const s = planningState({ kits: { player: ['sporelingBurrow'] } });
    expect(reasons(plant(s, 'player', 'gillNest', front(1)))).toEqual(['notInKit']);
    expect(reasons(plant(s, 'player', 'nowhere', front(1)))).toEqual(['notInKit']);
    expect([s.buildings, s.stats.player.rejectedCommands]).toEqual([[], 2]);
  });

  it('refuses a plant without the gold for it, and plants with exactly enough', () => {
    const s = planningState({ gold: { player: 109 } });
    expect(reasons(plant(s, 'player', 'sporelingBurrow', front(1)))).toEqual(['notEnoughGold']);
    s.sides.player.gold = 110;
    expect(plant(s, 'player', 'sporelingBurrow', front(1)).map((e) => e.t)).toEqual(['buildingPlanted']);
    expect(s.sides.player.gold).toBe(0);
  });

  it("refuses the enemy side's plant, sale and toggle after the round's opening, and its beginClash", () => {
    const s = enemyBurrow();
    const theirs = s.buildings[0]!;
    expect(reasons(plant(s, 'enemy', 'gillNest', front(2)))).toEqual(['enemyPlanAfterOpening']);
    expect(reasons(sell(s, 'enemy', theirs.id))).toEqual(['enemyPlanAfterOpening']);
    expect(reasons(toggle(s, 'enemy', theirs.id, false))).toEqual(['enemyPlanAfterOpening']);
    expect(reasons(command(s, 'enemy', { type: 'beginClash' }))).toEqual(['beginClashNotPlayer']);
    expect([s.phase, s.buildings, theirs.mergeOn, s.sides.enemy.gold, s.stats.enemy.rejectedCommands]).toEqual(['planning', [theirs], true, 300, 4]);
  });

  it("lets the player's beginClash through its planning half, and its clash half begins the clash (T043)", () => {
    const s = planningState();
    expect(reasons(command(s, 'player', { type: 'beginClash' }))).toEqual([]);
    expect(s.phase).toBe('clash');
  });

  it('refunds 100% in the planning phase a building was planted in, and frees its plot at once', () => {
    const s = planningState();
    plant(s, 'player', 'sporelingBurrow', front(2));
    const b = s.buildings[0]!;
    expect(sellValue(s, b.id)).toBe(110);
    // the sale and a plant on its plot run in one step, and the plot is free for the plant
    queueCommand(s, { ...commandStamp(s), side: 'player', type: 'sell', entityId: b.id });
    queueCommand(s, { ...commandStamp(s), side: 'player', type: 'plant', buildingId: 'gillNest', plot: b.plot });
    step(s);
    expect(s.events).toEqual([{ t: 'buildingSold', id: b.id, side: 'player', refund: 110 }, { t: 'buildingPlanted', id: 2 }]);
    expect(s.sides.player.plots[b.plot]!.building).toBe(2);
    expect([s.sides.player.gold, s.stats.player.buildingsSold, s.stats.player.buildingsPlanted]).toEqual([150, 1, 2]);
  });

  it('refunds floor(60%) once a building has fielded', () => {
    // a colony from before round 2 has stood in round 1's clash (§4.4)
    const s = createFromScenario(content, scenario({
      player: { colony: [{ building: 'capguardHall', ...front(1) }, { building: 'sporelingBurrow', ...front(2) }], gold: 0 }, enemy: {},
    }, { round: 2 }));
    const hall = s.buildings[0]!, burrow = s.buildings[1]!;
    burrow.pricePaid = 111; // a price 60% doesn't divide
    expect([sellValue(s, hall.id), sellValue(s, burrow.id)]).toEqual([90, 66]);
    expect(sell(s, 'player', burrow.id)).toEqual([{ t: 'buildingSold', id: burrow.id, side: 'player', refund: 66 }]);
    expect([s.sides.player.gold, s.buildings, sellValue(s, burrow.id)]).toEqual([66, [hall], 0]);
    expect(s.sides.player.plots.some((p) => p.building === burrow.id)).toBe(false);
  });

  it('toggles merging only on your own spawner', () => {
    const s = planningState({ gold: { player: 1000 } });
    plant(s, 'player', 'sporelingBurrow', front(1));
    plant(s, 'player', 'truffleCellar', back(1));
    plant(s, 'player', 'puffballMortar', back(2));
    const [burrow, cellar, mortar] = s.buildings;
    expect(toggle(s, 'player', burrow!.id, false)).toEqual([{ t: 'mergeToggled', id: burrow!.id, on: false }]);
    expect(reasons(toggle(s, 'player', cellar!.id, false))).toEqual(['notASpawner']);
    expect(reasons(toggle(s, 'player', mortar!.id, false))).toEqual(['notASpawner']);
    expect(reasons(toggle(s, 'player', 99, false))).toEqual(['noSuchBuilding']);
    expect(s.buildings.map((b) => b.mergeOn)).toEqual([false, true, true]);
    expect(toggle(s, 'player', burrow!.id, true)).toEqual([{ t: 'mergeToggled', id: burrow!.id, on: true }]);
  });

  it('never moves state.tick over planning steps', () => {
    const s = planningState();
    s.tick = 640; // as after round 1's clash
    plant(s, 'player', 'sporelingBurrow', front(1));
    sell(s, 'player', 1);
    for (let i = 0; i < 10; i++) step(s);
    expect([s.phase, s.tick]).toEqual(['planning', 640]);
  });

  it('reproduces the same refusals when its log is replayed', () => {
    const s = planningState();
    const batches: CommandBody[][] = [
      [{ type: 'plant', buildingId: 'sporelingBurrow', plot: 0 }, { type: 'plant', buildingId: 'gillNest', plot: 0 }, { type: 'plant', buildingId: 'gillNest', plot: 1 }],
      [
        { type: 'plant', buildingId: 'capguardHall', plot: 2 }, { type: 'sell', entityId: 1 }, { type: 'plant', buildingId: 'capguardHall', plot: 2 },
        { type: 'toggleMerge', entityId: 2, on: false }, { type: 'sell', entityId: 1 },
      ],
    ];
    const events = batches.flatMap((batch) => {
      for (const body of batch) queueCommand(s, { ...commandStamp(s), side: 'player', ...body });
      step(s);
      return [...s.events];
    });
    // validity is read when each runs: the gold, the plot and the building as earlier commands left them
    expect(reasons(events)).toEqual(['plotTaken', 'notEnoughGold', 'noSuchBuilding']);
    const replay = planningState();
    for (const c of s.log) queueCommand(replay, c);
    step(replay);
    expect(replay.events).toEqual(events);
    expect(hashState({ ...replay, events: [] })).toBe(hashState({ ...s, events: [] }));
  });

  it('prices a card at its cost wherever it stands: priceOf has no column term', () => {
    const s = planningState({ gold: { player: 1000 } });
    for (const side of SIDES) {
      for (const { building } of s.sides[side].kit) expect(priceOf(s, side, building), building).toBe(content.buildings[building]!.cost);
    }
    plant(s, 'player', 'sporelingBurrow', front(1));
    plant(s, 'player', 'sporelingBurrow', back(4));
    expect([s.buildings.map((b) => b.pricePaid), s.sides.player.gold]).toEqual([[110, 110], 780]);
  });

  it('lists the legal plots: free, open and not a stump, in plot order', () => {
    const s = planningState({ map: 'stumpfield' });
    const buildable = s.sides.player.plots.flatMap((p, i) => (p.open && p.terrain !== 'stump' ? [i] : []));
    expect(buildable).toHaveLength(6);
    expect(legalPlots(s, 'player', 'gillNest')).toEqual(buildable);
    plant(s, 'player', 'gillNest', front(1));
    expect(legalPlots(s, 'player', 'gillNest')).toEqual(buildable.slice(1));
    for (const [i] of s.sides.player.plots.entries()) expect(plantProblem(s, 'player', 'gillNest', i) === null).toBe(buildable.slice(1).includes(i));
    expect(legalPlots(s, 'player', 'nowhere')).toEqual([]);
  });
});

describe('the kit (§4.4, §7.8, §18.1 D45, plan Call 29)', () => {
  it("is a single battle's faction roster on each side, and a card outside it is refused", () => {
    const config = makeRoundConfig(content, { seed: 1, enemy: 'general:mother-mold' });
    for (const side of SIDES) {
      expect(kitOf(content, side, config).map((c) => c.building)).toEqual(content.factions[config[side].faction]!.buildings);
      expect(config[side].kit).toEqual(kitOf(content, side, config));
    }
    const s = planningState({ kits: { player: ['sporelingBurrow', 'gillNest'] } });
    expect([inKit(s, 'player', 'gillNest'), inKit(s, 'player', 'capguardHall')]).toEqual([true, false]);
    expect(legalPlots(s, 'player', 'capguardHall')).toEqual([]);
    expect(reasons(plant(s, 'player', 'capguardHall', front(1)))).toEqual(['notInKit']);
  });

  it('has no copy limit (D45, X4), so a card plants until the plots run out', () => {
    const s = planningState({ gold: { player: 10000 } });
    expect(s.sides.player.kit.every((c) => c.copies === undefined && c.maxOwned === undefined)).toBe(true);
    const plots = legalPlots(s, 'player', 'sporelingBurrow');
    expect(plots).toHaveLength(8);
    for (const plot of plots) expect(command(s, 'player', { type: 'plant', buildingId: 'sporelingBurrow', plot }).map((e) => e.t)).toEqual(['buildingPlanted']);
    expect(s.buildings.filter((b) => b.buildingId === 'sporelingBurrow')).toHaveLength(8);
    expect(legalPlots(s, 'player', 'sporelingBurrow')).toEqual([]);
    expect(plantProblem(s, 'player', 'sporelingBurrow', plotAt(s, 'player', { lane: 0, rank: 2, file: 1 }))).toBe('plotClosed');
  });

  it("keeps the general on its maxOwned (§7.8): at most 3 Truffle Cellars, while yours have no limit", () => {
    const cellars = [1, 2].map((file) => ({ building: 'truffleCellar', ...front(file) }));
    const s = createFromScenario(content, scenario({ player: { gold: 1000 }, enemy: { colony: cellars } }), { enemy: 'general:mother-mold' });
    expect(s.sides.enemy.kit.find((c) => c.building === 'truffleCellar')).toEqual({ building: 'truffleCellar', maxOwned: 3 });
    expect(s.sides.player.kit.find((c) => c.building === 'truffleCellar')).toEqual({ building: 'truffleCellar' });
    // the general's turn runs its plants at once in the round's opening (T068); here they run by hand
    const third = plotAt(s, 'enemy', front(3)), fourth = plotAt(s, 'enemy', front(4));
    expect(plantAtOnce(s, 'enemy', 'truffleCellar', third)).toBeNull();
    expect([plantProblem(s, 'enemy', 'truffleCellar', fourth), legalPlots(s, 'enemy', 'truffleCellar')]).toEqual(['maxOwned', []]);
    const hash = hashState(s);
    expect(plantAtOnce(s, 'enemy', 'truffleCellar', fourth)).toBe('maxOwned');
    expect(hashState(s)).toBe(hash);
    expect(plantProblem(s, 'enemy', 'sporelingBurrow', fourth)).toBeNull();
    for (const file of [1, 2, 3, 4]) plant(s, 'player', 'truffleCellar', front(file));
    expect(s.buildings.filter((b) => b.side === 'player' && b.buildingId === 'truffleCellar')).toHaveLength(4);
  });
});
