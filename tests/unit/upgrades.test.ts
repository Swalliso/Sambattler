// Gold upgrades (SPEC §6.1, §4.4, §5.6, §7.1, §14.5, #67; the user's details at R2b S5b, 2026-11-03): once its
// colony is full, a side's gold buys an upgrade for one of its planted spawners, at `upgradeCostPct` of the
// building's cost. From the next Begin every unit of that squad arrives Bloomed for the rest of the battle,
// so it can knit on to Elders at the muster, and the preview shows it first. Selling refunds the upgrade with
// the building by the phase rule. The general and the bots buy them too, at the end of their planning turn,
// once no plot is free.
import { describe, expect, it } from 'vitest';
import type { ScenarioDef } from '../../src/data/schema.ts';
import {
  colonyFull, createBattle, createFromScenario, formationOf, makeRoundConfig, mergePreview, sellValue, step, upgradePrice, upgradeProblem,
} from '../../src/sim/index.ts';
import type { BattleState, Side, SimEvent } from '../../src/sim/index.ts';
import { begin, command, content, finishRound, plotAt, sell, toggle } from '../helpers.ts';

type ScenarioSide = ScenarioDef['sides']['player'];

const PCT = content.balance.upgradeCostPct;
const front = (file: number) => ({ lane: 0, rank: 0, file });
const back = (file: number) => ({ lane: 0, rank: 1, file });

/** Bogwater Hollow's 8 plots, full: two Burrows, a Hall, a Burster Pod, two Gill Nests, a Mortar and a Cellar. */
const FULL: NonNullable<ScenarioSide['colony']> = [
  { building: 'sporelingBurrow', ...front(1) }, { building: 'capguardHall', ...front(2) },
  { building: 'sporelingBurrow', ...front(3) }, { building: 'bursterPod', ...front(4) },
  { building: 'gillNest', ...back(1) }, { building: 'puffballMortar', ...back(2) },
  { building: 'truffleCellar', ...back(3) }, { building: 'gillNest', ...back(4) },
];

/** A round scenario on Bogwater Hollow from `round`, with the player's colony full and 1,000 gold unless set. */
function full(opts: { round?: number; colony?: ScenarioSide['colony']; gold?: number; enemy?: ScenarioSide; over?: Partial<ScenarioDef> } = {}): BattleState {
  return createFromScenario(content, {
    id: 'upgrades', description: 'An upgrade test.', map: 'bogwater-hollow', round: opts.round ?? 2,
    sides: { player: { colony: opts.colony ?? FULL, gold: opts.gold ?? 1000 }, enemy: opts.enemy ?? {} },
    ...opts.over,
  });
}

const rejected = (events: readonly SimEvent[]): string[] => events.flatMap((e) => (e.t === 'commandRejected' ? [e.reason] : []));
const buildingAt = (s: BattleState, side: Side, at: { lane: number; rank: number; file: number }) =>
  s.buildings.find((b) => b.side === side && b.plot === plotAt(s, side, at))!;
const upgrade = (s: BattleState, side: Side, entityId: number): SimEvent[] => command(s, side, { type: 'upgrade', entityId });
/** The side's units by building and tier, as they stand. */
function fieldedBy(s: BattleState, side: Side): Record<number, { elders: number; bloomed: number; base: number }> {
  const out: Record<number, { elders: number; bloomed: number; base: number }> = {};
  for (const u of s.units.filter((x) => x.side === side)) {
    const t = (out[u.sourceBuildingId] ??= { elders: 0, bloomed: 0, base: 0 });
    t[u.tier === 3 ? 'elders' : u.tier === 2 ? 'bloomed' : 'base']++;
  }
  return out;
}

