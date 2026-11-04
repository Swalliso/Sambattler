// What the top band's tooltips, Help and the first-time tips teach in a battle in rounds (SPEC §10.2, §10.3,
// §10.5, §6.2, §6.4, §15.7; R2b/T112): the gold tip's income by source adds up to the gold chip's +N, which is
// `incomePreview`'s, with the comeback a lost round would add; interest in plain words, with what holding 140 pays;
// the storm tip's multiplier for each round to come, ×1.2 to ×2.0 from round 5; Help's six tabs, its keys by phase
// (the number keys as far as the tray and the draft reach, Space in all three phases), the Rounds tab's storm by
// round as §6.4's table, and the Economy tab's "bank 140" at R2-Q2's rate; and the first-time tips' texts, which
// speak of rounds, each once and only once it was on screen (A067). They build DOM through h() (src/ui/h.ts), so a
// few lines of fake DOM stand in for the browser, and the checks read the text back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScenarioDef } from '../../src/data/schema.ts';
import type { Atlas } from '../../src/render/atlas.ts';
import { PULSE_MS, TipCoach } from '../../src/app/tips.ts';
import type { TipLane } from '../../src/app/tips.ts';
import { createFromScenario, incomePreview } from '../../src/sim/index.ts';
import type { BattleState, Content, SimEvent } from '../../src/sim/index.ts';
import { BANK_EXAMPLE, helpOverlay } from '../../src/ui/help.ts';
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
/** A battle in round `round`'s planning with Vesper's Spore Burst for the player (§6.6), battle 1 unless set. */
const withPower = (round = 1, battleIndex = 1): BattleState => createFromScenario(content, {
  id: 'teaching', description: 'A teaching-text test.', map: 'bogwater-hollow', round, battleIndex, sides: { player: { commander: 'vesper' }, enemy: {} },
});

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

/** Help's tab labels, each tab's text, and the rows of the keys table of each phase ("1–9choose a building…"). */
function help(c: Content, s: BattleState): { tabs: string[]; tab: (id: string) => string; keys: (phase: string) => string[]; storm: string[][] } {
  const all = (helpOverlay(c, s, () => {}) as unknown as FakeNode).all();
  const panel = (id: string) => all.find((n) => n.attrs.get('role') === 'tabpanel' && n.attrs.get('id') === `help-${id}`)!;
  const rows = (n: FakeNode) => n.all().filter((x) => x.tag === 'tr');
  return {
    tabs: all.filter((n) => n.attrs.get('role') === 'tab').map((n) => n.textContent),
    tab: (id) => panel(id).textContent,
    keys: (phase) => all.filter((n) => n.tag === 'table' && n.attrs.get('data-phase') === phase).flatMap((t) => rows(t).map((r) => r.textContent)),
    storm: rows(all.find((n) => n.attrs.get('id') === 'help-storm')!).map((r) => r.kids.map((k) => (typeof k === 'string' ? k : k.textContent))),
  };
}

