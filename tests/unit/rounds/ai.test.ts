// The planning turn in rounds (SPEC §7.1–§7.3, §7.9, §14.6's opening steps 5 and 7, §15.7's Planning and
// AI rows). The general plans first, reading only `planningView` and drawing only on its own AI stream
// (plan Call 10); it buys from its listed weights (R2-Q4) and places each building by §7.3's scores, with
// Call 11's back-line term and #30's lanes, and keeps its plan per round in `ai.plans` (plan Call 12). A bot
// on the player's side plans after it and queues `beginClash`, which makes the planning checkpoint (plan
// Call 14). An adaptive general runs the counter cycle in its turn's step 1 (§7.4, §7.6, §15.7's AI row): it
// reads only the `fielded` record, at rounds 4 and 7 (the boss also at 3), and its counter lands in the same
// planning phase (#31), with X8's two default-off knobs beside it (§7.2).
import { describe, expect, it } from 'vitest';
import type { BalanceDef, RoundScenarioDef } from '../../../src/data/schema.ts';
import { parseController } from '../../../src/sim/create.ts';
import { planTurn, runAtOnce, targetWeights } from '../../../src/sim/rounds/ai/controller.ts';
import { analyzeFielded, counterSets, topKind } from '../../../src/sim/rounds/ai/counter.ts';
import { offCentre, plotScore } from '../../../src/sim/rounds/ai/formationScore.ts';
import { resolveProfile } from '../../../src/sim/rounds/ai/profiles.ts';
import { planningView } from '../../../src/sim/rounds/ai/view.ts';
import {
  COUNTER_KINDS, createBattle, createFromScenario, formationOf, hashState, makeRoundConfig, restore, runHeadless, snapshot, step,
} from '../../../src/sim/rounds/index.ts';
import type { BattleState, CounterKind, FieldedSquad, IntelProfile, PlotState, Side } from '../../../src/sim/rounds/index.ts';
import { generalNews } from '../../../src/app/rounds/phases/planning.ts';
import { intentOf } from '../../../src/ui/rounds/doctrine.ts';
import { content, finishRound, planningState } from '../../roundHelpers.ts';

type Colony = NonNullable<RoundScenarioDef['sides']['enemy']['colony']>;

/** A round scenario on `map`, both sides human unless the creation names a controller. */
const scenario = (sides: RoundScenarioDef['sides'], over: Partial<RoundScenarioDef> = {}): RoundScenarioDef => ({
  id: 'ai', description: 'An AI test.', map: 'bogwater-hollow', sides, ...over,
});

/**
 * Gives `side` the AI `controller` resolves to, without letting it plan. With `adaptive`, it gets the battle's
 * flags as `createBattle` gives them, so an adaptive general runs its counter cycle (§7.4).
 */
function withAi(s: BattleState, side: Side, controller: string, adaptive = false): BattleState {
  s.config[side].controller = parseController(controller);
  s.sides[side].ai = resolveProfile(content, s.config[side].controller, s.config[side], adaptive ? s.config.flags : undefined);
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
  /** With the battle's flags, so an adaptive general runs its counter cycle. */
  adaptive?: boolean;
  /** The general's intel file (§7.6). */
  intel?: IntelProfile;
}

