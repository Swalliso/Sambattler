// Step B battle-feel prototypes (docs/balance-backlog.md, "Step B"): the hot start, the Heartcap
// breach and last stand, and bigger drafts. Every knob is absent from data/balance.json, so the
// shipped rules are unchanged; with a knob set, the prototype behaves as described.
import { describe, expect, it } from 'vitest';
import { TriggerSchema } from '../../src/data/schema.ts';
import { battleConfig, battleSave, chooseNode, createRun, resumeBattle } from '../../src/run/index.ts';
import {
  HEARTCAP_ID, createBattle, generateOffer, hashState, makeConfig, queueCommand, runHeadless, step,
} from '../../src/sim/index.ts';
import type { BattleState, Content, Side } from '../../src/sim/index.ts';
import { insertHit } from '../../src/sim/hits.ts';
import { heartcapEdgeX } from '../../src/sim/world.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { content, unit } from '../helpers.ts';

const DRAFTS = { merging: true, drafts: true, adaptiveGeneral: false, powers: true };

function battle(c: Content, opts: { player?: string; flags?: typeof DRAFTS; commander?: string } = {}): BattleState {
  return createBattle(c, makeConfig(c, {
    seed: 4, mapId: 'test-flat', player: opts.player ?? 'human', enemy: 'human', flags: opts.flags ?? DRAFTS,
    ...(opts.commander ? { commander: opts.commander } : {}),
  }));
}

/** Lands a Crush hit of `damage` on `side`'s Heartcap this tick, as an enemy unit's blow would. */
function hitHeartcap(s: BattleState, side: Side, damage: number): void {
  const x = heartcapEdgeX(s, side), y = 2;
  insertHit(s, {
    tick: s.tick, sourceId: 0, seq: s.nextHitSeq++, side: side === 'player' ? 'enemy' : 'player', targetId: HEARTCAP_ID[side],
    x, y, fromX: x, fromY: y, fireTick: s.tick, lane: 0, damage, damageType: 'crush', splashRadius: 0, siegeMult: 1, slayerMult: 1,
    sourceBuildingId: 0, sourceType: 'test', ranged: false,
  });
}

describe('step B knobs are off by default', () => {
  it('balance.json sets none of them: no deploy draft, no side triggers, one pick per draft', () => {
    const b = content.balance;
    expect(b.hotStart).toBeUndefined();
    expect(b.sideTriggers).toBeUndefined();
    expect(b.bigDrafts).toBeUndefined();
    const s = battle(content);
    expect(s.rules.deployDraft).toBeUndefined();
    expect(s.rules.bigDrafts).toBeUndefined();
    expect(s.compiled.player.triggers).toEqual([]);
    expect(s.sides.player.draft).toBeUndefined();
    expect(s.held).toBe(false);
  });

  it('the presets compile', () => {
    for (const p of ['hotstart', 'breach', 'bigdrafts', 'hotstart,breach,bigdrafts']) expect(() => protoContent(p)).not.toThrow();
  });
});

