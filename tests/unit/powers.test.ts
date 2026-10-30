// Commander powers (SPEC §6.6, §11.10, §16 Milestone 5): each power's effect, its cooldown and
// first-ready time, targeting validation, the auto policy and determinism.
import { describe, expect, it } from 'vitest';
import {
  autoPowerTarget, createBattle, hashState, makeConfig, powerCooldownTicks, queueCommand, runHeadless, step,
} from '../../src/sim/index.ts';
import type { BattleState, CommandBody, Flags } from '../../src/sim/index.ts';
import { positionalValue } from '../../src/sim/effects.ts';
import { building, content, setBorders, steps, unit } from '../helpers.ts';

const POWERS: Flags = { merging: true, drafts: false, adaptiveGeneral: false, powers: true };

/**
 * Rhizome Surge as SPEC §11.10 first specced it (Armilla's power until her M5 rework; kept as a power
 * kind): a test-only commander carries it.
 */
const withSurge: typeof content = {
  ...content,
  commanders: {
    ...content.commanders,
    surger: {
      ...content.commanders.armilla!, id: 'surger',
      power: { id: 'rhizomeSurge', name: 'Rhizome Surge', kind: 'surge', target: 'global', cooldown: 100, firstReady: 90, text: 'Captures the frontier.' },
    },
  },
};

/** A live battle on the flat map, human against human, the player led by `commander`, the clock at `tick`. */
function battle(commander: string, opts: { tick?: number; flags?: Partial<Flags>; relics?: string[] } = {}): BattleState {
  const c = commander === 'surger' ? withSurge : content;
  const config = makeConfig(c, {
    seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', commander, flags: { ...POWERS, ...opts.flags },
  });
  if (opts.relics) config.player.relics = opts.relics;
  const s = createBattle(c, config);
  s.phase = 'live';
  // the clock starts at 0 when the battle goes live; skip ahead as live play would
  const t = opts.tick ?? 0;
  s.tick = t;
  s.sides.player.powerCooldown = Math.max(0, s.sides.player.powerCooldown - t);
  return s;
}

/** Issues a power command for the next tick and runs that tick. */
function use(s: BattleState, body: Omit<Extract<CommandBody, { type: 'power' }>, 'type'> = {}): void {
  queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'power', ...body });
  step(s);
}

const rejected = (s: BattleState) => s.events.filter((e) => e.t === 'commandRejected').map((e) => (e as { reason: string }).reason);
const used = (s: BattleState) => s.events.some((e) => e.t === 'power');

describe('Spore Burst (Vesper)', () => {
  it('deals 90 crush through the matrix to every enemy unit and building within 2 tiles, and nothing else', () => {
    const s = battle('vesper', { tick: 2000 });
    const near = unit(s, 'enemy', 'sporeling', 16, 4);
    const edge = unit(s, 'enemy', 'capguard', 17.9, 4); // its body reaches inside the 2-tile circle
    const far = unit(s, 'enemy', 'sporeling', 19, 4);
    const mine = unit(s, 'player', 'sporeling', 16.5, 4.2);
    const fort = building(s, 'enemy', 'truffleCellar', 14, 1);
    for (const u of s.units) u.cooldown = 99; // nobody swings this tick: only the burst does damage
    const hp = { near: near.hp, edge: edge.hp, far: far.hp, mine: mine.hp, fort: fort.hp, heart: s.sides.enemy.heartcapHp };
    use(s, { x: 16, y: 4 });
    const m = s.rules.matrix.crush;
    expect(used(s)).toBe(true);
    expect(hp.near - near.hp).toBe(Math.round(90 * m.light));
    expect(hp.edge - edge.hp).toBe(Math.round(90 * m.medium));
    expect(far.hp).toBe(hp.far);
    expect(mine.hp).toBe(hp.mine);
    expect(hp.fort - fort.hp).toBe(Math.round(90 * m.structure));
    expect(s.sides.enemy.heartcapHp).toBe(hp.heart);
    const st = s.stats.player;
    expect(st.powerUses).toBe(1);
    expect(st.powerDamage).toBe(Math.round(90 * m.light) + Math.round(90 * m.medium) + Math.round(90 * m.structure));
    expect(st.damageBySource['power:sporeBurst']).toBe(st.powerDamage);
  });
});

