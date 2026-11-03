// Scoring a round and the end of a battle in rounds (SPEC §6.4, §6.5, §6.7, §13.3 rule 5, §14.6 clash step
// 13): the pure helpers in §6.7's integer order, `scoreRound` from the lanes' locks, `roundWon`, and the end
// check with the aftermath's step (A035, A209). A lane's lock is S6's; most cases here set the locks by
// hand and score them as the clash's last tick would, and a few play real units to the cap.
import { describe, expect, it } from 'vitest';
import type { EffectBundle, RoundScenarioDef } from '../../../src/data/schema.ts';
import { addBuilding, createBattle, createFromScenario, makeRoundConfig, step } from '../../../src/sim/rounds/index.ts';
import type { BattleModifier, BattleState, LaneLock, Rules, Side } from '../../../src/sim/rounds/index.ts';
import { endClash } from '../../../src/sim/rounds/round.ts';
import { capFor, decisionWinner, laneDamage, roundOutcome, stormBpFor, stormed, takenMods } from '../../../src/sim/rounds/systems/victory.ts';
import { begin, content, finishRound, plotAt } from '../../roundHelpers.ts';

type Sides = RoundScenarioDef['sides'];
type Colony = NonNullable<Sides['player']['colony']>;

/** A building on a plot, merging off unless `merge` is set, so its squad fields as planted. */
const on = (building: string, lane: number, rank: number, file: number, merge = false): Colony[number] => ({ building, lane, rank, file, merge });

/** A lane's lock as the clash writes it (§14.4): scoring reads its winner and margin, and its end tick for the lane's ticks. */
const lock = (winner: Side | null, margin: number, endTick = 1): LaneLock => ({
  ended: true, endTick, winner, capped: false, survivors: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, margin,
});

/** A battle in a clash with no units, in `round` on `map`, whose sides start as `sides` give them (plan Call 18). */
function clashIn(opts: { map?: string; round?: number; sides?: Partial<Sides> } = {}): BattleState {
  const s = createFromScenario(content, {
    id: 'scoring', description: 'A scoring test.', map: opts.map ?? 'bogwater-hollow', ...(opts.round ? { round: opts.round } : {}),
    sides: { player: opts.sides?.player ?? {}, enemy: opts.sides?.enemy ?? {} }, clash: { units: [] },
  });
  s.events.length = 0;
  return at25(s);
}

/**
 * §6.7's rule at its first value, 25 a supply, which these tests' numbers are worked at: they check the rule's steps
 * (the storm, siege counted twice, each cap shape, E8), so a retune of the number (100 since T125) moves the rule
 * scenarios and the goldens, not them.
 */
function at25(s: BattleState): BattleState {
  s.rules.heartcapDamagePerSupply = 25;
  return s;
}

/** Ends the clash with these locks, as the tick its last lane ends does: the round is scored and the end checked. */
function scored(s: BattleState, ...locks: LaneLock[]): BattleState {
  s.clash!.lanes = locks;
  endClash(s);
  return s;
}

/** Round 1's planning on Bogwater Hollow, both sides human, with these battle modifiers. */
function withEffects(modifiers: BattleModifier[] = []): BattleState {
  const config = makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'human' });
  if (modifiers.length) config.modifiers = modifiers;
  return createBattle(content, config);
}

/** Units for a clash, each group in a block on its side, held still to the cap: no move, no attack. */
function heldToCap(groups: [Side, string, number][]): BattleState {
  const s = createFromScenario(content, {
    id: 'held', description: 'Held to the cap.', map: 'bogwater-hollow', sides: { player: {}, enemy: {} },
    clash: { units: groups.map(([side, unit, count]) => ({ side, unit, count, rows: count, x: side === 'player' ? 8 : 24, y: 3 })) },
  });
  for (const side of ['player', 'enemy'] as const) for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  for (const u of s.units) u.cooldown = 1e9;
  finishRound(at25(s));
  return s;
}

