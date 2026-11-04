import { describe, expect, it } from 'vitest';
import { battleSave, powerSave, resumeBattle } from '../../src/run/index.ts';
import { hashValue } from '../../src/sim/hash.ts';
import { hashState, legalPlots, restore, runHeadless, snapshot, step } from '../../src/sim/index.ts';
import type { BattleState, Command, HeadlessUntil } from '../../src/sim/index.ts';
import { begin, content, humanPlan, playerScript, powerCommand, runBattle, scriptedBattle } from '../helpers.ts';

// round 2 plants a Sporeling Burrow, so its clash differs from round 1's, and from round 3 the colonies stand still
const plot = legalPlots(scriptedBattle(), 'player', 'sporelingBurrow')[0]!;
const script = (): Command[] => playerScript(9, { 2: [{ type: 'plant', buildingId: 'sporelingBurrow', plot }] });
function play() {
  const s = scriptedBattle();
  return { s, res: runHeadless(s, { until: 'end', commands: script(), hashEvery: 200 }) };
}

describe('determinism in rounds (SPEC §13.3, §15.5)', () => {
  it('the same config and commands give equal hashes at every phase boundary and every 200 clash ticks', () => {
    const a = play(), b = play();
    expect([a.s.stats.player.buildingsPlanted, a.s.stats.player.rejectedCommands]).toEqual([1, 0]);
    expect(a.res.hashes).toEqual(b.res.hashes);
    expect(a.res.finalHash).toBe(b.res.finalHash);
    for (let r = 1; r <= a.s.round; r++) {
      expect(Object.keys(a.res.hashes)).toEqual(expect.arrayContaining([`r${r}.planning`, `r${r}.clash`, `r${r}:200`, `r${r}.aftermath`]));
    }
    // without round 2's plant, round 1 is the same and round 2's clash isn't
    const other = runHeadless(scriptedBattle(), { until: 'end', commands: playerScript(9), hashEvery: 200 });
    expect(other.hashes['r1.aftermath']).toBe(a.res.hashes['r1.aftermath']);
    expect(other.hashes['r2.planning']).toBe(a.res.hashes['r2.planning']);
    expect(other.hashes['r2.clash']).not.toBe(a.res.hashes['r2.clash']);
  });

  it('a snapshot at any checkpoint or clash tick, restored and continued, gives the same final hash', () => {
    const whole = play();
    const stops: (HeadlessUntil | 'r2.planning')[] = [
      { round: 1, tick: 0 }, { round: 1, tick: 137 }, { round: 1 }, 'r2.planning', { round: 2, tick: 200 }, { round: 3, tick: 1 }, { round: 4 },
    ];
    for (const stop of stops) {
      const part = scriptedBattle();
      runHeadless(part, { until: stop === 'r2.planning' ? { round: 1 } : stop, commands: script() });
      if (stop === 'r2.planning') step(part); // the aftermath's step opens round 2
      const resumed = restore(snapshot(part));
      expect(hashState(resumed)).toBe(hashState(part));
      // the whole script again: the commands already run are skipped
      const rest = runHeadless(resumed, { until: 'end', commands: script(), hashEvery: 200 });
      expect(rest.finalHash, JSON.stringify(stop)).toBe(whole.res.finalHash);
      for (const [key, hash] of Object.entries(rest.hashes)) expect(hash, `${JSON.stringify(stop)} ${key}`).toBe(whole.res.hashes[key]);
    }
  });

  /**
   * A clash's own state as a hash: its units, hits in flight, clouds and lane locks, with ids counted from the
   * clash's first, ticks from its start and hit seqs from Begin's, so two clashes that play alike hash alike.
   */
  function clashHash(s: BattleState, base: number, start: number, seq: number): string {
    const id = (n: number) => (n > 0 ? n - base : n); // 0 is no unit
    const at = (t: number) => (t >= start ? t - start : t); // a unit that hasn't fought keeps its sentinel
    return hashValue({
      units: s.units.map((u) => ({
        ...u, id: id(u.id), targetId: id(u.targetId), lastCombatTick: at(u.lastCombatTick), lastAttackTick: at(u.lastAttackTick),
        knit: u.knit && { ...u.knit, group: id(u.knit.group), untilTick: at(u.knit.untilTick) },
      })),
      hits: s.hits.map((h) => ({ ...h, tick: at(h.tick), fireTick: at(h.fireTick), sourceId: id(h.sourceId), targetId: id(h.targetId), seq: h.seq - seq })),
      clouds: (s.clouds ?? []).map((c) => ({ ...c, id: id(c.id), fromTick: at(c.fromTick), untilTick: at(c.untilTick) })),
      lanes: s.clash!.lanes.map((l) => ({ ...l, endTick: at(l.endTick) })),
    });
  }

  // rounds 3 and 4 of the battle, where neither colony changes and no power fires: each tick's units, by id counted
  // from the clash's first, where they stand and their HP, and its `clashHash`; then the round's results
  function quietRounds() {
    const s = scriptedBattle();
    runHeadless(s, { until: { round: 2 }, commands: script() });
    const playRound = () => {
      step(s);
      const base = s.nextId, start = s.tick, seq = s.nextHitSeq;
      begin(s);
      const ticks: string[] = [], hashes: string[] = [];
      while (s.phase === 'clash') {
        step(s);
        ticks.push(JSON.stringify(s.units.map((u) => [u.id - base, u.unitId, u.tier, u.x, u.y, u.hp])));
        hashes.push(clashHash(s, base, start, seq));
      }
      const { lanes, damageByBuilding, survivorsByBuilding, fielded } = s.rounds.at(-1)!;
      // a lane's Heartcap damage follows the round's storm, which the clash doesn't see
      return { ticks, hashes, lanes: lanes.map(({ damage: _damage, ...lane }) => lane), damageByBuilding, survivorsByBuilding, fielded };
    };
    const third = playRound(), fourth = playRound();
    return { s, third, fourth };
  }
  let quiet: ReturnType<typeof quietRounds> | undefined;
  const quietOnce = () => (quiet ??= quietRounds());

  it('rounds 3 and 4 field the same colonies', () => {
    const { s, third, fourth } = quietOnce();
    expect([s.round, third.ticks.length > 200]).toEqual([4, true]);
    expect(fourth.fielded).toEqual(third.fielded);
  });

  // T149: the kept systems' staggers and periodic checks count from the clash's start, and phase a unit by its
  // arrival on its side, so they fall on the same ticks in both rounds
  it('a round in which neither colony changed and no power fired replays the last clash exactly', () => {
    const { third, fourth } = quietOnce();
    expect(fourth).toEqual(third);
  });

  it("a round with unchanged colonies replays the last clash's hashes tick for tick", () => {
    const { third, fourth } = quietOnce();
    const differs = fourth.hashes.findIndex((h, t) => h !== third.hashes[t]);
    expect([fourth.hashes.length, differs]).toEqual([third.hashes.length, -1]);
  });
});

