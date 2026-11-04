// The v3 prototype's screen rules that need no browser (docs/v3-proto-plan.md, S2; T014, T017; the concept's
// C3.1 and C3.2): what the planning view holds back of the general, the empty-lane warning read from the visible
// formation, and the empty clash, which the screen skips. tests/browser/v3.test.ts plays them on the page.
import { describe, expect, it } from 'vitest';
import { emptyClash } from '../../src/app/phases/aftermath.ts';
import { emptyLanes } from '../../src/app/phases/planning.ts';
import { battleForParams, parseRoundParams } from '../../src/app/urlParams.ts';
import type { Content } from '../../src/data/registry.ts';
import { heldUntilBegin, v3Held } from '../../src/render/preview.ts';
import { formationOf } from '../../src/sim/index.ts';
import { nodeContent, protoContent } from '../../tools/lib/content.ts';

const content = nodeContent();
const at = (q: string, c: Content = content) => {
  const p = parseRoundParams(q);
  return battleForParams(c, p, p.seed ?? 1);
};
const V3 = 'scene=battle&rules=v3&seed=1&test=1&player=bot:balanced';
const V2 = 'scene=battle&seed=1&test=1&player=bot:balanced';

describe('the planning view under v3 (C3.1, T014)', () => {
  it('holds the general\'s changes back from hideFromRound, in planning only, and never under v2', () => {
    expect(heldUntilBegin('full', at(`${V3}&round=1&phase=planning`))).toBe(false);
    expect(heldUntilBegin('full', at(`${V3}&round=2&phase=planning`))).toBe(true);
    expect(heldUntilBegin('full', at(`${V3}&round=2&phase=clash&ticks=0&paused=1`))).toBe(false);
    expect(heldUntilBegin('full', at(`${V2}&round=2&phase=planning`))).toBe(false);
  });

  it('draws the general from the visible colony: this round\'s plantings held back, and nothing stood again', () => {
    const s = at(`${V3}&round=2&phase=planning`);
    const planted = s.buildings.filter((b) => b.side === 'enemy' && b.plantedRound === 2).map((b) => b.id);
    expect(planted.length, 'the general plants in round 2').toBeGreaterThan(0);
    const held = v3Held(s)!;
    expect([...held.hidden].sort()).toEqual([...planted].sort());
    expect(held.restored).toEqual([]);
    expect(held.state.buildings.some((b) => planted.includes(b.id))).toBe(false);
    expect(held.state.sides.enemy.plots.some((p) => planted.includes(p.building))).toBe(false);
    expect(v3Held(at(`${V3}&round=1&phase=planning`)), 'round 1 keeps the full reveal').toBeNull();
  });

  it('reads the empty-lane warning from the visible formation, so a hidden planting doesn\'t show through it', () => {
    // a timing where the opener is hidden but fields at once: the general's formation holds a squad you can't see
    const s = at('scene=battle&rules=v3&seed=1&test=1&round=1&phase=planning', protoContent('v3.fruitFromRound:2,v3.hideFromRound:1'));
    expect(formationOf(s, 'enemy').length).toBeGreaterThan(0);
    expect(emptyLanes(s)).toEqual([]);
    // the full reveal warns over the same opener
    expect(emptyLanes(at('scene=battle&seed=1&test=1&round=1&phase=planning'))).toEqual([0]);
  });
});

describe('the empty clash (C3.2, Plan-Q1, T017)', () => {
  it('is round 1\'s under v3, when both openers sprout, and never a clash with squads or a v2 one', () => {
    expect(emptyClash(at(`${V3}&round=1&phase=aftermath`))).toBe(true);
    expect(emptyClash(at(`${V3}&round=2&phase=aftermath`))).toBe(false);
    expect(emptyClash(at(`${V3}&round=1&phase=planning`)), 'no clash yet').toBe(false);
    expect(emptyClash(at(`${V2}&round=1&phase=aftermath`))).toBe(false);
  });
});
