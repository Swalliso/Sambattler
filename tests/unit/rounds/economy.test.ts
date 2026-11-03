// The economy in rounds (SPEC §6.2, §14.6 opening step 2): income lands at each round's opening from round
// 2, on the gold each side banked at the last Begin, and `incomePreview` shows what the next opening pays.
import { describe, expect, it } from 'vitest';
import type { Content } from '../../../src/data/registry.ts';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { createBattle, createFromScenario, incomePreview, makeRoundConfig, SIDES, step } from '../../../src/sim/rounds/index.ts';
import type { BattleState, Side } from '../../../src/sim/rounds/index.ts';
import { begin, content, finishRound, plant } from '../../roundHelpers.ts';
import type { PlotPlace } from '../../roundHelpers.ts';

type Sides = RoundScenarioDef['sides'];
type Planted = NonNullable<Sides['player']['colony']>[number];

/** Bogwater Hollow's one loam plot on the player's side, and a soil plot on either side (§11.9). */
const LOAM: PlotPlace = { lane: 0, rank: 1, file: 2 }, SOIL: PlotPlace = { lane: 0, rank: 1, file: 1 };
const on = (building: string, at: PlotPlace): Planted => ({ building, ...at });

/** Content whose `balance.rounds` has these values. */
const withRounds = (over: Partial<Content['balance']['rounds']>): Content => ({
  ...content, balance: { ...content.balance, rounds: { ...content.balance.rounds, ...over } },
});

/** A battle on Bogwater Hollow from a round scenario: its round's opening has paid that round's income. */
function opened(sides: Partial<Sides>, over: Partial<RoundScenarioDef> = {}, from: Content = content): BattleState {
  return createFromScenario(from, {
    id: 'economy', description: 'An economy test.', map: 'bogwater-hollow', round: 2,
    sides: { player: sides.player ?? {}, enemy: sides.enemy ?? {} }, ...over,
  });
}

/** What the last opening paid each side: its `income` event (every source but interest) and its `interest` event. */
function paid(s: BattleState): Record<Side, { income: number; interest: number }> {
  const out = { player: { income: 0, interest: 0 }, enemy: { income: 0, interest: 0 } };
  for (const e of s.events) if (e.t === 'income' || e.t === 'interest') out[e.side][e.t] += e.amount;
  return out;
}

