// The rule scenarios in data/scenarios/rounds/ (SPEC §15.7 Rule scenarios, §16 R2 step 4, §6.7's E1–E8):
// each plays its round's clash to its end and is asserted exactly: each lane's winner and margin, what each
// lane dealt, each Heartcap's damage and HP, who gets the comeback gold (the round's loser) and the battle's
// outcome. Each also has its own rule below, with the clash-form copies of v1's merge scenarios and R4a's
// lineups (§5.6). Ticks are asserted where a rule fixes them: the first tick, or the cap at 900.
import { describe, expect, it } from 'vitest';
import { other, SIDES, step } from '../../../src/sim/rounds/index.ts';
import type { BattleState, Side, SimEvent } from '../../../src/sim/rounds/index.ts';
import { roundOutcome } from '../../../src/sim/rounds/systems/victory.ts';
import { begin, content, finishRound, fromScenario } from '../../roundHelpers.ts';

interface LaneExpected { winner: Side | null; margin: number; damage: number; capped?: boolean; ticks?: number }
interface RoundExpected {
  lanes: LaneExpected[];
  /** What each side dealt, capped (`RoundResult.damage`), and each Heartcap's HP after it. */
  damage: Record<Side, number>;
  heartcaps: Record<Side, number>;
  /** The round's loser, who gets the comeback gold (§6.2), or null after a drawn round. */
  comeback: Side | null;
  stormBp?: number;
  outcome?: BattleState['outcome'];
}

const sides = (player: number, enemy: number): Record<Side, number> => ({ player, enemy });
const FULL = sides(3000, 2000);

