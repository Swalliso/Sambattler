// Stats per round and per battle (SPEC §5.7, §14.4, A064, A175): each counter is kept for each round, in its
// `RoundResult`, and a battle's figure is the sum of its rounds' (the most or the least, for the maxima and
// the Heartcap's lowest fraction). M6-Q1's feat stats are recorded now. `summarize` reports them with the
// battle's state, in ids and numbers only (R2-Q8).
import { describe, expect, it } from 'vitest';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { createBattle, createFromScenario, makeRoundConfig, SIDES, step, summarize } from '../../../src/sim/rounds/index.ts';
import type { BattleState, RoundStats, Side, SideStats, SimEvent } from '../../../src/sim/rounds/index.ts';
import { foldRounds } from '../../../src/sim/rounds/stats.ts';
import { begin, content, finishRound, fromScenario, plant, sell } from '../../roundHelpers.ts';
import type { PlotPlace } from '../../roundHelpers.ts';

type Sides = RoundScenarioDef['sides'];
type Planted = NonNullable<Sides['player']['colony']>[number];

const at = (lane: number, rank: number, file: number): PlotPlace => ({ lane, rank, file });
const on = (building: string, p: PlotPlace, merge = true): Planted => ({ building, ...p, merge });

/** A battle from a round scenario on `map`, in `round`. */
const battle = (sides: Sides, round = 1, map = 'bogwater-hollow'): BattleState =>
  createFromScenario(content, { id: 'stats', description: 'A stats test.', map, round, sides });

/** What a round's opening paid each side, from its `income` and `interest` events. */
const paidAt = (opening: readonly SimEvent[], side: Side): number =>
  opening.reduce((n, e) => n + ((e.t === 'income' || e.t === 'interest') && e.side === side ? e.amount : 0), 0);

/** The battle's figures that a round also keeps: all but the lookup of building types and the Rout round's damage by tag. */
function roundPart(st: SideStats): RoundStats {
  const { buildingTypes: _types, routRoundDamageByTag: _rout, ...rest } = st;
  return rest;
}

interface Played {
  /** The round's opening events, then every event from Begin to the clash's end. */
  opening: SimEvent[];
  play: SimEvent[];
  /** Units each side had standing once Begin had mustered them, and the most Elders it had alive at once. */
  arrived: Record<Side, number>;
  elders: Record<Side, number>;
  /** The battle's stats once the round closed. */
  after: Record<Side, SideStats>;
}

/** Plays the round from planning to its aftermath, noting what `Played` holds. */
function play(s: BattleState, opening: SimEvent[]): Played {
  const elders = { player: 0, enemy: 0 };
  const note = () => {
    for (const side of SIDES) elders[side] = Math.max(elders[side], s.units.filter((u) => u.side === side && u.tier === 3).length);
  };
  const events = begin(s);
  const arrived = { player: s.units.filter((u) => u.side === 'player').length, enemy: s.units.filter((u) => u.side === 'enemy').length };
  note();
  while (s.phase === 'clash') {
    step(s);
    events.push(...s.events);
    note();
  }
  return { opening, play: events, arrived, elders, after: structuredClone(s.stats) };
}

/**
 * Three rounds on Bogwater Hollow: two merging Sporeling Burrows, a Puffball Mortar and a Truffle Cellar on
 * loam, against Capguards, Bursters and Gill Archers. Round 2's planning sells the fielded Cellar and plants
 * a new one, and plants a Gill Nest and sells it in the same phase. It notes the gold spent and refunded.
 */
function threeRounds() {
  const s = battle({
    player: { colony: [on('sporelingBurrow', at(0, 0, 2)), on('sporelingBurrow', at(0, 0, 3)), on('puffballMortar', at(0, 1, 3)), on('truffleCellar', at(0, 1, 2))] },
    enemy: { colony: [on('capguardHall', at(0, 0, 2)), on('bursterPod', at(0, 0, 3)), on('gillNest', at(0, 1, 2))] },
  });
  const ledger = { spent: 0, refunded: 0 };
  const planted = (buildingId: string, p: PlotPlace) => {
    plant(s, 'player', buildingId, p);
    const b = s.buildings.at(-1)!;
    ledger.spent += b.pricePaid;
    return b.id;
  };
  const sold = (id: number) => {
    const [e] = sell(s, 'player', id);
    ledger.refunded += e?.t === 'buildingSold' ? e.refund : 0;
  };
  const rounds = [play(s, [...s.events])];
  step(s);
  const opening = [...s.events];
  sold(s.buildings.find((b) => b.buildingId === 'truffleCellar')!.id);
  planted('truffleCellar', at(0, 1, 2));
  sold(planted('gillNest', at(0, 1, 1)));
  rounds.push(play(s, opening));
  step(s);
  rounds.push(play(s, [...s.events]));
  return { s, rounds, ledger };
}