/** One turn of the general, alone, on a round scenario's state (the player human and planning nothing). */
function generalTurn(t: Turn = {}): BattleState {
  const enemy = { colony: t.colony ?? [], ...(t.plots !== undefined ? { plots: t.plots } : {}) };
  const s = createFromScenario(content, scenario({ player: {}, enemy }, { map: t.map ?? 'bogwater-hollow', ...(t.round ? { round: t.round } : {}) }), { seed: t.seed ?? 1 });
  if (t.intel) s.config.enemy.intel = t.intel;
  withAi(s, 'enemy', t.controller ?? 'general:scripted', t.adaptive);
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

describe('the answer bot (§12.2, X7, §18.2 #34, A198)', () => {
  /** Round 2's planning with the general's colony standing and `gold` for the player, who plans as `controller` once `before` has run. */
  const answerTurn = (controller: string, enemy: Colony, o: { gold?: number; kit?: string[]; seed?: number; before?: (s: BattleState) => void } = {}): BattleState => {
    const player = { gold: o.gold ?? 0, ...(o.kit ? { kit: o.kit } : {}) };
    const s = createFromScenario(content, scenario({ player, enemy: { colony: enemy } }, { round: 2 }), { seed: o.seed ?? 3 });
    o.before?.(s);
    return withAi(s, 'player', controller);
  };
  const burrows: Colony = [1, 2, 3].map((file) => ({ building: 'sporelingBurrow', lane: 0, rank: 0, file }));
  const halls: Colony = [1, 2, 3].map((file) => ({ building: 'capguardHall', lane: 0, rank: 0, file }));
  const weights = (s: BattleState) => targetWeights(planningView(s, 'player'));

  it("weighs bot:balanced's cards, × 3 on the one whose unit's hits best answer the general's planned squads: Capguard Hall against mono Sporelings", () => {
    const answer = weights(answerTurn('bot:answer', burrows, { gold: 500 })), balanced = weights(answerTurn('bot:balanced', burrows, { gold: 500 }));
    expect(answer.capguardHall).toBe(3 * balanced.capguardHall!);
    expect({ ...answer, capguardHall: 0 }).toEqual({ ...balanced, capguardHall: 0 });
  });

  it('plants a Capguard Hall against them where bot:balanced, on the same seed, plants none', () => {
    const plant = (controller: string) => {
      const s = answerTurn(controller, burrows, { gold: 600, seed: 3 });
      planTurn(s, 'player');
      return names(s, 'player');
    };
    expect(plant('bot:balanced')).not.toContain('capguardHall');
    expect(plant('bot:answer')).toContain('capguardHall');
  });

  it("leans to the next answer when its kit has no Capguard Hall: the Scythecap Grove, which the Sporelings' hits are weaker on than on Sporelings", () => {
    const kit = ['sporelingBurrow', 'gillNest', 'scythecapGrove', 'truffleCellar'];
    const answer = weights(answerTurn('bot:answer', burrows, { gold: 500, kit })), balanced = weights(answerTurn('bot:balanced', burrows, { gold: 500, kit }));
    expect(Object.keys(answer)).toEqual(['gillNest', 'scythecapGrove', 'sporelingBurrow', 'truffleCellar']);
    expect(answer).toEqual({ ...balanced, scythecapGrove: 3 * balanced.scythecapGrove! });
  });

  it("follows the general's colony this round, not what it fielded last round", () => {
    const fieldedLast = (army: FieldedSquad[]) => (s: BattleState) => { s.rounds.at(-1)!.fielded.enemy = army; };
    const lean = (enemy: Colony, last: FieldedSquad[]) => {
      const answer = weights(answerTurn('bot:answer', enemy, { gold: 500, before: fieldedLast(last) }));
      const balanced = weights(answerTurn('bot:balanced', enemy, { gold: 500, before: fieldedLast(last) }));
      return Object.keys(answer).filter((id) => answer[id] !== balanced[id]);
    };
    expect(lean(burrows, capguards)).toEqual(['capguardHall']);
    expect(lean(halls, sporelings)).toEqual(['gillNest']);
  });
});

// ---- the counter cycle (§7.4, §7.6, T098) ----

const sporelings = [fielded('sporeling', 24)], capguards = [fielded('capguard', 9)];
/** The other side's squads in each round before the turn's, the record the cycle reads (§14.4). Every round was drawn. */
const fieldedEach = (army: FieldedSquad[] | ((round: number) => FieldedSquad[])) => (s: BattleState): void => {
  for (const r of s.rounds) r.fielded.player = (typeof army === 'function' ? army(r.round) : army).map((f) => ({ ...f }));
};
/** An adaptive general's turn in `round` (4 unless set) with no gold, Mother Mold unless set, after you fielded `army` in every round before. */
const counterTurn = (army: FieldedSquad[] | ((round: number) => FieldedSquad[]), t: Turn = {}): BattleState => generalTurn({
  round: 4, gold: 0, controller: 'general:mother-mold', adaptive: true, ...t,
  before: (s) => { fieldedEach(army)(s); t.before?.(s); },
});
const counterOf = (s: BattleState) => s.sides.enemy.ai!.counter!;
/** The kind that activated in the turn, or null when none did. */
const activated = (s: BattleState): CounterKind | null => counterOf(s).history.find((c) => c.round === s.round)?.kind ?? null;
/** The record `army` gives the cycle that reads it, before the noise. */
const reading = (army: FieldedSquad[]) => analyzeFielded(planningView(counterTurn(army, { round: 2 }), 'enemy'), 1, 1);
const plotAt = (s: BattleState, lane: number, rank: number, file: number): number =>
  s.sides.enemy.plots.findIndex((p) => p.lane === lane && p.rank === rank && p.file === file);

describe('the counter cycle by round (§7.4, A051)', () => {
  it.each([
    ['general:mother-mold', [4, 7], [{ round: 4, from: 1 }, { round: 7, from: 4 }]],
    ['general:pale-sovereign', [3, 4, 7], [{ round: 3, from: 1 }, { round: 4, from: 1 }, { round: 7, from: 4 }]],
  ])('runs %s\'s cycles in rounds %j, stored as {round, from}', (controller, rounds, cycles) => {
    expect(counterOf(counterTurn(sporelings, { round: 1, controller })).cycles).toEqual(cycles);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((round) => activated(counterTurn(sporelings, { round, controller })))).toEqual(rounds);
  });

  it('reads only its own rounds: round 7 reads 4–6, the boss reads 1–2 in round 3 and 1–3 in round 4', () => {
    expect(activated(counterTurn((r) => (r <= 3 ? sporelings : capguards), { round: 7 }))).toBe('line');
    const boss = (round: number) => activated(counterTurn((r) => (r === 3 ? capguards : []), { round, controller: 'general:pale-sovereign' }));
    expect([boss(3), boss(4)]).toEqual([null, 'line']);
  });

  it("runs only for an adaptive general with flags.adaptiveGeneral on: the scripted general and the flag off get none", () => {
    expect(counterTurn(sporelings, { controller: 'general:scripted' }).sides.enemy.ai!.counter).toBeUndefined();
    const s = createFromScenario(content, scenario({ player: {}, enemy: {} }, { round: 4 }), { flags: { adaptiveGeneral: false } });
    expect(withAi(s, 'enemy', 'general:mother-mold', true).sides.enemy.ai!.counter).toBeUndefined();
  });
});

