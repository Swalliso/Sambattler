import { describe, expect, it } from 'vitest';
import { checkAssert, getPath, parseAssert } from '../../tools/lib/asserts.ts';

describe('--assert (SPEC §15.2)', () => {
  it("parses a plain path, and refuses v1's @<tick> checkpoint", () => {
    expect(parseAssert('winner=player')).toEqual({ text: 'winner=player', path: 'winner', op: '=', value: 'player' });
    expect(() => parseAssert('gold.player@1200>80')).toThrow(/bad --assert/);
  });

  it('parses the round checkpoints @r<n> and @r<n>:<t>, and paths with indices', () => {
    expect(parseAssert('hash@r3=9f2c41d07ab35e18')).toEqual({
      text: 'hash@r3=9f2c41d07ab35e18', path: 'hash', checkpoint: 'r3', op: '=', value: '9f2c41d07ab35e18',
    });
    expect(parseAssert('x@r2:200>=1')).toEqual({ text: 'x@r2:200>=1', path: 'x', checkpoint: 'r2:200', op: '>=', value: '1' });
    expect(parseAssert('roundLog[2].lanes[0].capped=false')).toEqual({
      text: 'roundLog[2].lanes[0].capped=false', path: 'roundLog[2].lanes[0].capped', op: '=', value: 'false',
    });
    expect(getPath({ roundLog: [{}, {}, { lanes: [{ capped: false }] }] }, 'roundLog[2].lanes[0].capped')).toBe(false);
    for (const bad of ['x@r=1', 'x@r2:=1', 'x@2:200=1', 'x@r2.planning=1']) expect(() => parseAssert(bad)).toThrow(/bad --assert/);
  });

  it('checks a round result, reading @r<n> and @r<n>:<t> from the summaries recorded there', () => {
    const result = {
      rounds: 4, roundLog: [{}, {}, { lanes: [{ capped: false }] }],
      at: { r3: { hash: '9f2c41d07ab35e18' }, 'r2:200': { x: 2 } },
    };
    const check = (text: string) => checkAssert(result, parseAssert(text));
    expect(check('roundLog[2].lanes[0].capped=false')).toBeNull();
    expect(check('roundLog[2].lanes[0].capped=true')).toBe('roundLog[2].lanes[0].capped=true: actual false');
    expect(check('rounds<=9')).toBeNull();
    expect(check('hash@r3=9f2c41d07ab35e18')).toBeNull();
    expect(check('x@r2:200>=1')).toBeNull();
    expect(check('x@r2:200>=3')).toBe('x@r2:200>=3: actual 2');
    expect(check('hash@r5=9f2c41d07ab35e18')).toBe('hash@r5=9f2c41d07ab35e18: no summary recorded at r5 (the battle reached round 4)');
  });
});
