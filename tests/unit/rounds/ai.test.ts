// The planning turn in rounds (SPEC §7.1–§7.3, §7.9, §14.6's opening steps 5 and 7, §15.7's Planning and
// AI rows). The general plans first, reading only `planningView` and drawing only on its own AI stream
// (plan Call 10); it buys from its listed weights (R2-Q4) and places each building by §7.3's scores, with
// Call 11's back-line term and #30's lanes, and keeps its plan per round in `ai.plans` (plan Call 12). A bot
// on the player's side plans after it and queues `beginClash`, which makes the planning checkpoint (plan
// Call 14).
import { describe, expect, it } from 'vitest';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { parseController } from '../../../src/sim/create.ts';
import { planTurn, runAtOnce, targetWeights } from '../../../src/sim/rounds/ai/controller.ts';
import { offCentre, plotScore } from '../../../src/sim/rounds/ai/formationScore.ts';
import { resolveProfile } from '../../../src/sim/rounds/ai/profiles.ts';
import { planningView } from '../../../src/sim/rounds/ai/view.ts';
import { createBattle, createFromScenario, formationOf, makeRoundConfig, step } from '../../../src/sim/rounds/index.ts';
import type { BattleState, FieldedSquad, PlotState, Side } from '../../../src/sim/rounds/index.ts';
import { content, finishRound, planningState } from '../../roundHelpers.ts';

type Colony = NonNullable<RoundScenarioDef['sides']['enemy']['colony']>;

/** A round scenario on `map`, both sides human unless the creation names a controller. */
const scenario = (sides: RoundScenarioDef['sides'], over: Partial<RoundScenarioDef> = {}): RoundScenarioDef => ({
  id: 'ai', description: 'An AI test.', map: 'bogwater-hollow', sides, ...over,
});

/** Gives `side` the AI `controller` resolves to, as `createBattle` does, without letting it plan. */
function withAi(s: BattleState, side: Side, controller: string): BattleState {
  s.sides[side].ai = resolveProfile(content, parseController(controller), s.config[side]);
  return s;
}

interface Turn {
  map?: string;
  round?: number;
  seed?: number;
  /** The general's gold for its turn, after the round's income. */
  gold?: number;
  plots?: number;
  colony?: Colony;
  controller?: string;
  /** Replace the profile's opener and weights. */
  opener?: string[];
  weights?: Record<string, number>;
  /** Changes to the state before the turn, such as the last round's record. */
  before?: (s: BattleState) => void;
}

/** One turn of the general, alone, on a round scenario's state (the player human and planning nothing). */
function generalTurn(t: Turn = {}): BattleState {
  const enemy = { colony: t.colony ?? [], ...(t.plots !== undefined ? { plots: t.plots } : {}) };
  const s = createFromScenario(content, scenario({ player: {}, enemy }, { map: t.map ?? 'bogwater-hollow', ...(t.round ? { round: t.round } : {}) }), { seed: t.seed ?? 1 });
  withAi(s, 'enemy', t.controller ?? 'general:scripted');
  const ai = s.sides.enemy.ai!;
  if (t.opener) ai.opener = t.opener;
  if (t.weights) ai.weights = Object.entries(t.weights).map(([building, weight]) => ({ building, weight }));
  if (t.gold !== undefined) s.sides.enemy.gold = t.gold;
  t.before?.(s);
  planTurn(s, 'enemy');
  return s;
}

/** The side's buildings, in id order. */
const names = (s: BattleState, side: Side = 'enemy'): string[] => s.buildings.filter((b) => b.side === side).map((b) => b.buildingId);
/** The plots of the side's buildings, in id order. */
const places = (s: BattleState, side: Side = 'enemy'): PlotState[] => s.buildings.filter((b) => b.side === side).map((b) => s.sides[side].plots[b.plot]!);
/** The side's buildings as building@lane:rank:file, in id order. */
const colony = (s: BattleState, side: Side): string[] => s.buildings.filter((b) => b.side === side).map((b) => {
  const p = s.sides[side].plots[b.plot]!;
  return `${b.buildingId}@${p.lane}:${p.rank}:${p.file}`;
});
/** The side's logged commands, a toggle named by its building's plot, so two battles' ids needn't match. */
const commands = (s: BattleState, side: Side): string[] => s.log.filter((c) => c.side === side).map((c) => {
  if (c.type === 'plant') return `plant ${c.buildingId}@${c.plot}`;
  if (c.type === 'toggleMerge') return `toggle @${s.buildings.find((b) => b.id === c.entityId)?.plot} ${c.on}`;
  return c.type;
});
const fielded = (unitId: string, count: number, lane = 0): FieldedSquad => ({ unitId, tier: 1, count, augments: [], lane });