describe("the analysis of what you fielded (§7.4, R2-Q3, #14)", () => {
  it.each([
    ['amanitaKnight', 'armor'], ['capguard', 'line'], ['sporeling', 'swarm'], ['gillArcher', 'ranged'],
  ])('reads a record of %s as %s', (unit, kind) => {
    expect(topKind(reading([fielded(unit, 12)]).scores)).toBe(kind);
  });

  it('picks those kinds through the noise too, except that Gill Archers tie Swarm and Ranged at 1, which the noise decides', () => {
    for (const [unit, kind] of [['amanitaKnight', 'armor'], ['capguard', 'line'], ['sporeling', 'swarm']] as const) {
      for (const seed of [1, 2, 3]) expect(activated(counterTurn([fielded(unit, 12)], { seed }))).toBe(kind);
    }
    const archers = reading([fielded('gillArcher', 12)]).scores;
    expect([archers.swarm, archers.ranged]).toEqual([1, 1]);
  });

  it("counts eliteShare in Elder units only, every unit at its parts' base supply, with no swarm read", () => {
    // 9 Sporelings, 3 Bloomed and 1 Elder: 27 parts' supply, 9 of it in the Elder; a Bloomed unit isn't elite
    const a = reading([fielded('sporeling', 9), { ...fielded('sporeling', 3), tier: 2 }, { ...fielded('sporeling', 1), tier: 3 }]);
    const part = planningState().compiled.player.units.sporeling!.tiers[0].supply;
    expect([a.total, a.shares.light]).toEqual([27 * part, 1]);
    expect(a.shares.elite).toBeCloseTo(1 / 3, 10);
    expect(a.scores.elite).toBeCloseTo(content.balance.ai.counter.eliteScoreMult / 3, 10);
    expect(a.scores.swarm).toBeCloseTo(1 - content.balance.ai.counter.swarmEliteDiscount / 3, 10);
    expect(reading([{ ...fielded('capguard', 3), tier: 2 }]).shares.elite).toBe(0);
    // the swarm read (`swarmMaxSupply`) isn't v2's rule: a Sporeling Elder still counts
    const swarmRead = counterTurn([{ ...fielded('sporeling', 1), tier: 3 }], {
      round: 2, before: (s) => { const b = s.library.balance; s.library.balance = { ...b, ai: { ...b.ai, counter: { ...b.ai.counter, swarmMaxSupply: 1 } } }; },
    });
    expect(analyzeFielded(planningView(swarmRead, 'enemy'), 1, 1).shares.elite).toBe(1);
  });

  it.each([1, 2, 3, 4, 5])("doesn't read bot:balanced's colony as Elite in round 4, its toggles at their defaults, on seed %i (A041)", (seed) => {
    const s = createBattle(content, makeRoundConfig(content, { seed, player: 'bot:balanced', enemy: 'general:mother-mold', flags: { powers: false } }));
    runHeadless(s, { until: { round: 4 } });
    // the round-4 cycle's reading of rounds 1–3, before the noise and as it picked
    const { total, scores } = analyzeFielded(planningView(s, 'enemy'), 1, 3);
    expect(total).toBeGreaterThan(0);
    expect(topKind(scores)).not.toBe('elite');
    expect(counterOf(s).history[0]).toMatchObject({ round: 4, kind: expect.not.stringMatching(/^elite$/) });
  });

  it('breaks ties Elite, Armor, Line, Ranged, Swarm (Ranged\'s place is #14\'s first guess)', () => {
    const all = (zero: CounterKind[]) => Object.fromEntries(COUNTER_KINDS.map((k) => [k, zero.includes(k) ? 0 : 1])) as Record<CounterKind, number>;
    expect([[], ['elite'], ['elite', 'armor'], ['elite', 'armor', 'line'], ['elite', 'armor', 'line', 'ranged']].map((z) => topKind(all(z as CounterKind[]))))
      .toEqual(['elite', 'armor', 'line', 'ranged', 'swarm']);
  });

  it('passes a cycle when nothing was fielded in its rounds', () => {
    const s = counterTurn([], { gold: 300 });
    expect([counterOf(s).history, s.sides.enemy.ai!.plans.at(-1)!.counter]).toEqual([[], undefined]);
  });
});