describe('heartcapBreach triggers (balance sideTriggers)', () => {
  it('need a threshold, and only they take one', () => {
    expect(TriggerSchema.safeParse({ on: 'heartcapBreach', at: 0.5, do: [{ readyPower: true }] }).success).toBe(true);
    expect(TriggerSchema.safeParse({ on: 'heartcapBreach', do: [{ readyPower: true }] }).success).toBe(false);
    expect(TriggerSchema.safeParse({ on: 'unitDeath', at: 0.5, do: [{ gainGold: 1 }] }).success).toBe(false);
  });

  const c = protoContent('breach');

  it('fire once as the Heartcap falls past each mark: a breach at ⅔, a last stand at ⅓', () => {
    const s = battle(c, { commander: 'vesper', flags: { ...DRAFTS, drafts: false } });
    s.phase = 'live';
    const ps = s.sides.player;
    expect(s.compiled.player.triggers.map((t) => t.at)).toEqual([0.67, 0.33]);
    expect(ps.powerCooldown).toBeGreaterThan(0);
    const breaches: number[] = [];
    const tick = () => { step(s); for (const e of s.events) if (e.t === 'heartcapBreach' && e.side === 'player') breaches.push(e.at); };
    // Crush deals ×1.5 against structure
    hitHeartcap(s, 'player', 500); // 3000 → 2250: above ⅔
    tick();
    expect(breaches).toEqual([]);
    hitHeartcap(s, 'player', 200); // → 1950: past ⅔ (2010)
    tick();
    expect(breaches).toEqual([0.67]);
    expect(s.hits.some((h) => h.sourceType === 'effect' && h.side === 'player')).toBe(true); // the pulse lands next tick
    expect(ps.heartcapShield).toEqual({ untilTick: s.tick + 10 * 20, takenMult: 0.5 });
    expect(s.stats.player.goldEarned.effects).toBe(150);
    hitHeartcap(s, 'player', 200); // shielded: → 1800, no new mark
    tick();
    expect(ps.heartcapHp).toBe(1800);
    expect(breaches).toEqual([0.67]);

    for (let i = 0; i < 200; i++) step(s); // the shield runs out
    hitHeartcap(s, 'player', 600); // → 900: past ⅓ (990)
    tick();
    expect(breaches).toEqual([0.67, 0.33]);
    expect(ps.powerCooldown).toBe(0);
    expect(ps.heartcapShield).toEqual({ untilTick: s.tick + 20 * 20, takenMult: 0.25 });
    expect(s.stats.player.goldEarned.effects).toBe(300);
    hitHeartcap(s, 'player', 100); // a quarter of 150
    tick();
    expect(ps.heartcapHp).toBe(900 - 38);
  });

  it('the pulse strikes enemy units near the Heartcap in the breached lane', () => {
    const s = battle(c, { flags: { ...DRAFTS, drafts: false } });
    s.phase = 'live';
    const near = unit(s, 'enemy', 'capguard', heartcapEdgeX(s, 'player') + 2, 2);
    const far = unit(s, 'enemy', 'capguard', heartcapEdgeX(s, 'player') + 8, 2);
    near.cooldown = far.cooldown = 1e9;
    hitHeartcap(s, 'player', 700); // 3000 → 1950: past ⅔
    step(s);
    step(s);
    expect(near.hp).toBe(220 - Math.round(150 * 0.75));
    expect(far.hp).toBe(220);
  });

  it('a Heartcap that falls to 0 breaches nothing', () => {
    const s = battle(c, { flags: { ...DRAFTS, drafts: false } });
    s.phase = 'live';
    hitHeartcap(s, 'player', 3000);
    step(s);
    expect(s.events.some((e) => e.t === 'heartcapBreach')).toBe(false);
    expect(s.outcome?.winner).toBe('enemy');
  });
});

