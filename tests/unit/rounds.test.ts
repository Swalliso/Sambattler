// A battle in rounds' creation (SPEC §4.7 steps 1–4, §6.1, §14.4, §14.6), its queue and step by phase
// (§13.3 rules 1 and 7, §14.5, §14.6), round scenarios (§15.2, plan Call 18), and a round's order (§4.7,
// §15.7's Rounds row).
import { describe, expect, it } from 'vitest';
import { loadContent } from '../../src/data/registry.ts';
import type { Content } from '../../src/data/registry.ts';
import type { ScenarioDef } from '../../src/data/schema.ts';
import { seedStream } from '../../src/sim/rng.ts';
import {
  addUnit, commandStamp, createBattle, createFromScenario, hashState, makeRoundConfig, queueCommand, restore, SIDES, snapshot, step, survivingSupply,
} from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
import { readRawContent } from '../../tools/lib/content.ts';
import { newClash } from '../../src/sim/round.ts';
import { begin, content, finishRound, planningState } from '../helpers.ts';

/** Battle `battleIndex` on Bogwater Hollow against `enemy`, with a human player. */
const battle = (enemy = 'human', battleIndex = 1, from: Content = content): BattleState =>
  createBattle(from, makeRoundConfig(from, { seed: 7, battleIndex, enemy }));

describe('createBattle opens round 1 in planning (§4.7 steps 1–4, §14.6)', () => {
  it('starts in planning, in round 1 at tick 0, with both colonies empty and their base plots open', () => {
    const s = battle();
    expect([s.v, s.phase, s.round, s.tick]).toEqual([2, 'planning', 1, 0]);
    expect([s.buildings, s.squads, s.units, s.rounds, s.queue]).toEqual([[], [], [], [], []]);
    for (const side of SIDES) {
      const plots = s.sides[side].plots;
      expect(plots.every((p) => p.building === 0), side).toBe(true);
      // Bogwater's two ranks of four files; the third rank stays closed until gained (§4.6)
      expect(plots.filter((p) => p.open).map((p) => `${p.rank}:${p.file}`), side).toEqual(['0:1', '0:2', '0:3', '0:4', '1:1', '1:2', '1:3', '1:4']);
    }
  });

  it.each([1, 2, 5])('fills both Heartcaps, at 3000 and 2000 + 250 × (index − 1), in battle %i', (i) => {
    const s = battle('human', i);
    const general = 2000 + 250 * (i - 1);
    expect(s.sides.player).toMatchObject({ heartcapHp: 3000, heartcapMaxHp: 3000 });
    expect(s.sides.enemy).toMatchObject({ heartcapHp: general, heartcapMaxHp: general });
  });

  it.each([1, 2, 5])('gives each side 300 + 75 × (index − 1) gold in battle %i', (i) => {
    const s = battle('human', i);
    expect([s.sides.player.gold, s.sides.enemy.gold]).toEqual([300 + 75 * (i - 1), 300 + 75 * (i - 1)]);
  });

  it("has run the enemy's plan hook before it returns, and recorded the round's plan (plan Call 12)", () => {
    const s = battle('general:mother-mold');
    expect(s.sides.enemy.ai?.plans.map((p) => p.round)).toEqual([1]);
    expect(s.events).toContainEqual(expect.objectContaining({ t: 'generalPlanned', side: 'enemy' }));
    const human = battle();
    expect(human.sides.enemy.ai).toBeUndefined();
    expect(human.events.some((e) => e.t === 'generalPlanned')).toBe(false);
  });

  it('seeds an AI stream a side from the battle index (plan Call 10)', () => {
    const s = battle('human', 2);
    expect(s.rng.ai).toEqual({ player: seedStream(7, 'ai.player', 2), enemy: seedStream(7, 'ai.enemy', 2) });
    expect(s.rng.ai.player).not.toEqual(s.rng.ai.enemy);
  });

  it('refuses a map without a colony block, with a message', () => {
    const raw = readRawContent();
    const { colony: _colony, ...map } = raw['maps/bogwater-hollow.json'] as Record<string, unknown>;
    const c = loadContent({ ...raw, 'maps/no-colony.json': { ...map, id: 'no-colony' } });
    const config = makeRoundConfig(c, { seed: 1 });
    config.mapId = 'no-colony';
    expect(() => createBattle(c, config)).toThrow(/no-colony has no colony block/);
  });

  it('round-trips a snapshot to an equal hash, and restore refuses a v1 state', () => {
    const s = battle('general:mother-mold');
    const back = restore(snapshot(s));
    expect(back).toEqual(s);
    expect(hashState(back)).toBe(hashState(s));
    expect(() => restore(JSON.stringify({ ...JSON.parse(snapshot(s)), v: 1 }))).toThrow(/version 1/);
  });

  it('hashes the same when a building, a unit or a power is reworded in content (R2-Q8)', () => {
    const { gillNest } = content.buildings, { gillArcher } = content.units, { vesper } = content.commanders;
    const reworded: Content = {
      ...content,
      buildings: { ...content.buildings, gillNest: { ...gillNest!, name: 'Archer Den', description: 'Other words.' } },
      units: { ...content.units, gillArcher: { ...gillArcher!, name: 'Gill Bowman' } },
      commanders: {
        ...content.commanders,
        vesper: { ...vesper!, passive: { ...vesper!.passive, text: 'Other words.' }, power: { ...vesper!.power, name: 'Other', text: 'Other words.' } },
      },
    };
    const hash = (from: Content) => hashState(createBattle(from, makeRoundConfig(from, { seed: 3, enemy: 'general:mother-mold', commander: 'vesper' })));
    expect(hash(reworded)).toBe(hash(content));
  });
});