// R2b/T092: a run's battle with your power fired 30 ticks into round 2's clash, saved where the page saves it
describe('resume from each save point (§8.9, §15.5)', () => {
  /** Queues your power for the next tick 30 ticks into round 2's clash, unless it's used or already queued; returns it. */
  function powerAt30(s: BattleState): Command | null {
    if (s.phase !== 'clash' || s.round !== 2 || s.tick - s.clash!.startTick !== 30) return null;
    if (s.sides.player.powerUsed || s.queue.some((c) => c.side === 'player' && c.type === 'power')) return null;
    return powerCommand(s);
  }

  /** Plays the battle to its end; with `saves`, keeps round 2's: its planning after the plant, Begin, and the power's. */
  function play(s: BattleState, saves?: Record<string, string>): void {
    let begun: BattleState | null = null;
    while (s.phase !== 'ended') {
      if (s.phase === 'planning') {
        const round2 = saves && s.round === 2;
        humanPlan(s, () => { if (round2) saves.planning = JSON.stringify(battleSave(s)); });
        if (round2) { saves.begin = JSON.stringify(battleSave(s)); begun = structuredClone(s); }
        continue;
      }
      const power = powerAt30(s);
      step(s);
      if (saves && power) saves.power = JSON.stringify(powerSave(begun!, power));
      // a save requested in the aftermath writes nothing, so the latest is still the power's
      if (saves && s.phase === 'aftermath' && s.round === 2) {
        expect(battleSave(s)).toBeNull();
        saves.aftermath ??= saves.power!;
      }
    }
  }

  it('a resume from round 2\'s planning, its Begin, the power and its aftermath matches the uninterrupted battle', () => {
    const whole = runBattle();
    const saves: Record<string, string> = {};
    play(whole, saves);
    expect(Object.keys(saves)).toEqual(['planning', 'begin', 'power', 'aftermath']);
    // the power fired: it ran in round 2, and nothing of yours was refused
    expect(whole.log.some((c) => c.side === 'player' && c.type === 'power' && c.round === 2)).toBe(true);
    expect(whole.stats.player.rejectedCommands).toBe(0);
    for (const [at, text] of Object.entries(saves)) {
      const back = resumeBattle(content, text, whole.config);
      expect(back, at).not.toBeNull();
      play(back!);
      expect(back!.outcome, at).toEqual(whole.outcome);
      expect(hashState(back!), at).toBe(hashState(whole));
    }
  });
});
