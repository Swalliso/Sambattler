// The one unit drawer (SPEC §5.8, §10.4, §13.6; R4a, T012): a merged unit keeps its body, its pips sit
// over the sprite clear of the sprite and the HP bar, and an Elder alone gets a gold rim, baked once per
// unit frame for both factions (R4-Q3).
import { describe, expect, it } from 'vitest';
import type { SpriteDef } from '../../src/data/schema.ts';
import type { Atlas } from '../../src/render/atlas.ts';
import { atlasLayout, framePixels, regionKey, rimKey, rimPixels } from '../../src/render/compose.ts';
import type { Region } from '../../src/render/compose.ts';
import { FLY_LIFT, drawUnitSprite, unitLayout } from '../../src/render/unitSprite.ts';
import type { Box } from '../../src/render/unitSprite.ts';
import { nodeContent } from '../../tools/lib/content.ts';

const content = nodeContent();
/** A Capguard's region: 12 × 13, its foot at (6, 12). */
const capguard: Region = { x: 0, y: 0, w: 12, h: 13, ax: 6, ay: 12 };
const PIP = { w: 5, h: 5 };

const grow = (b: Box): Box => ({ x: b.x - 1, y: b.y - 1, w: b.w + 2, h: b.h + 2 });
/** True when no empty pixel separates the boxes: they overlap, or share an edge or a corner. */
const touch = (a: Box, b: Box) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
const hex = (px: Uint8ClampedArray, i: number) => (px[i * 4 + 3] ? `#${[0, 1, 2].map((k) => px[i * 4 + k]!.toString(16).padStart(2, '0')).join('')}` : null);
/** A frame's pixels as rows, `#` for opaque and `.` for clear. */
const rows = (f: { w: number; h: number; px: Uint8ClampedArray }) =>
  Array.from({ length: f.h }, (_, y) => Array.from({ length: f.w }, (_, x) => (f.px[(y * f.w + x) * 4 + 3] ? '#' : '.')).join(''));

describe('unitLayout', () => {
  it('a merged unit keeps its body: Bloomed and Elder units get the tier-1 box', () => {
    for (const damaged of [false, true]) {
      const base = unitLayout(capguard, 100.4, 60.6, 1, { damaged, pip: PIP });
      expect(base.body).toEqual({ x: 94, y: 49, w: 12, h: 13 });
      for (const tier of [2, 3] as const) expect(unitLayout(capguard, 100.4, 60.6, tier, { damaged, pip: PIP }).body).toEqual(base.body);
    }
  });

  it('one pip for Bloomed and two for Elder, centred over the sprite, touching neither it nor the HP bar', () => {
    for (const tier of [1, 2, 3] as const) {
      for (const damaged of [false, true]) {
        const L = unitLayout(capguard, 100.4, 60.6, tier, { damaged, pip: PIP });
        expect(L.pips).toHaveLength(tier - 1);
        expect(L.bar !== null).toBe(damaged);
        if (tier === 1) continue;
        const left = Math.min(...L.pips.map((p) => p.x)), right = Math.max(...L.pips.map((p) => p.x + p.w));
        expect(Math.abs((left + right) / 2 - (L.body.x + L.body.w / 2))).toBeLessThanOrEqual(0.5);
        for (const p of L.pips) {
          expect(p).toMatchObject(PIP);
          expect(p.y + p.h).toBeLessThan(L.body.y);
          expect(touch(p, L.body)).toBe(false);
          if (L.rim) expect(touch(p, L.rim)).toBe(false);
          // the bar is drawn on a 1-px dark backing, which the pips stay clear of too
          if (L.bar) expect(p.y + p.h).toBeLessThan(L.bar.y);
          if (L.bar) expect(touch(p, grow(L.bar))).toBe(false);
        }
        if (tier === 3) expect(touch(L.pips[0]!, L.pips[1]!)).toBe(false);
      }
    }
  });

  it("a flyer's box is lifted by FLY_LIFT, plus its bob", () => {
    const ground = unitLayout(capguard, 100, 60, 2, { damaged: true, pip: PIP });
    const flyer = unitLayout(capguard, 100, 60, 2, { damaged: true, flying: true, pip: PIP });
    expect(flyer.lift).toBe(FLY_LIFT);
    expect(flyer.body).toEqual({ ...ground.body, y: ground.body.y - FLY_LIFT });
    expect(flyer.pips.map((p) => p.y)).toEqual(ground.pips.map((p) => p.y - FLY_LIFT));
    expect(flyer.bar!.y).toBe(ground.bar!.y - FLY_LIFT);
    expect(unitLayout(capguard, 100, 60, 1, { flying: true, bob: 1 }).body.y).toBe(ground.body.y - FLY_LIFT - 1);
  });

  it('an Elder gets a rim box one pixel outside its body, and a Bloomed unit none', () => {
    expect(unitLayout(capguard, 100, 60, 1).rim).toBeNull();
    expect(unitLayout(capguard, 100, 60, 2).rim).toBeNull();
    const elder = unitLayout(capguard, 100, 60, 3);
    expect(elder.rim).toEqual(grow(elder.body));
  });
});