describe('the queue and the step by phase (§13.3 rule 7, §14.5, §14.6)', () => {
  const sell = (s: BattleState, side: Side, entityId: number) => queueCommand(s, { ...commandStamp(s), side, type: 'sell', entityId });

  it('stamps a command with its round and state.tick, and sorts the player first within a stamp (plan Call 7)', () => {
    const s = planningState();
    s.tick = 640; // as after round 1's clash: planning never moves the tick
    expect(commandStamp(s)).toEqual({ round: 1, tick: 640 });
    const e = sell(s, 'enemy', 99), p = sell(s, 'player', 98), p2 = sell(s, 'player', 97);
    expect(s.queue).toEqual([p, p2, e]);
    expect([p.seq, p2.seq, e.seq]).toEqual([0, 1, 0]);
    s.phase = 'clash';
    expect(commandStamp(s)).toEqual({ round: 1, tick: 641 });
  });

  it('runs every queued command in planning without moving the tick, logging each in queue order', () => {
    const s = planningState();
    sell(s, 'enemy', 99);
    queueCommand(s, { ...commandStamp(s), side: 'player', type: 'toggleMerge', entityId: 98, on: false });
    step(s);
    expect([s.phase, s.tick, s.queue]).toEqual(['planning', 0, []]);
    expect(s.log.map((c) => c.side)).toEqual(['player', 'enemy']);
    // neither names a building of its side's, so both are refused and counted
    expect(s.events.map((e) => e.t)).toEqual(['commandRejected', 'commandRejected']);
    expect([s.stats.player.rejectedCommands, s.stats.enemy.rejectedCommands]).toEqual([1, 1]);
  });

  it("refuses a clash command in planning, and keeps a later round's command queued", () => {
    const s = planningState();
    queueCommand(s, { round: 1, tick: 0, side: 'player', type: 'power' });
    queueCommand(s, { round: 2, tick: 0, side: 'player', type: 'beginClash' });
    step(s);
    expect(s.log.map((c) => c.type)).toEqual(['power']);
    expect(s.events).toEqual([expect.objectContaining({ t: 'commandRejected', side: 'player' })]);
    expect(s.queue.map((c) => c.round)).toEqual([2]);
  });

  it('advances a clash by exactly one tick a step', () => {
    const s = planningState();
    s.phase = 'clash';
    s.clash = newClash(s);
    step(s);
    expect(s.tick).toBe(1);
  });

  it('opens the next round from the aftermath, clearing the last clash, and the general plans it', () => {
    const s = battle('general:mother-mold');
    s.phase = 'aftermath';
    s.tick = 300;
    addUnit(s, 'player', 'sporeling', 0, 12, 3, 0);
    step(s);
    expect([s.phase, s.round, s.tick, s.units]).toEqual(['planning', 2, 300, []]);
    expect(s.sides.enemy.ai?.plans.map((p) => p.round)).toEqual([1, 2]);
  });

  it('ends the battle from the aftermath once its outcome is set, and an ended battle steps to nothing', () => {
    const s = planningState();
    s.phase = 'aftermath';
    s.outcome = { winner: 'enemy', by: 'rout', round: 1 };
    step(s);
    expect(s.phase).toBe('ended');
    expect(s.events).toEqual([{ t: 'battleEnded', winner: 'enemy', by: 'rout', round: 1 }]);
    const hash = hashState(s);
    step(s);
    expect(hashState(s)).toBe(hash);
  });
});

