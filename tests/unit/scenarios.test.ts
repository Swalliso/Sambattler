// The scenarios in data/scenarios/ (SPEC §15.7 Rule scenarios, §16 R2 step 4, §6.7's E1–E8):
// each plays its round's clash to its end and is asserted exactly: each lane's winner and margin, what each
// lane dealt, each Heartcap's damage and HP, who gets the comeback gold (the round's loser) and the battle's
// outcome. Each also has its own rule below, with the clash-form copies of v1's merge scenarios and R4a's
// lineups (§5.6). Ticks are asserted where a rule fixes them: the first tick, or the cap at 900.
import { describe, expect, it } from 'vitest';
import { hashValue } from '../../src/sim/hash.ts';
import { formationOf, mergePreview, other, SIDES, step } from '../../src/sim/index.ts';
import type { BattleState, Side, SimEvent } from '../../src/sim/index.ts';
import { roundOutcome } from '../../src/sim/systems/victory.ts';
import { begin, content, finishRound, fromScenario, plant, sell, toggle } from '../helpers.ts';

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
  'general-plans-first': { lanes: [{ winner: 'player', margin: 10, damage: 1000 }], damage: sides(750, 0), heartcaps: sides(3000, 1250), comeback: 'enemy' },
  'formation-from-plots': { lanes: [{ winner: 'enemy', margin: 14, damage: 1400, capped: false, ticks: 1 }], damage: sides(0, 750), heartcaps: sides(2250, 2000), comeback: 'player' },
  'clash-cap': { lanes: [{ winner: 'player', margin: 3, damage: 300, capped: true, ticks: 900 }], damage: sides(300, 0), heartcaps: sides(3000, 1700), comeback: 'enemy' },
  'round-damage-cap': { lanes: [{ winner: 'player', margin: 40, damage: 4000, capped: false }], damage: sides(750, 0), heartcaps: sides(3000, 1250), comeback: 'enemy' },
  'decision-round-9': {
    lanes: [{ winner: 'enemy', margin: 6, damage: 1200, capped: false, ticks: 1 }], damage: sides(0, 750), heartcaps: sides(1050, 600), comeback: 'player',
    stormBp: 20000, outcome: { winner: 'player', by: 'decision', round: 9 },
  },
  'lane-empty-one-side': { lanes: [{ winner: 'player', margin: 18, damage: 1800, capped: false, ticks: 1 }], damage: sides(750, 0), heartcaps: sides(3000, 1250), comeback: 'enemy' },
  'lane-empty-both': {
    lanes: [{ winner: 'player', margin: 6, damage: 600, capped: false }, { winner: null, margin: 0, damage: 0, capped: false, ticks: 1 }],
    damage: sides(600, 0), heartcaps: sides(3000, 1400), comeback: 'enemy',
  },
  'cap-tie': { lanes: [{ winner: null, margin: 0, damage: 0, capped: true, ticks: 900 }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'double-wipe': { lanes: [{ winner: null, margin: 0, damage: 0, capped: false }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'emplacements-only-draw': { lanes: [{ winner: null, margin: 0, damage: 0, capped: true, ticks: 900 }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'emplacement-only-win': { lanes: [{ winner: 'player', margin: 0, damage: 0, capped: false, ticks: 1 }], damage: sides(0, 0), heartcaps: FULL, comeback: null },
  'split-lanes': {
    lanes: [{ winner: 'player', margin: 26, damage: 2600, capped: false, ticks: 1 }, { winner: 'enemy', margin: 6, damage: 600, capped: false, ticks: 1 }],
    damage: sides(750, 600), heartcaps: sides(2400, 2250), comeback: 'enemy',
  },
  'both-heartcaps-zero': {
    lanes: [{ winner: 'player', margin: 18, damage: 2160, ticks: 1 }, { winner: 'enemy', margin: 6, damage: 720, ticks: 1 }],
    damage: sides(750, 720), heartcaps: sides(0, 0), comeback: 'enemy', stormBp: 12000, outcome: { winner: 'enemy', by: 'rout', round: 5 },
  },
  'comeback-r4': { lanes: [{ winner: null, margin: 0, damage: 0 }], damage: sides(0, 0), heartcaps: sides(1450, 3000), comeback: null },
  'merge-trio': { lanes: [{ winner: 'player', margin: 4, damage: 400 }], damage: sides(400, 0), heartcaps: sides(3000, 1600), comeback: 'enemy' },
  'knit-cancel': { lanes: [{ winner: 'player', margin: 6, damage: 600 }], damage: sides(600, 0), heartcaps: sides(3000, 1400), comeback: 'enemy' },
  'elder-ladder': { lanes: [{ winner: 'player', margin: 8, damage: 800 }], damage: sides(750, 0), heartcaps: sides(3000, 1250), comeback: 'enemy' },
  'merge-under-fire': { lanes: [{ winner: 'enemy', margin: 5, damage: 500 }], damage: sides(0, 500), heartcaps: sides(2500, 2000), comeback: 'player' },
  'unit-lineup': { lanes: [{ winner: 'player', margin: 3, damage: 300, capped: true, ticks: 900 }], damage: sides(300, 0), heartcaps: sides(3000, 1700), comeback: 'enemy' },
  'unit-lineup-twin': {
    lanes: [{ winner: null, margin: 0, damage: 0, capped: true, ticks: 900 }, { winner: 'player', margin: 8, damage: 800 }], damage: sides(750, 0), heartcaps: sides(3000, 1250), comeback: 'enemy',
  },
  // the bench's clash (T114), a mirror: every lane holds level to the cap
  'bench-300': { lanes: [0, 1, 2].map(() => ({ winner: null, margin: 0, damage: 0, capped: true, ticks: 900 })), damage: sides(0, 0), heartcaps: FULL, comeback: null },
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
  it('has a case for every scenario in data/scenarios/', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.keys(content.scenarios).sort());
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
  it('general-plans-first: the general’s colony and army stand before your first command, and two different plans of yours leave its plan hash-equal (§4.7, §7.1)', () => {
    // the general's side as its turn left it: its colony, the army it will field, its gold and plans, and its AI stream
    const general = (s: BattleState): string => hashValue({
      side: s.sides.enemy, colony: s.buildings.filter((b) => b.side === 'enemy'),
      army: formationOf(s, 'enemy'), muster: mergePreview(s, 'enemy'), stream: s.rng.ai.enemy,
    });
    const yours = (s: BattleState, buildingId: string): number => s.buildings.find((b) => b.side === 'player' && b.buildingId === buildingId)!.id;
    // no plan, then two different ones: a plant and a toggle, or a sell and two plants
    const plans: ((s: BattleState) => SimEvent[])[][] = [
      [],
      [(s) => plant(s, 'player', 'sporelingBurrow', { lane: 0, rank: 0, file: 2 }), (s) => toggle(s, 'player', yours(s, 'capguardHall'), false)],
      [
        (s) => sell(s, 'player', yours(s, 'gillNest')), (s) => plant(s, 'player', 'puffballMortar', { lane: 0, rank: 1, file: 2 }),
        (s) => plant(s, 'player', 'capguardHall', { lane: 0, rank: 0, file: 1 }),
      ],
    ];
    for (const round of [1, 2]) {
      const armies = plans.map((commands) => {
        const s = fromScenario('general-plans-first');
        // round 1 played with no plan of yours, so round 2's general plans on the same record whatever you plan in round 2
        while (s.round < round) {
          finishRound(s);
          step(s);
        }
        // its turn came in the round's opening: its plan is kept, and only its commands are logged this round
        expect([s.phase, s.sides.enemy.ai!.plans.at(-1)!.round, s.sides.enemy.ai!.plans.at(-1)!.planted.length > 0]).toEqual(['planning', round, true]);
        expect(new Set(s.log.filter((c) => c.round === round).map((c) => c.side))).toEqual(new Set(['enemy']));
        const planned = general(s);
        for (const command of commands) {
          expect(command(s).filter((e) => e.t === 'commandRejected')).toEqual([]);
          expect(general(s)).toBe(planned);
        }
        begin(s);
        const units = s.units.filter((u) => u.side === 'enemy').map((u) => [u.unitId, u.tier, u.lane, u.x, u.y]);
        return { planned, fielded: s.clash!.fielded.enemy, units };
      });
      expect(armies[1]).toEqual(armies[0]);
      expect(armies[2]).toEqual(armies[0]);
    }
  });

  it('formation-from-plots: a Capguard Hall in front of a Gill Archer Nest fields its Capguards in rank 0, ahead of the archers', () => {
    const s = fromScenario('formation-from-plots');
    begin(s);
    expect(s.squads.map((q) => [q.side, q.unitId, q.rank])).toEqual([['enemy', 'capguard', 0], ['enemy', 'gillArcher', 1]]);
    // ahead is nearer the field's middle, for either side
    const fromMiddle = (unitId: string) => s.units.filter((u) => u.unitId === unitId).map((u) => Math.abs(u.x - s.map.width / 2));
    expect(fromMiddle('capguard')).toHaveLength(3);
    expect(Math.max(...fromMiddle('capguard'))).toBeLessThan(Math.min(...fromMiddle('gillArcher')));
  });

  it('clash-cap: at 45 s more surviving supply wins the lane, and the damage is the difference × the damage per supply, 100', () => {
    const s = fromScenario('clash-cap');
    finishRound(s);
    const lock = s.clash!.lanes[0]!;
    expect(lock).toMatchObject({ capped: true, endTick: s.clash!.startTick + 900, survivors: { player: 6, enemy: 3 } });
    expect([s.rules.heartcapDamagePerSupply, s.rounds[0]!.damage.player]).toEqual([100, (lock.survivors.player - lock.survivors.enemy) * 100]);
  });

  it('round-damage-cap: an overwhelming win deals exactly the cap, a fixed 750 for either Heartcap (#68)', () => {
    const s = fromScenario('round-damage-cap');
    finishRound(s);
    expect(s.rules.roundDamageCap).toEqual({ flat: 750 });
    expect(s.rounds[0]!.lanes[0]!.damage).toBeGreaterThan(750);
    expect(s.rounds[0]).toMatchObject({ capped: true, damage: { player: 750 } });
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

  it('comeback-r4: round 4 opens with equal colonies, banked gold and max HP, your Heartcap 1550 below full, after three lost rounds (G6)', () => {
    const s = fromScenario('comeback-r4');
    const colony = (side: Side) => s.buildings.filter((b) => b.side === side).map((b) => {
      const p = s.sides[side].plots[b.plot]!;
      return [b.buildingId, p.lane, p.rank, p.file];
    });
    expect(colony('player')).toEqual(colony('enemy'));
    expect([s.round, s.sides.player.bankedAtBegin, s.sides.player.heartcapMaxHp]).toEqual([4, s.sides.enemy.bankedAtBegin, s.sides.enemy.heartcapMaxHp]);
    // round 4's opening pays you the comeback gold for round 3 (§6.2)
    expect([s.sides.player.gold - s.sides.enemy.gold, s.stats.player.goldEarned.comeback]).toEqual([40, 40]);
    expect(s.sides.enemy.heartcapHp - s.sides.player.heartcapHp).toBe(1550);
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