describe('drawUnitSprite', () => {
  /** A canvas context that records what is drawn, and an atlas with one sprite, its rim and the pip. */
  function record() {
    const calls: string[] = [];
    const g = new Proxy({} as Record<string, unknown>, {
      get: (_t, k) => (k === 'drawImage'
        ? (_img: unknown, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number) => calls.push(`image ${sx},${sy} ${sw}×${sh} at ${dx},${dy}`)
        : () => calls.push(String(k))),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const sprite: Region = { x: 0, y: 0, w: 12, h: 13, ax: 6, ay: 12 };
    const rim: Region = { x: 20, y: 0, w: 14, h: 15, ax: 7, ay: 13 };
    const pip: Region = { x: 40, y: 0, w: 5, h: 5, ax: 0, ay: 0 };
    const atlas: Atlas = {
      canvas: {} as HTMLCanvasElement,
      get: (id) => (id === 'i-pip' ? pip : id === 'u-capguard' ? sprite : undefined),
      rim: (id) => (id === 'u-capguard' ? rim : undefined),
      frames: () => 3,
    };
    return { g, atlas, calls };
  }
  const opts = { sprite: 'u-capguard', faction: 'velvet-bloom', frame: 0, flip: false, x: 100, y: 60, side: 'player', id: 1, hpFrac: 1, glow: '#c9a2ff', time: 0 } as const;

  it("draws an Elder's gold rim under its sprite, then two pips from the ui sheet", () => {
    const { g, atlas, calls } = record();
    drawUnitSprite(g, atlas, { ...opts, tier: 3 });
    const images = calls.filter((c) => c.startsWith('image'));
    expect(images).toEqual([
      'image 20,0 14×15 at 93,47', // the rim, one pixel outside the body
      'image 0,0 12×13 at 94,48', // the sprite at its own size
      'image 40,0 5×5 at 95,41', 'image 40,0 5×5 at 101,41', // two pips
    ]);
  });

  it('draws a Bloomed unit at its own size with one pip and no rim', () => {
    const { g, atlas, calls } = record();
    drawUnitSprite(g, atlas, { ...opts, tier: 2 });
    expect(calls.filter((c) => c.startsWith('image'))).toEqual(['image 0,0 12×13 at 94,48', 'image 40,0 5×5 at 98,42']);
  });
});

describe('the pip and the rim', () => {
  it('i-pip is a gold core of at least 3 × 3 inside a 1-px dark outline, the same for both sides', () => {
    const pip = content.sprites['i-pip']!;
    expect(pip.factionSwap ?? false).toBe(false);
    const f = framePixels(pip, 0);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= f.w || y >= f.h ? null : hex(f.px, y * f.w + x));
    const GOLD = '#f0c85a', DARK = '#120a16';
    let core = false;
    for (let y = 0; y + 3 <= f.h; y++) {
      for (let x = 0; x + 3 <= f.w; x++) {
        if ([0, 1, 2].every((dy) => [0, 1, 2].every((dx) => at(x + dx, y + dy) === GOLD))) core = true;
      }
    }
    expect(core).toBe(true);
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const c = at(x, y);
        expect(c === null || c === GOLD || c === DARK, `i-pip (${x}, ${y}) is ${c}`).toBe(true);
        // the core is enclosed by the outline, and the outline is one pixel wide
        if (c === GOLD) for (const [dx, dy] of near) expect([GOLD, DARK]).toContain(at(x + dx, y + dy));
        if (c === DARK) expect(near.some(([dx, dy]) => at(x + dx, y + dy) === GOLD), `i-pip outline (${x}, ${y})`).toBe(true);
      }
    }
  });

  it('rimPixels gives the 1-px outline of the mask in a (w + 2) × (h + 2) box, its anchor moved by (+1, +1)', () => {
    const plus: SpriteDef = { id: 'u-plus', w: 4, h: 3, anchor: [1, 2], palette: { '.': null, k: '#1a1020' }, frames: [['.k..', 'kkk.', '.k..']] };
    const r = rimPixels(plus, 0, false);
    expect([r.w, r.h, r.ax, r.ay]).toEqual([6, 5, 2, 3]);
    expect(rows(r)).toEqual(['..#...', '.#.#..', '#...#.', '.#.#..', '..#...']);
    for (let i = 0; i < r.w * r.h; i++) expect([null, '#f0c85a']).toContain(hex(r.px, i));
    const flipped = rimPixels(plus, 0, true);
    expect([flipped.w, flipped.h, flipped.ax, flipped.ay]).toEqual([6, 5, 4, 3]);
    expect(rows(flipped)).toEqual(rows(r).map((row) => [...row].reverse().join('')));
  });

  it("every unit frame's rim sits outside its mask and touches it", () => {
    for (const id of content.spriteOrder.filter((s) => s.startsWith('u-'))) {
      const s = content.sprites[id]!;
      for (let f = 0; f < s.frames.length; f++) {
        for (const flip of [false, true]) {
          const body = rows(framePixels(s, f, { flip }));
          const rim = rows(rimPixels(s, f, flip));
          const inBody = (x: number, y: number) => body[y - 1]?.[x - 1] === '#';
          for (let y = 0; y < s.h + 2; y++) {
            for (let x = 0; x < s.w + 2; x++) {
              if (rim[y]![x] !== '#') continue;
              expect(inBody(x, y), `${id} frame ${f}: rim inside the body at (${x}, ${y})`).toBe(false);
              expect(inBody(x + 1, y) || inBody(x - 1, y) || inBody(x, y + 1) || inBody(x, y - 1), `${id} frame ${f}: stray rim pixel`).toBe(true);
            }
          }
        }
      }
    }
  });

  it('the atlas holds one Elder rim per unit frame and flip, for both factions, and none for Bloomed', () => {
    const L = atlasLayout(content);
    const units = content.spriteOrder.filter((id) => id.startsWith('u-'));
    const want = units.flatMap((id) => content.sprites[id]!.frames.flatMap((_, f) => [rimKey(id, f, false), rimKey(id, f, true)]));
    const rims = [...L.regions.keys()].filter((k) => k.startsWith('rim|'));
    expect(rims.sort()).toEqual([...want].sort());
    // every other region is a sprite frame: no per-faction rims and no tier-2 ones
    const frames = content.spriteOrder.flatMap((id) => {
      const s = content.sprites[id]!;
      return (s.factionSwap ? 2 : 1) * s.frames.length * (id.startsWith('u-') ? 2 : 1);
    }).reduce((a, b) => a + b, 0);
    expect(L.regions.size).toBe(frames + want.length);
    for (const id of units) {
      for (const flip of [false, true]) {
        const s = L.regions.get(regionKey(id, 'velvet-bloom', 0, flip))!, r = L.regions.get(rimKey(id, 0, flip))!;
        expect([r.w, r.h, r.ax, r.ay]).toEqual([s.w + 2, s.h + 2, s.ax + 1, s.ay + 1]);
      }
    }
  });

  it('the atlas still packs into its 1024-wide sheet, with no two regions overlapping', () => {
    const L = atlasLayout(content);
    const all = [...L.regions.values()];
    for (const r of all) expect(r.x >= 0 && r.x + r.w <= L.width && r.y + r.h <= L.height).toBe(true);
    expect(L.width).toBe(1024);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!, b = all[j]!;
        expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
      }
    }
  });
});