describe('the scoring helpers (SPEC §6.7 steps 1–4, §13.3 rule 5)', () => {
  it('scores margin 7 at a storm of 14000 bp as floor(175 × 14000 / 10000) = 245, and 208 with Rot Ward’s 8500', () => {
    expect(laneDamage(7, 25)).toBe(175);
    expect(stormed(175, 14000)).toBe(245);
    expect(takenMods(245, [8500])).toBe(208);
    expect(takenMods(245, [])).toBe(245);
  });

  it('floors each product in turn: the storm, then each damage-taken modifier', () => {
    expect(stormed(3, 12000)).toBe(3);
    // floor(floor(7 × 0.5) × 1.5) = 4, where one product of the two would give 5
    expect(takenMods(7, [5000, 15000])).toBe(4);
  });

  it('caps a Heartcap at a share of its max HP or a flat amount, either scaled by the storm: each roundDamageCap shape (X5, A208)', () => {
    expect(capFor({ maxHpBp: 2500 }, 3000, 14000)).toBe(750);
    expect(capFor({ maxHpBp: 2500 }, 2000, 10000)).toBe(500);
    expect(capFor({ maxHpBp: 2500 }, 3600, 10000)).toBe(900);
    expect(capFor({ maxHpBp: 2500 }, 2250, 10000)).toBe(562);
    expect(capFor({ maxHpBp: 2500, stormScales: true }, 2000, 18000)).toBe(900);
    expect(capFor({ flat: 500 }, 3000, 14000)).toBe(500);
    expect(capFor({ flat: 500, stormScales: true }, 3000, 14000)).toBe(700);
  });

  it('runs the storm from 10000 to 20000 from round 5, or from round 4 with battle.sporestormStart 4 (§6.4)', () => {
    const byRound = (s: BattleState) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => stormBpFor(s.rules.storm, r));
    expect(byRound(withEffects())).toEqual([10000, 10000, 10000, 10000, 12000, 14000, 16000, 18000, 20000]);
    const early = withEffects([{ side: 'both', source: 'test', effects: { modifiers: [{ stat: 'battle.sporestormStart', op: 'set', value: 4 }] } }]);
    expect(byRound(early)).toEqual([10000, 10000, 10000, 12000, 14000, 16000, 18000, 20000, 20000]);
  });

  it('gives the round to the side that dealt more, and the comeback gold to its loser; equal damage, none included, draws it', () => {
    expect(roundOutcome({ player: 300, enemy: 150 })).toEqual({ winner: 'player', loser: 'enemy' });
    expect(roundOutcome({ player: 0, enemy: 1 })).toEqual({ winner: 'enemy', loser: 'player' });
    expect(roundOutcome({ player: 210, enemy: 210 })).toEqual({ winner: null, loser: null });
    expect(roundOutcome({ player: 0, enemy: 0 })).toEqual({ winner: null, loser: null });
  });

  it('decides by decision.by, then the higher HP fraction, then for the general, cross-multiplying every share (§6.5, X5)', () => {
    // you dealt 70% of its 2000 and it 60% of your 3000, though 400 more
    const sides = { player: { dealt: 1400, hp: 1200, maxHp: 3000 }, enemy: { dealt: 1800, hp: 600, maxHp: 2000 } };
    expect(decisionWinner('shareOfMaxHp', sides)).toBe('player');
    expect(decisionWinner('damage', sides)).toBe('enemy');
    // equal shares (50% each) go to the higher HP fraction, and equal fractions to the general
    const even = { player: { dealt: 1000, hp: 1600, maxHp: 3000 }, enemy: { dealt: 1500, hp: 1000, maxHp: 2000 } };
    expect(decisionWinner('shareOfMaxHp', even)).toBe('player');
    expect(decisionWinner('shareOfMaxHp', { ...even, player: { ...even.player, hp: 1500 } })).toBe('enemy');
    expect(decisionWinner('shareOfMaxHp', { ...even, player: { ...even.player, hp: 1400 } })).toBe('enemy');
    expect(decisionWinner('damage', { player: { dealt: 900, hp: 2100, maxHp: 3000 }, enemy: { dealt: 900, hp: 1100, maxHp: 2000 } })).toBe('player');
  });
});

