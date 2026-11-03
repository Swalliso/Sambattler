// Prototype knobs (src/data/proto.ts): each is absent from data/balance.json, so the shipped rules are unchanged,
// and the `proto` spec (tools `--proto`, browser `?proto=`) applies presets and overrides to the content. R2b's
// T055 (S4) settles the preset list. A2's counter floor and B3's firing congestion still set their keys, but no
// battle in rounds reads either, so their behaviour cases went with v1's battle (R2b S3).
import { describe, expect, it } from 'vitest';
import { applyProto, applyProtoToBalance, PROTO_PRESETS } from '../../src/data/proto.ts';
import { createBattle, makeRoundConfig } from '../../src/sim/index.ts';
import { protoContent, readRawContent } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

describe('prototype knobs are off by default', () => {
  it('balance.json sets none of them', () => {
    const b = content.balance;
    expect(b.approachRush).toBeUndefined();
    expect(b.firingCongestion).toBeUndefined();
    expect(b.unitLifespan).toBeUndefined();
    expect(b.ai.counter.counterFloorWeight).toBeUndefined();
    expect(b.rangedFirstSpawnFraction).toBeUndefined();
    expect(b.fallBack).toBeUndefined();
    expect(b.spawnerDefense).toBeUndefined();
    expect(b.diveRanged).toBeUndefined();
  });

  it('the proto spec applies presets and path:value overrides in order', () => {
    const { balance, problems } = applyProtoToBalance(content.balance, 'b1,approachRush.speedMult:4,besiegedBy:melee,nope');
    expect(problems).toEqual([expect.stringContaining('unknown preset "nope"')]);
    expect(balance.approachRush).toEqual({ ...PROTO_PRESETS.b1!.approachRush as object, speedMult: 4 });
    expect(balance.besiegedBy).toBe('melee');
    expect(content.balance.approachRush).toBeUndefined(); // a copy, not the shared content
    const lists = applyProtoToBalance(content.balance, 'b1,approachRush.units:["sporeling","morelRunner"]').balance;
    expect((lists.approachRush as { units: string[] }).units).toEqual(['sporeling', 'morelRunner']);
  });

  it('a2 and b3 set their keys in the content', () => {
    expect(protoContent('a2').balance.ai.counter.counterFloorWeight).toBe(1);
    expect(protoContent('b3').balance.firingCongestion).toEqual(PROTO_PRESETS.b3!.firingCongestion);
  });
});

describe('proto overrides of buildings, units and bots', () => {
  it('patch an entry by id, add a one-off bot, and leave the rest of the content alone', () => {
    const { raw, problems } = applyProto(readRawContent(), 'building.gillNest.spawn.interval:19,unit.gillArcher.hp:100,bot.probe:{"opener":["sporelingBurrow"],"weights":{"sporelingBurrow":1},"mergePolicy":"on"},building.nope.cost:1');
    expect(problems).toEqual([expect.stringContaining('no building "nope"')]);
    const c = protoContent('building.gillNest.spawn.interval:19,unit.gillArcher.hp:100,bot.probe:{"opener":["sporelingBurrow"],"weights":{"sporelingBurrow":1},"mergePolicy":"on"}');
    expect(c.buildings.gillNest!.spawn!.interval).toBe(19);
    expect(c.units.gillArcher!.hp).toBe(100);
    expect(c.bots.probe!.weights).toEqual({ sporelingBurrow: 1 });
    expect(c.bots.balanced).toEqual(content.bots.balanced);
    expect(content.buildings.gillNest!.spawn!.interval).toBe(15); // the shared content is untouched
    expect(raw['balance.json']).toEqual(readRawContent()['balance.json']);
  });

  it("flyers and rework still validate with aiWeight retired, and R1's adopted pieces have no preset (R2a T012, T013)", () => {
    for (const p of ['flyers', 'rework']) expect(() => protoContent(p), p).not.toThrow();
    for (const p of ['pinned', 'sporecloud', 'rhizomorph', 'cleave', 'burster', 'kept']) expect(PROTO_PRESETS[p], p).toBeUndefined();
  });
});

describe("R1's clash-check presets (SPEC §16 R1, §12.4)", () => {
  it("noeldersplash removes the Elder Sporeling's splash perk", () => {
    expect(content.units.sporeling!.mergePerks?.[3]).toEqual({ splashRadius: 0.6 });
    const c = protoContent('noeldersplash');
    expect(c.units.sporeling!.mergePerks?.[3]).not.toHaveProperty('splashRadius');
    const s = createBattle(c, makeRoundConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' }));
    expect(s.compiled.player.units.sporeling!.tiers[2]!.splashRadius).toBe(0);
  });
});
