// The flyers knob (`?proto=flyers`, src/data/proto.ts; SPEC §1.3 #11, §5.3, §11.2): the Driftling and its Drift
// Stalk, kept as a default-off knob for the later flyer. Its building is in squad form, like every building in
// rounds: it fields a squad of 6 Driftlings each round, with no HP and no spawn timer. Off, no flyer exists.
import { describe, expect, it } from 'vitest';
import { createFromScenario } from '../../src/sim/index.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { begin, content, plant, toggle } from '../helpers.ts';

describe('flyers (§1.3 #11, §11.2)', () => {
  const flyers = protoContent('flyers');

  it('validate in squad form: the Drift Stalk is a squad of 6 Driftlings, with no HP and no spawn timer', () => {
    const stalk = flyers.buildings.driftStalk!;
    expect(stalk).toMatchObject({ kind: 'spawner', cost: 160, squad: { unit: 'driftling', count: 6 } });
    expect(stalk.hp).toBeUndefined();
    expect(stalk.spawn).toBeUndefined();
    expect(flyers.units.driftling!.tags).toEqual(['flying']);
    expect(flyers.balance.flying).toEqual({ reachSupply: 1, meleeMult: 0.5, mergedReach: false, cloudsReach: true });
    for (const f of Object.values(flyers.factions)) expect(f.buildings).toContain('driftStalk');
  });

  it('field 6 Driftlings a round from a planted Drift Stalk', () => {
    const s = createFromScenario(flyers, {
      id: 'flyers', description: 'a Drift Stalk', map: 'bogwater-hollow', sides: { player: { kit: ['driftStalk'] }, enemy: {} },
    });
    plant(s, 'player', 'driftStalk', { lane: 0, rank: 0, file: 1 });
    toggle(s, 'player', s.buildings.find((b) => b.side === 'player' && b.buildingId === 'driftStalk')!.id, false);
    begin(s);
    expect(s.clash!.fielded.player).toEqual([expect.objectContaining({ unitId: 'driftling', tier: 1, count: 6 })]);
  });

  it('are absent with the knob off', () => {
    expect(content.balance.flying).toBeUndefined();
    expect(content.buildings.driftStalk).toBeUndefined();
    expect(Object.values(content.units).filter((u) => u.tags.includes('flying'))).toEqual([]);
    for (const weights of [...Object.values(content.bots), ...Object.values(content.generals)].map((x) => x.weights)) expect(weights).not.toHaveProperty('driftStalk');
  });
});