describe('Help (§10.3, §10.5)', () => {
  it('has six tabs, Rounds in the Sporestorm tab\'s place', () => {
    expect(help(content, planningState()).tabs).toEqual(['Matrix', 'Merging', 'The general', 'Economy', 'Rounds', 'Keys']);
  });

  it('numbers the building keys as far as the tray does, and the draft keys as far as the offer goes', () => {
    const s = planningState();
    const planning = help(content, s).keys('planning');
    expect(planning).toContain('1–9choose a building, then click a plot; Shift-click keeps planting');
    expect(planning).toContain('1–3pick a draft card, while a draft is open');
    s.sides.player.kit.splice(5);
    expect(help(content, s).keys('planning')).toContain('1–5choose a building, then click a plot; Shift-click keeps planting');
    const big = protoContent('draft.cards:4');
    expect(help(big, planningState()).keys('planning')).toContain('1–4pick a draft card, while a draft is open');
  });

  it('lists the keys by phase, with Space in all three, and no Hold', () => {
    const k = help(content, withPower());
    expect(k.keys('planning')).toContain('Space/EnterBegin the clash');
    expect(k.keys('clash')).toContain('Spacepause or resume');
    expect(k.keys('aftermath')).toContain('Space/Entergo on to the next round (a click does too)');
    expect(k.keys('clash')).toContain('Qaim Spore Burst, then click the field (works while paused; Esc cancels)');
    expect(help(content, planningState()).keys('clash').some((r) => r.startsWith('Q'))).toBe(false); // no commander, no power
    expect(k.keys('any').map((r) => r[0])).toEqual(['H', 'S', 'I', 'R']);
    for (const phase of ['planning', 'clash', 'aftermath', 'any']) expect(k.keys(phase).join(' ')).not.toMatch(/hold|wave|forward/i);
  });

  it("gives the Rounds tab's storm by round as §6.4's table, from the data", () => {
    const s = planningState();
    const want = ['×1.0', '×1.0', '×1.0', '×1.0', '×1.2', '×1.4', '×1.6', '×1.8', '×2.0']; // §6.4
    expect(help(content, s).storm).toEqual([['Round', ...want.map((_, i) => String(i + 1))], ['Damage', ...want]]);
    // an event that moves the storm moves the table
    s.rules.storm.startRound = 4;
    expect(help(content, s).storm[1]!.slice(1, 6)).toEqual(['×1.0', '×1.0', '×1.0', '×1.2', '×1.4']);
  });

  it("works the Economy tab's example at R2-Q2's rate: bank 140 for +14, capped", () => {
    const s = planningState();
    const pays = (c: Content, st: BattleState) => Math.min(st.compiled.player.interestCap, Math.floor(BANK_EXAMPLE / st.rules.interestPer));
    expect(pays(content, s)).toBe(14);
    expect(help(content, s).tab('economy')).toContain('bank 140 for +14');
    // at v1's 1 per 20, the same bank pays +7 (R2-Q2 moved it)
    const slow = protoContent('rounds.interestPer:20');
    const t = createFromScenario(slow, { id: 'teaching', description: 'A teaching-text test.', map: 'bogwater-hollow', sides: { player: {}, enemy: {} } });
    expect(pays(slow, t)).toBe(7);
    expect(help(slow, t).tab('economy')).toContain('bank 140 for +7');
  });

  it('tells the three phases, how a clash ends and costs, the Decision and Regrowths, with no waves, columns or forward price', () => {
    const s = planningState();
    const rounds = help(content, s).tab('rounds');
    for (const phase of ['Planning.', 'Clash.', 'Aftermath.']) expect(rounds).toContain(phase);
    expect(rounds).toContain(`or at ${s.rules.clashCapTicks / s.rules.tickRate} s`);
    expect(rounds).toContain(`deals ${s.rules.heartcapDamagePerSupply} Heartcap damage for each supply`);
    expect(rounds).toContain('up to 750 HP a round');
    expect(rounds).toContain(`After round ${content.balance.rounds.maxRounds}, if both Heartcaps stand, the battle ends by Decision`);
    expect(rounds).toContain('costs a Regrowth');
    expect(rounds).toContain(`For ${content.balance.rounds.upgradeCostPct}% of its price`);
    expect(rounds).toContain('In rounds 3, 5 and 7 a draft opens first');
    for (const tab of ['matrix', 'merging', 'general', 'economy', 'rounds', 'keys']) expect(help(content, s).tab(tab)).not.toMatch(/wave|column|forward|frontier/i);
  });

  it('says the general plans first and counters in rounds 4 and 7, with no countdown, and merging happens at the muster', () => {
    const h = help(content, planningState());
    expect(h.tab('general')).toContain('the general plans before you');
    expect(h.tab('general')).toContain("In round 4's planning it reads rounds 1–3 and in round 7's planning it reads rounds 4–6.");
    expect(h.tab('general')).toContain('no countdown');
    expect(h.tab('merging')).toContain('1 s muster');
    expect(h.tab('merging')).toContain('while you plan');
  });
});

