import { describe, expect, it } from 'vitest';
import { victorySystem } from '../../src/sim/systems/victory.ts';
import { liveState, setBorders } from '../helpers.ts';

describe('endings (SPEC §6.5)', () => {
  it('Rout when a Heartcap falls; simultaneous deaths lose for the player', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    s.sides.enemy.heartcapHp = 0;
    victorySystem(s);
    expect(s.outcome).toMatchObject({ winner: 'player', by: 'rout' });
    const t = liveState({ map: 'bogwater-hollow' });
    t.sides.enemy.heartcapHp = 0;
    t.sides.player.heartcapHp = 0;
    victorySystem(t);
    expect(t.outcome).toMatchObject({ winner: 'enemy', by: 'rout' });
    expect(t.phase).toBe('ended');
  });

  it('Decision at 10:00: columns, then Heartcap HP fraction, then the general', () => {
    const at = (setup: (s: ReturnType<typeof liveState>) => void) => {
      const s = liveState({ map: 'bogwater-hollow' });
      setup(s);
      s.tick = s.rules.timeLimitTicks;
      victorySystem(s);
      return s.outcome;
    };
    expect(at((s) => setBorders(s, 17, 27))).toMatchObject({ winner: 'player', by: 'decision' });
    expect(at((s) => setBorders(s, 10, 20))).toMatchObject({ winner: 'enemy', by: 'decision' });
    // tied columns: player 3000/3000 (100%) vs enemy 1900/2000 (95%)
    expect(at((s) => { setBorders(s, 15, 16); s.sides.enemy.heartcapHp = 1900; })).toMatchObject({ winner: 'player' });
    expect(at((s) => { setBorders(s, 15, 16); s.sides.player.heartcapHp = 1500; })).toMatchObject({ winner: 'enemy' });
    // exactly even → the general
    expect(at((s) => { setBorders(s, 15, 16); s.sides.player.heartcapHp = 1500; s.sides.enemy.heartcapHp = 1000; })).toMatchObject({ winner: 'enemy' });
  });

  it('no ending before the time limit while both Heartcaps stand', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    s.tick = s.rules.timeLimitTicks - 1;
    victorySystem(s);
    expect(s.outcome).toBeUndefined();
  });
});