describe('round scenarios (§15.2, plan Call 18, A106)', () => {
  const scenario = (over: Partial<ScenarioDef> = {}): ScenarioDef => ({
    id: 'test', description: 'A test.', map: 'bogwater-hollow', sides: { player: {}, enemy: {} }, ...over,
  });
  const dealt = (s: BattleState) => SIDES.map((side) => s.rounds.reduce((n, r) => n + r.damage[side], 0));

  it('loads data/scenarios/ into content.scenarios, and checks what each names', () => {
    const raw = readRawContent();
    const c = loadContent({ ...raw, 'scenarios/demo.json': scenario({ id: 'demo' }) });
    expect(Object.keys(c.scenarios).sort()).toEqual([...Object.keys(content.scenarios), 'demo'].sort());
    const bad = scenario({ id: 'bad', sides: { player: { colony: [{ building: 'nowhere', lane: 0, rank: 0, file: 1 }] }, enemy: {} } });
    expect(() => loadContent({ ...raw, 'scenarios/bad.json': bad })).toThrow(/building "nowhere" does not exist/);
  });

  it("plants each side's colony on its plots, and records what each has dealt in the rounds before", () => {
    const s = createFromScenario(content, scenario({
      round: 3,
      sides: {
        player: { colony: [{ building: 'capguardHall', lane: 0, rank: 0, file: 2 }, { building: 'gillNest', lane: 0, rank: 1, file: 2, merge: false }], gold: 140, heartcapHp: 2500 },
        enemy: { colony: [{ building: 'sporelingBurrow', lane: 0, rank: 0, file: 3 }], heartcapHp: 1700 },
      },
    }));
    expect([s.phase, s.round]).toEqual(['planning', 3]);
    expect(s.buildings.map((b) => [b.side, b.buildingId, s.sides[b.side].plots[b.plot]!.rank, s.sides[b.side].plots[b.plot]!.file, b.mergeOn])).toEqual([
      ['player', 'capguardHall', 0, 2, true], ['player', 'gillNest', 1, 2, false], ['enemy', 'sporelingBurrow', 0, 3, true],
    ]);
    for (const b of s.buildings) expect(s.sides[b.side].plots[b.plot]!.building).toBe(b.id);
    expect(s.sides.player).toMatchObject({ bankedAtBegin: 140, heartcapHp: 2500, heartcapMaxHp: 3000 });
    // rounds 1 and 2 stand behind it, and by default each side has dealt what the other's Heartcap lost
    expect(s.rounds.map((r) => r.round)).toEqual([1, 2]);
    expect(dealt(s)).toEqual([300, 500]);
  });

  it("gives the last round each lane's winner and its damage, which names its loser (§6.7)", () => {
    const s = createFromScenario(content, scenario({
      round: 4, last: { lanes: ['player'], damage: { player: 200, enemy: 0 } },
      sides: { player: { heartcapHp: 2600 }, enemy: { heartcapHp: 1500 } },
    }));
    const last = s.rounds.at(-1)!;
    expect([last.round, last.lanes.map((l) => l.winner), last.damage]).toEqual([3, ['player'], { player: 200, enemy: 0 }]);
    expect(dealt(s)).toEqual([500, 400]);
  });

  it('refuses a colony on a missing, closed, stump or taken plot', () => {
    const plant = (...colony: { building: string; lane: number; rank: number; file: number }[]) => () =>
      createFromScenario(content, scenario({ map: 'stumpfield', sides: { player: { colony }, enemy: {} } }));
    const at = (rank: number, file: number) => ({ building: 'gillNest', lane: 0, rank, file });
    expect(plant(at(0, 5))).toThrow(/no plot/);
    expect(plant(at(2, 2))).toThrow(/closed/);
    expect(plant(at(0, 2))).toThrow(/stump/); // Stumpfield's front file 2 (§11.9)
    expect(plant(at(0, 1), at(0, 1))).toThrow(/taken/);
  });

  it('places units for a clash directly, in the order given (clash.units)', () => {
    const s = createFromScenario(content, scenario({
      clash: { units: [{ side: 'player', unit: 'sporeling', lane: 0, x: 12, y: 3, count: 3 }, { side: 'enemy', unit: 'gillArcher', x: 19, y: 4 }] },
    }));
    expect([s.phase, s.clash?.startTick]).toEqual(['clash', s.tick]);
    expect(s.units.map((u) => [u.id, u.side, u.unitId, u.lane])).toEqual([
      [1, 'player', 'sporeling', 0], [2, 'player', 'sporeling', 0], [3, 'player', 'sporeling', 0], [4, 'enemy', 'gillArcher', 0],
    ]);
  });

  it("counts a side's surviving supply in a lane: its living units', a merged unit its own and a siege unit once (§6.7)", () => {
    const s = createFromScenario(content, scenario({
      map: 'twin-roots',
      clash: {
        units: [
          { side: 'player', unit: 'sporeling', lane: 0, x: 8, y: 2, count: 3 }, { side: 'player', unit: 'sporeling', lane: 0, x: 9, y: 3, tier: 2 },
          { side: 'player', unit: 'rootbreaker', lane: 0, x: 10, y: 2 }, { side: 'enemy', unit: 'gillArcher', lane: 0, x: 21, y: 3 },
          { side: 'enemy', unit: 'capguard', lane: 1, x: 20, y: 9 },
        ],
      },
    }));
    const tug = () => [0, 1].map((lane) => SIDES.map((side) => survivingSupply(s, side, lane)));
    expect(tug()).toEqual([[8, 2], [0, 2]]);
    s.units.find((u) => u.unitId === 'gillArcher')!.hp = 0;
    expect(tug()).toEqual([[8, 0], [0, 2]]);
    expect(survivingSupply(planningState(), 'player', 0)).toBe(0);
  });
});