describe('first-time tips (§10.2, §10.5)', () => {
  /** The tips a battle offers, in the order they show, to a player who has seen only `seen`, on a lane that may slice them off. */
  function coach(opts: { showing?: () => boolean; seen?: string[] } = {}) {
    const store = new Map<string, string>(opts.seen ? [['spore-sprawl/tips/v1', JSON.stringify({ shown: opts.seen })]] : []);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
    const shown: string[] = [];
    let live = 0;
    const text = (x: unknown): string => (x instanceof FakeNode ? x.textContent : String(x));
    const lane: TipLane = {
      live: () => live > 0,
      push: (_kind, parts) => { shown.push(parts.map(text).join('')); live = 1; return new FakeNode('div') as unknown as HTMLElement; },
      showing: opts.showing ?? (() => true),
    };
    const c = new TipCoach(lane, content);
    /** Frames until the queue is empty: each tip's time runs out before the next. */
    const flush = (from = 0) => { for (let i = from; i < from + 12; i++) { c.frame(i); live = 0; } };
    const remembered = () => JSON.parse(store.get('spore-sprawl/tips/v1') ?? '{"shown":[]}').shown as string[];
    return { c, shown, flush, remembered, done: () => c.dispose() };
  }
  /** One step's events, as the view feeds them. */
  const tick = (c: TipCoach, s: BattleState, events: SimEvent[] = []) => { s.events = events; c.onTick(s); };
  /** One of the player's buildings, planted in round 2. */
  const planted = (id: number, buildingId: string): BattleState['buildings'][number] => ({
    id, side: 'player', buildingId, plot: 0, plantedRound: 2, pricePaid: 0, fielded: false, mergeOn: true,
  });

  it("reads the general's army as round 1's planning opens", () => {
    const s = planningState();
    const t = coach();
    t.c.watch(s);
    t.flush();
    expect(t.shown).toEqual(['TipThe general has planned: its whole army stands on the right. Plan against what you see.']);
    expect(t.remembered()).toEqual(['army']);
  });

  it('names the formation at your first planting, and the clash with its power at the first Begin', () => {
    const s = withPower(2, 2);
    const t = coach();
    t.c.watch(s);
    s.buildings.push(planted(999, 'capguardHall'));
    tick(t.c, s, [{ t: 'buildingPlanted', id: 999 }]);
    s.phase = 'clash';
    tick(t.c, s);
    t.flush();
    expect(t.shown).toEqual([
      'TipThe clash: both armies fight. Space pauses; Q aims Spore Burst, once a clash.',
      'TipYour squads stand in the rank and file of their plots: rank 1 is the front line.',
    ]);
    expect(t.remembered()).toEqual(['clash', 'formation']);
  });

  it('says what the aftermath costs, from the data', () => {
    const s = planningState({ round: 2 });
    s.phase = 'aftermath';
    const t = coach();
    tick(t.c, s);
    t.flush();
    expect(t.shown).toEqual([`TipThe aftermath: a lane's winner deals ${s.rules.heartcapDamagePerSupply} Heartcap damage per supply it has left.`]);
  });

  it('says interest pays each round, from the gold held at Begin', () => {
    const s = planningState({ round: 2, battleIndex: 2 });
    const t = coach();
    tick(t.c, s, [{ t: 'interest', side: 'player', amount: 7 }]);
    t.flush();
    expect(t.shown).toEqual([`TipInterest +7: each round pays 1 gold per ${s.rules.interestPer} you held at Begin, up to a cap. Hover your gold.`]);
    expect(t.remembered()).toEqual(['roundInterest']);
  });

  it("names the storm as round 5's planning opens, and not before", () => {
    const t = coach();
    t.c.watch(planningState({ round: 5 }));
    t.flush();
    expect(t.shown).toEqual(['TipThe Sporestorm: a round now deals ×1.2 Heartcap damage, and more each round, up to ×2.0.']);
    const u = coach();
    u.c.watch(planningState({ round: 4 }));
    u.flush();
    expect(u.shown).toEqual([]);
  });

  it('gives a key for each card on offer', () => {
    const s = planningState({ round: 3 });
    const card = { id: 'relic:rootStipend', type: 'relic' as const, rarity: 'common' as const };
    s.sides.player.draft = { offer: [card, card, card, card], rerolls: 0, index: 1 };
    // a battle that opens with its draft up, as `scene=draft` and a resumed planning do: no step has run
    const t = coach();
    t.c.watch(s);
    t.flush();
    expect(t.shown).toEqual(['TipPick with 1–4: blueprints add buildings, upgrades improve them, relics last the run.']);
  });

  it('shows none after battle 2, and none it was shown before', () => {
    const s = planningState({ battleIndex: 3 });
    const t = coach();
    t.c.watch(s);
    t.flush();
    expect(t.shown).toEqual([]);
    const u = coach({ seen: ['army'] });
    u.c.watch(planningState());
    u.flush();
    expect(u.shown).toEqual([]);
  });

  it('counts a tip as shown only once the lane has it on screen (A067)', () => {
    let onScreen = false;
    const t = coach({ showing: () => onScreen });
    t.c.watch(planningState());
    t.c.frame(0); // pushed, but pinned callouts slice it off
    expect(t.shown).toHaveLength(1);
    expect(t.remembered()).toEqual([]);
    onScreen = true;
    t.c.frame(1);
    expect(t.remembered()).toEqual(['army']);
  });

  it("doesn't remember a tip whose time ran out off screen", () => {
    const t = coach({ showing: () => false });
    t.c.watch(planningState());
    t.flush();
    expect(t.shown).toHaveLength(1);
    expect(t.remembered()).toEqual([]);
  });

  describe("battle 1's economy tip (#33's first guess)", () => {
    it('names the first economy card and its key as round 2 opens with none planted, pulses for 12 s, and stops once one is chosen', () => {
      const s = planningState({ round: 2, battleIndex: 1 });
      const t = coach();
      t.c.watch(s);
      t.c.frame(100);
      expect(t.shown).toEqual([`TipA Truffle Cellar 1 earns +${s.compiled.player.buildings.truffleCellar!.economy!.goldPerRound} gold every round, all battle. Plant one early!`]);
      // it isn't remembered: battle 1 always tips it
      expect(t.remembered()).toEqual([]);
      expect(t.c.pulsing(s, null, 100 + PULSE_MS - 1)).toBe(true);
      expect(t.c.pulsing(s, null, 100 + PULSE_MS)).toBe(false);
      expect(t.c.pulsing(s, 'truffleCellar', 200)).toBe(false);
      expect(t.c.pulsing(s, null, 300)).toBe(false);
    });

    it('stays quiet in battle 2, in round 3, and with an economy building planted', () => {
      for (const [battleIndex, round, eco] of [[2, 2, false], [1, 3, false], [1, 2, true]] as const) {
        const s = planningState({ round, battleIndex });
        if (eco) s.buildings.push(planted(998, 'truffleCellar'));
        const t = coach();
        t.c.watch(s);
        t.flush();
        expect(t.shown.filter((x) => x.includes('Truffle Cellar')), `battle ${battleIndex} round ${round}`).toEqual([]);
      }
    });
  });
});
