// hashState: FNV-1a 64 (two 32-bit halves) over a canonical traversal of the state (SPEC §13.3
// rule 9). Object keys are visited in sorted order; numbers are hashed through a Float64Array
// byte view so the hash is bit-exact; -0 is normalised to +0 and undefined fields are skipped,
// so a JSON snapshot round trip hashes identically.

const f64 = new Float64Array(1);
const bytes = new Uint8Array(f64.buffer);

interface H { hi: number; lo: number }

function byte(h: H, b: number): void {
  const lo = (h.lo ^ (b & 0xff)) >>> 0;
  // multiply the 64-bit value (hi, lo) by the FNV prime 0x100000001b3
  const loProd = lo * 0x1b3; // < 2^41, exact in a double
  const carry = Math.floor(loProd / 4294967296);
  h.hi = (Math.imul(h.hi, 0x1b3) + Math.imul(lo, 0x100) + carry) >>> 0;
  h.lo = loProd >>> 0;
}

function tag(h: H, t: number): void { byte(h, t); }

function num(h: H, n: number): void {
  f64[0] = n === 0 ? 0 : n;
  for (let i = 0; i < 8; i++) byte(h, bytes[i] as number);
}

function str(h: H, s: string): void {
  num(h, s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    byte(h, c & 0xff);
    byte(h, c >>> 8);
  }
}

function walk(h: H, v: unknown): void {
  if (v === null) { tag(h, 1); return; }
  switch (typeof v) {
    case 'number': tag(h, 2); num(h, v); return;
    case 'string': tag(h, 3); str(h, v); return;
    case 'boolean': tag(h, v ? 4 : 5); return;
    case 'object': {
      if (Array.isArray(v)) {
        tag(h, 6); num(h, v.length);
        for (const item of v) walk(h, item === undefined ? null : item);
        return;
      }
      tag(h, 7);
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
      num(h, keys.length);
      for (const k of keys) { str(h, k); walk(h, obj[k]); }
      return;
    }
    default:
      throw new Error(`hashState: unhashable ${typeof v}`);
  }
}

export function hashValue(v: unknown): string {
  const h: H = { hi: 0xcbf29ce4, lo: 0x84222325 };
  walk(h, v);
  return h.hi.toString(16).padStart(8, '0') + h.lo.toString(16).padStart(8, '0');
}