describe('planningView, the only thing a planner reads (§7.1, §7.2, §7.5)', () => {
  it("shows each side its own state and the round, the general the player only through the record, and a player-side planner the general's colony and formation", () => {
    const s = createFromScenario(content, scenario({
      player: { colony: [{ building: 'capguardHall', lane: 0, rank: 0, file: 2 }] },
      enemy: { colony: [{ building: 'sporelingBurrow', lane: 0, rank: 0, file: 3 }] },
    }, { round: 2 }));
    const enemy = planningView(s, 'enemy'), player = planningView(s, 'player');
    expect([enemy.side, enemy.round, enemy.gold, player.gold]).toEqual(['enemy', 2, s.sides.enemy.gold, s.sides.player.gold]);
    expect([enemy.buildings.map((b) => b.buildingId), player.buildings.map((b) => b.buildingId)]).toEqual([['sporelingBurrow'], ['capguardHall']]);
    expect(enemy.plots).toEqual(s.sides.enemy.plots);
    expect(enemy.rounds).toEqual(s.rounds);
    expect(enemy.general).toBeUndefined();
    expect(player.general!.buildings.map((b) => b.buildingId)).toEqual(['sporelingBurrow']);
    expect(player.general!.formation).toEqual(formationOf(s, 'enemy'));
  });

  it("makes a plan a function of its view: the player's current colony changes neither the general's commands nor its stream (§7.1)", () => {
    const make = (colony: Colony): BattleState => withAi(createFromScenario(content, scenario({ player: { colony }, enemy: {} }, { round: 3 })), 'enemy', 'general:scripted');
    const a = make([]);
    const b = make([{ building: 'capguardHall', lane: 0, rank: 0, file: 2 }, { building: 'gillNest', lane: 0, rank: 1, file: 2 }]);
    expect(planningView(b, 'enemy')).toEqual(planningView(a, 'enemy'));
    planTurn(a, 'enemy');
    planTurn(b, 'enemy');
    expect(commands(a, 'enemy').length).toBeGreaterThan(0);
    expect(commands(b, 'enemy')).toEqual(commands(a, 'enemy'));
    expect(colony(b, 'enemy')).toEqual(colony(a, 'enemy'));
    expect(b.rng.ai.enemy).toEqual(a.rng.ai.enemy);
  });
});

