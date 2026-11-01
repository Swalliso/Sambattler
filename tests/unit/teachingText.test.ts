// What Help, the first-time tips and the top band's tooltips teach, with and without the combat rework
// (docs/archive/v1/ideas/after-the-rework.md, "Fixes worth making first"): the number keys reach as far as the tray
// and the draft do, a hold is a timer in today's game but one beat under `waves`, interest goes by its
// own 60 s clock where a wave also leaves on every beat, the Sporestorm's wave growth (`stormWaves`) is
// said wherever the storm is, and the rework's other rules they touch (waiting units' supply, flyers'
// ground, the swarm read) are told only where they apply. They build DOM through h() (src/ui/h.ts), so a
// few lines of fake DOM stand in for the browser and the checks read the text back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipCoach } from '../../src/app/tips.ts';
import type { Atlas } from '../../src/render/atlas.ts';
import { createBattle, makeConfig } from '../../src/sim/index.ts';
import type { BattleState, Content, SimEvent } from '../../src/sim/index.ts';
import type { Callouts } from '../../src/ui/callouts.ts';
import { helpOverlay } from '../../src/ui/help.ts';
import { goldTip, stormTip, supplyTip, territoryTip, waveTip } from '../../src/ui/hud/explain.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

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

const text = (x: unknown): string => (x instanceof FakeNode ? x.textContent : String(x));
const atlas = { get: () => null } as unknown as Atlas;
const protos = new Map<string, Content>();
const proto = (spec: string): Content => {
  if (!protos.has(spec)) protos.set(spec, protoContent(spec));
  return protos.get(spec)!;
};

beforeEach(() => {
  vi.stubGlobal('Node', FakeNode);
  vi.stubGlobal('document', { createElement: (tag: string) => new FakeNode(tag) });
});
afterEach(() => { vi.unstubAllGlobals(); });

/** Battle 1 on Bogwater Hollow, live, with the full 14-building kit. */
function battle(c: Content = content): BattleState {
  const s = createBattle(c, makeConfig(c, { seed: 1, mapId: 'bogwater-hollow', player: 'human', enemy: 'general:mother-mold' }));
  s.phase = 'live';
  return s;
}

/** Help's tabs as text, and each row of its key tables ("1–9choose a building; …"). */
function help(c: Content, s: BattleState): { tab: (id: string) => string; keys: string[] } {
  const root = helpOverlay(c, s, () => {}) as unknown as FakeNode;
  const panels = root.all().filter((n) => n.attrs.get('role') === 'tabpanel');
  const panel = (id: string) => panels.find((n) => n.attrs.get('id') === `help-${id}`)!;
  const keys = panel('keys').all().filter((n) => n.tag === 'tr').map((n) => n.textContent);
  return { tab: (id) => panel(id).textContent, keys };
}

/** The tips a battle offers on this tick and these events, in the order they show, to a player who has seen none. */
function tips(s: BattleState, secs: number, events: SimEvent[] = []): string[] {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
  const shown: string[] = [];
  const lane = { live: () => false, push: (_kind: string, parts: unknown[]) => { shown.push(parts.map(text).join('')); } };
  const coach = new TipCoach(lane as unknown as Callouts);
  s.tick = secs * s.rules.tickRate;
  s.events = events;
  coach.onTick(s);
  for (let i = 0; i < 6; i++) coach.frame(i);
  coach.dispose();
  return shown;
}

const tooltip = (src: { build: () => Node[] }): string => src.build().map(text).join(' | ');

describe('Help', () => {
  it('numbers the building keys as far as the tray does, and the draft keys as far as the offer goes', () => {
    const s = battle();
    expect(help(content, s).keys).toContain('1–9choose a building; Shift-click keeps placing');
    expect(help(content, s).keys).toContain('1–3pick a draft card');
    s.sides.player.kit.splice(5);
    expect(help(content, s).keys).toContain('1–5choose a building; Shift-click keeps placing');
    const big = proto('bigdrafts');
    expect(help(big, battle(big)).keys).toContain('1–4pick a draft card');
  });

  it("says what a hold does: up to 30 s in today's game, one beat under waves", () => {
    expect(help(content, battle()).keys).toContain('Fhold every lane, or advance them all (a hold lasts up to 30 s)');
    const rw = proto('rework');
    expect(help(rw, battle(rw)).keys).toContain('Fhold every lane, or advance them all (a held lane keeps its next wave home for one beat; the beat after sends both)');
  });

  it('keeps the panel keys in a second table beside Selling, and Space / Enter in the first', () => {
    const root = helpOverlay(content, battle(), () => {}) as unknown as FakeNode;
    const tables = root.all().filter((n) => n.tag === 'table' && n.className === 'keys');
    expect(tables.map((t) => t.attrs.get('id') ?? '')).toEqual(['help-keys', '']);
    expect(tables[0]!.textContent).toContain('Space/Enterbegin the battle (in deploy)');
    expect(tables[1]!.all().filter((n) => n.tag === 'tr').map((n) => n.textContent[0])).toEqual(['H', 'S', 'R', 'I']);
  });

  it("adds the storm's wave growth to the Sporestorm tab only under stormWaves", () => {
    const plain = help(content, battle()).tab('storm');
    expect(plain).not.toContain('Waves');
    expect(plain).not.toContain('bigger');
    const rw = proto('rework');
    const storm = help(rw, battle(rw)).tab('storm');
    expect(storm).toContain("Each stack also makes both sides' waves 20% bigger, ×2 at 5 stacks. The extra units need free supply.");
    expect(storm).toContain('Heartcaps takeWaves');
    expect(storm).toContain('58:00+50% damage−50%+100%+100%');
    // a gentler storm says its own numbers
    const mild = proto('rework,stormWaves.perStack:0.1');
    expect(help(mild, battle(mild)).tab('storm')).toContain('10% bigger, ×1.5 at 5 stacks');
  });

  it('times interest by its own clock under waves, and says "two waves" are two minutes there', () => {
    const plain = help(content, battle());
    expect(plain.tab('economy')).toContain('Interest, at each new waveEvery 1:00, as a new wave starts, you get 1 gold');
    expect(plain.tab('general')).toContain('two waves later');
    const rw = proto('rework');
    const h = help(rw, battle(rw));
    expect(h.tab('economy')).toContain('Interest, every 1:00Every 1:00 you get 1 gold');
    expect(h.tab('economy')).toContain('holding 145 gold at 1:00 pays +7');
    expect(h.tab('economy')).toContain('so interest can pay up to 20');
    expect(h.tab('economy')).not.toContain('a wave');
    expect(h.tab('general')).toContain('two waves (two minutes) later');
  });

  it("says the general's swarm read leaves a cheap unit's merges out of Elite", () => {
    expect(help(content, battle()).tab('general')).toContain('ELITE units you actually merge. It answers with Slayers.');
    const rw = proto('rework');
    expect(help(rw, battle(rw)).tab('general')).toContain('ELITE units you actually merge, except 1-supply units: it reads those by their armor.');
  });
});