describe('the upgrade command (§6.1, §14.5)', () => {
  it("costs its price, `upgradeCostPct` of the building's cost, and marks the building upgraded", () => {
    const s = full();
    const burrow = buildingAt(s, 'player', front(1));
    expect(upgradePrice(s, 'player', 'sporelingBurrow')).toBe(Math.floor((110 * PCT) / 100));
    const price = upgradePrice(s, 'player', 'sporelingBurrow'), gold = s.sides.player.gold;
    const events = upgrade(s, 'player', burrow.id);
    expect(events).toContainEqual({ t: 'buildingUpgraded', id: burrow.id, side: 'player', price });
    expect(s.sides.player.gold).toBe(gold - price);
    expect(burrow.upgrade).toEqual({ paid: price, fielded: false });
    expect([s.stats.player.upgradesBought, s.stats.player.rejectedCommands]).toEqual([1, 0]);
  });

  it('is refused on an empty plot, an upgraded building, a building that fields no squad, a part-built colony, without the gold, and on the other side', () => {
    const s = full();
    const burrow = buildingAt(s, 'player', front(1)), mortar = buildingAt(s, 'player', back(2)), cellar = buildingAt(s, 'player', back(3));
    expect(rejected(upgrade(s, 'player', 999))).toEqual(['noSuchBuilding']);
    expect(rejected(upgrade(s, 'player', mortar.id))).toEqual(['notASpawner']);
    expect(rejected(upgrade(s, 'player', cellar.id))).toEqual(['notASpawner']);
    upgrade(s, 'player', burrow.id);
    expect(rejected(upgrade(s, 'player', burrow.id))).toEqual(['alreadyUpgraded']);
    s.sides.player.gold = upgradePrice(s, 'player', 'gillNest') - 1;
    expect(rejected(upgrade(s, 'player', buildingAt(s, 'player', back(1)).id))).toEqual(['notEnoughGold']);
    expect(s.stats.player.rejectedCommands).toBe(5);

    const part = full({ colony: FULL.slice(0, 7) });
    expect(colonyFull(part, 'player')).toBe(false);
    expect(rejected(upgrade(part, 'player', buildingAt(part, 'player', front(1)).id))).toEqual(['colonyNotFull']);
    const theirs = full({ enemy: { colony: [{ building: 'sporelingBurrow', ...front(1) }] } });
    expect(rejected(upgrade(theirs, 'player', buildingAt(theirs, 'enemy', front(1)).id))).toEqual(['notYourBuilding']);
    // a queued enemy plan comes after the general's turn, so it's refused (plan Call 8)
    expect(rejected(upgrade(theirs, 'enemy', buildingAt(theirs, 'enemy', front(1)).id))).toEqual(['enemyPlanAfterOpening']);
  });

  it("is refused while the side's draft is open (#28), and runs once it resolves", () => {
    const s = full({ round: 3, over: { flags: { merging: true, drafts: true } } });
    expect(s.sides.player.draft).toBeDefined();
    const burrow = buildingAt(s, 'player', front(1));
    expect(upgradeProblem(s, 'player', burrow.id)).toBe('draftOpen');
    expect(rejected(upgrade(s, 'player', burrow.id))).toEqual(['draftOpen']);
    command(s, 'player', { type: 'draftSkip' });
    expect(rejected(upgrade(s, 'player', burrow.id))).toEqual([]);
    expect(burrow.upgrade).toBeDefined();
  });

  it('is refused in a clash (wrongPhase)', () => {
    const s = full();
    begin(s);
    expect(rejected(upgrade(s, 'player', buildingAt(s, 'player', front(1)).id))).toEqual(['wrongPhase']);
  });
});

