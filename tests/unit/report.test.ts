// The battle report's gold by source (src/ui/report.ts): every source that paid has a row in plain
// words, the relics', the commander power's and skipped drafts' included, so the rows add up to the
// gold the banner shows.
import { describe, expect, it } from 'vitest';
import { createBattle, makeConfig } from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';
import { goldBySource } from '../../src/ui/report.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { runBattle } from '../../tools/lib/run.ts';
import { content, liveState } from '../helpers.ts';

const total = (s: BattleState, side: 'player' | 'enemy') => Object.values(s.stats[side].goldEarned).reduce((a, b) => a + b, 0);

describe('gold by source', () => {
  it('shows each source that paid, relics and skipped drafts too, and leaves out what paid nothing', () => {
    const s = liveState();
    Object.assign(s.stats.player.goldEarned, { stipend: 300, economy: 120, interest: 20, effects: 412, drafts: 40 });
    Object.assign(s.stats.enemy.goldEarned, { stipend: 300, comeback: 35 });
    expect(goldBySource(s, 'player')).toEqual([
      { label: 'Stipend', value: 300 }, { label: 'Economy', value: 120 }, { label: 'Interest', value: 20 },
      { label: 'Relics', value: 412 }, { label: 'Skipped drafts', value: 40 },
    ]);
    expect(goldBySource(s, 'enemy')).toEqual([{ label: 'Stipend', value: 300 }, { label: 'Comeback', value: 35 }]);
  });

  it("gives Armilla's Rhizome Tithe its own row (it pays through effects, as Spore Tithe does), and the rows add up", () => {
    const config = makeConfig(content, { seed: 1, player: 'bot:balanced', commander: 'armilla', powerPolicy: 'auto' });
    config.player.relics = ['sporeTithe'];
    const { state } = runBattle(content, { seed: 1, config });
    const st = state.stats.player;
    expect(st.powerGold).toBeGreaterThan(0);
    const rows = goldBySource(state, 'player');
    expect(rows).toContainEqual({ label: 'Rhizome Tithe (power)', value: st.powerGold });
    expect(rows).toContainEqual({ label: 'Relics', value: st.goldEarned.effects - st.powerGold! });
    for (const side of ['player', 'enemy'] as const) expect(goldBySource(state, side).reduce((a, r) => a + r.value, 0)).toBe(total(state, side));
  });

  it("names the Heartcap breach prototype's gold, with the relics' when a relic pays gold", () => {
    const c = protoContent('breach');
    const rows = (relics: string[]) => {
      const config = makeConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' });
      config.player.relics = relics;
      const s = createBattle(c, config);
      s.stats.player.goldEarned.effects = 150;
      return goldBySource(s, 'player');
    };
    expect(rows([])).toEqual([{ label: 'Heartcap breaches', value: 150 }]);
    expect(rows(['quickRoots'])).toEqual([{ label: 'Heartcap breaches', value: 150 }]);
    expect(rows(['sporeTithe'])).toEqual([{ label: 'Relics and breaches', value: 150 }]);
  });
});
