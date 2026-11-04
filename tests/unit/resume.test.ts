// Battle saves between rounds (SPEC §8.9, §13.8, §14.5; R2b/T091): a battle saves at each planning phase, once
// the general has planned and any draft's offer is set, with every plant and sale made; at Begin; and when the
// power fires (R2-Q22). Resume replays the saved human commands from the battle's config, checks the hash, and
// continues in that planning phase or at the clash's first tick. A save of any version but 3 is refused (A089).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BATTLE_KEY, MemoryStorage, battleSave, powerSave, resumeBattle, saveBattle } from '../../src/run/index.ts';
import { hashState, legalPlots, plantProblem, powerProblem, step } from '../../src/sim/index.ts';
import type { BattleState, Command } from '../../src/sim/index.ts';
import { command, content, playOn, powerCommand, runBattle } from '../helpers.ts';

/** The battle rebuilt from its save as the page stores it, or null when it can't be. */
const resume = (s: BattleState, text = JSON.stringify(battleSave(s))): BattleState | null => resumeBattle(content, text, s.config);

/** Plants `n` cards of the kit, in its order, each on the first plot it can go on. */
function plantSome(s: BattleState, n: number): void {
  for (const { building } of s.sides.player.kit) {
    if (s.buildings.filter((b) => b.side === 'player').length === n) return;
    const plot = legalPlots(s, 'player', building).find((p) => !plantProblem(s, 'player', building, p));
    if (plot !== undefined) command(s, 'player', { type: 'plant', buildingId: building, plot });
  }
}

/** Fires your power at the general's first unit, on the next tick, and steps to it. */
function firePower(s: BattleState): Command {
  const cmd = powerCommand(s);
  step(s);
  return cmd;
}

describe('battle saves between rounds (§8.9)', () => {
  it('a round-1 planning save with plants made resumes to the same hash, with the same gold', () => {
    const s = runBattle();
    plantSome(s, 2);
    expect(s.buildings.filter((b) => b.side === 'player')).toHaveLength(2);
    const save = battleSave(s)!;
    expect(save).toMatchObject({ v: 3, round: 1, phase: 'planning', pending: [] });
    expect(save.commands.map((c) => c.type)).toEqual(['plant', 'plant']);
    const back = resume(s)!;
    expect(back).not.toBeNull();
    expect([back.round, back.phase]).toEqual([1, 'planning']);
    expect(hashState(back)).toBe(hashState(s));
    expect(back.sides.player.gold).toBe(s.sides.player.gold);
    expect(back.buildings.filter((b) => b.side === 'player').map((b) => [b.buildingId, b.plot]))
      .toEqual(s.buildings.filter((b) => b.side === 'player').map((b) => [b.buildingId, b.plot]));
  });

  it('a planning save with an open draft resumes with the same offer, and so does one after a reroll', () => {
    const s = runBattle();
    playOn(s, (x) => x.phase === 'planning' && !!x.sides.player.draft);
    expect(s.round).toBe(3);
    const offer = structuredClone(s.sides.player.draft);
    const back = resume(s)!;
    expect(hashState(back)).toBe(hashState(s));
    expect(back.sides.player.draft).toEqual(offer);
    command(s, 'player', { type: 'draftReroll' });
    expect(s.sides.player.draft).not.toEqual(offer);
    const rerolled = resume(s)!;
    expect(hashState(rerolled)).toBe(hashState(s));
    expect(rerolled.sides.player.draft).toEqual(s.sides.player.draft);
    expect(rerolled.sides.player.gold).toBe(s.sides.player.gold);
  });

  it("a Begin save resumes at the clash's first tick, and both copies run to the same hash", () => {
    const s = runBattle();
    playOn(s, (x) => x.round === 2 && x.phase === 'clash');
    expect(s.tick).toBe(s.clash!.startTick);
    const back = resume(s)!;
    expect([back.round, back.phase, back.tick]).toEqual([2, 'clash', s.tick]);
    expect(hashState(back)).toBe(hashState(s));
    playOn(s);
    playOn(back);
    expect(back.outcome).toEqual(s.outcome);
    expect(hashState(back)).toBe(hashState(s));
  });

  it('a save requested in a clash or an aftermath writes nothing, so the Begin save stays the latest', () => {
    const s = runBattle();
    const storage = new MemoryStorage();
    playOn(s, (x) => x.phase === 'clash');
    saveBattle(storage, battleSave(s)!);
    const begun = storage.get(BATTLE_KEY);
    step(s);
    expect(battleSave(s)).toBeNull();
    playOn(s, (x) => x.phase === 'aftermath');
    expect(battleSave(s)).toBeNull();
    expect(storage.get(BATTLE_KEY)).toBe(begun);
    expect(JSON.parse(begun!)).toMatchObject({ v: 3, round: 1, phase: 'clash' });
  });

  it("a power fired in a clash is saved, and replays at its tick on resume, so it can't fire again in that clash (A087)", () => {
    const s = runBattle();
    playOn(s, (x) => x.phase === 'clash');
    const begin = structuredClone(s);
    for (let i = 0; i < 30; i++) step(s);
    const power = firePower(s);
    expect(s.sides.player.powerUsed).toBe(true);
    const save = powerSave(begin, power);
    expect(save).toMatchObject({ v: 3, round: 1, phase: 'clash', pending: [power] });
    const back = resume(s, JSON.stringify(save))!;
    expect([back.phase, back.tick, back.sides.player.powerUsed]).toEqual(['clash', begin.tick, false]);
    // the clash runs live again, and the power goes off at its tick, as it did
    while (back.tick < power.tick) step(back);
    expect(back.events.some((e) => e.t === 'power' && e.side === 'player')).toBe(true);
    expect(hashState(back)).toBe(hashState(s));
    const { x, y } = power as Extract<Command, { type: 'power' }>;
    expect(powerProblem(back, 'player', { x: x!, y: y! })).toBe('powerUsed');
  });

  it('a power logged in an earlier clash replays at its tick', () => {
    const s = runBattle();
    playOn(s, (x) => x.phase === 'clash');
    for (let i = 0; i < 30; i++) step(s);
    const power = firePower(s);
    playOn(s, (x) => x.round === 2);
    expect(s.log).toContainEqual(power);
    const back = resume(s)!;
    expect(back.log).toContainEqual(power);
    expect(hashState(back)).toBe(hashState(s));
  });

  it("a save of another version, or another battle's, or whose hash differs, is refused (A089)", () => {
    const s = runBattle();
    plantSome(s, 1);
    const save = battleSave(s)!;
    const v1 = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'saves', 'v1', 'battle-v2.json'), 'utf8');
    for (const text of [
      JSON.stringify({ ...save, v: 2 }), JSON.stringify({ ...save, v: undefined }), v1, 'not a save', 'null',
      JSON.stringify({ ...save, hash: 'x' }), JSON.stringify({ ...save, commands: [] }),
    ]) expect(resume(s, text), text.slice(0, 40)).toBeNull();
    expect(resumeBattle(content, JSON.stringify(save), runBattle(10).config)).toBeNull();
    expect(resume(s, JSON.stringify(save))).not.toBeNull();
  });
});