let cached: ReturnType<typeof threeRounds> | undefined;
const three = () => (cached ??= threeRounds());

describe('stats per round (§5.7, A064)', () => {
  it("keeps each stat per round, and a battle's figure is their sum, or their most or least", () => {
    const { s, rounds } = three();
    expect([s.round, s.phase, s.rounds.length]).toEqual([3, 'aftermath', 3]);
    for (const side of SIDES) {
      expect(foldRounds(s.rounds.map((r) => r.stats[side]))).toEqual(roundPart(s.stats[side]));
      // each round's counters are what the round added to the battle's
      rounds.forEach((r, i) => {
        const before = i ? rounds[i - 1]!.after[side] : undefined;
        const rec = s.rounds[i]!.stats[side];
        expect(rec.damageDealt, `${side} round ${i + 1}`).toBe(r.after[side].damageDealt - (before?.damageDealt ?? 0));
        expect(rec.unitsLost).toBe(r.play.filter((e) => e.t === 'died' && e.side === side).length);
      });
    }
  });

  it('records what each side fielded by type, tier and count, and its merges by tier, at the muster and after', () => {
    const { s, rounds } = three();
    rounds.forEach((r, i) => {
      for (const side of SIDES) {
        const round = s.rounds[i]!;
        expect(round.fielded[side].reduce((n, f) => n + f.count, 0)).toBe(r.arrived[side]);
        const merged = (tier: number) => r.play.filter((e) => e.t === 'merged' && e.side === side && e.tier === tier).length;
        expect(round.stats[side].merges).toEqual({ '2': merged(2), '3': merged(3) });
      }
    });
    // the muster knits the Burrows' Sporelings inside Begin, so Bloomed and Elders field
    expect(s.rounds[0]!.fielded.player.filter((f) => f.tier > 1).length).toBeGreaterThan(0);
    // elder-ladder's three trios bloom after the muster, and their Bloomed knit into an Elder
    const ladder = fromScenario('elder-ladder');
    finishRound(ladder);
    const rung = ladder.rounds.at(-1)!.stats.player;
    expect([rung.merges, rung.maxEldersAlive]).toEqual([{ '2': 3, '3': 1 }, 1]);
  });

  it('attributes damage to buildings, clouds and bursts included, and by their units’ tags (M6-Q1)', () => {
    const { s } = three();
    const byId = (side: Side, buildingId: string) => s.buildings.find((b) => b.side === side && b.buildingId === buildingId)!.id;
    const [burrowA, burrowB] = s.buildings.filter((b) => b.side === 'player' && b.buildingId === 'sporelingBurrow').map((b) => b.id);
    const mortar = byId('player', 'puffballMortar'), pod = byId('enemy', 'bursterPod'), nest = byId('enemy', 'gillNest');
    let clouds = 0, bursts = 0;
    for (const r of s.rounds) {
      for (const side of SIDES) {
        const st = r.stats[side];
        expect(st.damageByBuilding).toEqual(r.damageByBuilding[side]);
        expect(Object.values(st.damageByBuilding).reduce((n, d) => n + d, 0)).toBe(st.damageDealt);
      }
      const p = r.stats.player, e = r.stats.enemy;
      // the Mortar's damage is its shells' and its clouds' (§5.3)
      expect(p.damageByBuilding[mortar] ?? 0).toBe((p.damageBySource.puffballMortar ?? 0) + (p.damageBySource.sporeCloud ?? 0));
      // the Bursters' is their bursts' and the clouds they leave
      expect(e.damageByBuilding[pod] ?? 0).toBe((e.damageBySource.burster ?? 0) + (e.damageBySource.sporeCloud ?? 0));
      clouds += p.damageBySource.sporeCloud ?? 0;
      bursts += e.damageBySource.burster ?? 0;
      // by tag: the Sporelings are swarm, the Gill Archers ranged and the Bursters burst; a tower and the Capguards have none
      const swarm = (p.damageByBuilding[burrowA!] ?? 0) + (p.damageByBuilding[burrowB!] ?? 0);
      const burst = e.damageByBuilding[pod] ?? 0, ranged = e.damageByBuilding[nest] ?? 0;
      expect(p.damageByTag).toEqual(swarm ? { swarm } : {});
      expect(e.damageByTag).toEqual({ ...(burst ? { burst } : {}), ...(ranged ? { ranged } : {}) });
    }
    expect([clouds > 0, bursts > 0]).toEqual([true, true]);
  });

  it('records each lane’s result, length and survivors, and the Heartcap damage dealt and taken, after the cap and the storm', () => {
    const { s } = three();
    const { roundLog } = summarize(s);
    s.rounds.forEach((r, i) => {
      expect(roundLog[i]).toEqual({
        round: i + 1, storm: 1, taken: { player: r.damage.enemy, enemy: r.damage.player },
        lanes: r.lanes.map((l) => ({ winner: l.winner, ticks: l.ticks, capped: l.capped, survivors: l.survivors })),
      });
      for (const side of SIDES) {
        expect(r.stats[side].heartcapDamageDealt).toBe(r.damage[side]);
        expect(r.stats[side].heartcapDamageTaken).toBe(r.damage[side === 'player' ? 'enemy' : 'player']);
      }
    });
    // Capguards against Tenders, which never attack: 25 × 6 at round 7's ×1.6 (§6.4), §6.7's first value, under the cap
    const storm = battle({ player: { colony: [on('capguardHall', at(0, 0, 2), false)] }, enemy: { colony: [on('tendersRing', at(0, 0, 2), false)] } }, 7);
    storm.rules.heartcapDamagePerSupply = 25;
    finishRound(storm);
    expect([storm.rounds.at(-1)!.stats.player.heartcapDamageDealt, storm.rounds.at(-1)!.stats.enemy.heartcapDamageTaken]).toEqual([240, 240]);
    // a lane dealing 1000 against a cap of 500 (§6.7, X5)
    const capped = fromScenario('round-damage-cap');
    finishRound(capped);
    expect([capped.rounds.at(-1)!.stats.player.heartcapDamageDealt, capped.stats.player.heartcapDamageDealt, capped.stats.enemy.heartcapDamageTaken]).toEqual([500, 500, 500]);
  });

  it('records gold by source, which sums to what each opening paid', () => {
    const { s, rounds } = three();
    rounds.forEach((r, i) => {
      for (const side of SIDES) {
        const g = s.rounds[i]!.stats[side].goldEarned;
        expect(g.stipend + g.economy + g.interest + g.comeback + g.pending, `${side} round ${i + 1}`).toBe(paidAt(r.opening, side));
      }
    });
    // round 1 pays nothing, and round 2 pays the Cellar's 75 on loam
    expect([s.rounds[0]!.stats.player.goldEarned, s.rounds[1]!.stats.player.goldEarned.economy]).toEqual([
      { stipend: 0, economy: 0, interest: 0, comeback: 0, pending: 0, effects: 0 }, 75,
    ]);
  });

  it('counts buildings planted and sold, the sales after fielding apart, and the economy buildings planted (M6-Q1)', () => {
    const { s } = three();
    const r2 = s.rounds[1]!.stats.player;
    expect([r2.buildingsPlanted, r2.buildingsSold, r2.soldAfterFielding, r2.economyPlanted]).toEqual([2, 2, 1, 1]);
    expect([s.stats.player.buildingsPlanted, s.stats.player.buildingsSold, s.stats.player.soldAfterFielding, s.stats.player.economyPlanted]).toEqual([2, 2, 1, 1]);
    expect(s.rounds[0]!.stats.player.buildingsPlanted).toBe(0);
  });

  it('keeps the most Elders alive at once and the gold banked at Begin, per round and at most in the battle', () => {
    const { s, rounds } = three();
    rounds.forEach((r, i) => {
      for (const side of SIDES) {
        expect(s.rounds[i]!.stats[side].maxEldersAlive).toBe(r.elders[side]);
      }
    });
    expect(s.stats.player.maxEldersAlive).toBe(Math.max(...rounds.map((r) => r.elders.player)));
    const banked = s.rounds.map((r) => r.stats.player.maxGoldBanked);
    // round 1 banks the starting 300, since its colony came free with the scenario
    expect(banked[0]).toBe(300);
    expect(s.stats.player.maxGoldBanked).toBe(Math.max(...banked));
  });

  it("keeps a side's power use per round (§6.6)", () => {
    const s = createBattle(content, makeRoundConfig(content, { seed: 1, enemy: 'human', commander: 'vesper' }));
    finishRound(s);
    step(s);
    s.stats.player.powerUses! += 1; // S16 fires the power; here a use is counted by hand
    finishRound(s);
    expect([s.rounds.map((r) => r.stats.player.powerUses), s.stats.player.powerUses, s.rounds[0]!.stats.enemy.powerUses]).toEqual([[0, 1], 1, undefined]);
  });
});