const EXPECTED: Record<string, RoundExpected> = {
  'formation-from-plots': { lanes: [{ winner: 'enemy', margin: 14, damage: 350, capped: false, ticks: 1 }], damage: sides(0, 350), heartcaps: sides(2650, 2000), comeback: 'player' },
  'clash-cap': { lanes: [{ winner: 'player', margin: 3, damage: 75, capped: true, ticks: 900 }], damage: sides(75, 0), heartcaps: sides(3000, 1925), comeback: 'enemy' },
  'round-damage-cap': { lanes: [{ winner: 'player', margin: 40, damage: 1000, capped: false }], damage: sides(500, 0), heartcaps: sides(3000, 1500), comeback: 'enemy' },
  'decision-round-9': {
    lanes: [{ winner: 'enemy', margin: 6, damage: 300, capped: false, ticks: 1 }], damage: sides(0, 300), heartcaps: sides(1200, 600), comeback: 'player',
    stormBp: 20000, outcome: { winner: 'player', by: 'decision', round: 9 },
  },
  'lane-empty-one-side': { lanes: [{ winner: 'player', margin: 18, damage: 450, capped: false, ticks: 1 }], damage: sides(450, 0), heartcaps: sides(3000, 1550), comeback: 'enemy' },
  'lane-empty-both': {
    lanes: [{ winner: 'player', margin: 6, damage: 150, capped: false }, { winner: null, margin: 0, damage: 0, capped: false, ticks: 1 }],
    damage: sides(150, 0), heartcaps: sides(3000, 1850), comeback: 'enemy',
  },
  'cap-tie': { lanes: [{ winner: null, margin: 0, damage: 0, capped: true, ticks: 900 }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'double-wipe': { lanes: [{ winner: null, margin: 0, damage: 0, capped: false }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'emplacements-only-draw': { lanes: [{ winner: null, margin: 0, damage: 0, capped: true, ticks: 900 }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'emplacement-only-win': { lanes: [{ winner: 'player', margin: 0, damage: 0, capped: false, ticks: 1 }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'split-lanes': {
    lanes: [{ winner: 'player', margin: 26, damage: 650, capped: false, ticks: 1 }, { winner: 'enemy', margin: 6, damage: 150, capped: false, ticks: 1 }],
    damage: sides(500, 150), heartcaps: sides(2850, 1500), comeback: 'enemy',
  },
  'both-heartcaps-zero': {
    lanes: [{ winner: 'player', margin: 18, damage: 630, ticks: 1 }, { winner: 'enemy', margin: 6, damage: 210, ticks: 1 }],
    damage: sides(500, 210), heartcaps: sides(0, 0), comeback: 'enemy', stormBp: 14000, outcome: { winner: 'enemy', by: 'rout', round: 6 },
  },
  'comeback-r4': { lanes: [{ winner: 'enemy', margin: 6, damage: 150 }], damage: sides(0, 150), heartcaps: sides(2150, 3000), comeback: 'player' },
  'merge-trio': { lanes: [{ winner: 'player', margin: 4, damage: 100 }], damage: sides(100, 0), heartcaps: sides(3000, 1900), comeback: 'enemy' },
  'knit-cancel': { lanes: [{ winner: 'player', margin: 6, damage: 150 }], damage: sides(150, 0), heartcaps: sides(3000, 1850), comeback: 'enemy' },
  'elder-ladder': { lanes: [{ winner: 'player', margin: 8, damage: 200 }], damage: sides(200, 0), heartcaps: sides(3000, 1800), comeback: 'enemy' },
  'merge-under-fire': { lanes: [{ winner: 'enemy', margin: 5, damage: 125 }], damage: sides(0, 125), heartcaps: sides(2875, 2000), comeback: 'player' },
  'unit-lineup': { lanes: [{ winner: 'player', margin: 54, damage: 1350, capped: true, ticks: 900 }], damage: sides(500, 0), heartcaps: sides(3000, 1500), comeback: 'enemy' },
  'unit-lineup-twin': {
    lanes: [{ winner: 'player', margin: 41, damage: 1025 }, { winner: 'player', margin: 24, damage: 600 }], damage: sides(500, 0), heartcaps: sides(3000, 1500), comeback: 'enemy',
  },
};

/** Plays a scenario's clash to its end, recording each event with the tick it came on. */
function played(id: string): { s: BattleState; ticks: (t: SimEvent['t']) => number[] } {
  const s = fromScenario(id);
  const log: [number, SimEvent['t']][] = [];
  if (s.phase === 'planning') begin(s);
  while (s.phase === 'clash') {
    step(s);
    for (const e of s.events) log.push([s.tick, e.t]);
  }
  return { s, ticks: (t) => log.filter(([, kind]) => kind === t).map(([tick]) => tick) };
}

describe('rule scenarios, asserted exactly (§6.7, §15.7, §16 R2 step 4)', () => {
  it('has a case for every scenario in data/scenarios/rounds/', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.keys(content.roundScenarios).sort());
  });

  for (const [id, want] of Object.entries(EXPECTED)) {
    it(`${id}: each lane's winner and margin, the damage, the comeback gold and the outcome`, () => {
      const s = fromScenario(id);
      const events = finishRound(s);
      const r = s.rounds.at(-1)!;
      expect(s.phase).toBe('aftermath');
      expect(r.lanes.map((got, i) => {
        const w = want.lanes[i];
        return {
          winner: got.winner, margin: s.clash!.lanes[i]!.margin, damage: got.damage,
          ...(w && 'capped' in w ? { capped: got.capped } : {}), ...(w && 'ticks' in w ? { ticks: got.ticks } : {}),
        };
      })).toEqual(want.lanes);
      expect([r.damage, r.heartcaps, r.stormBp]).toEqual([want.damage, want.heartcaps, want.stormBp ?? 10000]);
      expect([SIDES.map((side) => s.sides[side].heartcapHp), roundOutcome(r.damage).loser, s.outcome]).toEqual([
        SIDES.map((side) => want.heartcaps[side]), want.comeback, want.outcome,
      ]);
      // each Heartcap that took damage, and whether the cap cut its sum over the lanes it lost
      const lost = (side: Side) => r.lanes.reduce((n, l) => n + (l.winner === other(side) ? l.damage : 0), 0);
      const cut = (side: Side) => lost(side) > r.damage[other(side)];
      expect(events.filter((e) => e.t === 'heartcapDamaged')).toEqual(SIDES.filter((side) => r.damage[other(side)] > 0).map((side) => (
        { t: 'heartcapDamaged', side, amount: r.damage[other(side)], stormBp: r.stormBp, capped: cut(side) })));
      expect(r.capped).toBe(SIDES.some(cut));
    });
  }
});

describe('each scenario’s own rule', () => {
  it('formation-from-plots: a Capguard Hall in front of a Gill Archer Nest fields its Capguards in rank 0, ahead of the archers', () => {
    const s = fromScenario('formation-from-plots');
    begin(s);
    expect(s.squads.map((q) => [q.side, q.unitId, q.rank])).toEqual([['enemy', 'capguard', 0], ['enemy', 'gillArcher', 1]]);
    // ahead is nearer the field's middle, for either side
    const fromMiddle = (unitId: string) => s.units.filter((u) => u.unitId === unitId).map((u) => Math.abs(u.x - s.map.width / 2));
    expect(fromMiddle('capguard')).toHaveLength(3);
    expect(Math.max(...fromMiddle('capguard'))).toBeLessThan(Math.min(...fromMiddle('gillArcher')));
  });

  it('clash-cap: at 45 s more surviving supply wins the lane, and the damage is the difference × 25', () => {
    const s = fromScenario('clash-cap');
    finishRound(s);
    const lock = s.clash!.lanes[0]!;
    expect(lock).toMatchObject({ capped: true, endTick: s.clash!.startTick + 900, survivors: { player: 6, enemy: 3 } });
    expect(s.rounds[0]!.damage.player).toBe((lock.survivors.player - lock.survivors.enemy) * 25);
  });

  it('round-damage-cap: an overwhelming win deals exactly the cap, 25% of the general’s max HP', () => {
    const s = fromScenario('round-damage-cap');
    finishRound(s);
    expect(s.rounds[0]!.lanes[0]!.damage).toBeGreaterThan(500);
    expect(s.rounds[0]).toMatchObject({ capped: true, damage: { player: Math.floor((s.sides.enemy.heartcapMaxHp * 2500) / 10000) } });
  });

  it('decision-round-9: the larger share of max HP dealt wins after round 9, where damage dealt would not (X5)', () => {
    const byDamage = fromScenario('decision-round-9');
    byDamage.rules.decisionBy = 'damage';
    finishRound(byDamage);
    expect(byDamage.outcome).toEqual({ winner: 'enemy', by: 'decision', round: 9 });
    const s = fromScenario('decision-round-9');
    finishRound(s);
    step(s);
    expect([s.phase, s.events]).toEqual(['ended', [{ t: 'battleEnded', winner: 'player', by: 'decision', round: 9 }]]);
  });

  it('both-heartcaps-zero: both Heartcaps at 0 in one round is a Rout for the general, though you won the round (E8)', () => {
    const s = fromScenario('both-heartcaps-zero');
    finishRound(s);
    expect([roundOutcome(s.rounds.at(-1)!.damage).winner, s.outcome?.winner]).toEqual(['player', 'enemy']);
  });

  it('comeback-r4: round 4 opens with equal colonies, gold and max HP, your Heartcap 700 below full, after three lost rounds (G6)', () => {
    const s = fromScenario('comeback-r4');
    const colony = (side: Side) => s.buildings.filter((b) => b.side === side).map((b) => {
      const p = s.sides[side].plots[b.plot]!;
      return [b.buildingId, p.lane, p.rank, p.file];
    });
    expect(colony('player')).toEqual(colony('enemy'));
    expect([s.round, s.sides.player.gold, s.sides.player.heartcapMaxHp]).toEqual([4, s.sides.enemy.gold, s.sides.enemy.heartcapMaxHp]);
    expect(s.sides.enemy.heartcapHp - s.sides.player.heartcapHp).toBe(700);
    expect(s.rounds.map((r) => roundOutcome(r.damage).loser)).toEqual(['player', 'player', 'player']);
    // the record of rounds 1–3 is what this colony musters now
    begin(s);
    for (const r of s.rounds) expect(r.fielded).toEqual(s.clash!.fielded);
  });
});

describe('v1’s merge scenarios and R4a’s lineups in clash form (§5.6, §15.7)', () => {
  it('merge-trio: three Capguards knit at tick 10, in the muster, and bloom at tick 30', () => {
    const { s, ticks } = played('merge-trio');
    expect([ticks('knitStart'), ticks('merged'), s.stats.player.merges]).toEqual([[10], [30], { '2': 1, '3': 0 }]);
  });

  it('knit-cancel: the archer’s first dart, after the muster, lands mid-knit and cancels it, and no merge follows', () => {
    const { s, ticks } = played('knit-cancel');
    const [cancel] = ticks('knitCancel');
    expect(ticks('knitStart')).toEqual([10]);
    expect(cancel).toBeGreaterThan(s.rules.musterTicks);
    expect(cancel).toBeLessThan(10 + s.compiled.player.knitTicks);
    expect(ticks('merged')).toEqual([]);
  });

  it('elder-ladder: three trios bloom at tick 30, and their three Bloomed knit at once into an Elder at tick 50', () => {
    const { s, ticks } = played('elder-ladder');
    expect([ticks('knitStart'), ticks('merged'), s.stats.player.merges]).toEqual([[10, 10, 10, 30], [30, 30, 30, 50], { '2': 3, '3': 1 }]);
  });

  it('merge-under-fire: Capguards in combat every second never knit, through tick 200 and to the clash’s end', () => {
    const { s, ticks } = played('merge-under-fire');
    expect(s.tick).toBeGreaterThan(200);
    expect([ticks('knitStart'), s.stats.player.merges]).toEqual([[], { '2': 0, '3': 0 }]);
  });

  it('unit-lineup and unit-lineup-twin field every unit at tiers 1–3 on both sides, one per tier, so nothing merges', () => {
    for (const id of ['unit-lineup', 'unit-lineup-twin']) {
      const kinds = (s: BattleState, side: Side) => new Set(s.units.filter((u) => u.side === side).map((u) => `${u.unitId}:${u.tier}`)).size;
      const s = fromScenario(id);
      expect([s.units.length, kinds(s, 'player'), kinds(s, 'enemy')]).toEqual([60, 30, 30]);
      expect(played(id).ticks('knitStart')).toEqual([]);
    }
  });
});