describe('buying (§7.2, §7.9, R2-Q4, #29)', () => {
  it("works through round 1's opener first, skipping what it can't afford, then picks by its weights", () => {
    const opener = generalTurn({ gold: 400, opener: ['capguardHall', 'amanitaLodge', 'sporelingBurrow'], weights: {} });
    // the Lodge's 260 is more than the 250 left after the Hall
    expect([names(opener), opener.sides.enemy.gold]).toEqual([['capguardHall', 'sporelingBurrow'], 140]);
    const picks = generalTurn({ gold: 410, opener: ['sporelingBurrow'], weights: { capguardHall: 1 } });
    expect([names(picks), picks.sides.enemy.gold]).toEqual([['sporelingBurrow', 'capguardHall', 'capguardHall'], 0]);
  });

  it('weighs each card by its weight × the round, and only its listed cards', () => {
    const w = targetWeights(planningView(withAi(planningState({ round: 4 }), 'enemy', 'general:scripted'), 'enemy'));
    // `general:scripted` (§7.9): Truffle Cellar 2 × 1, the Rootbreaker Den from round 4
    expect(w).toEqual({
      bursterPod: 1, capguardHall: 3, gillNest: 2, puffballMortar: 1, rhizomorphTunnel: 1, rootbreakerDen: 1, sporelingBurrow: 3, truffleCellar: 2,
    });
  });

  it.each([[1, 1.5], [2, 1.5], [3, 1], [6, 1], [7, 0.3], [9, 0.3]])('weighs economy in round %i × %s (§7.2)', (round, mult) => {
    const w = targetWeights(planningView(withAi(planningState({ round }), 'enemy', 'general:scripted'), 'enemy'));
    expect(w.truffleCellar).toBeCloseTo(2 * mult, 10);
    expect([w.sporelingBurrow, w.capguardHall]).toEqual([3, 3]);
  });

  it('weighs the Mortar × 2 only after a round it lost, not a drawn or won one (§7.2)', () => {
    const mortar = (damage: Record<Side, number>): number | undefined => {
      const s = withAi(planningState({ round: 2 }), 'enemy', 'general:scripted');
      s.rounds.at(-1)!.damage = damage;
      return targetWeights(planningView(s, 'enemy')).puffballMortar;
    };
    expect([mortar({ player: 300, enemy: 0 }), mortar({ player: 0, enemy: 0 }), mortar({ player: 120, enemy: 120 }), mortar({ player: 0, enemy: 200 })]).toEqual([2, 1, 1, 1]);
  });

  it('stops at 3 Truffle Cellars, and buys a Rootbreaker Den only from round 4 (its limits, read by round)', () => {
    const cellars = [1, 2, 3].map((file) => ({ building: 'truffleCellar', lane: 0, rank: 1, file }));
    const s = withAi(createFromScenario(content, scenario({ player: {}, enemy: { colony: cellars } }, { round: 3 })), 'enemy', 'general:scripted');
    expect(targetWeights(planningView(s, 'enemy'))).toMatchObject({ truffleCellar: 0, rootbreakerDen: 0 });
    const rich = generalTurn({ gold: 5000, colony: cellars, round: 3 });
    expect(names(rich).filter((id) => id === 'truffleCellar' || id === 'rootbreakerDen')).toEqual(['truffleCellar', 'truffleCellar', 'truffleCellar']);
  });

  it('carries a target out of reach into the next planning phase once, then drops it and picks afresh (§7.2)', () => {
    const first = generalTurn({ gold: 200, opener: [], weights: { amanitaLodge: 1 } });
    expect([names(first), first.sides.enemy.gold, first.sides.enemy.ai!.target]).toEqual([[], 200, { building: 'amanitaLodge', round: 1 }]);
    // round 2: the carried Lodge comes before any pick
    const carried = (gold: number): BattleState => generalTurn({
      round: 2, gold, opener: [], weights: { sporelingBurrow: 1 }, before: (s) => { s.sides.enemy.ai!.target = { building: 'amanitaLodge', round: 1 }; },
    });
    const reached = carried(300);
    expect([names(reached), reached.sides.enemy.ai!.target]).toEqual([['amanitaLodge'], { building: 'sporelingBurrow', round: 2 }]);
    const dropped = carried(250);
    expect([names(dropped), dropped.sides.enemy.ai!.target]).toEqual([['sporelingBurrow', 'sporelingBurrow'], { building: 'sporelingBurrow', round: 2 }]);
  });

  it("buys only its listed weights in a single battle (R2-Q4), and banks only what's left (#29)", () => {
    const listed = Object.keys(content.generals.scripted!.weights);
    const rich = generalTurn({ gold: 5000, round: 4 });
    expect(rich.sides.enemy.kit.length).toBeGreaterThan(listed.length);
    expect(names(rich)).toHaveLength(8);
    expect(names(rich).every((id) => listed.includes(id))).toBe(true);
    // no reserve for interest: a third Burrow leaves 20 banked
    const s = generalTurn({ gold: 350, opener: [], weights: { sporelingBurrow: 1 } });
    expect([names(s).length, s.sides.enemy.gold, s.sides.enemy.ai!.plans.at(-1)!.banked]).toEqual([3, 20, 20]);
  });
});