describe('scoreRound (§6.7, §14.4, §14.6 clash step 13)', () => {
  it('deals 25 × the margin to the lane loser’s Heartcap, × the round’s storm, and records the round (A068)', () => {
    const s = scored(clashIn({ round: 7 }), lock('player', 4));
    const r = s.rounds.at(-1)!;
    expect(r).toMatchObject({ round: 7, stormBp: 16000, capped: false, damage: { player: 160, enemy: 0 }, heartcaps: { player: 3000, enemy: 1840 } });
    expect(r.lanes).toEqual([{ winner: 'player', survivors: { player: 0, enemy: 0 }, capped: false, ticks: 1, damage: 160 }]);
    expect(s.events).toEqual([{ t: 'heartcapDamaged', side: 'enemy', amount: 160, stormBp: 16000, capped: false }]);
    expect([s.rounds.length, s.sides.enemy.heartcapHp, s.stats.enemy.heartcapDamageTaken, s.phase]).toEqual([7, 1840, 160, 'aftermath']);
  });

  it('takes the whole damage supply from a wiped loser, and at 45 s counts siege once to decide and twice to deal, never below 0 (#22)', () => {
    const lanes = (s: BattleState) => s.clash!.lanes.map((l, i) => [l.winner, l.capped, l.margin, s.rounds[0]!.lanes[i]!.damage]);
    // a Rootbreaker alone: 3 supply, 6 for damage, on the first tick (E1)
    expect(lanes(heldToCap([['player', 'rootbreaker', 1]]))).toEqual([['player', false, 6, 150]]);
    // at the cap, 2 Rootbreakers (6 supply, 12 for damage) beat 2 Capguards (4) by 12 − 4
    expect(lanes(heldToCap([['player', 'rootbreaker', 2], ['enemy', 'capguard', 2]]))).toEqual([['player', true, 8, 200]]);
    // and 1 Rootbreaker (3, 6 for damage) loses to them on supply, so their margin, max(0, 4 − 6), deals nothing
    const lost = heldToCap([['player', 'rootbreaker', 1], ['enemy', 'capguard', 2]]);
    expect(lanes(lost)).toEqual([['enemy', true, 0, 0]]);
    expect(lost.rounds[0]!.damage).toEqual({ player: 0, enemy: 0 });
  });

  it('caps each Heartcap’s sum over the lanes it lost, not each lane, and each Heartcap on its own (X5, E7)', () => {
    // 500 a lane is under the round's cap of 750 (#68), and their sum isn't
    const s = scored(clashIn({ map: 'twin-roots' }), lock('player', 20), lock('player', 20));
    expect(s.rounds[0]).toMatchObject({ damage: { player: 750, enemy: 0 }, capped: true, heartcaps: { player: 3000, enemy: 1250 } });
    expect(s.rounds[0]!.lanes.map((l) => l.damage)).toEqual([500, 500]);
    expect(s.events).toEqual([{ t: 'heartcapDamaged', side: 'enemy', amount: 750, stormBp: 10000, capped: true }]);
    expect(scored(clashIn({ map: 'twin-roots' }), lock('player', 8), lock('player', 8)).rounds[0]).toMatchObject({ damage: { player: 400, enemy: 0 }, capped: false });
    // each Heartcap caps on its own: yours at 750 of 3000, the general's at 750 of 2000
    const split = scored(clashIn({ map: 'twin-roots' }), lock('player', 40), lock('enemy', 40));
    expect(split.rounds[0]).toMatchObject({ damage: { player: 750, enemy: 750 }, capped: true, heartcaps: { player: 2250, enemy: 1250 } });
    expect(split.events).toEqual([
      { t: 'heartcapDamaged', side: 'player', amount: 750, stormBp: 10000, capped: true },
      { t: 'heartcapDamaged', side: 'enemy', amount: 750, stormBp: 10000, capped: true },
    ]);
  });

  it('reads the cap from each roundDamageCap shape: a share of max HP, or a flat amount, either scaled by the storm', () => {
    const dealt = (cap: Rules['roundDamageCap'], round?: number) => {
      const s = clashIn({ map: 'twin-roots', ...(round ? { round } : {}) });
      s.rules.roundDamageCap = cap;
      return scored(s, lock('player', 12), lock('player', 12)).rounds.at(-1)!.damage.player;
    };
    expect([dealt({ maxHpBp: 2500 }), dealt({ maxHpBp: 2000 }), dealt({ flat: 550 })]).toEqual([500, 400, 550]);
    // in round 6 the lanes deal 420 each after the storm, 840 in all
    expect([dealt({ flat: 400, stormScales: true }, 6), dealt({ maxHpBp: 2500, stormScales: true }, 6), dealt({ flat: 900, stormScales: true }, 6)]).toEqual([560, 700, 840]);
  });

  it('records RoundResult.damage capped and before the HP floor, so a Heartcap left at 100 records the 750 it was dealt (R2-Q11)', () => {
    const s = scored(clashIn({ sides: { enemy: { heartcapHp: 100 } } }), lock('player', 40));
    expect(s.rounds[0]).toMatchObject({ damage: { player: 750, enemy: 0 }, capped: true, heartcaps: { player: 3000, enemy: 0 } });
    expect(s.events[0]).toEqual({ t: 'heartcapDamaged', side: 'enemy', amount: 750, stormBp: 10000, capped: true });
  });

  it('moves the fielded record into the round, with the round’s own damage and survivors by building (A064)', () => {
    // your Capguards wipe the general's Tenders, which never attack, in two rounds running
    const s = createFromScenario(content, {
      id: 'by-building', description: 'Two rounds of Capguards and Tenders.', map: 'bogwater-hollow',
      sides: { player: { colony: [on('capguardHall', 0, 0, 2)] }, enemy: { colony: [on('tendersRing', 0, 0, 2)] } },
    });
    const hall = s.buildings[0]!.id;
    begin(s);
    const fielded = structuredClone(s.clash!.fielded);
    finishRound(s);
    const first = s.rounds[0]!;
    expect(first.fielded).toEqual(fielded);
    expect(first.fielded.enemy).toEqual([{ unitId: 'tender', tier: 1, count: 3, augments: [], lane: 0 }]);
    expect(s.clash!.fielded).toEqual({ player: [], enemy: [] });
    expect(first.damageByBuilding).toEqual({ player: { [hall]: s.stats.player.damageByBuilding[String(hall)] }, enemy: {} });
    expect(first.survivorsByBuilding).toEqual({ player: { [hall]: 3 }, enemy: {} });
    step(s);
    finishRound(s);
    const total = s.stats.player.damageByBuilding[String(hall)]!;
    expect(s.rounds[1]!.damageByBuilding.player).toEqual({ [hall]: total - first.damageByBuilding.player[hall]! });
    expect(s.rounds[1]!.fielded.enemy).toEqual(first.fielded.enemy);
  });

  it('fires roundWon triggers once, for the round’s winner only, and none after a drawn round (T026)', () => {
    const gain = (gainGold: number): EffectBundle => ({ triggers: [{ on: 'roundWon', do: [{ gainGold }] }] });
    const mods: BattleModifier[] = [{ side: 'player', source: 'test', effects: gain(7) }, { side: 'enemy', source: 'test', effects: gain(5) }];
    const won = withEffects(mods);
    addBuilding(won, 'player', 'capguardHall', plotAt(won, 'player', { lane: 0, rank: 0, file: 2 }), 0);
    expect(finishRound(won).filter((e) => e.t === 'effectGold')).toEqual([{ t: 'effectGold', side: 'player', amount: 7 }]);
    expect([won.sides.player.gold, won.sides.enemy.gold]).toEqual([307, 300]);
    const drawn = withEffects(mods);
    expect(finishRound(drawn).filter((e) => e.t === 'effectGold')).toEqual([]);
    expect([drawn.rounds[0]!.damage, drawn.sides.player.gold, drawn.sides.enemy.gold]).toEqual([{ player: 0, enemy: 0 }, 300, 300]);
  });
});

