// The commander power in rounds (SPEC §6.6, §11.10, §14.5, §14.6): at most once per clash, from the clash's
// first tick with the muster's merged units on the field (#25), refused in planning, the aftermath, an ended
// battle and an ended lane (R2-Q11, A030, A053), and dropped rather than rejected when its clash ends first
// (A046). Spore Burst hits units, emplacements included and buildings never; Puppet Bloom lifts units one tier
// (R2-Q7); Rhizome Tithe pays for the clash's kills so far (R2-Q16); the Sporestorm Sigil makes each 50% stronger
// (A054, A086). The auto policy thinks every 20 ticks of the clash clock from its first tick. Cordis's passive is
// in commanders.test.ts.
import { describe, expect, it } from 'vitest';
import type { ScenarioDef } from '../../src/data/schema.ts';
import {
  bestBloom, burstPreview, commandStamp, createFromScenario, harvestGold, hashState, powerNow, powerOf, queueCommand, restore, runHeadless, SIDES,
  snapshot, step, survivingSupply,
} from '../../src/sim/index.ts';
import type { BattleState, Command, Flags, LibraryPower, Side, SimEvent, UnitState } from '../../src/sim/index.ts';
import { powerProblem } from '../../src/sim/powers.ts';
import { damageFor } from '../../src/sim/systems/combat.ts';
import { inMuster } from '../../src/sim/systems/clash.ts';
import { POWER_REFUSALS } from '../../src/app/phases/clash.ts';
import { begin, content, finishRound, playerScript, SCRIPTED_BATTLE, stepClash } from '../helpers.ts';

type Colony = NonNullable<ScenarioDef['sides']['player']['colony']>;
type ClashUnits = NonNullable<ScenarioDef['clash']>['units'];

const at = (building: string, lane: number, rank: number, file: number, merge = true): Colony[number] => ({ building, lane, rank, file, merge });

/** Round 1's planning with these colonies and the player's commander, both sides human (plan Call 8). */
function battle(commander: string | undefined, player: Colony, enemy: Colony = [], opts: { flags?: Partial<Flags>; enemyHp?: number } = {}): BattleState {
  return createFromScenario(content, {
    id: 'powers', description: 'A power test.', map: 'bogwater-hollow', ...(opts.flags ? { flags: opts.flags } : {}),
    sides: {
      player: { colony: player, ...(commander ? { commander } : {}) },
      enemy: { colony: enemy, ...(opts.enemyHp !== undefined ? { heartcapHp: opts.enemyHp } : {}) },
    },
  });
}

/** A clash with its units placed directly, its first tick still to run (a rule scenario's `clash` block). */
function clash(commander: string | undefined, units: ClashUnits, map = 'bogwater-hollow'): BattleState {
  return createFromScenario(content, {
    id: 'powers-clash', description: 'A power test.', map,
    sides: { player: commander ? { commander } : {}, enemy: {} },
    clash: { units },
  });
}

/** Queues a side's power as the UI does: stamped for the next tick in a clash, this phase's tick otherwise (§14.5). */
const power = (s: BattleState, aim: { x?: number; y?: number; lane?: number } = {}, side: Side = 'player'): Command =>
  queueCommand(s, { ...commandStamp(s), side, type: 'power', ...aim });

/** Nobody moves or attacks: every unit type's speed 0, and every unit's cooldown longer than a clash. */
function hold(s: BattleState): void {
  for (const side of SIDES) for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  for (const u of s.units) u.cooldown = 1e9;
}

const byKind = <T extends SimEvent['t']>(events: SimEvent[], t: T) => events.filter((e): e is Extract<SimEvent, { t: T }> => e.t === t);
const refusals = (events: SimEvent[]) => byKind(events, 'commandRejected').map((e) => e.reason);
const mine = (s: BattleState, side: Side): UnitState[] => s.units.filter((u) => u.side === side);
const clashTickOf = (s: BattleState) => s.tick - s.clash!.startTick;
const queuedPowers = (s: BattleState) => s.queue.filter((c) => c.type === 'power');
/** The side's power as it would act now, narrowed to its kind. */
const now = <K extends LibraryPower['kind']>(s: BattleState, kind: K): Extract<LibraryPower, { kind: K }> => {
  const def = powerNow(s, 'player');
  if (def?.kind !== kind) throw new Error(`no ${kind} power`);
  return def as Extract<LibraryPower, { kind: K }>;
};
/** The Sporestorm Sigil in force on the player (§11.7): its modifier, with the storm on its first step. */
function sigil(s: BattleState): BattleState {
  s.compiled.player.powerMods = [...content.relics.sporestormSigil!.effects.modifiers!];
  s.sporestorm = 1;
  return s;
}

