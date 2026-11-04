// Hidden plantings under the v3 prototype's rules (the concept's section 3.1; T007, T010): from `hideFromRound`, what
// the general plants this round stays out of its colony as the player sees it until Begin, while its sales, its merge
// toggles and its gold at the start of its turn stay in view. Round 1's opener is in view. A bot that plans after the
// general reads the same view.
import { describe, expect, it } from 'vitest';
import { sell, toggleMerge } from '../../src/sim/planning.ts';
import { createBattle, makeRoundConfig, planningView, step, visibleColony } from '../../src/sim/index.ts';
import type { BattleState, RoundBattleOptions } from '../../src/sim/index.ts';
import { begin, content } from '../helpers.ts';

const battle = (opts: Partial<RoundBattleOptions> = {}): BattleState =>
  createBattle(content, makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'general:mother-mold', rules: 'v3', ...opts }));
const theirs = (s: BattleState) => s.buildings.filter((b) => b.side === 'enemy');
/** Round 2's planning, the general's plan made: round 1's clash is empty, so it ends at Begin. */
function round2(opts: Partial<RoundBattleOptions> = {}): BattleState {
  const s = battle(opts);
  begin(s);
  step(s);
  expect([s.round, s.phase]).toEqual([2, 'planning']);
  return s;
}

describe('the visible colony (C3.1, T010)', () => {
  it("round 1 keeps the full reveal: the general's opener is in view", () => {
    expect(content.balance.v3!.hideFromRound).toBe(2);
    const s = battle();
    expect(visibleColony(s, 'enemy').buildings.map((b) => b.id)).toEqual(theirs(s).map((b) => b.id));
  });

  it("from hideFromRound, the general's plantings this round are missing until Begin, then appear as sprouts", () => {
    const s = round2();
    const fresh = theirs(s).filter((b) => b.plantedRound === 2), old = theirs(s).filter((b) => b.plantedRound === 1);
    expect(fresh.length).toBeGreaterThan(0);
    const seen = visibleColony(s, 'enemy');
    expect(seen.buildings.map((b) => b.id)).toEqual(old.map((b) => b.id));
    for (const b of fresh) expect(seen.plots[b.plot]!.building).toBe(0);
    for (const b of old) expect(seen.plots[b.plot]!.building).toBe(b.id);
    expect(seen.formation.map((p) => p.building).every((id) => old.some((b) => b.id === id))).toBe(true);
    begin(s);
    const after = visibleColony(s, 'enemy');
    expect(after.buildings.map((b) => b.id)).toEqual(theirs(s).map((b) => b.id));
    // as sprouts: they field nothing in this clash
    expect(s.units.some((u) => fresh.some((b) => b.id === u.sourceBuildingId))).toBe(false);
  });

  it('its sales and merge toggles show at once', () => {
    const s = round2();
    // Mold's opener on seed 1: a Sporeling Burrow and a Gill Archer Nest
    const opener = theirs(s).filter((b) => b.plantedRound === 1);
    const burrow = opener.find((b) => b.buildingId === 'sporelingBurrow')!, nest = opener.find((b) => b.buildingId === 'gillNest')!;
    const was = burrow.mergeOn;
    expect(sell(s, 'enemy', nest.id)).toBeNull();
    expect(toggleMerge(s, 'enemy', burrow.id, !was)).toBeNull();
    const seen = visibleColony(s, 'enemy');
    expect(seen.buildings.some((b) => b.id === nest.id)).toBe(false);
    expect(seen.plots[nest.plot]!.building).toBe(0);
    expect(seen.formation.some((p) => p.building === nest.id)).toBe(false);
    expect(seen.buildings.find((b) => b.id === burrow.id)!.mergeOn).toBe(!was);
    expect(seen.formation.find((p) => p.building === burrow.id)!.mergeOn).toBe(!was);
  });

  it("the general's gold at the start of its turn is recorded, and it's the gold in view", () => {
    const s = round2();
    const [r1, r2] = s.sides.enemy.ai!.plans;
    expect(r2!.goldAtStart).toBe(r1!.banked + r2!.income);
    expect(r1!.goldAtStart).toBe(content.balance.startingGold);
    expect(visibleColony(s, 'enemy').gold).toBe(r2!.goldAtStart);
    expect(s.sides.enemy.gold).toBe(r2!.banked);
  });

  it('bot:answer plans from the visible colony, not the state', () => {
    const s = round2({ player: 'bot:answer' });
    const view = planningView(s, 'player');
    expect(view.general).toEqual(visibleColony(s, 'enemy'));
    expect(view.general!.buildings.some((b) => b.plantedRound === 2)).toBe(false);
  });

  it('under v2 the colony is in view as it stands, and the plans record no gold at the start', () => {
    const s = battle({ rules: 'v2' });
    begin(s);
    while (s.phase === 'clash') step(s);
    step(s);
    expect(visibleColony(s, 'enemy').buildings).toEqual(theirs(s));
    expect(visibleColony(s, 'enemy').gold).toBeUndefined();
    expect(s.sides.enemy.ai!.plans.every((p) => p.goldAtStart === undefined)).toBe(true);
  });
});