describe('hot start (balance hotStart)', () => {
  const c = protoContent('hotstart');

  it('opens a free draft at deploy for a side that drafts, and none without drafts or in scenarios', () => {
    const s = battle(c);
    expect(s.phase).toBe('deploy');
    expect(s.held).toBe(true);
    expect(s.sides.player.draft).toMatchObject({ index: 1 });
    expect(s.sides.player.draft!.offer).toHaveLength(3);
    expect(s.sides.player.draft!.picks).toBeUndefined();
    expect(s.sides.enemy.draft).toBeUndefined(); // no draft pool
    expect(battle(c, { flags: { ...DRAFTS, drafts: false } }).held).toBe(false);
  });

  it('a human picks before deploying; Begin waits for the pick, and a save resumes to the same hash', () => {
    const s = battle(c);
    const card = s.sides.player.draft!.offer[0]!.id;
    queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
    step(s);
    expect(s.phase).toBe('deploy'); // held: Begin waits
    queueCommand(s, { tick: 0, side: 'player', type: 'draftPick', cardId: card });
    step(s);
    expect(s.held).toBe(false);
    expect(s.stats.player.drafted).toEqual([card]);
    expect(s.phase).toBe('deploy');
    queueCommand(s, { tick: 0, side: 'player', type: 'place', buildingId: 'sporelingBurrow', lane: 0, col: 0, row: 0 });
    const resumed = resumeBattle(c, battleSave(s));
    expect(hashState(resumed)).toBe(hashState(s));
    step(s);
    expect(s.phase).toBe('live');
    expect(s.buildings).toHaveLength(1);
  });

  it('a bot picks at deploy, before the clock starts', () => {
    const s = battle(c, { player: 'bot:balanced' });
    let first = -1;
    runHeadless(s, { until: 1, onTick: () => { if (first < 0) first = s.stats.player.drafted.length; } });
    expect(first).toBe(1);
    expect(s.tick).toBe(1);
  });

  it('gives run battle 1 its effects as battle modifiers, and later battles none', () => {
    const run = createRun(c, { seed: 3, player: 'bot:balanced' });
    chooseNode(c, run, 0);
    const config = run.screen.kind === 'battle' ? run.screen.config : undefined;
    expect(config?.modifiers).toContainEqual({ side: 'enemy', source: 'proto:hotStart', effects: c.balance.hotStart!.battles![0]!.enemy });
    const later = battleConfig(c, { ...run, battles: [{} as never] }, run.route[2]![0]!);
    expect(later.modifiers ?? []).not.toContainEqual(expect.objectContaining({ source: 'proto:hotStart' }));
    const s = createBattle(c, config!);
    expect(s.compiled.enemy.stipend).toBe(Math.round(content.balance.stipendPerTick * 0.75));
    expect(s.compiled.player.stipend).toBe(content.balance.stipendPerTick);
  });
});

describe('bigger drafts (balance bigDrafts)', () => {
  const c = protoContent('bigdrafts');

  it('compile to rules: drafts after waves 2 and 5, 4 cards, 2 picks, +10 rare', () => {
    const s = battle(c);
    expect(s.rules.draftWaves).toEqual([2, 5]);
    expect(s.compiled.player.draftCards).toBe(4);
    expect(s.rules.bigDrafts).toEqual({ picks: 2, rareBonus: 10 });
  });

  /** The battle at the first draft's hold. */
  function atDraft(player = 'human'): BattleState {
    const s = battle(c, { player });
    s.phase = 'live';
    while (!s.held) step(s);
    return s;
  }

  it('the offer stays open after a pick with the cards left, and closes after the last', () => {
    const s = atDraft();
    const d = s.sides.player.draft!;
    expect(d.picks).toBe(2);
    const offer = d.offer.map((x) => x.id);
    expect(offer).toHaveLength(4);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftPick', cardId: offer[1]! });
    step(s);
    expect(s.held).toBe(true);
    expect(s.sides.player.draft!.offer.map((x) => x.id)).toEqual(offer.filter((id) => id !== offer[1]));
    expect(s.sides.player.draft!.picks).toBeUndefined();
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftPick', cardId: offer[3]! });
    step(s);
    expect(s.held).toBe(false);
    expect(s.stats.player.drafted).toEqual([offer[1], offer[3]]);
  });

  it('offers carry the rare bonus', () => {
    const s = battle(c);
    const rng = { ...s.rng.draft };
    const ss = s.sides.player;
    const expected = generateOffer(s.library, s.config.player.draft!, ss, { cards: 4, battleIndex: 1, rareBonus: 10 }, rng);
    s.phase = 'live';
    while (!s.held) step(s);
    expect(s.sides.player.draft!.offer).toEqual(expected);
  });

  it('an AI side takes both picks', () => {
    const s = atDraft('bot:balanced');
    step(s);
    expect(s.held).toBe(false);
    expect(s.stats.player.drafted).toHaveLength(2);
  });
});