describe('when the power may fire (§6.6, §14.5)', () => {
  it('is refused in planning, the aftermath and an ended battle', () => {
    const s = battle('vesper', [at('capguardHall', 0, 0, 1)], [at('sporelingBurrow', 0, 0, 1)]);
    expect(powerProblem(s, 'player', { x: 20, y: 4 })).toBe('wrongPhase');
    power(s, { x: 20, y: 4 });
    step(s);
    expect(refusals(s.events)).toEqual(['wrongPhase']);
    finishRound(s);
    expect(s.phase).toBe('aftermath');
    expect(powerProblem(s, 'player', { x: 20, y: 4 })).toBe('wrongPhase');
    // stamped in the aftermath, it runs at the next planning step, and is refused there
    power(s, { x: 20, y: 4 });
    step(s);
    expect(s.phase).toBe('planning');
    step(s);
    expect(refusals(s.events)).toEqual(['wrongPhase']);
    expect([s.sides.player.powerUsed, s.stats.player.powerUses, s.stats.player.rejectedCommands]).toEqual([false, 0, 2]);

    // the general's Heartcap falls in round 1's clash, so the battle ends after its aftermath
    const e = battle('vesper', [at('capguardHall', 0, 0, 1)], [], { enemyHp: 1 });
    finishRound(e);
    step(e);
    expect(e.phase).toBe('ended');
    expect(powerProblem(e, 'player', { x: 20, y: 4 })).toBe('wrongPhase');
    power(e, { x: 20, y: 4 });
    const h = hashState(e);
    step(e);
    expect(hashState(e)).toBe(h);
    expect(e.sides.player.powerUsed).toBe(false);
  });

  it('fires on the clash’s first tick, during the muster, and hits the merged units (#25)', () => {
    const s = battle('vesper', [at('capguardHall', 0, 0, 1)], [at('sporelingBurrow', 0, 0, 1), at('sporelingBurrow', 0, 0, 2)]);
    begin(s);
    const merged = mine(s, 'enemy').filter((u) => u.tier > 1);
    expect(merged.length).toBeGreaterThan(0);
    const fielded = new Set(s.units.map((u) => u.id));
    const target = merged[0]!;
    expect(powerProblem(s, 'player', { x: target.x, y: target.y })).toBeNull();
    power(s, { x: target.x, y: target.y });
    const events = stepClash(s);
    expect([clashTickOf(s), inMuster(s)]).toEqual([1, true]);
    const [used] = byKind(events, 'power');
    expect(used).toMatchObject({ side: 'player', power: 'sporeBurst', lifts: 0 });
    const hits = byKind(events, 'hit');
    expect(hits.length).toBe(used!.hits);
    expect(hits.map((h) => h.target)).toContain(target.id);
    // the muster's parts are gone before the first tick, so every hit lands on a unit Begin left standing
    for (const h of hits) expect(fielded.has(h.target)).toBe(true);
    expect([s.sides.player.powerUsed, s.stats.player.powerUses]).toEqual([true, 1]);
    expect(s.stats.player.powerDamage).toBeGreaterThan(0);
  });

  it('refuses a second use in the same clash, and an unused power doesn’t carry to the next clash', () => {
    const s = battle('vesper', [at('capguardHall', 0, 0, 1)], [at('sporelingBurrow', 0, 0, 1)]);
    const aim = (): { x: number; y: number } => ({ x: mine(s, 'enemy')[0]!.x, y: mine(s, 'enemy')[0]!.y });
    // round 1: unused
    finishRound(s);
    step(s);
    // round 2: once, and a second use refused
    begin(s);
    expect(s.sides.player.powerUsed).toBe(false);
    power(s, aim());
    expect(byKind(stepClash(s), 'power')).toHaveLength(1);
    expect(powerProblem(s, 'player', aim())).toBe('powerUsed');
    power(s, aim());
    const again = stepClash(s);
    expect([refusals(again), byKind(again, 'power').length]).toEqual([['powerUsed'], 0]);
    // round 3: ready again at the arrival
    finishRound(s);
    step(s);
    begin(s);
    expect(s.sides.player.powerUsed).toBe(false);
    power(s, aim());
    expect(byKind(stepClash(s), 'power')).toHaveLength(1);
    expect([s.stats.player.powerUses, s.stats.player.rejectedCommands]).toEqual([2, 1]);
  });

  it('refuses a power aimed at a lane whose clash is over, and a burst skips that lane’s units (R2-Q11, A030, A053)', () => {
    // Twin Roots: lane 0 holds only the general's unit, so it ends on the first tick; lane 1 fights on
    const s = clash('vesper', [
      { side: 'player', unit: 'sporeling', x: 4, y: 9 },
      { side: 'enemy', unit: 'sporeling', x: 20, y: 5.5 },
      { side: 'enemy', unit: 'sporeling', x: 20, y: 7.5 },
    ], 'twin-roots');
    hold(s);
    stepClash(s);
    expect([s.clash!.lanes[0]!.ended, s.clash!.lanes[1]!.ended]).toEqual([true, false]);
    expect(powerProblem(s, 'player', { x: 20, y: 3 })).toBe('laneEnded');
    expect(POWER_REFUSALS.laneEnded).toBe("this lane's clash is over");
    power(s, { x: 20, y: 3 });
    expect(refusals(stepClash(s))).toEqual(['laneEnded']);
    expect(s.sides.player.powerUsed).toBe(false);
    // aimed at the wall between the lanes, its 2 tiles reach both units, but the ended lane holds still
    const [frozenUnit, live] = mine(s, 'enemy');
    const hp = frozenUnit!.hp;
    power(s, { x: 20, y: 6.5 });
    const hits = byKind(stepClash(s), 'hit');
    expect(hits.map((h) => h.target)).toEqual([live!.id]);
    expect(frozenUnit!.hp).toBe(hp);
  });
});