describe("placement by §7.3's scores (plan Call 11, A043)", () => {
  it.each([1, 2, 3, 4, 5])('puts a Nest behind a Hall (+3), and a second Burrow beside the first (+2), on seed %i', (seed) => {
    const [hall, nest] = places(generalTurn({ seed, opener: ['capguardHall', 'gillNest'], weights: {} }));
    expect([hall!.rank, nest!.rank, nest!.file]).toEqual([0, 1, hall!.file]);
    expect([2, 3]).toContain(hall!.file);
    const [a, b] = places(generalTurn({ seed, opener: ['sporelingBurrow', 'sporelingBurrow'], weights: {} }));
    expect([a!.rank, b!.rank, Math.abs(a!.file - b!.file)]).toEqual([0, 0, 1]);
  });

  it('puts a Truffle Cellar on a back loam plot', () => {
    const [cellar] = places(generalTurn({ opener: ['truffleCellar'], weights: {} }));
    expect([cellar!.rank, cellar!.terrain]).toEqual([1, 'loam']);
  });

  it('measures offCentre across its own lane: 3, 1, 1, 3 on 4 files and 2, 0, 2 on 3', () => {
    const across = (map: string): number[] => {
      const plots = planningState({ map }).sides.enemy.plots;
      return plots.flatMap((p, i) => (p.lane === 0 && p.rank === 0 ? [offCentre(plots, i)] : []));
    };
    expect(across('bogwater-hollow')).toEqual([3, 1, 1, 3]);
    expect(across('twin-roots')).toEqual([2, 0, 2]);
  });

  it.each([1, 2, 3, 4, 5, 6])('never puts a back-liner in the front rank while a back or third-rank plot is free (Call 11), on seed %i', (seed) => {
    const back = ['truffleCellar', 'sporeExchange', 'rhizomeVault', 'sporeExchange'].map((building, i) => ({ building, lane: 0, rank: 1, file: i + 1 }));
    const s = generalTurn({ seed, gold: 1000, plots: 12, colony: back, opener: ['gillNest', 'puffballMortar'], weights: {} });
    expect(places(s).slice(4).map((p) => p.rank)).toEqual([2, 2]);
    // the third rank's worst plot outscores the front rank's best, noise and all
    const view = planningView(s, 'enemy');
    const ranks = (rank: number) => s.sides.enemy.plots.flatMap((p, i) => (p.rank === rank ? [plotScore(view, 'gillNest', i, true)] : []));
    expect(Math.min(...ranks(2)) - 0.5).toBeGreaterThan(Math.max(...ranks(0)) + 0.5);
  });

  it('gives the same plots on the same seed', () => {
    const a = createBattle(content, makeRoundConfig(content, { seed: 9, enemy: 'general:scripted' }));
    const b = createBattle(content, makeRoundConfig(content, { seed: 9, enemy: 'general:scripted' }));
    expect(colony(a, 'enemy').length).toBeGreaterThan(0);
    expect(colony(b, 'enemy')).toEqual(colony(a, 'enemy'));
  });
});

