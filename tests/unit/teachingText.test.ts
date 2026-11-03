// What the top band's tooltips, Help and the first-time tips teach in a battle in rounds (SPEC §10.2, §10.3,
// §10.5, §6.2, §6.4): the gold tip's income by source adds up to the gold chip's +N, which is `incomePreview`'s,
// with the comeback a lost round would add; interest in plain words, with what holding 140 pays; the storm tip's
// multiplier for each round to come, ×1.2 to ×2.0 from round 5; Help's number keys reach as far as the tray and
// the draft do, with the panel keys in a table of their own and the storm by round; and the tips speak of rounds,
// not waves. They build DOM through h() (src/ui/h.ts), so a few lines of fake DOM stand in for the browser, and
// the checks read the text back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScenarioDef } from '../../src/data/schema.ts';
import type { Atlas } from '../../src/render/atlas.ts';
import { TipCoach } from '../../src/app/tips.ts';
import type { TipLane } from '../../src/app/tips.ts';
import { createFromScenario, incomePreview } from '../../src/sim/index.ts';
import type { BattleState, Content, SimEvent } from '../../src/sim/index.ts';
import { helpOverlay } from '../../src/ui/help.ts';
import { goldLesson, goldTip, stormTip } from '../../src/ui/hud/explain.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { content, finishRound, planningState } from '../helpers.ts';
import type { PlotPlace } from '../helpers.ts';

/** Just enough of a DOM node for h(), Help's tabs and a sprite canvas. */
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
  focus(): void {}
  append(...kids: (FakeNode | string)[]): void { this.kids.push(...kids); }
  get textContent(): string { return this.kids.map((k) => (typeof k === 'string' ? k : k.textContent)).join(''); }
  /** Every node below this one, depth first. */
  all(): FakeNode[] { return this.kids.flatMap((k) => (typeof k === 'string' ? [] : [k, ...k.all()])); }
}

const atlas = { get: () => null } as unknown as Atlas;
/** A tip's text, its nodes joined by a line each. */
const tipText = (nodes: Node[]): string => nodes.map((n) => (n as unknown as FakeNode).textContent).join('\n');

beforeEach(() => {
  vi.stubGlobal('Node', FakeNode);
  vi.stubGlobal('document', { createElement: (tag: string) => new FakeNode(tag) });
});
afterEach(() => { vi.unstubAllGlobals(); });

type Planted = NonNullable<ScenarioDef['sides']['player']['colony']>[number];
/** Bogwater Hollow's one loam plot on the player's side, and a soil plot beside it (§11.9). */
const LOAM: PlotPlace = { lane: 0, rank: 1, file: 2 }, SOIL: PlotPlace = { lane: 0, rank: 1, file: 1 };
const on = (building: string, at: PlotPlace): Planted => ({ building, ...at, merge: false });

/** A battle on Bogwater Hollow from a round scenario, in that round's planning, holding `gold`. */
function planning(round: number, gold: number, sides: Partial<ScenarioDef['sides']> = {}): BattleState {
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
    expect(text).toContain('capped at 750 HP');
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

/** Help's tabs as text, and each row of its key tables ("1–9choose a building; …"). */
function help(c: Content, s: BattleState): { tab: (id: string) => string; keys: string[] } {
  const root = helpOverlay(c, s, () => {}) as unknown as FakeNode;
  const panels = root.all().filter((n) => n.attrs.get('role') === 'tabpanel');
  const panel = (id: string) => panels.find((n) => n.attrs.get('id') === `help-${id}`)!;
  const keys = panel('keys').all().filter((n) => n.tag === 'tr').map((n) => n.textContent);
  return { tab: (id) => panel(id).textContent, keys };
}

describe('Help (§10.3)', () => {
  it('numbers the building keys as far as the tray does, and the draft keys as far as the offer goes', () => {
    const s = planningState();
    expect(help(content, s).keys).toContain('1–9choose a building; Shift-click keeps placing');
    expect(help(content, s).keys).toContain('1–3pick a draft card');
    s.sides.player.kit.splice(5);
    expect(help(content, s).keys).toContain('1–5choose a building; Shift-click keeps placing');
    const big = protoContent('draft.cards:4');
    expect(help(big, planningState()).keys).toContain('1–4pick a draft card');
  });

  it('keeps the panel keys in a second table beside Selling, and Space / Enter in the first, with no Hold', () => {
    const root = helpOverlay(content, planningState(), () => {}) as unknown as FakeNode;
    const tables = root.all().filter((n) => n.tag === 'table' && n.className === 'keys');
    expect(tables.map((t) => t.attrs.get('id') ?? '')).toEqual(['help-keys', '']);
    expect(tables[0]!.textContent).toContain('Space/Enterbegin the clash (in planning)');
    expect(tables[0]!.textContent).not.toContain('hold');
    expect(tables[1]!.all().filter((n) => n.tag === 'tr').map((n) => n.textContent[0])).toEqual(['H', 'S', 'I']);
  });

  it('tells interest and the storm by round, with no waves, columns or forward price', () => {
    const s = planningState();
    const h = help(content, s);
    expect(h.tab('economy')).toContain(`1 gold for every ${s.rules.interestPer} gold you held when you pressed Begin, up to ${s.compiled.player.interestCap}`);
    expect(h.tab('storm')).toContain(`After round ${content.balance.rounds.maxRounds}, if both Heartcaps stand, the battle ends by Decision.`);
    for (const tab of ['economy', 'storm', 'general', 'merging', 'keys']) expect(h.tab(tab)).not.toMatch(/wave|column|forward|frontier/i);
  });
});

describe('first-time tips (§10.5)', () => {
  /** The tips a battle offers on these events, in the order they show, to a player who has seen none. */
  function tips(s: BattleState, events: SimEvent[] = []): string[] {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
    const shown: string[] = [];
    const text = (x: unknown): string => (x instanceof FakeNode ? x.textContent : String(x));
    const lane: TipLane = { live: () => false, push: (_kind, parts) => { shown.push(parts.map(text).join('')); } };
    const coach = new TipCoach(lane);
    s.events = events;
    coach.onTick(s);
    for (let i = 0; i < 6; i++) coach.frame(i);
    coach.dispose();
    return shown;
  }

  it('says interest pays each round, from the gold held at Begin', () => {
    const s = planningState({ round: 2 });
    expect(tips(s, [{ t: 'interest', side: 'player', amount: 7 }]))
      .toEqual([`TipInterest +7: each round pays 1 gold per ${s.rules.interestPer} you held at Begin, up to a cap. Hover your gold.`]);
  });

  it('names the storm as it first raises a round\'s damage', () => {
    expect(tips(planningState({ round: 5 }), [{ t: 'roundStarted', round: 5, stormBp: 12000 }])).toEqual(['TipThe Sporestorm: a round now deals ×1.2 Heartcap damage, and more each round, up to ×2.0.']);
    expect(tips(planningState({ round: 2 }), [{ t: 'roundStarted', round: 2, stormBp: 10000 }])).toEqual([]);
  });

  it('gives a key for each card on offer', () => {
    const s = planningState({ round: 3 });
    const card = { id: 'relic:rootStipend', type: 'relic' as const, rarity: 'common' as const };
    s.sides.player.draft = { offer: [card, card, card, card], rerolls: 0, index: 1 };
    expect(tips(s)).toEqual(['TipPick with 1–4: blueprints add buildings, upgrades improve them, relics last the run.']);
  });
});