describe('activation (§7.4, #15, #31, A055, A056)', () => {
  it('multiplies the counter set ×3 and the rest ×0.6 in the planning phase of its analysis', () => {
    const s = counterTurn(sporelings);
    expect(activated(s)).toBe('swarm');
    const sets = counterSets(planningView(s, 'enemy'));
    const w = targetWeights(planningView(s, 'enemy'));
    for (const [id, base] of Object.entries(content.generals['mother-mold']!.weights)) {
      expect(w[id]).toBeCloseTo(base * (sets.swarm.includes(id) ? 3 : 0.6), 10);
    }
    expect(w.capguardHall).toBeCloseTo(3, 10);
    expect(w.sporelingBurrow).toBeCloseTo(3, 10);
  });

  it('keeps swarm units out of the Anti-Swarm and Anti-Line sets, a unit with no damage out of every set, and swarm spawners as the Anti-Ranged set', () => {
    const view = planningView(planningState(), 'enemy');
    const sets = counterSets(view);
    for (const { building } of view.kit) {
      const card = view.cards[building]!;
      const u = card.kind === 'spawner' ? view.units[card.squad!.unit]! : undefined;
      const swarm = !!u?.tags.includes('swarm');
      const kinds = COUNTER_KINDS.filter((k) => sets[k].includes(building));
      if (!u || u.tiers[0].damage <= 0) expect(kinds).toEqual([]);
      if (swarm) expect(kinds).not.toContain('swarm');
      if (swarm) expect(kinds).not.toContain('line');
      expect(kinds.includes('ranged')).toBe(swarm);
    }
    expect([sets.ranged, sets.swarm.includes('capguardHall'), COUNTER_KINDS.some((k) => sets[k].includes('tendersRing'))])
      .toEqual([['morelWarren', 'sporelingBurrow'], true, false]);
  });

  it("lists the cheapest roster counter that beats the dominant armor when it lists no card of the set: Mold's lone Burrow gets Capguard Hall, a non-swarm card, not the cheaper Burster Pod", () => {
    const s = counterTurn(sporelings, { weights: { sporelingBurrow: 5 } });
    expect(counterOf(s).history[0]).toMatchObject({ kind: 'swarm', added: 'capguardHall' });
    expect(s.sides.enemy.ai!.weights).toEqual([{ building: 'capguardHall', weight: 1 }, { building: 'sporelingBurrow', weight: 5 }]);
    expect(counterOf(counterTurn(capguards, { weights: { sporelingBurrow: 5 } })).history[0]).toMatchObject({ kind: 'line', added: 'gillNest' });
    // Mold's own weights list the set already, and only its non-swarm cards gain
    const own = counterTurn(sporelings);
    expect(counterOf(own).history[0]!.added).toBeUndefined();
    const w = targetWeights(planningView(own, 'enemy'));
    expect(Object.keys(w).filter((id) => w[id]! > content.generals['mother-mold']!.weights[id]!).every((id) => !content.units[content.buildings[id]!.squad?.unit ?? '']?.tags.includes('swarm'))).toBe(true);
  });

  it('records the counter in generalPlanned and the round\'s plan, and its state survives a snapshot round trip', () => {
    const s = counterTurn(sporelings, { gold: 300 });
    expect(s.sides.enemy.ai!.plans.at(-1)).toMatchObject({ round: 4, counter: 'swarm' });
    expect(s.events.find((e) => e.t === 'generalPlanned')).toMatchObject({ counter: 'swarm' });
    expect(counterOf(s).history).toEqual([expect.objectContaining({ round: 4, from: 1, kind: 'swarm', sold: [] })]);
    const copy = restore(snapshot(s));
    expect(copy.sides.enemy.ai!.counter).toEqual(counterOf(s));
    expect(hashState(copy)).toBe(hashState(s));
    // both play the next round alike, which runs no cycle and plans under the same counter
    for (const x of [s, copy]) { finishRound(x); step(x); }
    expect(hashState(copy)).toBe(hashState(s));
    expect([s.round, s.sides.enemy.ai!.plans.at(-1)!.counter]).toEqual([5, undefined]);
  });
});