describe('Spore Burst and Puppet Bloom (§11.10, §6.6, §6.7)', () => {
  it('Spore Burst deals 90 crush to every enemy unit within 2 tiles, emplacements included', () => {
    const s = clash('vesper', [
      { side: 'player', unit: 'sporeling', x: 4, y: 4 },
      { side: 'enemy', unit: 'puffballMortar', x: 20, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 20, y: 5.5 },
      // a sporeling's body is 0.25 tiles: its centre 2.2 tiles away is touched, 2.3 isn't
      { side: 'enemy', unit: 'sporeling', x: 22.2, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 22.3, y: 4 },
    ]);
    hold(s);
    const [mortar, near, edge, out] = mine(s, 'enemy');
    power(s, { x: 20, y: 4 });
    const hits = byKind(stepClash(s), 'hit');
    expect(hits.map((h) => h.target)).toEqual([mortar!.id, near!.id, edge!.id]);
    const dmg = (u: UnitState) => damageFor(s.rules, 90, 'crush', 1, 1, s.compiled.enemy.units[u.unitId]!.armor, u.tier, 1);
    expect(hits.map((h) => h.amount)).toEqual([dmg(mortar!), dmg(near!), dmg(edge!)]);
    expect(mortar!.hp).toBe(500 - dmg(mortar!));
    expect(out!.hp).toBe(out!.maxHp);
  });

  it('Spore Burst never hits a building', () => {
    const s = battle('vesper', [at('capguardHall', 0, 0, 1)], [at('puffballMortar', 0, 0, 2), at('sporelingBurrow', 0, 0, 1)]);
    begin(s);
    const mortar = mine(s, 'enemy').find((u) => u.unitId === 'puffballMortar')!;
    const buildings = JSON.stringify(s.buildings);
    power(s, { x: mortar.x, y: mortar.y });
    const events = stepClash(s);
    const hits = byKind(events, 'hit');
    expect(hits.map((h) => h.target)).toContain(mortar.id);
    expect(hits.length).toBe(byKind(events, 'power')[0]!.hits);
    for (const h of hits) expect(s.units.some((u) => u.id === h.target) || byKind(events, 'died').some((d) => d.id === h.target)).toBe(true);
    expect(JSON.stringify(s.buildings)).toBe(buildings);
  });

  it('Puppet Bloom lifts each of your units within 3 tiles one tier where it stands, even in combat, its HP in proportion (R2-Q7)', () => {
    const s = clash('cordis', [
      // two sporelings and a Bloomed one within 3 tiles of the point, and one 4.5 tiles off
      { side: 'player', unit: 'sporeling', x: 8, y: 2 },
      { side: 'player', unit: 'sporeling', x: 8, y: 3 },
      { side: 'player', unit: 'sporeling', tier: 2, x: 9, y: 2.5 },
      { side: 'player', unit: 'sporeling', x: 8, y: 7 },
      { side: 'enemy', unit: 'sporeling', x: 28, y: 4 },
    ]);
    hold(s);
    // in combat, so none could knit on its own
    for (const u of mine(s, 'player')) u.lastCombatTick = 0;
    const [half, full, bloomed, far] = mine(s, 'player');
    half!.hp = 36;
    const ids = mine(s, 'player').map((u) => u.id);
    power(s, { x: 8.5, y: 2.5 });
    const events = stepClash(s);
    expect(byKind(events, 'power')[0]).toMatchObject({ power: 'puppetBloom', hits: 0, lifts: 3 });
    expect([half, full, bloomed, far].map((u) => u!.tier)).toEqual([2, 2, 3, 1]);
    const [, t2, t3] = s.compiled.player.units.sporeling!.tiers;
    expect([half!.maxHp, half!.hp, full!.hp, bloomed!.maxHp]).toEqual([t2.hp, Math.round(t2.hp / 2), t2.hp, t3.hp]);
    expect([full!.supply, bloomed!.supply, far!.supply]).toEqual([2, 4, 1]);
    // the same units, lifted where they stand: no knit, no merge counted, and the Elder counted alive
    expect(mine(s, 'player').map((u) => u.id)).toEqual(ids);
    expect([byKind(events, 'merged'), s.stats.player.merges]).toEqual([[], { '2': 0, '3': 0 }]);
    expect([s.stats.player.powerLifts, s.clash!.maxElders.player]).toEqual([3, 1]);
  });

  it('ends a lane when it kills the side’s last units there (§6.7)', () => {
    const s = clash('vesper', [
      { side: 'player', unit: 'sporeling', x: 4, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 20, y: 4, count: 2, rows: 2 },
    ]);
    hold(s);
    for (const u of mine(s, 'enemy')) u.hp = 10;
    power(s, { x: 20, y: 4.3 });
    const events = stepClash(s);
    expect(byKind(events, 'laneWon')).toEqual([{ t: 'laneWon', lane: 0, winner: 'player', survivors: { player: 1, enemy: 0 }, capped: false }]);
    expect([clashTickOf(s), s.phase]).toEqual([1, 'aftermath']);
  });

  it('drops a power still queued when the clash ends, without counting it as rejected (A046)', () => {
    // the general fields nothing, so the clash ends on its first tick
    const s = clash('vesper', [{ side: 'player', unit: 'sporeling', x: 4, y: 4 }]);
    const cmd = queueCommand(s, { round: s.round, tick: s.tick + 2, side: 'player', type: 'power', x: 20, y: 4 });
    const events = stepClash(s);
    expect(s.phase).toBe('aftermath');
    expect(byKind(events, 'commandDropped')).toEqual([{ t: 'commandDropped', side: 'player', seq: cmd.seq }]);
    expect([s.queue.length, s.log.some((c) => c.seq === cmd.seq && c.side === 'player'), s.stats.player.rejectedCommands]).toEqual([0, false, 0]);
    step(s);
    step(s);
    expect(s.stats.player.rejectedCommands).toBe(0);
  });

  it('Rhizome Tithe pays 2 gold per enemy supply killed so far this clash, a Bloomed unit at its own supply and an emplacement at 0, as clash gold (R2-Q16, R2-Q20)', () => {
    const s = clash('armilla', [
      { side: 'player', unit: 'capguard', x: 4, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 20, y: 2 },
      { side: 'enemy', unit: 'sporeling', tier: 2, x: 20, y: 4 },
      { side: 'enemy', unit: 'puffballMortar', x: 24, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 28, y: 6 },
    ]);
    hold(s);
    expect(powerOf(s, 'player')).toMatchObject({ kind: 'harvest', target: 'none', goldPerSupply: 2 });
    const [one, bloomed, mortar] = mine(s, 'enemy');
    for (const u of [one!, bloomed!, mortar!]) u.hp = 0;
    stepClash(s);
    expect(s.clash!.killedSupply).toEqual({ player: 3, enemy: 0 });
    expect(harvestGold(s, 'player', now(s, 'harvest'))).toBe(6);
    const gold = s.sides.player.gold, fromClash = s.stats.player.goldEarned.clash;
    power(s);
    const events = stepClash(s);
    expect(byKind(events, 'power')).toEqual([{ t: 'power', side: 'player', power: 'rhizomeTithe', hits: 0, lifts: 0, gold: 6 }]);
    expect(byKind(events, 'gold')).toEqual([{ t: 'gold', side: 'player', amount: 6, source: 'clash' }]);
    expect([s.sides.player.gold - gold, s.stats.player.goldEarned.clash - fromClash, s.stats.player.powerGold]).toEqual([6, 6, 6]);
  });

  it('fires Rhizome Tithe at 0 kills, which pays 0, and counts no kill of its own side', () => {
    const s = clash('armilla', [{ side: 'player', unit: 'capguard', x: 4, y: 4 }, { side: 'enemy', unit: 'sporeling', x: 20, y: 4 }]);
    hold(s);
    expect(powerProblem(s, 'player', {})).toBeNull();
    power(s);
    const events = stepClash(s);
    expect(byKind(events, 'power')[0]).toMatchObject({ power: 'rhizomeTithe', gold: 0 });
    expect(byKind(events, 'gold')).toEqual([]);
    expect([s.stats.player.powerUses, s.stats.player.powerGold, s.clash!.killedSupply]).toEqual([1, 0, { player: 0, enemy: 0 }]);
    // no clash counts kills when no side's power is a harvest
    expect(clash('vesper', [{ side: 'player', unit: 'capguard', x: 4, y: 4 }]).clash!.killedSupply).toBeUndefined();
  });
});