describe("Twin Roots' lanes (§7.3, #30, A047)", () => {
  /** The general's Capguard Halls on Twin Roots, each 3 units of 2 supply, by lane in the order planted. */
  const halls = (t: Turn): number[] => places(generalTurn({ map: 'twin-roots', opener: [], weights: { capguardHall: 1 }, ...t })).map((p) => p.lane);
  /** Last round's lanes, each lost by `by[i]`: the player's survivors there, the general's none. */
  const lost = (by: number[]) => (s: BattleState) => s.rounds.at(-1)!.lanes.forEach((l, i) => { l.survivors = { player: by[i]!, enemy: 0 }; });

  it("sends a spawner to the lane it lost by most, each lowering that lane's need by its squad's supply", () => {
    expect(halls({ round: 2, gold: 600, before: lost([20, 4]) })).toEqual([0, 0, 0, 1]);
    expect(halls({ round: 2, gold: 450, before: lost([10, 4]) })).toEqual([0, 1, 0]);
  });

  it('takes, in round 1 and on ties, the lane with less supply, then the lower lane', () => {
    expect(halls({ gold: 450 })).toEqual([0, 1, 0]);
  });

  it("sends the Blightwright's spawners to the lane you fielded least in", () => {
    const record = (s: BattleState) => {
      lost([10, 0])(s);
      s.rounds.at(-1)!.fielded.player = [fielded('sporeling', 20, 0), fielded('capguard', 3, 1)];
    };
    expect(halls({ round: 2, gold: 450, before: record, controller: 'general:blightwright' })).toEqual([1, 1, 1]);
  });

  it('puts a Cellar in a lane with a free loam plot, else in the lane with more free back-rank plots', () => {
    const [cellar] = places(generalTurn({ map: 'twin-roots', opener: ['truffleCellar'], weights: {} }));
    expect([cellar!.lane, cellar!.rank, cellar!.terrain]).toEqual([0, 1, 'loam']);
    const loamTaken = [1, 3].map((file) => ({ building: 'truffleCellar', lane: 0, rank: 1, file }));
    expect(places(generalTurn({ map: 'twin-roots', colony: loamTaken, opener: ['truffleCellar'], weights: {} })).at(-1)!.lane).toBe(1);
  });

  it('falls back to the other lane when its lane is full', () => {
    // round 1's tie goes to lane 0, which economy and utility fill
    const full = [0, 1].flatMap((rank) => [1, 2, 3].map((file) => ({ building: rank ? 'sporeExchange' : 'rhizomeVault', lane: 0, rank, file })));
    expect(halls({ gold: 150, colony: full }).at(-1)).toBe(1);
  });
});

describe('merge toggles (§7.2 step 3)', () => {
  /** The general in round 2 with a Burrow and a Hall, after you fielded `slayers` Veilstalkers (1 supply each) and `capguards` Capguards (2 each). */
  const after = (slayers: number, capguards: number): BattleState => generalTurn({
    round: 2, gold: 0,
    colony: [{ building: 'sporelingBurrow', lane: 0, rank: 0, file: 2 }, { building: 'capguardHall', lane: 0, rank: 0, file: 3 }],
    before: (s) => { s.rounds.at(-1)!.fielded.player = [fielded('veilstalker', slayers), fielded('capguard', capguards)]; },
  });
  const toggles = (s: BattleState) => s.buildings.filter((b) => b.side === 'enemy').map((b) => [b.buildingId, b.mergeOn]);

  it('switches merging off on its swarm buildings when Slayers made up more than 25% of the supply you fielded last round', () => {
    const s = after(30, 35);
    expect(toggles(s)).toEqual([['sporelingBurrow', false], ['capguardHall', true]]);
    expect(commands(s, 'enemy')).toEqual([`toggle @${s.buildings[0]!.plot} false`]);
    expect(s.events).toContainEqual({ t: 'mergeToggled', id: s.buildings[0]!.id, on: false });
  });

  it('keeps it on at 20%', () => {
    const s = after(20, 40);
    expect(toggles(s)).toEqual([['sporelingBurrow', true], ['capguardHall', true]]);
    expect(commands(s, 'enemy')).toEqual([]);
  });
});

