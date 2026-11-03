// The order units are listed in never decides a clash (SPEC §5.2, §13.3 rule 4, T147). At Begin every
// player unit takes a lower id than every enemy unit, and the systems run units in id order, so each case
// here plays a clash twice: as it arrives, and with the enemy's ids first. Both must end the same, unit for
// unit. The staggered checks are phased by each unit's arrival on its side, not its id (T149), so the lineup's
// Tenders heal on the same ticks either way. A Burster's burst strikes at once inside the attack step, so it may
// fell a unit later in the list before that unit attacks (T148): its mirrors run both ways too. The mirror monos
// must also end level, since each side is the other's mirror image.
import { describe, expect, it } from 'vitest';
import type { ScenarioDef } from '../../src/data/schema.ts';
import { createFromScenario } from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';
import { begin, content, finishRound, fromScenario } from '../helpers.ts';

/**
 * Gives the enemy's units the lowest ids, each side keeping its own order, as if its squads had arrived
 * first. Only before anything holds a unit's id: right after Begin, or with a scenario's placed units.
 */
function enemyIdsFirst(s: BattleState): void {
  if (s.hits.length || s.units.some((u) => u.targetId !== 0 || u.knit)) throw new Error('a unit id is already held');
  const ids = s.units.map((u) => u.id);
  [...s.units.filter((u) => u.side === 'enemy'), ...s.units.filter((u) => u.side === 'player')].forEach((u, i) => { u.id = ids[i]!; });
  s.units.sort((a, b) => a.id - b.id);
}

/** How a clash ends, with the enemy's ids first or not: each lane's lock, and every unit left standing, in a fixed order. */
function ending(make: () => BattleState, enemyFirst: boolean) {
  const s = make();
  if (s.phase === 'planning') begin(s);
  if (enemyFirst) enemyIdsFirst(s);
  finishRound(s);
  const standing = s.units.map((u) => JSON.stringify([u.side, u.unitId, u.tier, u.hp, u.x, u.y])).sort();
  return { lanes: s.clash!.lanes, standing };
}

type Colony = NonNullable<ScenarioDef['sides']['player']['colony']>;

/** The same colony on each side, on the same plots, so each side's army is the other's mirror image. */
const mirror = (id: string, colony: Colony): ScenarioDef =>
  ({ id, description: 'A mirror.', map: 'bogwater-hollow', sides: { player: { colony }, enemy: { colony } } });

/** Two of a building on each side. */
const mono = (building: string): ScenarioDef =>
  mirror(`mono-${building}`, [{ building, lane: 0, rank: 0, file: 2 }, { building, lane: 0, rank: 0, file: 3 }]);

/** Bursters behind a Sporeling front, so their bursts land among units that attack in the same step (T148). */
const bursters = (): ScenarioDef => mirror('bursters-behind-sporelings', [
  { building: 'sporelingBurrow', lane: 0, rank: 0, file: 2 }, { building: 'sporelingBurrow', lane: 0, rank: 0, file: 3 },
  { building: 'bursterPod', lane: 0, rank: 1, file: 2 }, { building: 'bursterPod', lane: 0, rank: 1, file: 3 },
]);

describe('the id order decides nothing in a clash (§5.2, T147)', () => {
  const cases: [string, () => BattleState][] = [
    ['a mirror Hammercap mono', () => createFromScenario(content, mono('hammercapForge'))],
    ['a mirror of Bursters behind Sporelings', () => createFromScenario(content, bursters())],
    ['comeback-r4', () => fromScenario('comeback-r4')],
    ['unit-lineup', () => fromScenario('unit-lineup')],
  ];
  for (const [name, make] of cases) {
    it(`${name} ends the same, unit for unit, with the player's ids first or the enemy's`, () => {
      expect(ending(make, true)).toEqual(ending(make, false));
    });
  }

  // T148's finding, which waits for the user's call (no rule changed): the side whose ids come first bursts first,
  // at clash tick 56, and its bursts fell the other's Bursters before they burst on it in the same attack step. That
  // side wins the lane 4–0 at tick 60, 100 Heartcap damage. Once a fix lands, this fails: make it an `it` above.
  it.fails("a mirror Burster mono ends the same with the player's ids first or the enemy's (T148: it doesn't yet)", () => {
    const make = () => createFromScenario(content, mono('bursterPod'));
    expect(ending(make, true)).toEqual(ending(make, false));
  });

  it('a mirror mono ends level: the same lock and the same army standing on each side', () => {
    for (const building of ['sporelingBurrow', 'capguardHall', 'gillNest', 'hammercapForge']) {
      const { lanes: [lock] } = ending(() => createFromScenario(content, mono(building)), false);
      expect([building, lock!.winner, lock!.survivors.player]).toEqual([building, null, lock!.survivors.enemy]);
    }
  });
});
