// Fruiting under the v3 prototype's rules (the concept's section 3.2, Plan-Q1; T006, T008, T009): what's planted from
// `fruitFromRound` is a sprout until the next clash, so its slot stays empty in the formation and its preview. The
// user's call on Plan-Q1 (2026-11-04) is `fruitFromRound` 1: the opener sprouts too, so round 1's clash fields nothing,
// ends on its first tick as a draw that deals no damage, and the round moves on. Economy pays as before.
import { describe, expect, it } from 'vitest';
import { createBattle, formationOf, makeRoundConfig, mergePreview, sellValue, step } from '../../src/sim/index.ts';
import type { BattleState, Content, RoundBattleOptions } from '../../src/sim/index.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { begin, content, finishRound, plant, plotAt, sell } from '../helpers.ts';

const v3 = (opts: Partial<RoundBattleOptions> = {}, c: Content = content): BattleState =>
  createBattle(c, makeRoundConfig(c, { seed: 1, player: 'human', enemy: 'human', rules: 'v3', ...opts }));
const front = (file: number) => ({ lane: 0, rank: 0, file });
const at = (s: BattleState, file: number) => s.buildings.find((b) => b.side === 'player' && b.plot === plotAt(s, 'player', front(file)))!;
/** Plays the round out, then opens the next one. */
const nextRound = (s: BattleState): void => { finishRound(s); step(s); };

describe('fruiting (C3.2, T008)', () => {
  it('Plan-Q1 is the default: every building fruits a round after it is planted, the opener too', () => {
    expect(content.balance.v3!.fruitFromRound).toBe(1);
  });

  it('a building planted in round r fields from clash r + 1, and until then its slot stays empty', () => {
    const s = v3();
    plant(s, 'player', 'sporelingBurrow', front(1));
    const burrow = at(s, 1);
    expect(formationOf(s, 'player')).toEqual([]);
    expect(mergePreview(s, 'player').byBuilding).toEqual({});
    // the ghost of another planting previews a sprout as well
    expect(formationOf(s, 'player', { plant: { buildingId: 'capguardHall', plot: plotAt(s, 'player', front(2)) } })).toEqual([]);
    nextRound(s);
    expect(s.round).toBe(2);
    expect(formationOf(s, 'player').map((p) => p.building)).toEqual([burrow.id]);
    // round 2's planting sprouts, beside the Burrow that fruited
    plant(s, 'player', 'capguardHall', front(2));
    expect(formationOf(s, 'player').map((p) => p.building)).toEqual([burrow.id]);
    begin(s);
    const fielded = s.units.filter((u) => u.side === 'player');
    expect(fielded.length).toBeGreaterThan(0);
    expect(new Set(fielded.map((u) => u.sourceBuildingId))).toEqual(new Set([burrow.id]));
  });

  it('a building sold and replanted sprouts again, so a pivot costs a round as well as 40% of the price', () => {
    const s = v3();
    plant(s, 'player', 'sporelingBurrow', front(1));
    nextRound(s);
    const old = at(s, 1);
    expect(sellValue(s, old.id)).toBe(Math.floor(110 * content.balance.sellRefund));
    sell(s, 'player', old.id);
    plant(s, 'player', 'sporelingBurrow', front(1));
    expect(at(s, 1).id).not.toBe(old.id);
    expect(formationOf(s, 'player')).toEqual([]);
    // a sprout sold in the round it was planted refunds in full, as before (§4.4)
    expect(sellValue(s, at(s, 1).id)).toBe(110);
  });

  it("economy pays from the next round's income, as before", () => {
    const s = v3();
    plant(s, 'player', 'truffleCellar', front(1));
    const cellar = at(s, 1);
    nextRound(s);
    expect(s.stats.player.goldByBuilding[String(cellar.id)]).toBe(50);
  });

  it('with fruitFromRound 2, round 1 fields its opener at once and fruiting starts with round 2', () => {
    const s = v3({}, protoContent('v3.fruitFromRound:2'));
    plant(s, 'player', 'sporelingBurrow', front(1));
    expect(formationOf(s, 'player')).toHaveLength(1);
    nextRound(s);
    plant(s, 'player', 'capguardHall', front(2));
    expect(formationOf(s, 'player').map((p) => p.building)).toEqual([at(s, 1).id]);
  });

  it('under v2 a building fields in the clash it was planted for, as before', () => {
    const s = createBattle(content, makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'human' }));
    plant(s, 'player', 'sporelingBurrow', front(1));
    expect(formationOf(s, 'player')).toHaveLength(1);
  });
});

describe('the empty clash (T009)', () => {
  it("with fruitFromRound 1, round 1's clash fields nothing and ends on its first tick, a draw that deals no damage", () => {
    const s = v3({ enemy: 'general:mother-mold' });
    expect(s.buildings.filter((b) => b.side === 'enemy').length).toBeGreaterThan(0);
    plant(s, 'player', 'sporelingBurrow', front(1));
    const tick = s.tick, hp = [s.sides.player.heartcapHp, s.sides.enemy.heartcapHp];
    const events = begin(s);
    expect(s.phase).toBe('aftermath');
    expect(s.tick).toBe(tick);
    expect(s.units).toEqual([]);
    expect(events.filter((e) => e.t === 'laneWon')).toEqual([{ t: 'laneWon', lane: 0, winner: null, survivors: { player: 0, enemy: 0 }, capped: false }]);
    expect(events.some((e) => e.t === 'heartcapDamaged')).toBe(false);
    const r = s.rounds[0]!;
    expect(r.damage).toEqual({ player: 0, enemy: 0 });
    expect(r.lanes).toEqual([{ winner: null, survivors: { player: 0, enemy: 0 }, capped: false, ticks: 0, damage: 0 }]);
    expect([s.sides.player.heartcapHp, s.sides.enemy.heartcapHp]).toEqual(hp);
    // the round moves on
    step(s);
    expect([s.round, s.phase]).toEqual([2, 'planning']);
  });

  it('on Twin Roots every lane of the empty clash ends at once', () => {
    const s = v3({ mapId: 'twin-roots' });
    begin(s);
    expect(s.phase).toBe('aftermath');
    expect(s.rounds[0]!.lanes.map((l) => [l.winner, l.ticks])).toEqual([[null, 0], [null, 0]]);
  });
});