describe('Rhizome Tithe (Armilla)', () => {
  it('pays 30 gold for every column held past home, in every lane, and moves no border', () => {
    const s = battle('armilla', { tick: 2000 });
    setBorders(s, 9, 22); // home is columns 0–3: six columns past it
    const gold = s.sides.player.gold;
    use(s);
    expect(used(s)).toBe(true);
    expect(s.sides.player.gold - gold).toBe(6 * 30);
    expect(s.stats.player.powerGold).toBe(180);
    expect(s.stats.player.goldEarned.effects).toBe(180);
    expect(s.events).toContainEqual(expect.objectContaining({ t: 'power', power: 'rhizomeTithe', gold: 180 }));
    expect(s.lanes[0]!.pBorder).toBe(9);
  });

  it('is refused with no ground past home (the charge is kept), and the auto policy waits for 3 columns a lane', () => {
    const s = battle('armilla', { tick: 2000 });
    setBorders(s, 3, 28);
    expect(autoPowerTarget(s, 'player')).toBeNull();
    use(s);
    expect(rejected(s)).toEqual(['you hold no ground past home']);
    expect(s.sides.player.powerCooldown).toBe(0);
    setBorders(s, 5, 28);
    expect(autoPowerTarget(s, 'player')).toBeNull();
    setBorders(s, 6, 28);
    expect(autoPowerTarget(s, 'player')).toEqual({});
  });
});

describe('Rhizome Surge (a power kind; Armilla\'s first-pass power)', () => {
  it('captures the frontier column at once, unless an enemy building stands on it', () => {
    const s = battle('surger', { tick: 2000 });
    setBorders(s, 9, 22);
    use(s);
    expect(used(s)).toBe(true);
    expect(s.lanes[0]!.pBorder).toBe(10);
    expect(s.lanes[0]!.owner[10]).toBe(1);
    expect(s.stats.player.powerCaptures).toBe(1);
    expect(s.events).toContainEqual({ t: 'columnFlipped', lane: 0, column: 10, to: 'player' });

    // a fort on the frontier blocks it, and with nothing to capture the use is refused (no cooldown spent)
    const t = battle('surger', { tick: 2000 });
    setBorders(t, 9, 22);
    building(t, 'enemy', 'truffleCellar', 10, 3);
    use(t);
    expect(used(t)).toBe(false);
    expect(rejected(t)).toEqual(['no frontier column can be captured']);
    expect(t.sides.player.powerCooldown).toBe(0);
  });

  it('takes an enemy-held frontier column, pushing their border back', () => {
    const s = battle('surger', { tick: 2000 });
    setBorders(s, 12, 13);
    use(s);
    expect(s.lanes[0]!.pBorder).toBe(13);
    expect(s.lanes[0]!.eBorder).toBe(14);
    expect(s.stats.enemy.columnsLost).toBe(1);
  });
});

