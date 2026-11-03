// The order units are listed in never decides a clash (SPEC §5.2, §13.3 rule 4, T147). At Begin every
// player unit takes a lower id than every enemy unit, and the systems run units in id order, so each case
// here plays a clash twice: as it arrives, and with the enemy's ids first. Both must end the same, unit for
// unit. The lineup's Tenders heal on a timer phased by their ids (`healing.ts`), which T147 leaves, so the
// lineup must end with the same locks. The mirror monos must also end level, since each side is the
// other's mirror image.
import { describe, expect, it } from 'vitest';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { createFromScenario } from '../../../src/sim/rounds/index.ts';
import type { BattleState } from '../../../src/sim/rounds/index.ts';
import { begin, content, finishRound, fromScenario } from '../../roundHelpers.ts';

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

/** Two of a building on each side, on the same plots, so each side's army is the other's mirror image. */
const mono = (building: string): RoundScenarioDef => {
  const colony = [{ building, lane: 0, rank: 0, file: 2 }, { building, lane: 0, rank: 0, file: 3 }];
  return { id: `mono-${building}`, description: 'A mirror mono.', map: 'bogwater-hollow', sides: { player: { colony }, enemy: { colony } } };
};

describe('the id order decides nothing in a clash (§5.2, T147)', () => {
  const cases: [string, () => BattleState][] = [
    ['a mirror Hammercap mono', () => createFromScenario(content, mono('hammercapForge'))],
    ['comeback-r4', () => fromScenario('comeback-r4')],
  ];
  for (const [name, make] of cases) {
    it(`${name} ends the same, unit for unit, with the player's ids first or the enemy's`, () => {
      expect(ending(make, true)).toEqual(ending(make, false));
    });
  }

  it("unit-lineup ends with the same locks with the player's ids first or the enemy's", () => {
    const make = () => fromScenario('unit-lineup');
    expect(ending(make, true).lanes).toEqual(ending(make, false).lanes);
  });

  it('a mirror mono ends level: the same lock and the same army standing on each side', () => {
    for (const building of ['sporelingBurrow', 'capguardHall', 'gillNest', 'hammercapForge']) {
      const { lanes: [lock] } = ending(() => createFromScenario(content, mono(building)), false);
      expect([building, lock!.winner, lock!.survivors.player]).toEqual([building, null, lock!.survivors.enemy]);
    }
  });
});
