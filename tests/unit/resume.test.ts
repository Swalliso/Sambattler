import { describe, expect, it } from 'vitest';
import { battleSave, chooseNode, createRun, resumeBattle } from '../../src/run/index.ts';
import type { BattleSave } from '../../src/run/index.ts';
import { createBattle, hashState, legalPlacements, queueCommand, runHeadless, step } from '../../src/sim/index.ts';
import type { BattleState, CommandBody } from '../../src/sim/index.ts';
import { content } from '../helpers.ts';

function deploy(): BattleState {
  const run = createRun(content, { seed: 9 });
  chooseNode(content, run, 0);
  if (run.screen.kind !== 'battle') throw new Error('expected battle');
  return createBattle(content, run.screen.config);
}

function held(): BattleState {
  const state = deploy();
  queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
  runHeadless(state, { until: 2400 });
  expect(state.held).toBe(true);
  return state;
}

function issue(state: BattleState, body: CommandBody): void {
  queueCommand(state, { ...body, side: 'player', tick: state.tick + 1 });
}

function resume(state: BattleState): BattleState {
  const saved = JSON.parse(JSON.stringify(battleSave(state))) as BattleSave;
  const resumed = resumeBattle(content, saved);
  expect(hashState(resumed)).toBe(hashState(state));
  expect(resumed.log).toEqual(state.log);
  expect(resumed.queue).toEqual(state.queue);
  return resumed;
}

function legacy(state: BattleState): BattleSave {
  const saved = battleSave(state);
  return JSON.parse(JSON.stringify({
    config: saved.config, commands: [...saved.commands, ...saved.pending!], tick: saved.tick, hash: saved.hash,
  })) as BattleSave;
}

describe('battle save command boundaries', () => {
  it.each(['draftPick', 'draftSkip', 'draftReroll'] as const)('preserves a pending %s without executing it', (type) => {
    const state = held();
    issue(state, type === 'draftPick' ? { type, cardId: state.sides.player.draft!.offer[0]!.id } : { type });
    const resumed = resume(state);
    expect(resumed.held).toBe(true);
    expect(resumed.sides.player.draft).toEqual(state.sides.player.draft);
    step(state);
    step(resumed);
    expect(hashState(resumed)).toBe(hashState(state));
  });

  it.each(['draftPick', 'draftSkip'] as const)('replays an executed %s without advancing the held tick', (type) => {
    const state = held();
    issue(state, type === 'draftPick' ? { type, cardId: state.sides.player.draft!.offer[0]!.id } : { type });
    step(state);
    expect(state.tick).toBe(2400);
    expect(resume(state).held).toBe(false);
  });

  it('distinguishes executed rerolls and a pending answer sharing the same command tick', () => {
    const state = held();
    issue(state, { type: 'draftReroll' });
    step(state);
    issue(state, { type: 'draftReroll' });
    step(state);
    expect(state.sides.player.draft!.rerolls).toBe(2);
    issue(state, { type: 'draftPick', cardId: state.sides.player.draft!.offer[1]!.id });
    const resumed = resume(state);
    expect(resumed.sides.player.draft!.rerolls).toBe(2);
    step(state);
    step(resumed);
    expect(hashState(resumed)).toBe(hashState(state));
    runHeadless(state, { until: 3000 });
    runHeadless(resumed, { until: 3000 });
    expect(hashState(resumed)).toBe(hashState(state));
  });

  it('preserves queue ordering when ordinary input surrounds a held answer', () => {
    const state = held();
    const spot = legalPlacements(state, 'player', 'sporelingBurrow')[0]!;
    issue(state, { type: 'place', buildingId: 'sporelingBurrow', ...spot });
    issue(state, { type: 'draftReroll' });
    step(state);
    issue(state, { type: 'draftSkip' });
    step(state);
    issue(state, { type: 'place', buildingId: 'sporelingBurrow', ...spot });
    const resumed = resume(state);
    expect(resumed.queue).toHaveLength(2);
    step(state);
    step(resumed);
    expect(hashState(resumed)).toBe(hashState(state));
    expect(resume(state).tick).toBe(2401);
  });

  it('restores distant future input and its sequence numbers without applying it early', () => {
    const state = deploy();
    queueCommand(state, { side: 'player', tick: 5000, type: 'draftSkip' });
    queueCommand(state, { side: 'player', tick: 0, type: 'begin' });
    runHeadless(state, { until: 100 });
    issue(state, { type: 'power' });
    const resumed = resume(state);
    expect(resumed.nextSeq).toEqual(state.nextSeq);
    step(state);
    step(resumed);
    expect(hashState(resumed)).toBe(hashState(state));
  });

  it('preserves deploy input, pending Begin, and a begun battle at tick zero', () => {
    const state = deploy();
    resume(state);
    const spot = legalPlacements(state, 'player', 'sporelingBurrow')[0]!;
    queueCommand(state, { side: 'player', tick: 0, type: 'place', buildingId: 'sporelingBurrow', ...spot });
    expect(resume(state).phase).toBe('deploy');
    step(state);
    resume(state);
    queueCommand(state, { side: 'player', tick: 0, type: 'begin' });
    expect(resume(state).phase).toBe('deploy');
    step(state);
    expect(resume(state).phase).toBe('live');
  });

  it('retains the final step events after several rejected commands on a held tick', () => {
    const state = held();
    issue(state, { type: 'draftPick', cardId: 'missing' });
    step(state);
    issue(state, { type: 'draftPick', cardId: 'also-missing' });
    step(state);
    expect(state.events).toHaveLength(1);
    expect(resume(state).events).toEqual(state.events);
  });

  it('accepts legacy pending and completed answers only when their saved hashes match', () => {
    const state = held();
    issue(state, { type: 'draftSkip' });
    expect(hashState(resumeBattle(content, legacy(state)))).toBe(hashState(state));
    step(state);
    expect(hashState(resumeBattle(content, legacy(state)))).toBe(hashState(state));
    const broken = legacy(state);
    broken.hash = 'incompatible';
    expect(() => resumeBattle(content, broken)).toThrow('resume diverged');
  });

  it('rejects incompatible current saves rather than returning a fresh battle', () => {
    const state = held();
    const saved = battleSave(state);
    saved.hash = 'incompatible';
    expect(() => resumeBattle(content, saved)).toThrow('resume diverged');
  });
});