describe('Puppet Bloom (Cordis)', () => {
  it('merges every same-type trio within 3 tiles at once, even in combat', () => {
    const s = battle('cordis', { tick: 2000 });
    const trio = [unit(s, 'player', 'capguard', 10, 3), unit(s, 'player', 'capguard', 11, 3), unit(s, 'player', 'capguard', 10.5, 4.5)];
    for (const u of trio) u.lastCombatTick = s.tick; // fighting: they couldn't knit on their own
    const pair = [unit(s, 'player', 'sporeling', 11, 2), unit(s, 'player', 'sporeling', 11, 5)]; // only two: no trio
    const away = [unit(s, 'player', 'capguard', 20, 3), unit(s, 'player', 'capguard', 20, 4), unit(s, 'player', 'capguard', 21, 3)];
    use(s, { x: 10.5, y: 3.5 });
    expect(used(s)).toBe(true);
    for (const u of trio) expect(s.units.find((v) => v.id === u.id)).toBeUndefined();
    const bloomed = s.units.filter((u) => u.side === 'player' && u.unitId === 'capguard' && u.tier === 2);
    expect(bloomed).toHaveLength(1);
    for (const u of [...pair, ...away]) expect(s.units.find((v) => v.id === u.id)?.tier).toBe(1);
    expect(s.stats.player.powerMerges).toBe(1);
    expect(s.stats.player.merges['2']).toBe(1);
  });

  it('is refused when merging is off in the battle', () => {
    const s = battle('cordis', { tick: 2000, flags: { merging: false } });
    use(s, { x: 10, y: 3 });
    expect(rejected(s)).toEqual(['merging is off in this battle']);
  });
});

describe('cooldown and first-ready time', () => {
  it.each([['vesper', 45, 75], ['armilla', 60, 75], ['cordis', 60, 80], ['surger', 90, 100]] as const)('%s: first ready at %i s, then every %i s', (id, first, cd) => {
    const s = battle(id);
    expect(s.sides.player.powerCooldown).toBe(first * 20);
    const def = withSurge.commanders[id]!.power;
    // the global powers need ground (past home, or a capturable frontier), the point powers a point on the field
    if (id === 'armilla' || id === 'surger') setBorders(s, 9, 22);
    const at = { x: 12, y: 3 };
    // counting down through live ticks: refused the tick before, accepted on the first ready tick
    steps(s, first * 20 - 1);
    expect(s.sides.player.powerCooldown).toBe(1);
    use(s, at);
    expect(rejected(s)).toEqual(['power ready in 1 s']);
    expect(s.sides.player.powerCooldown).toBe(0);
    use(s, at);
    expect(used(s)).toBe(true);
    expect(s.sides.player.powerCooldown).toBe(cd * 20 - 1); // set on use, then this tick's countdown
    expect(powerCooldownTicks(s, 'player', def)).toBe(cd * 20);
    if (id === 'surger') setBorders(s, 9, 22);
    steps(s, cd * 20 - 2);
    use(s, at);
    expect(rejected(s)[0]).toMatch(/^power ready in/);
    use(s, at);
    expect(used(s)).toBe(true);
  });

  it('waits while the battle is held for a draft, and the Sporestorm Sigil cuts it by 30%', () => {
    const s = battle('vesper', { tick: 2000, relics: ['sporestormSigil'] });
    expect(powerCooldownTicks(s, 'player', content.commanders.vesper!.power)).toBe(Math.round(75 * 0.7 * 20));
    use(s, { x: 12, y: 3 });
    const left = s.sides.player.powerCooldown;
    s.held = true;
    steps(s, 50);
    expect(s.sides.player.powerCooldown).toBe(left);
  });
});