describe('the Sporestorm Sigil per power (§6.6, §11.7, A054, A086)', () => {
  it('makes Spore Burst deal 135 in the same 2 tiles once the storm is on, and its preview shows it', () => {
    const units: ClashUnits = [{ side: 'player', unit: 'sporeling', x: 4, y: 4 }, { side: 'enemy', unit: 'capguard', x: 20, y: 4 }];
    const plain = clash('vesper', units);
    expect(now(plain, 'burst')).toMatchObject({ damage: 90, radius: 2 });
    const s = sigil(clash('vesper', units));
    hold(s);
    expect(now(s, 'burst')).toMatchObject({ damage: 135, radius: 2 });
    const dmg = damageFor(s.rules, 135, 'crush', 1, 1, 'medium', 1, 1);
    expect(burstPreview(s, 'player', now(s, 'burst'), 20, 4)).toEqual({ targets: 1, value: dmg });
    power(s, { x: 20, y: 4 });
    expect(byKind(stepClash(s), 'hit').map((h) => h.amount)).toEqual([dmg]);
    // before the storm's first round it does nothing
    s.sporestorm = 0;
    expect(now(s, 'burst').damage).toBe(90);
  });

  it('makes Rhizome Tithe pay 3 a supply', () => {
    const s = sigil(clash('armilla', [
      { side: 'player', unit: 'capguard', x: 4, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 20, y: 2, count: 4, rows: 4 },
      { side: 'enemy', unit: 'sporeling', x: 28, y: 6 },
    ]));
    hold(s);
    for (const u of mine(s, 'enemy').slice(0, 4)) u.hp = 0;
    stepClash(s);
    expect([now(s, 'harvest').goldPerSupply, harvestGold(s, 'player', now(s, 'harvest'))]).toEqual([3, 12]);
    power(s);
    expect(byKind(stepClash(s), 'power')[0]).toMatchObject({ gold: 12 });
  });

  it('makes Puppet Bloom reach 4.5 tiles', () => {
    const units: ClashUnits = [
      { side: 'player', unit: 'sporeling', x: 8, y: 2 },
      // 4.5 tiles from the point, its body 0.25 inside 4.5 but outside 3
      { side: 'player', unit: 'sporeling', x: 8, y: 6.5 },
      { side: 'enemy', unit: 'sporeling', x: 28, y: 4 },
    ];
    const plain = clash('cordis', units), s = sigil(clash('cordis', units));
    expect([now(plain, 'bloom').radius, now(s, 'bloom').radius]).toEqual([3, 4.5]);
    expect([bestBloom(plain, 'player')?.lifts, bestBloom(s, 'player')?.lifts]).toEqual([1, 2]);
    hold(s);
    power(s, { x: 8, y: 2 });
    expect(byKind(stepClash(s), 'power')[0]).toMatchObject({ lifts: 2 });
  });
});