describe("the general's turn in the round's opening (§14.6 step 5, plan Calls 8 and 12)", () => {
  it('runs its commands at once and logs them with its stamps, then generalPlanned, and keeps the plan in ai.plans', () => {
    const s = createBattle(content, makeRoundConfig(content, { seed: 3, enemy: 'general:scripted' }));
    const mine = s.buildings.filter((b) => b.side === 'enemy');
    // its opener, a Burrow and a Cellar, leaves 40, short of any card
    expect(mine.map((b) => b.buildingId)).toEqual(['sporelingBurrow', 'truffleCellar']);
    expect(s.log).toEqual(mine.map((b, seq) => ({ round: 1, tick: 0, side: 'enemy', seq, type: 'plant', buildingId: b.buildingId, plot: b.plot })));
    expect(s.events.filter((e) => e.t === 'buildingPlanted' || e.t === 'generalPlanned')).toEqual([
      ...mine.map((b) => ({ t: 'buildingPlanted', id: b.id })),
      { t: 'generalPlanned', side: 'enemy', planted: mine.map((b) => b.id), sold: [] },
    ]);
    expect(s.events.at(-1)!.t).toBe('generalPlanned');
    expect(s.sides.enemy.ai!.plans).toEqual([{ round: 1, planted: mine.map((b) => ({ building: b.buildingId, plot: b.plot })), sold: [], income: 0, banked: 40 }]);
    expect([s.sides.enemy.gold, s.queue, s.stats.enemy.rejectedCommands]).toEqual([40, [], 0]);
    // the next round's plan, with the income it was paid
    finishRound(s);
    step(s);
    const paid = s.events.reduce((n, e) => n + ((e.t === 'income' || e.t === 'interest') && e.side === 'enemy' ? e.amount : 0), 0);
    expect(s.sides.enemy.ai!.plans.map((p) => [p.round, p.income])).toEqual([[1, 0], [2, paid]]);
    expect(s.sides.enemy.ai!.plans[1]!.banked).toBe(s.sides.enemy.gold);
  });

  it('stamps and logs a command it runs at once, and counts a refusal in rejectedCommands', () => {
    const s = planningState();
    s.events.length = 0;
    expect(runAtOnce(s, 'enemy', { type: 'plant', buildingId: 'sporelingBurrow', plot: 99 })).toBe('noSuchPlot');
    expect(s.log).toEqual([{ round: 1, tick: 0, side: 'enemy', seq: 0, type: 'plant', buildingId: 'sporelingBurrow', plot: 99 }]);
    expect(s.events).toEqual([{ t: 'commandRejected', side: 'enemy', seq: 0, reason: 'noSuchPlot' }]);
    expect(s.stats.enemy.rejectedCommands).toBe(1);
  });
});

describe('bots plan after the general (§7.1, §14.6 step 7, plan Call 14)', () => {
  const battle = (player: string, enemy = 'general:scripted'): BattleState => createBattle(content, makeRoundConfig(content, { seed: 4, player, enemy }));

  it('plans after the general, then leaves only its beginClash queued: the planning checkpoint', () => {
    const s = battle('bot:balanced');
    const sides = s.log.map((c) => c.side);
    expect(sides).toContain('enemy');
    expect(sides.indexOf('player')).toBeGreaterThan(sides.lastIndexOf('enemy'));
    const seq = sides.filter((side) => side === 'player').length;
    expect(s.queue).toEqual([{ round: 1, tick: 0, side: 'player', seq, type: 'beginClash' }]);
    const sideOf = (id: number) => s.buildings.find((b) => b.id === id)!.side;
    const planned = s.events.findIndex((e) => e.t === 'generalPlanned' && e.side === 'enemy');
    expect(s.events.findIndex((e) => e.t === 'buildingPlanted' && sideOf(e.id) === 'player')).toBeGreaterThan(planned);
    expect(s.phase).toBe('planning');
    step(s);
    expect(s.phase).toBe('clash');
  });

  it("plans the same whatever the general plans: a fixed-weight bot doesn't read the general's army", () => {
    const a = battle('bot:balanced'), b = battle('bot:balanced', 'general:lichen-baron');
    expect(colony(b, 'enemy')).not.toEqual(colony(a, 'enemy'));
    expect(commands(a, 'player').length).toBeGreaterThan(0);
    expect(commands(b, 'player')).toEqual(commands(a, 'player'));
    expect(b.rng.ai.player).toEqual(a.rng.ai.player);
  });

  it('fills its plots as bot:mono:<id>, opening with as many as its gold buys', () => {
    const mono = (gold: number) => createFromScenario(content, scenario({ player: { gold }, enemy: {} }), { player: 'bot:mono:sporelingBurrow' });
    expect(names(mono(300), 'player')).toEqual(['sporelingBurrow', 'sporelingBurrow']);
    const rich = mono(2000);
    expect(names(rich, 'player')).toEqual(Array<string>(8).fill('sporelingBurrow'));
    expect(rich.sides.player.plots.every((p) => !p.open || p.building !== 0)).toBe(true);
  });

  it("reads a bot's limits by round: bot:balanced's Rootbreaker Den from round 4 (afterRound, R2-Q6)", () => {
    const den = (round: number) => targetWeights(planningView(withAi(planningState({ round }), 'player', 'bot:balanced'), 'player')).rootbreakerDen;
    expect([den(3), den(4)]).toEqual([0, 1]);
  });
});