describe('the battle’s end (§4.7 steps 18–19, §6.5, §14.6)', () => {
  it('routs the side whose Heartcap reaches 0, and ends the battle when the round’s aftermath closes', () => {
    const s = scored(clashIn({ round: 3, sides: { enemy: { heartcapHp: 100 } } }), lock('player', 6));
    expect([s.phase, s.outcome]).toEqual(['aftermath', { winner: 'player', by: 'rout', round: 3 }]);
    step(s);
    expect([s.phase, s.events]).toEqual(['ended', [{ t: 'battleEnded', winner: 'player', by: 'rout', round: 3 }]]);
  });

  it('gives the general the battle when both Heartcaps reach 0 in the same round, whoever won it (E8)', () => {
    const s = scored(clashIn({ map: 'twin-roots', round: 4, sides: { player: { heartcapHp: 100 }, enemy: { heartcapHp: 100 } } }),
      lock('player', 20), lock('enemy', 4));
    expect(s.outcome).toEqual({ winner: 'enemy', by: 'rout', round: 4 });
    expect(s.rounds.at(-1)!.damage).toEqual({ player: 500, enemy: 100 });
  });

  it('decides the battle after the last round with both Heartcaps standing, by decision.by, then the HP fraction, then the general (X5)', () => {
    const decide = (sides: Partial<Sides>, by?: Rules['decisionBy']) => {
      const s = clashIn({ round: 9, sides });
      if (by) s.rules.decisionBy = by;
      return scored(s, lock(null, 0)).outcome;
    };
    // you dealt 1400 of the general's 2000, and it 1800 of your 3000
    const behind = { player: { heartcapHp: 1200 }, enemy: { heartcapHp: 600 } };
    expect(decide(behind)).toEqual({ winner: 'player', by: 'decision', round: 9 });
    expect(decide(behind, 'damage')).toEqual({ winner: 'enemy', by: 'decision', round: 9 });
    // equal shares, 50% each: a heal kept yours at 1600, so your fraction is higher; at 1500 they're equal
    expect(decide({ player: { heartcapHp: 1600, dealt: 1000 }, enemy: { heartcapHp: 1000, dealt: 1500 } })?.winner).toBe('player');
    expect(decide({ player: { heartcapHp: 1500 }, enemy: { heartcapHp: 1000 } })?.winner).toBe('enemy');
  });

  it('sets no outcome before the last round while both stand, and the aftermath opens the next round on a cleared field', () => {
    const s = createFromScenario(content, {
      id: 'next-round', description: 'Capguards against Tenders.', map: 'bogwater-hollow', round: 8,
      sides: { player: { colony: [on('capguardHall', 0, 0, 2)] }, enemy: { colony: [on('tendersRing', 0, 0, 2)] } },
    });
    finishRound(at25(s));
    expect([s.phase, s.outcome, s.units.length]).toEqual(['aftermath', undefined, 3]);
    step(s);
    expect([s.phase, s.round, s.clash, s.units, s.squads, s.hits, s.clouds]).toEqual(['planning', 9, undefined, [], [], [], []]);
    // 25 × 6 at round 8's storm, ×1.8
    expect([s.rounds.length, s.sides.enemy.heartcapHp]).toEqual([8, 2000 - 270]);
  });
});