describe('an upgraded squad arrives Bloomed (§6.1, §5.5, §5.6)', () => {
  it('every unit arrives at tier 2 from the next Begin, for the rest of the battle', () => {
    const s = full();
    const burrow = buildingAt(s, 'player', front(1)), other = buildingAt(s, 'player', front(3));
    // with their toggles off, the squads stand as they arrived
    toggle(s, 'player', burrow.id, false);
    toggle(s, 'player', other.id, false);
    upgrade(s, 'player', burrow.id);
    const bloomed = s.compiled.player.units.sporeling!.tiers[1]!;
    for (let round = 0; round < 2; round++) {
      begin(s);
      const units = s.units.filter((u) => u.sourceBuildingId === burrow.id);
      expect(units).toHaveLength(8);
      for (const u of units) expect([u.tier, u.maxHp, u.supply]).toEqual([2, bloomed.hp, bloomed.supply]);
      expect(s.squads.find((q) => q.building === burrow.id)!.supply).toBe(8 * bloomed.supply);
      // the other Burrow, not upgraded, fields Sporelings at tier 1
      expect(s.units.filter((u) => u.sourceBuildingId === other.id).map((u) => u.tier)).toEqual(Array(8).fill(1));
      finishRound(s);
      step(s);
      expect(s.phase).toBe('planning');
    }
  });

  it('knits on to Elders at the muster, and the preview before buying equals what fields', () => {
    const s = full();
    const burrow = buildingAt(s, 'player', front(1));
    const formation = formationOf(s, 'player', { upgrade: burrow.id });
    const preview = mergePreview(s, 'player', { upgrade: burrow.id });
    expect(formation.find((q) => q.building === burrow.id)!.tier).toBe(2);
    expect(formationOf(s, 'player').find((q) => q.building === burrow.id)!.tier).toBe(1);
    expect(preview.byBuilding[burrow.id]!.elders).toBeGreaterThan(0);
    upgrade(s, 'player', burrow.id);
    expect(formationOf(s, 'player')).toEqual(formation);
    expect(mergePreview(s, 'player')).toEqual(preview);
    begin(s);
    expect(fieldedBy(s, 'player')).toEqual(Object.fromEntries(Object.entries(preview.byBuilding).filter(([, t]) => t.elders + t.bloomed + t.base > 0)));
    expect(s.clash!.fielded.player).toContainEqual(expect.objectContaining({ unitId: 'sporeling', tier: 3 }));
  });

  it('a Burster Pod arrives Bloomed too, and never knits', () => {
    const s = full();
    const pod = buildingAt(s, 'player', front(4));
    upgrade(s, 'player', pod.id);
    begin(s);
    const units = s.units.filter((u) => u.sourceBuildingId === pod.id);
    expect(units.length).toBe(content.buildings.bursterPod!.squad!.count);
    expect(units.every((u) => u.tier === 2)).toBe(true);
  });
});

describe('selling refunds the upgrade with the building, by the phase rule (§4.4)', () => {
  it('100% of an upgrade bought this phase, and 60% once it has fielded', () => {
    const s = full();
    const burrow = buildingAt(s, 'player', front(1));
    const price = upgradePrice(s, 'player', 'sporelingBurrow');
    upgrade(s, 'player', burrow.id);
    // the Burrow fielded before this round, so it refunds 60%; its upgrade was bought in this phase
    expect(sellValue(s, burrow.id)).toBe(Math.floor(110 * 0.6) + price);
    begin(s);
    finishRound(s);
    step(s);
    expect(burrow.upgrade).toEqual({ paid: price, fielded: true });
    const value = Math.floor(110 * 0.6) + Math.floor(price * 0.6);
    expect(sellValue(s, burrow.id)).toBe(value);
    const gold = s.sides.player.gold;
    expect(sell(s, 'player', burrow.id)).toContainEqual({ t: 'buildingSold', id: burrow.id, side: 'player', refund: value });
    expect(s.sides.player.gold).toBe(gold + value);
  });

  it('all of it for a building planted and upgraded in the same phase, and the plot then frees with no upgrade left', () => {
    const s = full({ colony: FULL.slice(0, 7) });
    command(s, 'player', { type: 'plant', buildingId: 'gillNest', plot: plotAt(s, 'player', back(4)) });
    const nest = buildingAt(s, 'player', back(4));
    const price = upgradePrice(s, 'player', 'gillNest');
    upgrade(s, 'player', nest.id);
    expect(sellValue(s, nest.id)).toBe(150 + price);
    sell(s, 'player', nest.id);
    expect(colonyFull(s, 'player')).toBe(false);
    command(s, 'player', { type: 'plant', buildingId: 'gillNest', plot: plotAt(s, 'player', back(4)) });
    expect(buildingAt(s, 'player', back(4)).upgrade).toBeUndefined();
  });
});

