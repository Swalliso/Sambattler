// Prototype knobs (src/data/proto.ts, SPEC §15.7 Prototypes): since R2b's S4c one default-off preset remains,
// `bosslives`, absent from data/balance.json, so the shipped rules are unchanged; R2b's playtest (S14) adopts it
// as data or deletes it (§16 R2, A109). The `proto` spec (tools `--proto`, browser `?proto=`) applies presets and
// `path:value` overrides to the content, and a preset that doesn't exist, such as a retired one, is reported
// (A117). The user dropped A2 and B3, which no battle in rounds read, and then the flyers, whose rules the round
// sim never had (2026-11-03: "Cleanup first"), so the content takes no `flying` block or tag.
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
  it("are lives at the boss alone: R1's review kept no knob, the user dropped A2, B3 and the flyers, and the retired systems' presets are gone", () => {
    expect(Object.keys(PROTO_PRESETS)).toEqual(['bosslives']);
  });

  it('leave no flyer rules: the content refuses a `flying` block or tag (2026-11-03)', () => {
    expect(() => protoContent('flying.meleeMult:0.5')).toThrow(/balance\.json: Unrecognized key: "flying"/);
    expect(() => protoContent('unit.sporeling.tags:["flying"]')).toThrow(/units\.json: 0\.tags\.0: Invalid option/);
  });

  it('set nothing data/balance.json sets, so without a spec the rules are unchanged', () => {
    const balance = readRawContent()['balance.json'];
    for (const [name, preset] of Object.entries(PROTO_PRESETS)) {
      for (const path of Object.keys(preset).filter((p) => !CONTENT_PATH.test(p))) expect(at(balance, path), `${name}: ${path}`).toBeUndefined();
    }
  });

  it("drops X8's two data knobs, which S11 measured as moving neither G14 nor G15 (T129, T172)", () => {
    expect(content.balance.ai).not.toHaveProperty('leanToLastAnswer');
    expect(content.balance.ai).not.toHaveProperty('replaceWhenFull');
  });

  it('bosslives sets its key in the content', () => {
    expect(protoContent('bosslives').balance.livesAtBoss).toEqual({ heartcapPerLife: 250 });
  });
});

describe('the proto spec', () => {
  it('applies presets and path:value overrides in order, parsing JSON values', () => {
    const { balance, problems } = applyProtoToBalance(content.balance, 'bosslives,livesAtBoss.heartcapPerLife:300,cleave:null');
    expect(problems).toEqual([]);
    expect(balance.livesAtBoss).toEqual({ ...PROTO_PRESETS.bosslives!.livesAtBoss as object, heartcapPerLife: 300 });
    expect(balance.cleave).toBeUndefined(); // null removes a setting
    expect([content.balance.livesAtBoss, content.balance.cleave]).toEqual([undefined, { units: ['scythecap'] }]); // a copy, not the shared content
    const lists = applyProtoToBalance(content.balance, 'cleave.units:["scythecap","hammercap"]').balance;
    expect(at(lists, 'cleave.units')).toEqual(['scythecap', 'hammercap']);
  });

  it('reports a preset that does not exist, a retired or dropped one among them, and applies the rest (A117)', () => {
    const { balance, problems } = applyProtoToBalance(content.balance, 'rework,bosslives,B3,constructor');
    expect(problems).toEqual([
      expect.stringContaining('unknown preset "rework"'), expect.stringContaining('unknown preset "B3"'), expect.stringContaining('unknown preset "constructor"'),
    ]);
    expect(balance.livesAtBoss).toEqual(PROTO_PRESETS.bosslives!.livesAtBoss);
    expect(unknownPresets('rework,bosslives,B3,a2,hold,constructor,livesAtBoss.heartcapPerLife:300')).toEqual(['rework', 'b3', 'a2', 'hold', 'constructor']);
    expect(unknownPresets('Flyers,bosslives,livesAtBoss.heartcapPerLife:300')).toEqual(['flyers']);
    expect(() => protoContent('rework')).toThrow(/unknown preset "rework"/);
    expect(() => protoContent('flyers')).toThrow(/unknown preset "flyers" \(known: bosslives\)/);
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

  it("patch a commander by id, so a commander's data can be measured as a path (R2b/T131)", () => {
    const c = protoContent('commander.armilla.starter:["capguardHall","truffleCellar","gillNest"],commander.armilla.core.5:"gillNest",commander.cordis.power.radius:2');
    expect(c.commanders.armilla!.starter).toEqual(['capguardHall', 'truffleCellar', 'gillNest']);
    expect(c.commanders.armilla!.core).toContain('gillNest');
    expect(c.commanders.cordis!.power).toMatchObject({ kind: 'bloom', radius: 2 });
    expect(content.commanders.armilla!.starter).toEqual(['capguardHall', 'truffleCellar', 'puffballMortar']);
  });
});