describe('the auto policy (§14.6 clash step 4, plan Call 9)', () => {
  it('thinks every 20 ticks of the clash clock, from the clash’s first tick', () => {
    // three of the general's sporelings, apart: a burst on one is worth less than 180
    const s = clash('vesper', [
      { side: 'player', unit: 'sporeling', x: 4, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 14, y: 1 },
      { side: 'enemy', unit: 'sporeling', x: 20, y: 4 },
      { side: 'enemy', unit: 'sporeling', x: 26, y: 7 },
    ]);
    s.config.player.powerPolicy = 'auto';
    hold(s);
    const twin = restore(snapshot(s));
    const both = (f: (b: BattleState) => void) => { f(s); f(twin); };
    const queued = () => s.queue.filter((c) => c.type === 'power');
    both((b) => stepClash(b, 5));
    expect(queued()).toEqual([]);
    // packed after the first think, so worth 3 × 72: the policy waits for its next think
    both((b) => mine(b, 'enemy').forEach((u, i) => { u.x = 20 + 0.3 * i; u.y = 4; }));
    for (let t = 6; t <= 20; t++) {
      both((b) => stepClash(b));
      expect(queued(), `clash tick ${t}`).toEqual([]);
    }
    both((b) => stepClash(b));
    expect(clashTickOf(s)).toBe(21);
    expect(queued()).toMatchObject([{ round: 1, tick: s.clash!.startTick + 22, side: 'player', type: 'power' }]);
    both((b) => stepClash(b));
    expect(byKind(s.events, 'power')[0]).toMatchObject({ side: 'player', hits: 3 });
    expect(hashState(twin)).toBe(hashState(s));
  });

  it('fires from each clash’s own clock, and plays the same battle twice the same way', () => {
    const def: ScenarioDef = { ...SCRIPTED_BATTLE, sides: { ...SCRIPTED_BATTLE.sides, player: { ...SCRIPTED_BATTLE.sides.player, commander: 'vesper' } } };
    const run = () => {
      const s = createFromScenario(content, def);
      s.config.player.powerPolicy = 'auto';
      const starts: Record<number, number> = {};
      // the policy's commands take the side's next seq, so the script's leave room for them
      const commands = playerScript(9).map((c) => ({ ...c, seq: c.round * 100 }));
      const res = runHeadless(s, { until: 'end', commands, onTick: (b) => { starts[b.round] = b.clash!.startTick; } });
      return { s, starts, hash: res.finalHash };
    };
    const a = run(), b = run();
    expect(b.hash).toBe(a.hash);
    const uses = a.s.log.filter((c) => c.type === 'power');
    expect(uses.length).toBe(a.s.stats.player.powerUses);
    expect(new Set(uses.map((c) => c.round)).size).toBe(uses.length);
    expect(uses.filter((c) => a.starts[c.round]! > 0).length).toBeGreaterThan(0);
    // each was thought on a think tick, clash tick 1, 21, 41 …, and runs on the tick after
    for (const c of uses) expect((c.tick - a.starts[c.round]! - 2) % 20, `round ${c.round}`).toBe(0);
    expect(a.s.stats.player.rejectedCommands).toBe(0);
  });
});

