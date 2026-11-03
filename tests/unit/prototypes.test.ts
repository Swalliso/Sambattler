// Prototype knobs (src/data/proto.ts, SPEC §15.7 Prototypes): since R2b's S4 only the agreed default-off knobs
// remain (§16 R2, A109), each absent from data/balance.json, so the shipped rules are unchanged. The `proto`
// spec (tools `--proto`, browser `?proto=`) applies presets and overrides to the content, and a preset that
// doesn't exist, such as a retired one, is reported (A117). A2's counter floor and B3's firing congestion
// still set their keys, but no battle in rounds reads either, so their behaviour cases went with v1's battle
// (R2b S3). The flyers have their own file (flyers.test.ts).
import { describe, expect, it } from 'vitest';
import { applyProto, applyProtoToBalance, PROTO_PRESETS, unknownPresets } from '../../src/data/proto.ts';
import { protoContent, readRawContent } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

/** The value at a dotted path, or undefined. */
function at(obj: unknown, path: string): unknown {
  let o = obj;
  for (const k of path.split('.')) o = typeof o === 'object' && o !== null ? (o as Record<string, unknown>)[k] : undefined;
  return o;
}

/** The content collections a preset's path can patch by id; every other path is a balance path. */
const CONTENT_PATH = /^(building|unit|bot|general|faction)\./;

describe('the presets are the agreed list (§16 R2, A109)', () => {
  it("are A2, B3, the flyers and lives at the boss: R1's review kept no knob, and the retired systems' presets are gone", () => {
    expect(Object.keys(PROTO_PRESETS).sort()).toEqual(['a2', 'b3', 'bosslives', 'flyers']);
  });

  it('set nothing data/balance.json sets, so without a spec the rules are unchanged', () => {
    const balance = readRawContent()['balance.json'];
    for (const [name, preset] of Object.entries(PROTO_PRESETS)) {
      for (const path of Object.keys(preset).filter((p) => !CONTENT_PATH.test(p))) expect(at(balance, path), `${name}: ${path}`).toBeUndefined();
    }
  });

  it("keeps X8's data knobs in data/balance.json, both off (R2a/T101)", () => {
    expect(content.balance.rounds.ai.leanToLastAnswer).toBe(0);
    expect(content.balance.rounds.ai.replaceWhenFull).toBe(false);
  });

  it('a2 and b3 set their keys in the content', () => {
    expect(protoContent('a2').balance.ai.counter.counterFloorWeight).toBe(1);
    expect(protoContent('b3').balance.firingCongestion).toEqual(PROTO_PRESETS.b3!.firingCongestion);
  });
});

describe('the proto spec', () => {
  it('applies presets and path:value overrides in order, parsing JSON values', () => {
    const { balance, problems } = applyProtoToBalance(content.balance, 'b3,firingCongestion.freeRanks:3,a2');
    expect(problems).toEqual([]);
    expect(balance.firingCongestion).toEqual({ ...PROTO_PRESETS.b3!.firingCongestion as object, freeRanks: 3 });
    expect(at(balance, 'ai.counter.counterFloorWeight')).toBe(1);
    expect(content.balance.firingCongestion).toBeUndefined(); // a copy, not the shared content
    const lists = applyProtoToBalance(content.balance, 'cleave.units:["scythecap","hammercap"]').balance;
    expect(at(lists, 'cleave.units')).toEqual(['scythecap', 'hammercap']);
  });

  it('reports a preset that does not exist, a retired one among them, and applies the rest (A117)', () => {
    const { balance, problems } = applyProtoToBalance(content.balance, 'rework,b3,Hold,constructor');
    expect(problems).toEqual([
      expect.stringContaining('unknown preset "rework"'), expect.stringContaining('unknown preset "Hold"'), expect.stringContaining('unknown preset "constructor"'),
    ]);
    expect(balance.firingCongestion).toEqual(PROTO_PRESETS.b3!.firingCongestion);
    expect(unknownPresets('rework,b3,Hold,constructor,firingCongestion.freeRanks:3')).toEqual(['rework', 'hold', 'constructor']);
    expect(unknownPresets('B3,bosslives,flying.meleeMult:1')).toEqual([]);
    expect(() => protoContent('rework')).toThrow(/unknown preset "rework"/);
  });
});

describe('proto overrides of buildings, units and bots', () => {
  it('patch an entry by id, add a one-off bot, and leave the rest of the content alone', () => {
    const spec = 'building.gillNest.squad.count:5,unit.gillArcher.hp:100,bot.probe:{"opener":["sporelingBurrow"],"weights":{"sporelingBurrow":1},"mergePolicy":"on"}';
    const { raw, problems } = applyProto(readRawContent(), `${spec},building.nope.cost:1`);
    expect(problems).toEqual([expect.stringContaining('no building "nope"')]);
    const c = protoContent(spec);
    expect(c.buildings.gillNest!.squad).toEqual({ unit: 'gillArcher', count: 5 });
    expect(c.units.gillArcher!.hp).toBe(100);
    expect(c.bots.probe!.weights).toEqual({ sporelingBurrow: 1 });
    expect(c.bots.balanced).toEqual(content.bots.balanced);
    expect(content.buildings.gillNest!.squad!.count).toBe(4); // the shared content is untouched
    expect(raw['balance.json']).toEqual(readRawContent()['balance.json']);
  });
});