describe("income at a round's opening (§4.7 step 5, §6.2, §14.6 opening step 2)", () => {
  it('pays nothing in round 1, where starting gold takes its place, and a stipend of 100 from round 2', () => {
    const first = createBattle(content, makeRoundConfig(content, { seed: 1, enemy: 'human' }));
    expect([first.sides.player.gold, first.sides.enemy.gold, first.events.filter((e) => e.t === 'income' || e.t === 'interest')]).toEqual([300, 300, []]);
    const s = opened({ player: { gold: 0 }, enemy: { gold: 0 } });
    expect(paid(s)).toEqual({ player: { income: 100, interest: 0 }, enemy: { income: 100, interest: 0 } });
    expect([s.sides.player.gold, s.sides.enemy.gold]).toEqual([100, 100]);
    expect(s.stats.player.goldEarned).toEqual({ stipend: 100, economy: 0, interest: 0, comeback: 0, pending: 0, effects: 0 });
  });

  it('pays each economy building its gold a round, × 1.5 on a loam plot rounded down', () => {
    const s = opened({ player: { gold: 0, colony: [on('truffleCellar', SOIL), on('truffleCellar', LOAM)] } });
    const [soil, loam] = s.buildings;
    expect(paid(s).player).toEqual({ income: 100 + 50 + 75, interest: 0 });
    expect(s.stats.player.goldEarned).toMatchObject({ stipend: 100, economy: 125 });
    expect(s.stats.player.goldByBuilding).toEqual({ [soil!.id]: 50, [loam!.id]: 75 });
    // a Spore Exchange pays 12, and floor(12 × 1.5) = 18 on loam
    expect(paid(opened({ player: { gold: 0, colony: [on('sporeExchange', LOAM)] } })).player.income).toBe(100 + 18);
  });

  it('raises the interest cap by 10 for each Spore Exchange standing', () => {
    const without = opened({ player: { gold: 400 } });
    const exchange = opened({ player: { gold: 400, colony: [on('sporeExchange', SOIL)] } });
    expect([paid(without).player, paid(exchange).player]).toEqual([{ income: 100, interest: 30 }, { income: 112, interest: 40 }]);
  });

  it.each([
    // SPEC's first guess, then R2-Q2's values (2026-11-02), which are the data's
    [20, 10, 140, 7], [20, 10, 1000, 10], [10, 30, 140, 14], [10, 30, 149, 14], [10, 30, 300, 30], [10, 30, 1000, 30],
  ])('pays interest of min(cap, floor(banked / interestPer)): at %i per and a cap of %i, %i banked pays %i', (interestPer, interestCap, banked, want) => {
    const s = opened({ player: { gold: banked } }, {}, withRounds({ interestPer, interestCap }));
    expect(paid(s).player.interest).toBe(want);
    expect(s.stats.player.goldEarned.interest).toBe(want);
  });

  it('pays interest on the gold each side banked at Begin', () => {
    const s = createBattle(content, makeRoundConfig(content, { seed: 1, enemy: 'human' }));
    plant(s, 'player', 'sporelingBurrow', SOIL);
    begin(s);
    expect([s.sides.player.bankedAtBegin, s.sides.enemy.bankedAtBegin]).toEqual([190, 300]);
    finishRound(s);
    step(s);
    expect([s.round, paid(s).player.interest, paid(s).enemy.interest]).toEqual([2, 19, 30]);
  });

  it("pays +40 to the last round's loser, and nothing after a drawn round", () => {
    const lost = opened({ player: { heartcapHp: 2900 } }, { last: { damage: { player: 0, enemy: 100 } } });
    expect(paid(lost)).toEqual({ player: { income: 140, interest: 30 }, enemy: { income: 100, interest: 30 } });
    expect([lost.stats.player.goldEarned.comeback, lost.stats.enemy.goldEarned.comeback]).toEqual([40, 0]);
    const drawn = opened({ player: { heartcapHp: 2900 }, enemy: { heartcapHp: 1900 } }, { last: { damage: { player: 100, enemy: 100 } } });
    expect(paid(drawn)).toEqual({ player: { income: 100, interest: 30 }, enemy: { income: 100, interest: 30 } });
  });

  it('pays pending gold once, with the next round’s income, then zeroes it (plan Call 25)', () => {
    const s = createBattle(content, makeRoundConfig(content, { seed: 1, enemy: 'human' }));
    s.sides.player.pendingGold = 25; // nothing pays into it in R2a; R2b's Rhizome Tithe does (R2-Q20)
    finishRound(s);
    step(s);
    expect([s.round, paid(s).player.income, s.sides.player.pendingGold, s.stats.player.goldEarned.pending]).toEqual([2, 125, 0, 25]);
    finishRound(s);
    step(s);
    expect([s.round, paid(s).player.income, s.stats.player.goldEarned.pending]).toEqual([3, 100, 25]);
  });

  it("multiplies the general's income by enemyIncomeMult, source by source, rounded down (§6.2, §7.1)", () => {
    const s = opened(
      { enemy: { gold: 140, heartcapHp: 1900, colony: [on('truffleCellar', SOIL)] } },
      { last: { damage: { player: 100, enemy: 0 } } },
      withRounds({ enemyIncomeMult: 1.5 }),
    );
    expect(paid(s)).toEqual({ player: { income: 100, interest: 30 }, enemy: { income: 150 + 75 + 60, interest: 21 } });
    expect(s.stats.enemy.goldEarned).toEqual({ stipend: 150, economy: 75, interest: 21, comeback: 60, pending: 0, effects: 0 });
  });
});

describe('incomePreview (§6.2, §10.2, §14.6)', () => {
  it("equals the next round's income: what its opening pays if planning ended now", () => {
    const s = createBattle(content, makeRoundConfig(content, { seed: 1, enemy: 'human' }));
    plant(s, 'player', 'truffleCellar', LOAM);
    // 150 held pays 15; nobody fields an army, so the round is drawn
    const next = { stipend: 100, economy: 75, interest: 15, comeback: 0, pending: 0, total: 190 };
    expect(incomePreview(s, 'player')).toEqual(next);
    finishRound(s);
    expect(incomePreview(s, 'player')).toEqual(next);
    step(s);
    expect([paid(s).player, s.sides.player.gold]).toEqual([{ income: 175, interest: 15 }, 150 + 190]);
  });

  it("counts the comeback once the round is scored, since its loser isn't known before", () => {
    const s = createFromScenario(content, {
      id: 'preview', description: 'A Cellar against a Sporeling Burrow.', map: 'bogwater-hollow',
      sides: { player: { colony: [on('truffleCellar', SOIL)] }, enemy: { colony: [on('sporelingBurrow', { lane: 0, rank: 0, file: 2 })] } },
    });
    expect(incomePreview(s, 'player')).toMatchObject({ comeback: 0, total: 100 + 50 + 30 });
    finishRound(s);
    expect(incomePreview(s, 'player')).toMatchObject({ comeback: 40, total: 100 + 50 + 30 + 40 });
    step(s);
    // the general won the round, so it gets its stipend and interest only
    expect(SIDES.map((side) => paid(s)[side].income + paid(s)[side].interest)).toEqual([220, 130]);
  });
});
