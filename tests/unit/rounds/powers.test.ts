// The commander power in rounds (SPEC §6.6, §11.10, §14.5, §14.6): at most once per clash, from the clash's
// first tick with the muster's merged units on the field (#25), refused in planning, the aftermath, an ended
// battle and an ended lane (R2-Q11, A030, A053), dropped rather than rejected when its clash ends first
// (A046), and Rhizome Tithe refused until R2b (plan Call 19). Spore Burst and Puppet Bloom keep their v1
// effects on units, emplacements included and buildings never. The auto policy thinks every 20 ticks of the
// clash clock from its first tick. Cordis's passive is kept: a wider muster, and quicker knits after it.
import { describe, expect, it } from 'vitest';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import {
  commandStamp, createFromScenario, hashState, mergePreview, queueCommand, restore, runHeadless, SIDES, snapshot, step,
} from '../../../src/sim/rounds/index.ts';
import type { BattleState, Command, Flags, Side, SimEvent, UnitState } from '../../../src/sim/rounds/index.ts';
import { autoPowerTarget, powerProblem } from '../../../src/sim/rounds/powers.ts';
import { damageFor } from '../../../src/sim/rounds/systems/combat.ts';
import { inMuster } from '../../../src/sim/rounds/systems/clash.ts';
import { POWER_REFUSALS } from '../../../src/app/rounds/phases/clash.ts';
import { begin, content, finishRound, playerScript, SCRIPTED_BATTLE, stepClash } from '../../roundHelpers.ts';

type Colony = NonNullable<RoundScenarioDef['sides']['player']['colony']>;
type ClashUnits = NonNullable<RoundScenarioDef['clash']>['units'];

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
    expect(used).toMatchObject({ side: 'player', power: 'sporeBurst', merges: 0 });
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

  it('Puppet Bloom merges every same-type trio within 3 tiles at once, even in combat', () => {
    const s = clash('cordis', [
      // six sporelings in a 3-tile circle, three more 4.7 tiles away
      { side: 'player', unit: 'sporeling', x: 8, y: 2, count: 6, rows: 2 },
      { side: 'player', unit: 'sporeling', x: 8, y: 7, count: 3, rows: 1 },
      { side: 'enemy', unit: 'sporeling', x: 28, y: 4 },
    ]);
    hold(s);
    // in combat, so none could knit on its own
    for (const u of mine(s, 'player')) u.lastCombatTick = 0;
    const far = mine(s, 'player').slice(6).map((u) => u.id);
    power(s, { x: 8.6, y: 2.3 });
    const events = stepClash(s);
    expect(byKind(events, 'power')[0]).toMatchObject({ power: 'puppetBloom', hits: 0, merges: 2 });
    expect(byKind(events, 'merged').map((e) => [e.side, e.tier])).toEqual([['player', 2], ['player', 2]]);
    expect(mine(s, 'player').map((u) => u.tier).sort()).toEqual([1, 1, 1, 2, 2]);
    expect(mine(s, 'player').filter((u) => u.tier === 1).map((u) => u.id)).toEqual(far);
    expect(s.stats.player.powerMerges).toBe(2);
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

  it('refuses Rhizome Tithe with notInRoundsYet until R2b, and the auto policy skips it (plan Call 19)', () => {
    const s = clash('armilla', [{ side: 'player', unit: 'capguard', x: 4, y: 4 }, { side: 'enemy', unit: 'sporeling', x: 20, y: 4 }]);
    s.config.player.powerPolicy = 'auto';
    expect(powerProblem(s, 'player', {})).toBe('notInRoundsYet');
    expect(autoPowerTarget(s, 'player')).toBeNull();
    power(s);
    const events = stepClash(s);
    expect(refusals(events)).toEqual(['notInRoundsYet']);
    expect(s.queue).toEqual([]);
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
    const def: RoundScenarioDef = { ...SCRIPTED_BATTLE, sides: { ...SCRIPTED_BATTLE.sides, player: { ...SCRIPTED_BATTLE.sides.player, commander: 'vesper' } } };
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

describe('Cordis’s passive under the muster (§11.10, R2-Q7)', () => {
  const gills = [at('gillNest', 0, 0, 1), at('gillNest', 0, 0, 2), at('gillNest', 0, 0, 3)];

  it('a merge radius of 2.0 lets the muster knit across squads it couldn’t reach', () => {
    const tiers = (s: BattleState) => mine(s, 'player').map((u) => u.tier).sort();
    const plain = battle(undefined, gills), cordis = battle('cordis', gills);
    expect([plain.compiled.player.mergeRadius, cordis.compiled.player.mergeRadius]).toEqual([1.5, 2]);
    const preview = (s: BattleState) => Object.values(mergePreview(s, 'player').byBuilding).reduce((n, b) => [n[0]! + b.elders, n[1]! + b.bloomed, n[2]! + b.base], [0, 0, 0]);
    expect([preview(plain), preview(cordis)]).toEqual([[0, 4, 0], [1, 1, 0]]);
    begin(plain);
    begin(cordis);
    expect([tiers(plain), tiers(cordis)]).toEqual([[2, 2, 2, 2], [2, 3]]);
  });

  it('halves knit time, which acts only on the field after the muster', () => {
    // the muster is instant either way: Begin's step leaves nothing knitting
    const b = battle('cordis', gills);
    const beginEvents = begin(b);
    expect([byKind(beginEvents, 'knitStart').length, b.units.some((u) => u.knit)]).toEqual([0, false]);
    // three sporelings placed together knit on the field from the clash's 10th tick
    const knitDone = (commander?: string) => {
      const s = clash(commander, [{ side: 'player', unit: 'sporeling', x: 6, y: 4, count: 3, rows: 3, dy: 0.5 }, { side: 'enemy', unit: 'sporeling', x: 28, y: 4 }]);
      hold(s);
      for (let i = 0; i < 60 && !byKind(s.events, 'merged').length; i++) stepClash(s);
      return [s.compiled.player.knitTicks, clashTickOf(s)];
    };
    expect(knitDone()).toEqual([20, 30]);
    expect(knitDone('cordis')).toEqual([10, 20]);
  });
});