describe('the general and the bots buy upgrades once their plots are full (§6.1, §7.1, §7.2)', () => {
  it("the general upgrades spawners at its turn's end, records them in its plan, and stops when its gold doesn't reach the next", () => {
    const s = full({ enemy: { colony: FULL, gold: 1000 }, over: { controllers: { enemy: 'general:scripted' } } });
    const ups = s.events.flatMap((e) => (e.t === 'buildingUpgraded' && e.side === 'enemy' ? [s.buildings.find((b) => b.id === e.id)!] : []));
    expect(ups.length).toBeGreaterThan(0);
    for (const b of ups) expect(s.compiled.enemy.buildings[b.buildingId]!.kind).toBe('spawner');
    expect(s.sides.enemy.ai!.plans.at(-1)!.upgraded).toEqual(ups.map((b) => ({ building: b.buildingId, plot: b.plot })));
    expect(s.events).toContainEqual(expect.objectContaining({ t: 'generalPlanned', side: 'enemy', upgraded: ups.map((b) => b.id) }));
    const left = s.buildings.filter((b) => b.side === 'enemy' && !b.upgrade && s.compiled.enemy.buildings[b.buildingId]!.kind === 'spawner');
    if (left.length) expect(s.sides.enemy.gold).toBeLessThan(Math.max(...left.map((b) => upgradePrice(s, 'enemy', b.buildingId))));
    expect(s.stats.enemy.rejectedCommands).toBe(0);
  });

  it('plants a free plot before it upgrades anything', () => {
    const s = full({ enemy: { colony: FULL.slice(0, 7), gold: 1000 }, over: { controllers: { enemy: 'general:scripted' } } });
    const enemyIds = new Set(s.buildings.filter((b) => b.side === 'enemy').map((b) => b.id));
    const order = s.events.flatMap((e) => ((e.t === 'buildingPlanted' || e.t === 'buildingUpgraded') && enemyIds.has(e.id) ? [e.t] : []));
    expect(order[0]).toBe('buildingPlanted');
    expect(order).toContain('buildingUpgraded');
    expect(order.lastIndexOf('buildingPlanted')).toBeLessThan(order.indexOf('buildingUpgraded'));
  });

  it('in whole battles, the general and a bot upgrade only with their colonies full, and never have one refused', () => {
    let bought = { player: 0, enemy: 0 };
    for (const seed of [1, 2, 3, 4]) {
      const s = createBattle(content, makeRoundConfig(content, { seed, player: 'bot:balanced', enemy: 'general:scripted' }));
      for (let n = 0; s.phase !== 'ended' && n < 100000; n++) {
        step(s);
        for (const e of s.events) {
          if (e.t !== 'buildingUpgraded') continue;
          bought = { ...bought, [e.side]: bought[e.side] + 1 };
          expect(colonyFull(s, e.side)).toBe(true);
        }
      }
      expect(s.stats.player.rejectedCommands + s.stats.enemy.rejectedCommands).toBe(0);
    }
    expect(bought.player).toBeGreaterThan(0);
    expect(bought.enemy).toBeGreaterThan(0);
  });

  it("the general's turn never reads what the player buys in the same phase", () => {
    const make = () => full({ enemy: { colony: FULL, gold: 1000 }, over: { controllers: { enemy: 'general:scripted' } } });
    const a = make(), b = make();
    upgrade(a, 'player', buildingAt(a, 'player', front(1)).id);
    expect(a.buildings.filter((x) => x.side === 'enemy')).toEqual(b.buildings.filter((x) => x.side === 'enemy'));
    expect(a.sides.enemy).toEqual(b.sides.enemy);
  });
});
