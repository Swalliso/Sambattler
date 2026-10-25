// Seeded randomness (SPEC §13.3 rule 2): sfc32 streams seeded through splitmix32 from
// hash32(runSeed, streamName, battleIndex). Stream state lives in the battle state.
import type { Rng4 } from './state.ts';

export type StreamName = 'combat' | 'ai' | 'draft' | 'route' | 'events' | 'meta';

/** FNV-1a 32 over the UTF-16 code units of a string. */
export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hash32(runSeed: number, stream: string, battleIndex: number): number {
  return fnv1a32(`${runSeed >>> 0}|${stream}|${battleIndex}`);
}

/** One splitmix32 step: returns [nextState, output]. */
export function splitmix32(state: number): [number, number] {
  const s = (state + 0x9e3779b9) | 0;
  let z = s;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  z ^= z >>> 16;
  return [s, z >>> 0];
}

export function seedStream(runSeed: number, stream: StreamName, battleIndex: number): Rng4 {
  let s = hash32(runSeed, stream, battleIndex);
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [next, v] = splitmix32(s);
    s = next;
    out.push(v | 0);
  }
  const rng = out as Rng4;
  for (let i = 0; i < 12; i++) nextU32(rng);
  return rng;
}

/** sfc32: advances the stream in place and returns a uint32. */
export function nextU32(s: Rng4): number {
  let a = s[0], b = s[1], c = s[2], d = s[3];
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  s[0] = a; s[1] = b; s[2] = c; s[3] = d;
  return t >>> 0;
}

/** Uniform float in [0, 1). */
export function nextFloat(s: Rng4): number {
  return nextU32(s) / 4294967296;
}

/** Uniform float in [-1, 1). */
export function nextSigned(s: Rng4): number {
  return nextFloat(s) * 2 - 1;
}

/** Uniform integer in [0, n). */
export function nextInt(s: Rng4, n: number): number {
  return Math.floor(nextFloat(s) * n);
}
