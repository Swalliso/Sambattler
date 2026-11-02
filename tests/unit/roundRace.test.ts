// The race model for X5 (SPEC §4.5, §6.4, §6.5, §6.7; R1 plan call 17): clash records chained into
// battles of up to 9 rounds, under the 500 cap and its alternatives.
import { describe, expect, it } from 'vitest';
import type { Side } from '../../src/sim/index.ts';
import type { ClashRecord, FieldId } from '../../tools/lib/clash.ts';
import { RACE_RULES, budgetRound, heartcaps, raceBattle, raceBudget, raceReport, stormBp } from '../../tools/lib/roundRace.ts';
import type { RaceRound, RaceRules } from '../../tools/lib/roundRace.ts';

const rules = (id: string): RaceRules => RACE_RULES.find((r) => r.id === id)!;
const FIRST = rules('first guess');
const BUDGETS = [300, 600, 900, 1200, 1500];

/** Nine rounds, each from `f(round)`. */
const nine = (f: (r: number) => RaceRound): RaceRound[] => Array.from({ length: 9 }, (_, i) => f(i + 1));
const none: RaceRound = { player: [], general: [] };

/** The fields `raceReport` reads of a clash record: who played where, and each lane's `cap` winner and raw damage. */
function rec(field: FieldId, budget: number, seed: number, seat: Side, player: string, enemy: string, lanes: [Side | 'draw', number][]): ClashRecord {
  return {
    field, budget, seed, seat,
    armies: { player: { controller: player }, enemy: { controller: enemy } },
    lanes: lanes.map(([winner, raw], lane) => ({ lane, cap: { winner, raw } })),
  } as unknown as ClashRecord;
}

describe('the race: one battle of rounds (SPEC §6.4, §6.5, §6.7)', () => {
  it('a stream of 400-raw wins routs a 2000 Heartcap in round 5 (400 × 4, then 480)', () => {
    const b = raceBattle(nine(() => ({ player: [], general: [400] })), { heartcaps: { player: 3000, general: 2000 }, rules: FIRST });
    expect(b).toMatchObject({ rounds: 5, winner: 'player', by: 'rout', lost: { player: 0, general: 2000 } });
  });

  it('a raw 600 is capped to 500; at round 9 a raw 200 becomes 400 and a raw 300 is capped at 500: the storm applies before the cap', () => {
    expect([1, 4, 5, 6, 7, 8, 9, 10].map(stormBp)).toEqual([10000, 10000, 12000, 14000, 16000, 18000, 20000, 20000]);
    const at = (r: number, raw: number) => {
      const rounds = nine((x) => (x === r ? { player: [], general: [raw] } : none));
      return raceBattle(rounds, { heartcaps: { player: 3000, general: 3000 }, rules: FIRST }).lost.general;
    };
    expect(at(1, 600)).toBe(500);
    expect(at(9, 200)).toBe(400);
    expect(at(9, 300)).toBe(500);
    // per lane, floored, then summed and capped
    const split = raceBattle(nine((x) => (x === 5 ? { player: [], general: [125, 125] } : none)), { heartcaps: { player: 3000, general: 3000 }, rules: FIRST });
    expect(split.lost.general).toBe(300);
  });

  it('both Heartcaps at 0 in one round: the player loses (E8)', () => {
    const b = raceBattle(nine(() => ({ player: [500], general: [500] })), { heartcaps: { player: 500, general: 500 }, rules: FIRST });
    expect(b).toMatchObject({ rounds: 1, winner: 'general', by: 'rout' });
  });

  it("the Decision after round 9: damage dealt, then the HP fraction, then the general; under the alternative, by share of max HP lost", () => {
    // rounds 1–4 only, at storm ×1.0: the player deals 900, the general 1000
    const fight = (p: number, g: number) => nine((r) => (r <= 4 ? { player: [p], general: [g] } : none));
    const hc = { player: 3000, general: 2000 };
    expect(raceBattle(fight(250, 225), { heartcaps: hc, rules: FIRST })).toMatchObject({ rounds: 9, winner: 'general', by: 'decision' });
    // by share: the player lost 1000 / 3000, the general 900 / 2000
    expect(raceBattle(fight(250, 225), { heartcaps: hc, rules: rules('share Decision') })).toMatchObject({ winner: 'player', by: 'decision' });
    // equal damage dealt: the higher HP fraction wins, 2100 / 3000 against 1100 / 2000
    expect(raceBattle(fight(225, 225), { heartcaps: hc, rules: FIRST })).toMatchObject({ winner: 'player', by: 'decision' });
    // equal on both: the general
    expect(raceBattle(fight(225, 225), { heartcaps: { player: 2000, general: 2000 }, rules: FIRST })).toMatchObject({ winner: 'general', by: 'decision' });
    expect(raceBattle(nine(() => none), { heartcaps: hc, rules: rules('share Decision') })).toMatchObject({ winner: 'general', by: 'decision' });
  });

  it('the lead changes when the other side moves ahead on the Decision\'s measure, ties not counted', () => {
    const rounds = nine((r) => (r === 1 ? { player: [], general: [100] } : r === 2 ? { player: [300], general: [] } : r === 3 ? { player: [], general: [200] } : none));
    expect(raceBattle(rounds, { heartcaps: { player: 2000, general: 2000 }, rules: FIRST }).leadChanges).toBe(1);
  });

  it("the alternatives: a cap of 25% of the loser's max HP, the cap × the storm, and equal Heartcaps", () => {
    const cap25 = rules('cap 25%');
    const once = (raw: number, hc: { player: number; general: number }, rr: RaceRules, r = 1) =>
      raceBattle(nine((x) => (x === r ? { player: [raw], general: [raw] } : none)), { heartcaps: hc, rules: rr }).lost;
    expect(once(1000, { player: 3000, general: 2000 }, cap25)).toEqual({ player: 750, general: 500 });
    expect(once(1000, { player: 3000, general: 3600 }, cap25)).toEqual({ player: 750, general: 900 });
    expect(once(600, { player: 3000, general: 3000 }, rules('storm cap'), 9)).toEqual({ player: 1000, general: 1000 });
    expect(once(600, { player: 3000, general: 3000 }, rules('storm cap'), 5)).toEqual({ player: 600, general: 600 });
    // the Heartcaps: 3000 against 2000 + 250 × (i − 1), a Fortified elite at index 3 +30%, the boss 3600
    expect(['1', '2', '3', '4', '5', 'elite', 'boss'].map((k) => heartcaps(k as never, FIRST))).toEqual([
      { player: 3000, general: 2000 }, { player: 3000, general: 2250 }, { player: 3000, general: 2500 }, { player: 3000, general: 2750 },
      { player: 3000, general: 3000 }, { player: 3000, general: 3250 }, { player: 3000, general: 3600 },
    ]);
    const equal = rules('equal');
    expect(['1', '3', '5'].map((k) => heartcaps(k as never, equal))).toEqual([
      { player: 2000, general: 2000 }, { player: 2500, general: 2500 }, { player: 3000, general: 3000 },
    ]);
  });

  it('round r of battle i reads the clash at the measured budget nearest below 300 + 75 × (i − 1) + 150 × (r − 1), at most 1,500', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => raceBudget(1, r, BUDGETS))).toEqual([300, 300, 600, 600, 900, 900, 1200, 1200, 1500]);
    expect([1, 9].map((r) => raceBudget(5, r, BUDGETS))).toEqual([600, 1500]);
    expect(raceBudget(6, 1, BUDGETS)).toBe(600);
    expect(raceBudget(3, 4, BUDGETS)).toBe(900);
    // nothing measured below: the smallest budget
    expect(raceBudget(1, 1, [600, 900])).toBe(600);
    // each budget's round in battle 1, for the storm the cap-binding share reads at
    expect(BUDGETS.map((b) => stormBp(budgetRound(b)))).toEqual([10000, 10000, 12000, 16000, 20000]);
  });
});