describe('selling for room (§7.4)', () => {
  // Bogwater Hollow's 8 open plots, full: three spawners outside the Anti-Swarm set fare worst against light armor (crush)
  const full: Colony = [
    { building: 'capguardHall', lane: 0, rank: 0, file: 1 }, { building: 'capguardHall', lane: 0, rank: 0, file: 2 },
    { building: 'scythecapGrove', lane: 0, rank: 0, file: 3 }, { building: 'hammercapForge', lane: 0, rank: 0, file: 4 },
    { building: 'gillNest', lane: 0, rank: 1, file: 1 }, { building: 'hammercapForge', lane: 0, rank: 1, file: 2 },
    { building: 'rootbreakerDen', lane: 0, rank: 1, file: 3 }, { building: 'truffleCellar', lane: 0, rank: 1, file: 4 },
  ];
  const refund = (id: string) => Math.floor(content.buildings[id]!.cost * 0.6);
  const sold = (s: BattleState) => s.sides.enemy.ai!.plans.at(-1)!.sold;

  it('sells up to 2 spawners outside the set, worst against the dominant armor, rearmost first, then the lower file, at 60%', () => {
    const s = counterTurn(sporelings, { colony: full });
    expect(sold(s)).toEqual([{ building: 'hammercapForge', plot: plotAt(s, 0, 1, 2) }, { building: 'rootbreakerDen', plot: plotAt(s, 0, 1, 3) }]);
    expect(counterOf(s).history[0]!.sold).toEqual(['hammercapForge', 'rootbreakerDen']);
    expect(s.events.filter((e) => e.t === 'buildingSold').map((e) => e.t === 'buildingSold' && e.refund)).toEqual([refund('hammercapForge'), refund('rootbreakerDen')]);
    expect(s.stats.enemy.rejectedCommands).toBe(0);
  });

  it('sells only to leave 2 plots free: one with a plot free, none with 2', () => {
    const one = counterTurn(sporelings, { colony: full.slice(0, 7) });
    expect(sold(one)).toEqual([{ building: 'hammercapForge', plot: plotAt(one, 0, 1, 2) }]);
    expect(sold(counterTurn(sporelings, { colony: full.slice(0, 6) }))).toEqual([]);
  });

  it('breaks a tie of rank and file by building id, on Twin Roots', () => {
    const colony: Colony = [
      ...[1, 2, 3].map((file) => ({ building: 'capguardHall', lane: 0, rank: 0, file })),
      { building: 'truffleCellar', lane: 0, rank: 1, file: 1 }, { building: 'rootbreakerDen', lane: 0, rank: 1, file: 2 },
      // lane 1's front middle plot is a stump
      { building: 'hammercapForge', lane: 1, rank: 0, file: 1 }, { building: 'capguardHall', lane: 1, rank: 0, file: 3 },
      { building: 'truffleCellar', lane: 1, rank: 1, file: 1 }, { building: 'hammercapForge', lane: 1, rank: 1, file: 2 }, { building: 'sporeExchange', lane: 1, rank: 1, file: 3 },
    ];
    const s = counterTurn(sporelings, { map: 'twin-roots', colony });
    expect(sold(s)).toEqual([{ building: 'hammercapForge', plot: plotAt(s, 1, 1, 2) }]);
  });
});