describe('the auto policy for Puppet Bloom and Rhizome Tithe (R2-Q7, R2-Q16)', () => {
  it('fires Puppet Bloom on its first think, at the point where the lift adds most supply', () => {
    const s = clash('cordis', [
      { side: 'player', unit: 'sporeling', x: 6, y: 2 },
      { side: 'player', unit: 'gillArcher', x: 14, y: 6 },
      { side: 'player', unit: 'gillArcher', x: 14.5, y: 6.5 },
      { side: 'enemy', unit: 'sporeling', x: 28, y: 4 },
    ]);
    s.config.player.powerPolicy = 'auto';
    hold(s);
    expect(bestBloom(s, 'player')).toEqual({ x: 14, y: 6, lifts: 2, value: 4 });
    stepClash(s);
    expect(queuedPowers(s)).toMatchObject([{ side: 'player', tick: s.clash!.startTick + 2, x: 14, y: 6 }]);
    stepClash(s);
    expect(byKind(s.events, 'power')[0]).toMatchObject({ lifts: 2 });
    expect(mine(s, 'player').map((u) => u.tier)).toEqual([1, 2, 2]);
  });

  it('fires Rhizome Tithe on the first think once a side in a lane still fighting is down to 25% of the supply it fielded there', () => {
    const s = battle('armilla', [at('capguardHall', 0, 0, 1)], [at('sporelingBurrow', 0, 0, 1, false), at('sporelingBurrow', 0, 0, 2, false)]);
    s.config.player.powerPolicy = 'auto';
    begin(s);
    hold(s);
    expect(survivingSupply(s, 'enemy', 0)).toBe(16);
    const kill = (n: number) => mine(s, 'enemy').filter((u) => u.hp > 0).slice(0, n).forEach((u) => { u.hp = 0; });
    stepClash(s);
    kill(11);
    // 5 of 16 left at clash tick 21's think: 31%
    stepClash(s, 20);
    expect([clashTickOf(s), queuedPowers(s)]).toEqual([21, []]);
    kill(1);
    // 4 of 16 at clash tick 41's think: 25%, so it fires on the next tick
    stepClash(s, 20);
    expect(queuedPowers(s)).toMatchObject([{ side: 'player', tick: s.clash!.startTick + 42 }]);
    stepClash(s);
    expect(byKind(s.events, 'power')[0]).toMatchObject({ power: 'rhizomeTithe', gold: 24 });
  });

  it('fires Rhizome Tithe on the first think from 40 s of clash time, at 0 kills, and replays to the same hash', () => {
    const s = battle('armilla', [at('capguardHall', 0, 0, 1)], [at('sporelingBurrow', 0, 0, 1)]);
    s.config.player.powerPolicy = 'auto';
    begin(s);
    hold(s);
    const twin = restore(snapshot(s));
    const both = (f: (b: BattleState) => void) => { f(s); f(twin); };
    // the last think before 40 s is clash tick 781
    both((b) => stepClash(b, 800));
    expect(queuedPowers(s)).toEqual([]);
    both((b) => stepClash(b));
    expect(queuedPowers(s)).toMatchObject([{ side: 'player', tick: s.clash!.startTick + 802 }]);
    both((b) => stepClash(b));
    expect(byKind(s.events, 'power')[0]).toMatchObject({ power: 'rhizomeTithe', gold: 0 });
    expect([s.phase, s.stats.player.powerUses, s.stats.player.powerGold]).toEqual(['clash', 1, 0]);
    expect(hashState(twin)).toBe(hashState(s));
  });
});