describe('targeting validation', () => {
  it('refuses a point power without a point, or off the field; a global power needs none', () => {
    const s = battle('vesper', { tick: 2000 });
    use(s);
    expect(rejected(s)).toEqual(['the power needs a target point']);
    use(s, { x: -1, y: 3 });
    expect(rejected(s)).toEqual(['target is off the field']);
    use(s, { x: 5, y: 8 });
    expect(rejected(s)).toEqual(['target is off the field']);
    use(s, { x: 31.9, y: 7.9 });
    expect(used(s)).toBe(true);
  });

  it('refuses in deploy, without a commander, with powers off, and for the enemy side', () => {
    const d = createBattle(content, makeConfig(content, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', commander: 'vesper', flags: POWERS }));
    queueCommand(d, { tick: 0, side: 'player', type: 'power', x: 10, y: 3 });
    step(d);
    expect(rejected(d)).toEqual(['powers work once the battle is live']);
    const none = battle('vesper', { tick: 2000, flags: { powers: false } });
    expect(none.library.powers).toBeUndefined();
    use(none, { x: 10, y: 3 });
    expect(rejected(none)).toEqual(['no commander power']);
    const s = battle('vesper', { tick: 2000 });
    queueCommand(s, { tick: s.tick + 1, side: 'enemy', type: 'power', x: 10, y: 3 });
    step(s);
    expect(rejected(s)).toEqual(['no commander power']);
  });
});

describe('passives (SPEC §11.10)', () => {
  it('Vesper: home spawners 10% faster; Armilla: capture ×1.25; Cordis: knit ×0.5 and merge radius 2', () => {
    const base = battle('vesper', { flags: { powers: false } });
    expect(base.config.modifiers?.some((m) => m.source === 'commander:vesper')).toBe(true);
    setBorders(base, 8, 24);
    const home = building(base, 'player', 'sporelingBurrow', 0, 0);
    const away = building(base, 'player', 'sporelingBurrow', 6, 0);
    // the interval is positional: resolved where each building stands, each time its timer resets
    const p = base.compiled.player.buildings.sporelingBurrow!.spawn!.positional!;
    const secs = content.buildings.sporelingBurrow!.spawn!.interval;
    expect(positionalValue(base, home, p, 'building.spawnInterval')).toBeCloseTo(secs * 0.91);
    expect(positionalValue(base, away, p, 'building.spawnInterval')).toBe(secs);
    const plain = createBattle(content, makeConfig(content, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' }));
    expect(battle('armilla').compiled.player.captureSpeed).toBe(1.25);
    expect(plain.compiled.player.captureSpeed).toBe(1);
    const c = battle('cordis');
    expect(c.compiled.player.knitTicks).toBe(plain.compiled.player.knitTicks / 2);
    expect(c.compiled.player.mergeRadius).toBe(2);
    expect(c.compiled.enemy.mergeRadius).toBe(plain.compiled.enemy.mergeRadius);
  });
});

describe('the auto policy and determinism', () => {
  it('Spore Burst aims at the densest knot of enemies, and waits when nothing is worth it', () => {
    const s = battle('vesper', { tick: 2000 });
    unit(s, 'enemy', 'sporeling', 20, 3);
    expect(autoPowerTarget(s, 'player')).toBeNull();
    for (let i = 0; i < 5; i++) unit(s, 'enemy', 'sporeling', 12 + (i % 2) * 0.5, 4 + i * 0.3);
    const p = autoPowerTarget(s, 'player')!;
    expect(p.x).toBeGreaterThanOrEqual(11.9);
    expect(p.x).toBeLessThanOrEqual(12.6);
  });

  it('a bot with powers replays to the same hash, and its uses are ordinary logged commands', () => {
    const config = makeConfig(content, { seed: 3, player: 'bot:balanced', enemy: 'general:scripted', commander: 'vesper', powerPolicy: 'auto', flags: POWERS });
    const run = () => {
      const s = createBattle(content, config);
      queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
      runHeadless(s, { until: 6000 });
      return s;
    };
    const a = run(), b = run();
    expect(hashState(a)).toBe(hashState(b));
    const uses = a.log.filter((c) => c.type === 'power');
    expect(uses.length).toBeGreaterThan(0);
    expect(a.stats.player.powerUses).toBe(uses.length);
    // a human never gets the policy, even if asked
    expect(makeConfig(content, { seed: 3, player: 'human', commander: 'vesper', powerPolicy: 'auto' }).player.powerPolicy).toBeUndefined();
  });

  it('battles without a commander power hash as they did before powers', () => {
    const s = createBattle(content, makeConfig(content, { seed: 1, player: 'bot:balanced', enemy: 'general:scripted', flags: POWERS }));
    expect(s.library.powers).toBeUndefined();
    expect(s.stats.player.powerUses).toBeUndefined();
    expect(s.compiled.player.powerCooldownMult).toBeUndefined();
    expect(s.sides.player.powerCooldown).toBe(0);
  });
});