describe("M6-Q1's feat stats (§5.7, A175)", () => {
  it('keeps the most economy buildings on loam plots at once, as each Begin fields the colony', () => {
    // Twin Roots gives the player two loam plots (§11.9)
    const s = battle({ player: { gold: 600 }, enemy: {} }, 1, 'twin-roots');
    plant(s, 'player', 'truffleCellar', at(1, 1, 1));
    plant(s, 'player', 'truffleCellar', at(1, 1, 3));
    // planted and sold before Begin on soil, so it never stood
    plant(s, 'player', 'truffleCellar', at(1, 1, 2));
    sell(s, 'player', s.buildings.at(-1)!.id);
    finishRound(s);
    step(s);
    sell(s, 'player', s.buildings[0]!.id);
    finishRound(s);
    expect([s.rounds.map((r) => r.stats.player.maxEconomyOnLoam), s.stats.player.maxEconomyOnLoam, s.stats.player.economyPlanted]).toEqual([[2, 1], 2, 3]);
  });

  it("keeps each Heartcap's lowest HP fraction in basis points, and the damage by unit tag in the round a Heartcap fell", () => {
    const { s } = three();
    for (const side of SIDES) {
      const fraction = (r: (typeof s.rounds)[number]) => Math.floor((r.heartcaps[side] * 10000) / s.sides[side].heartcapMaxHp);
      expect(s.rounds.map((r) => r.stats[side].lowestHeartcapBp)).toEqual(s.rounds.map(fraction));
      expect(s.stats[side].lowestHeartcapBp).toBe(Math.min(...s.rounds.map(fraction)));
      expect(s.stats[side].routRoundDamageByTag).toEqual({});
    }
    // Sporelings rout the general from 100 HP in round 3, against Tenders that never attack
    const rout = battle({ player: { colony: [on('sporelingBurrow', at(0, 0, 2), false)] }, enemy: { heartcapHp: 100, colony: [on('tendersRing', at(0, 0, 2), false)] } }, 3);
    finishRound(rout);
    const last = rout.rounds.at(-1)!;
    expect([rout.outcome?.by, last.stats.player.damageByTag.swarm! > 0, last.stats.enemy.lowestHeartcapBp]).toEqual(['rout', true, 0]);
    expect([rout.stats.player.routRoundDamageByTag, rout.stats.enemy.routRoundDamageByTag]).toEqual([last.stats.player.damageByTag, last.stats.enemy.damageByTag]);
  });
});

