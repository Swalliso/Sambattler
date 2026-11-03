// What the top band's tooltips teach in a battle in rounds (SPEC §10.2, §6.2, §6.4): the gold tip's income
// by source adds up to the gold chip's +N, which is `incomePreview`'s, with the comeback a lost round would add;
// interest in plain words, with what holding 140 pays; and the storm tip's multiplier for each round to come,
// ×1.2 to ×2.0 from round 5. They build DOM through h() (src/ui/h.ts), so a few lines of fake DOM stand in for
// the browser, as in v1's `tests/unit/teachingText.test.ts`, and the checks read the text back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import type { Atlas } from '../../../src/render/atlas.ts';
import { createFromScenario, incomePreview } from '../../../src/sim/rounds/index.ts';
import type { BattleState } from '../../../src/sim/rounds/index.ts';
import { goldLesson, goldTip, stormTip } from '../../../src/ui/rounds/hud/explain.ts';
import { content, finishRound, planningState } from '../../roundHelpers.ts';
import type { PlotPlace } from '../../roundHelpers.ts';

/** Just enough of a DOM node for h() and a sprite canvas. */
class FakeNode {
  readonly kids: (FakeNode | string)[] = [];
  readonly attrs = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  readonly classList = { toggle: () => true, add: () => {}, remove: () => {}, contains: () => false };
  className = '';
  hidden = false;
  tabIndex = -1;
  width = 0;
  height = 0;
  constructor(readonly tag: string) {}
  setAttribute(k: string, v: string): void { this.attrs.set(k, v); }
  removeAttribute(k: string): void { this.attrs.delete(k); }
  addEventListener(): void {}
  append(...kids: (FakeNode | string)[]): void { this.kids.push(...kids); }
  get textContent(): string { return this.kids.map((k) => (typeof k === 'string' ? k : k.textContent)).join(''); }
}

const atlas = { get: () => null } as unknown as Atlas;
/** A tip's text, its nodes joined by a line each. */
const tipText = (nodes: Node[]): string => nodes.map((n) => (n as unknown as FakeNode).textContent).join('\n');

beforeEach(() => {
  vi.stubGlobal('Node', FakeNode);
  vi.stubGlobal('document', { createElement: (tag: string) => new FakeNode(tag) });
});
afterEach(() => { vi.unstubAllGlobals(); });

type Planted = NonNullable<RoundScenarioDef['sides']['player']['colony']>[number];
/** Bogwater Hollow's one loam plot on the player's side, and a soil plot beside it (§11.9). */
const LOAM: PlotPlace = { lane: 0, rank: 1, file: 2 }, SOIL: PlotPlace = { lane: 0, rank: 1, file: 1 };
const on = (building: string, at: PlotPlace): Planted => ({ building, ...at, merge: false });

/** A battle on Bogwater Hollow from a round scenario, in that round's planning, holding `gold`. */
function planning(round: number, gold: number, sides: Partial<RoundScenarioDef['sides']> = {}): BattleState {
  const s = createFromScenario(content, {
    id: 'teaching', description: 'A teaching-text test.', map: 'bogwater-hollow', round,
    sides: { player: sides.player ?? {}, enemy: sides.enemy ?? {} },
  });
  s.sides.player.gold = gold;
  return s;
}

describe('the gold tip (§10.2, §6.2)', () => {
  it("adds its rows up to the chip's +N, which is incomePreview's: the stipend, each economy building with its loam bonus, interest", () => {
    const s = planning(3, 245, { player: { colony: [on('truffleCellar', SOIL), on('truffleCellar', LOAM), on('sporeExchange', { lane: 0, rank: 0, file: 1 })] } });
    const want = incomePreview(s, 'player');
    const lesson = goldLesson(content, s);
    expect(lesson.total).toBe(want.total);
    expect(lesson.rows.reduce((n, r) => n + r.gold, 0)).toBe(want.total);
    // two Cellars (50, and 75 on loam), the Exchange's trickle and the stipend
    expect(lesson.rows.find((r) => r.label.startsWith('Truffle Cellar'))!.gold).toBe(125);
    expect(lesson.rows.find((r) => r.label === 'Heartcap stipend')!.gold).toBe(want.stipend);
    const text = tipText(goldTip(content, atlas, s).build());
    expect(text).toContain(`+${want.total}`);
    for (const r of lesson.rows) expect(text).toContain(r.label);
  });

  it('shows what holding 140 pays, and what to hold for the full cap', () => {
    const s = planning(2, 140);
    const lesson = goldLesson(content, s);
    expect(lesson.rows.find((r) => r.label === 'Interest')!.gold).toBe(14);
    expect(lesson.rows.reduce((n, r) => n + r.gold, 0)).toBe(incomePreview(s, 'player').total);
    const text = tipText(goldTip(content, atlas, s).build());
    expect(text).toContain('1 gold for every 10');
    expect(text).toContain('bank 140 for +14');
    expect(text).toContain('Hold 300 for the full +30');
  });

  it('names the comeback a lost round would add, then counts it once the round is lost', () => {
    const before = planning(1, 300, { enemy: { colony: [on('rootbreakerDen', { lane: 0, rank: 0, file: 2 })] } });
    expect(goldLesson(content, before).comeback).toBe(40);
    expect(tipText(goldTip(content, atlas, before).build())).toMatch(/lose this round.*\+40/i);
    finishRound(before);
    expect(before.phase).toBe('aftermath');
    const lost = goldLesson(content, before);
    expect(lost.rows.find((r) => r.label === 'Comeback')!.gold).toBe(40);
    expect(lost.rows.reduce((n, r) => n + r.gold, 0)).toBe(incomePreview(before, 'player').total);
  });

  it('says the last round pays no more income', () => {
    const s = planning(9, 200);
    expect(goldLesson(content, s).last).toBe(true);
    expect(tipText(goldTip(content, atlas, s).build())).toMatch(/last round/i);
  });
});

describe('the storm tip (§10.2, §6.4)', () => {
  it('lists ×1.2 to ×2.0 from round 5, and ×1.0 before it', () => {
    const text = tipText(stormTip(content, atlas, planningState()).build());
    expect(text).toMatch(/Rounds 1–4\s*×1\.0/);
    ['×1.2', '×1.4', '×1.6', '×1.8', '×2.0'].forEach((x, i) => expect(text).toMatch(new RegExp(`Round ${5 + i}[^\\n]*${x.replace('.', '\\.')}`)));
    expect(text).toContain('25% of its max HP');
  });

  it('gives the multiplier now and each round to come, from round 6', () => {
    const s = planningState({ round: 6 });
    const text = tipText(stormTip(content, atlas, s).build());
    expect(text).toMatch(/Round 6[^\n]*×1\.4/);
    expect(text).not.toMatch(/Round 5\b/);
    expect(text).toMatch(/Round 9[^\n]*×2\.0/);
  });

  it('says when an event moved it', () => {
    const s = planningState();
    s.rules.storm.startRound = 4;
    const text = tipText(stormTip(content, atlas, s).build());
    expect(text).toMatch(/Round 4[^\n]*×1\.2/);
    expect(text).toMatch(/moved/i);
  });
});