describe('intel (§7.6)', () => {
  it("opens on the intel's top kind, its set ×2 and the rest ×0.8, until the first activation", () => {
    const intel = { swarm: 0.6, line: 0.3, armor: 0.1 };
    const first = counterTurn([], { round: 1, intel });
    expect(counterOf(first).opening).toEqual({ kinds: ['swarm'], dual: false });
    const w1 = targetWeights(planningView(first, 'enemy'));
    // round 1's economy × 1.5 too
    expect([w1.capguardHall, w1.sporelingBurrow, w1.truffleCellar].map((x) => +x!.toFixed(6))).toEqual([2, 4, 2.4]);
    // round 4's Line ends it
    const w4 = targetWeights(planningView(counterTurn(capguards, { intel }), 'enemy'));
    expect([w4.gillNest, w4.capguardHall, w4.sporelingBurrow].map((x) => +x!.toFixed(6))).toEqual([6, 0.6, 3]);
  });

  it("gives the boss a dual doctrine on the intel's top two kinds, ×2.5 for the whole battle", () => {
    const intel = { swarm: 0.5, armor: 0.4, line: 0.1 };
    const boss = (army: FieldedSquad[], round: number) => targetWeights(planningView(counterTurn(army, { round, intel, controller: 'general:pale-sovereign' }), 'enemy'));
    const w1 = boss([], 1);
    expect([w1.capguardHall, w1.hammercapForge, w1.gillNest, w1.morelWarren].map((x) => +x!.toFixed(6))).toEqual([2.5, 2.5, 1, 1]);
    // round 4's Line on top of it
    const w4 = boss(capguards, 4);
    expect([w4.gillNest, w4.capguardHall, w4.hammercapForge, w4.morelWarren].map((x) => +x!.toFixed(6))).toEqual([3, 1.5, 1.5, 0.6]);
  });
});