describe('summarize (§5.7, §14.4, §15.2)', () => {
  it('gives the round, the phase, both Heartcaps, dealt, the round log, gold, plots planted of owned, and the stats', () => {
    const { s } = three();
    const sum = summarize(s);
    expect(sum).toMatchObject({
      seed: s.config.seed, map: 'bogwater-hollow', round: 3, phase: 'aftermath', tick: s.tick, winner: null, by: null,
      heartcap: { player: s.sides.player.heartcapHp, enemy: s.sides.enemy.heartcapHp }, heartcapMax: { player: 3000, enemy: 2000 },
      gold: { player: s.sides.player.gold, enemy: s.sides.enemy.gold },
      plots: { player: { planted: 4, owned: 8 }, enemy: { planted: 3, owned: 8 } },
      rejectedCommands: 0,
    });
    expect(sum.dealt).toEqual({ player: s.rounds.reduce((n, r) => n + r.damage.player, 0), enemy: s.rounds.reduce((n, r) => n + r.damage.enemy, 0) });
    expect(sum.roundLog.map((r) => r.round)).toEqual([1, 2, 3]);
    for (const side of SIDES) expect(sum.stats[side]).toEqual({ ...s.stats[side], rounds: s.rounds.map((r) => r.stats[side]) });
  });

  it('is plain data, with ids and numbers and no display text (R2-Q8), and leaves the state as it was', () => {
    const { s } = three();
    const before = JSON.stringify(s);
    const sum = summarize(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(JSON.parse(JSON.stringify(sum))).toEqual(sum);
    expect(JSON.stringify(sum)).not.toMatch(/Sporeling Burrow|Truffle Cellar|Puffball Mortar|Gill Nest|Burster Pod/);
    // a stump plot takes no building, so it isn't counted among the owned plots (Twin Roots, §11.9)
    expect(summarize(battle({ player: {}, enemy: {} }, 1, 'twin-roots')).plots).toEqual({ player: { planted: 0, owned: 11 }, enemy: { planted: 0, owned: 11 } });
  });

  it("adds up the report's gold rows: by source to each round's, the rounds to the battle's, and the battle's to the gold held", () => {
    const { s, ledger } = three();
    const { stats } = summarize(s);
    for (const side of SIDES) {
      const rows = (g: RoundStats['goldEarned']) => g.stipend + g.economy + g.interest + g.comeback + g.pending + g.effects;
      const earned = rows(stats[side].goldEarned);
      expect(stats[side].rounds.reduce((n, r) => n + rows(r.goldEarned), 0)).toBe(earned);
      const { spent, refunded } = side === 'player' ? ledger : { spent: 0, refunded: 0 };
      expect(s.config[side].startingGold + earned - spent + refunded, side).toBe(s.sides[side].gold);
      for (const v of Object.values(stats[side].goldEarned)) expect(Number.isInteger(v)).toBe(true);
    }
  });
});