describe("the race report: the G4 case first, then G3's (plan call 17, A193)", () => {
  // the G4 pairing: bot:balanced wins every lane at every budget, from the enemy seat on seed 1 and the player's on seed 2
  const g4 = BUDGETS.flatMap((budget) => [
    rec('one', budget, 1, 'enemy', 'general:scripted', 'bot:balanced', [['enemy', 400]]),
    rec('one', budget, 2, 'player', 'bot:balanced', 'general:scripted', [['player', 400]]),
  ]);
  // the mirror: the player seat wins
  const mirror = BUDGETS.map((budget) => rec('one', budget, 1, 'player', 'bot:balanced', 'bot:balanced', [['player', 400]]));
  // G3: the mono in the enemy seat wins every lane, so bot:balanced, in the player seat, is the race's player and loses
  const g3 = BUDGETS.map((budget) => rec('twin', budget, 1, 'enemy', 'bot:balanced', 'bot:mono:gillNest', [['enemy', 300], ['enemy', 300]]));
  const report = raceReport([...g3, ...mirror, ...g4]);

  it('builds the G4 case only from bot:balanced against general:scripted, with bot:balanced the player whichever seat it played', () => {
    expect(report.groups.map((g) => `${g.id} ${g.field} ${g.cases}`)).toEqual(['g4 one 2', 'mirror one 1', 'g3 twin 1']);
    const one = report.groups[0]!.reads.find((x) => x.rules === 'first guess')!.battles['1'];
    expect(one).toMatchObject({ battles: 2, medianRounds: 5, round9: 0, general: { rout: 0, decision: 0 } });
    expect(one.routs.player[4]).toBe(2);
  });

  it('the mirror and G3: the seat as played sets who is the player, and a G3 record never enters the G4 case', () => {
    expect(report.groups[1]!.reads[0]!.battles['1'].routs.player[4]).toBe(1);
    // 600 a round in two lanes, capped at 500: the general routs the player's 3000 in round 6
    const g = report.groups[2]!.reads[0]!.battles['1'];
    expect(g).toMatchObject({ battles: 1, medianRounds: 6, general: { rout: 1, decision: 0 } });
    expect(g.routs.general[5]).toBe(1);
  });

  it("each case gives a battle per index 1–5, the elite and the boss, under every rule set; the section's lines list the G4 case first", () => {
    for (const g of report.groups) {
      expect(g.reads.map((x) => x.rules)).toEqual(RACE_RULES.map((r) => r.id));
      for (const x of g.reads) expect(Object.keys(x.battles)).toEqual(['1', '2', '3', '4', '5', 'elite', 'boss']);
    }
    const heads = report.lines.filter((l) => /^(G4 case|mirror|G3 cases)/.test(l));
    expect(heads.map((l) => l.split(':')[0])).toEqual(['G4 case', 'mirror', 'G3 cases']);
    expect(report.lines[0]).toMatch(/income, comeback gold and counters/);
  });
});
