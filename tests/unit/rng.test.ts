import { describe, expect, it } from 'vitest';
import { hash32, nextFloat, nextU32, seedStream } from '../../src/sim/rng.ts';

describe('rng (sfc32 via splitmix32)', () => {
  it('fixed seeds give fixed sequences', () => {
    const a = seedStream(42, 'combat', 1), b = seedStream(42, 'combat', 1);
    const xs = Array.from({ length: 8 }, () => nextU32(a));
    const ys = Array.from({ length: 8 }, () => nextU32(b));
    expect(xs).toEqual(ys);
    // pin the first values so an accidental algorithm change is caught
    expect(xs.slice(0, 3)).toMatchInlineSnapshot(`
      [
        3267986679,
        2878676417,
        3222998458,
      ]
    `);
  });

  it('streams and battle indices are independent', () => {
    const combat = seedStream(7, 'combat', 1), ai = seedStream(7, 'ai', 1), b2 = seedStream(7, 'combat', 2);
    const c = nextU32(combat), a = nextU32(ai), d = nextU32(b2);
    expect(new Set([c, a, d]).size).toBe(3);
    // drawing from one stream never shifts another
    const ai2 = seedStream(7, 'ai', 1);
    for (let i = 0; i < 100; i++) nextU32(combat);
    expect(nextU32(ai2)).toBe(a);
  });

  it('floats are in [0, 1) and hash32 is stable', () => {
    const s = seedStream(1, 'ai', 1);
    for (let i = 0; i < 1000; i++) {
      const f = nextFloat(s);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    expect(hash32(1, 'combat', 1)).toBe(hash32(1, 'combat', 1));
    expect(hash32(1, 'combat', 1)).not.toBe(hash32(2, 'combat', 1));
  });
});