describe("a round's order (§4.7, §14.6's opening steps 1–7, §15.7 Rounds)", () => {
  /**
   * Battle 1 against Mother Mold, who plans each round, with a player's passive that pays 7 gold at battleStart and 5 at
   * roundStart. She keeps her first opener, a Burrow and a Truffle Cellar, so her plans don't rest on the draw (#69).
   */
  function ordered(): BattleState {
    const { moreOpeners: _more, ...mold } = content.generals['mother-mold']!;
    const firstOpener = { ...content, generals: { ...content.generals, 'mother-mold': mold } };
    const config = makeRoundConfig(firstOpener, { seed: 7, enemy: 'general:mother-mold' });
    config.modifiers = [...(config.modifiers ?? []), {
      side: 'player', source: 'test:order',
      effects: { triggers: [{ on: 'battleStart', do: [{ gainGold: 7 }] }, { on: 'roundStart', do: [{ gainGold: 5 }] }] },
    }];
    return createBattle(firstOpener, config);
  }
  const kinds = (s: BattleState) => s.events.map((e) => (e.t === 'gold' ? `${e.t}:${e.amount}` : e.t));
  const scenario = (round: number, sides: ScenarioDef['sides'] = { player: {}, enemy: {} }): ScenarioDef => ({
    id: 'order', description: 'A round-order test.', map: 'bogwater-hollow', round, sides,
  });

  it("opens round 1 with its storm, then battleStart and roundStart, then the general's plan, then the player's planning", () => {
    const s = ordered();
    // the general's opener, a Burrow and a Truffle Cellar, runs at once before generalPlanned (T068)
    expect(kinds(s)).toEqual(['roundStarted', 'gold:7', 'gold:5', 'buildingPlanted', 'buildingPlanted', 'generalPlanned']);
    expect([s.events[0], s.sporestorm, s.phase]).toEqual([{ t: 'roundStarted', round: 1, stormBp: 10000 }, 0, 'planning']);
  });

  it("opens a later round with income, interest, its storm, roundStart and the general's plan, which records its income (plan Call 12)", () => {
    const s = ordered();
    finishRound(s);
    step(s);
    expect(kinds(s)).toEqual(['income', 'income', 'interest', 'interest', 'roundStarted', 'gold:5', 'buildingPlanted', 'generalPlanned']);
    expect([s.round, s.phase]).toEqual([2, 'planning']);
    // Mold's opener, a Burrow and a Truffle Cellar (T068), won round 1 against nobody: the general's 100, the Cellar's 75 on
    // loam and 4 on the 40 it banked, then the Burster Pod it carried
    expect(s.sides.enemy.ai!.plans[1]).toMatchObject({ round: 2, income: 179, planted: [{ building: 'bursterPod' }] });
  });

  it.each([[4, 10000, 0], [5, 12000, 1], [9, 20000, 5]])("sets round %i's storm before roundStarted: %i bp, step %i (§6.4)", (round, stormBp, storm) => {
    const s = createFromScenario(content, scenario(round));
    expect([s.events.find((e) => e.t === 'roundStarted'), s.sporestorm]).toEqual([{ t: 'roundStarted', round, stormBp }, storm]);
  });

  it('carries only the colony and gold into the next round, and fields every squad fresh (§4.7 step 19, §14.4)', () => {
    const s = createFromScenario(content, scenario(1, {
      player: { colony: [{ building: 'capguardHall', lane: 0, rank: 0, file: 2, merge: false }] },
      enemy: { colony: [{ building: 'sporelingBurrow', lane: 0, rank: 0, file: 2, merge: false }] },
    }));
    begin(s);
    const colony = structuredClone(s.buildings);
    const arrival = s.units.map((u) => [u.side, u.unitId, u.x, u.y, u.hp, u.maxHp]);
    const firstId = s.nextId;
    finishRound(s);
    expect(s.units.some((u) => u.hp < u.maxHp)).toBe(true);
    const gold = SIDES.map((side) => s.sides[side].gold);
    step(s);
    expect([s.round, s.units, s.squads, s.hits, s.clouds, s.clash]).toEqual([2, [], [], [], [], undefined]);
    expect(s.buildings).toEqual(colony);
    const paid = (side: Side) => s.events.reduce((n, e) => n + ((e.t === 'income' || e.t === 'interest') && e.side === side ? e.amount : 0), 0);
    expect(SIDES.map((side) => s.sides[side].gold)).toEqual(SIDES.map((side, i) => gold[i]! + paid(side)));
    begin(s);
    expect(s.units.map((u) => [u.side, u.unitId, u.x, u.y, u.hp, u.maxHp])).toEqual(arrival);
    expect(s.units.every((u) => u.id >= firstId)).toBe(true);
  });

  it('gives the last round its aftermath like any other, then ends the battle (§4.7 step 19, §6.5)', () => {
    const s = createFromScenario(content, scenario(9));
    finishRound(s);
    expect([s.phase, s.outcome?.by]).toEqual(['aftermath', 'decision']);
    step(s);
    expect([s.phase, s.round, kinds(s)]).toEqual(['ended', 9, ['battleEnded']]);
  });
});