describe("X8's default-off knobs (§7.2, A049, T101)", () => {
  /** The battle's balance with X8's knobs set: a copy, so content's stays as it is. */
  const knobs = (over: Partial<BalanceDef['rounds']['ai']>) => (s: BattleState): void => {
    const b = s.library.balance;
    s.library.balance = { ...b, rounds: { ...b.rounds, ai: { ...b.rounds.ai, ...over } } };
  };

  it('ships both off', () => {
    expect([content.balance.rounds.ai.leanToLastAnswer, content.balance.rounds.ai.replaceWhenFull]).toEqual([0, false]);
  });

  it("leanToLastAnswer leans from round 2 toward the answer to last round's army", () => {
    const w = (lean: number, round: number) => targetWeights(planningView(counterTurn(capguards, { round, before: knobs({ leanToLastAnswer: lean }) }), 'enemy'));
    // your Capguards read Line, so Mold's Gill Nest gains and nothing else does
    expect(w(0.5, 2).gillNest).toBeCloseTo(w(0, 2).gillNest! * 1.5, 10);
    expect({ ...w(0.5, 2), gillNest: 0 }).toEqual({ ...w(0, 2), gillNest: 0 });
    expect(w(0.5, 1)).toEqual(w(0, 1));
  });

  it('replaceWhenFull sells its lowest-weighted fielded spawner at 60% for a heavier card it can afford, once the colony is full', () => {
    const colony: Colony = [
      ...[1, 2, 3, 4].map((file) => ({ building: 'sporelingBurrow', lane: 0, rank: 0, file })),
      { building: 'gillNest', lane: 0, rank: 1, file: 1 }, { building: 'gillNest', lane: 0, rank: 1, file: 2 },
      { building: 'bursterPod', lane: 0, rank: 1, file: 3 }, { building: 'rhizomorphTunnel', lane: 0, rank: 1, file: 4 },
    ];
    const turn = (on: boolean, gold: number) => counterTurn([], { round: 5, gold, colony, before: knobs({ replaceWhenFull: on }) });
    expect(turn(false, 100).events.some((e) => e.t === 'buildingSold')).toBe(false);
    // the Pod and the Tunnel weigh 1, the Pod in the lower file; a Burrow (5) is the heaviest card it can afford
    const s = turn(true, 100);
    const plan = s.sides.enemy.ai!.plans.at(-1)!;
    expect([plan.sold, plan.planted]).toEqual([[{ building: 'bursterPod', plot: plotAt(s, 0, 1, 3) }], [{ building: 'sporelingBurrow', plot: plotAt(s, 0, 1, 3) }]]);
    expect(s.sides.enemy.gold).toBe(100 + Math.floor(content.buildings.bursterPod!.cost * 0.6) - content.buildings.sporelingBurrow!.cost);
    // with no gold the refund buys nothing heavier, so it sells nothing
    expect(turn(true, 0).events.some((e) => e.t === 'buildingSold')).toBe(false);
  });
});

describe('what you see of a counter (§7.4, §7.5, §10.2, T102)', () => {
  it('names the counter in the Intent panel from its activation on, with what it planted, and calls it out in the activation round only', () => {
    const s = counterTurn(sporelings, { gold: 300 });
    const name = content.generals['mother-mold']!.name;
    expect(intentOf(content, s).doctrine).toBe('Countering SWARM');
    expect(intentOf(content, s).planted.length).toBeGreaterThan(0);
    expect(generalNews(content, s)).toBe(`${name} now counters your SWARM`);
    finishRound(s);
    step(s);
    expect([s.round, intentOf(content, s).doctrine, generalNews(content, s)]).toEqual([5, 'Countering SWARM', null]);
  });

  it("calls out round 1's intel: The Gray Rot remembers your SWARM", () => {
    const s = counterTurn([], { round: 1, intel: { swarm: 1 } });
    expect([generalNews(content, s), intentOf(content, s).doctrine]).toEqual(['The Gray Rot remembers your SWARM.', 'Remembers your SWARM']);
    expect(generalNews(content, counterTurn([], { round: 1 }))).toBeNull();
  });
});