describe('first-time tips', () => {
  it('teaches Hold as a timer without waves and as one beat with them', () => {
    expect(tips(battle(), 50)).toEqual(['TipPress F to hold your units back for a bigger push; press it again to advance.']);
    const rw = proto('rework');
    expect(tips(battle(rw), 50)).toEqual(['TipPress F to keep your next wave home for one beat; the beat after sends both waves.']);
  });

  it("names the storm's wave growth only under stormWaves", () => {
    const storm: SimEvent[] = [{ t: 'sporestorm', stacks: 1 }];
    expect(tips(battle(), 240, storm)).toEqual(['TipThe Sporestorm: each stack, units hit 10% harder and Heartcaps take 20% more.']);
    const rw = proto('rework');
    expect(tips(battle(rw), 240, storm)).toEqual(['TipThe Sporestorm: each stack, waves grow 20%, units hit 10% harder and Heartcaps take 20% more.']);
  });

  it('says interest pays every 60 s, in both games', () => {
    const paid: SimEvent[] = [{ t: 'interest', side: 'player', amount: 7 }];
    const line = 'TipInterest +7: every 60 s pays 1 gold per 20 you hold, up to a cap. Hover your gold.';
    expect(tips(battle(), 120, paid)).toEqual([line]);
    const rw = proto('rework');
    expect(tips(battle(rw), 120, paid)).toEqual([line]);
  });

  it('gives a key for each card on offer', () => {
    const s = battle();
    const card = { id: 'relic:rootStipend', type: 'relic' as const, rarity: 'common' as const };
    s.sides.player.draft = { offer: [card, card, card, card], rerolls: 0, index: 1 };
    expect(tips(s, 120)).toEqual(['TipPick with 1–4: blueprints add buildings, upgrades improve them, relics last the run.']);
  });
});

describe("the top band's tooltips", () => {
  it('show the Sporestorm growing waves, each stack and now, only under stormWaves', () => {
    const s = battle();
    s.sporestorm = 2;
    expect(tooltip(stormTip(content, atlas, s))).not.toContain('Waves');
    const rw = proto('rework');
    const r = battle(rw);
    r.sporestorm = 2;
    const tip = tooltip(stormTip(rw, atlas, r));
    expect(tip).toContain('Each stack | Units and towers+10% damage | Heartcap turrets−10% damage | Heartcapstake +20% damage | Waves · extra units need free supply+20% units');
    expect(tip).toContain('Heartcapstake +40% damage | Waves+40% units');
  });

  it('time interest by its own clock under waves, where the beat chip owns "Next wave"', () => {
    const plain = tooltip(goldTip(content, atlas, battle()));
    expect(plain).toContain('Interest, paid at each new wave');
    expect(plain).toContain('Next wave, in 1:00');
    const rw = proto('rework');
    const tip = tooltip(goldTip(rw, atlas, battle(rw)));
    expect(tip).toContain('Interest, paid every 1:00');
    expect(tip).toContain('Next payout, in 1:00');
    expect(tip).not.toContain('wave');
  });

  it("say the wave chip's waves aren't the units' under waves", () => {
    expect(tooltip(waveTip(content, atlas, battle()))).not.toContain('beat');
    const rw = proto('rework');
    expect(tooltip(waveTip(rw, atlas, battle(rw)))).toContain('Units leave on their own 0:20 beat, not on these waves.');
  });

  it('count the units waiting inside for their wave toward supply under waves', () => {
    expect(tooltip(supplyTip(content, atlas, battle()))).toContain('Every living unit uses supply. At the cap');
    const rw = proto('rework');
    expect(tooltip(supplyTip(rw, atlas, battle(rw)))).toContain('Every living unit uses supply, and so does each one waiting inside a spawner for its wave. At the cap');
  });

  it("say flyers hold no ground under the rework's flyers", () => {
    expect(tooltip(territoryTip(content, atlas, battle()))).not.toContain('Flyers');
    const rw = proto('rework');
    expect(tooltip(territoryTip(rw, atlas, battle(rw)))).toContain('for 2 s. Flyers hold no ground, so they never count. An enemy building');
  });
});
