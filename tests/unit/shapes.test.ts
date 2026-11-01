// The shape language's checks (SPEC §5.8, §11.3, §14.3; R4a, T017): the body and the mark a unit's data
// gives it, a frame's measured boxes, every way a sprite's shape block breaks the rules, and the glyphs the
// atlas bakes onto a frame.
import { describe, expect, it } from 'vitest';
import { SpriteSchema } from '../../src/data/schema.ts';
import type { SpriteBands, SpriteDef, SpriteShape } from '../../src/data/schema.ts';
import {
  bodyBox, bodyOf, composedBox, emplacementShapeProblems, glyphBox, markOf, shapeProblems, towerMarkOf, unitShapeProblems,
} from '../../src/data/shapes.ts';
import type { Box } from '../../src/data/shapes.ts';
import { framePixels, rimPixels } from '../../src/render/compose.ts';
import { nodeContent, protoContent } from '../../tools/lib/content.ts';

const content = nodeContent();
const rework = protoContent('rework');
const BANDS: SpriteBands = { small: [8, 9], medium: [11, 12], big: [15, 16] };
const K = '#1a1020', V = '#8a4fd8', W = '#fbf6ff';

/** A glyph whose opaque box is 3 × 3 at (1, 1) in its 5 × 5 frame. Its core uses `l`, a key the faction swap covers. */
const BLADE: SpriteDef = {
  id: 'm-blade', w: 5, h: 5, anchor: [0, 0], palette: { '.': null, k: K, l: W },
  frames: [['.....', '.kkk.', '.klk.', '.kkk.', '.....']],
};
/** An accent whose opaque box is 2 × 2 at (1, 2). */
const SPLASH: SpriteDef = { ...BLADE, id: 'm-splash', frames: [['.....', '.....', '.kk..', '.kk..', '.....']] };
const glyphs = { 'm-blade': BLADE, 'm-splash': SPLASH };

/**
 * A unit sprite in a 10 × 12 box, facing +x. Each frame's body is columns 1–5 from row `top` to row `bottom`
 * (the box's last row by default), so its box is (1, top) and 5 wide.
 */
function unit(shape: SpriteShape | undefined, frames: { top: number; bottom?: number }[] = [{ top: 1 }]): SpriteDef {
  const w = 10, h = 12;
  return {
    id: 'u-test', w, h, anchor: [3, 11], factionSwap: true, palette: { '.': null, k: K, v: V },
    frames: frames.map(({ top, bottom = h - 1 }) => Array.from({ length: h }, (_, y) => (y >= top && y <= bottom ? '.vvvvv....' : '..........'))),
    ...(shape ? { shape } : {}),
  };
}
/** A medium unit drawn to its shape: a body 11 px tall, the blade's opaque box at (5, 5) on its front edge. */
const good = () => unit({ body: 'medium', mark: 'blade', markAt: [[4, 4]] });

const hex = (px: Uint8ClampedArray, i: number) => (px[i * 4 + 3] ? `#${[0, 1, 2].map((k) => px[i * 4 + k]!.toString(16).padStart(2, '0')).join('')}` : null);
/** A frame's colour at (x, y), or null where it's clear. */
const at = (f: { w: number; px: Uint8ClampedArray }, x: number, y: number) => hex(f.px, y * f.w + x);
/** The bounding box of a frame's opaque pixels. */
function opaqueBox(f: { w: number; h: number; px: Uint8ClampedArray }): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      if (!f.px[(y * f.w + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

describe('bodyOf, markOf and towerMarkOf (§5.8)', () => {
  it('the body follows the armor', () => {
    expect([bodyOf('light'), bodyOf('medium'), bodyOf('heavy'), bodyOf('structure')]).toEqual(['small', 'medium', 'big', 'structure']);
  });

  it("the mark follows §5.8's rule: area for burst, heal for a healer with no damage, else the damage type's", () => {
    const u = content.units, r = rework.units;
    expect(markOf(r.burster!)).toBe('area');
    expect(markOf(u.tender!)).toBe('heal');
    expect(markOf(u.gillArcher!)).toBe('arrow');
    expect([markOf(u.veilstalker!), markOf(u.morelRunner!)]).toEqual(['spike', 'spike']);
    expect(markOf(u.scythecap!)).toBe('blade'); // cleave doesn't change a mark (A150)
    expect([markOf(u.hammercap!), markOf(u.rootbreaker!)]).toEqual(['hammer', 'hammer']);
    for (const unit of [u.sporeling!, u.capguard!, u.amanitaKnight!, r.rhizomorph!, r.driftling!]) expect(markOf(unit), unit.id).toBe('blade');
  });

  it("an emplacement's mark: the Mortar's shells hit as crush, so a hammer with a splash accent (A151)", () => {
    expect(towerMarkOf(content.buildings.puffballMortar!)).toEqual({ mark: 'hammer', accent: 'splash' });
    expect(towerMarkOf(content.buildings.truffleCellar!)).toEqual({ mark: 'none' });
  });

  it("holds a unit's sprite to its unit, and an emplacement's to its building", () => {
    const knight = content.units.amanitaKnight!, mortar = content.buildings.puffballMortar!;
    expect(unitShapeProblems(knight, unit({ body: 'big', mark: 'blade', markAt: [[4, 4]] }))).toEqual([]);
    expect(unitShapeProblems(knight, unit({ body: 'medium', mark: 'hammer', markAt: [[4, 4]] }))).toEqual([
      'unit amanitaKnight: sprite u-test has a medium body, but heavy armor draws a big one',
      "unit amanitaKnight: sprite u-test carries the hammer mark, but its unit's mark is the blade",
    ]);
    expect(unitShapeProblems(knight, unit(undefined))).toEqual([]);
    const e = (shape: SpriteShape) => ({ ...unit(shape), id: 'e-puffballMortar' });
    expect(emplacementShapeProblems(mortar, e({ body: 'structure', mark: 'hammer', accent: 'splash', markAt: [[4, 4]], accentAt: [[6, 6]] }))).toEqual([]);
    expect(emplacementShapeProblems(mortar, e({ body: 'big', mark: 'hammer', markAt: [[4, 4]] }))).toEqual([
      "building puffballMortar: sprite e-puffballMortar has a big body, but an emplacement's is structure",
      "building puffballMortar: sprite e-puffballMortar carries the hammer mark, but its attack's is the hammer mark with the splash accent",
    ]);
  });
});

describe('bodyBox, glyphBox and composedBox', () => {
  it("measure a frame's own opaque pixels and a glyph's", () => {
    expect(bodyBox(good(), 0)).toEqual({ x: 1, y: 1, w: 5, h: 11 });
    expect(glyphBox(BLADE)).toEqual({ x: 1, y: 1, w: 3, h: 3 });
    expect(bodyBox(unit(undefined, [{ top: 0, bottom: -1 }]), 0)).toBeNull();
  });

  it("unite the body's box with the glyph's own box at markAt, mirrored with flip", () => {
    expect(composedBox(good(), 0, glyphs)).toEqual({ x: 1, y: 1, w: 7, h: 11 });
    expect(composedBox(good(), 0, glyphs, true)).toEqual({ x: 2, y: 1, w: 7, h: 11 });
    // the accent counts too, and a glyph above the body widens the box upward
    const accented = unit({ body: 'structure', mark: 'blade', accent: 'splash', markAt: [[4, 4]], accentAt: [[6, 6]] });
    expect(composedBox(accented, 0, glyphs)).toEqual({ x: 1, y: 1, w: 8, h: 11 });
    expect(composedBox(unit({ body: 'medium', mark: 'blade', markAt: [[4, -1]] }), 0, glyphs)).toEqual({ x: 1, y: 0, w: 7, h: 12 });
  });
});

describe('shapeProblems', () => {
  it('passes a sprite drawn to its shape, and a sprite with no shape', () => {
    expect(shapeProblems(good(), BANDS, glyphs)).toEqual([]);
    expect(shapeProblems(unit(undefined), undefined, {})).toEqual([]);
  });

  it('a heavy sprite drawn 11 px tall is a big body out of band, and only shapeProblems checks bands', () => {
    const s = unit({ body: 'big', mark: 'blade', markAt: [[4, 4]] });
    expect(bodyBox(s, 0)!.h).toBe(11);
    expect(shapeProblems(s, BANDS, glyphs)).toEqual(['sprite u-test frame 0: big body out of band (11 px tall, the band is 15–16)']);
    expect(SpriteSchema.safeParse(s).success).toBe(true);
    expect(shapeProblems(s, undefined, glyphs)).toEqual(['sprite u-test: its sheet has no bands for its big body']);
    // structure has no band
    expect(shapeProblems(unit({ body: 'structure', mark: 'blade', markAt: [[4, 4]] }), undefined, glyphs)).toEqual([]);
  });

  it('rejects a markAt or accentAt that misses a frame, and a mark or accent with none', () => {
    const three = [{ top: 1 }, { top: 1 }, { top: 1 }];
    expect(shapeProblems(unit({ body: 'medium', mark: 'blade', markAt: [[4, 4], [4, 4]] }, three), BANDS, glyphs)).toEqual(['sprite u-test: markAt has 2 entries for 3 frames']);
    expect(shapeProblems(unit({ body: 'medium', mark: 'blade' }), BANDS, glyphs)).toEqual(['sprite u-test: its blade mark has no markAt']);
    expect(shapeProblems(unit({ body: 'medium', mark: 'none' }), BANDS, glyphs)).toEqual([]);
    expect(shapeProblems(unit({ body: 'medium', mark: 'blade', markAt: [[4, 4]], accent: 'splash' }), BANDS, glyphs)).toEqual(['sprite u-test: its splash accent has no accentAt']);
    expect(shapeProblems(unit({ body: 'medium', mark: 'blade', markAt: [[4, 4]], accent: 'splash', accentAt: [] }), BANDS, glyphs)).toEqual(['sprite u-test: accentAt has 0 entries for 1 frame']);
  });

  it('rejects a mark with no m- glyph', () => {
    expect(shapeProblems(good(), BANDS, {})).toEqual(['sprite u-test: no m-blade glyph for its blade mark']);
  });

  it('rejects a glyph that leaves the w × h box, and a mark in the back half (A165)', () => {
    expect(shapeProblems(unit({ body: 'medium', mark: 'blade', markAt: [[7, 4]] }), BANDS, glyphs)).toEqual(['sprite u-test frame 0: m-blade leaves the 10 × 12 box']);
    expect(shapeProblems(unit({ body: 'medium', mark: 'blade', markAt: [[-1, 4]] }), BANDS, glyphs)).toEqual(["sprite u-test frame 0: m-blade sits in the body's back half"]);
    // an emplacement has no front, so its mark may stand anywhere on it
    expect(shapeProblems(unit({ body: 'structure', mark: 'blade', markAt: [[-1, 4]] }), BANDS, glyphs)).toEqual([]);
  });

  it("rejects a glyph whose rows reach above the body's top row or below its bottom row, in that frame (call 10)", () => {
    expect(shapeProblems(unit({ body: 'medium', mark: 'blade', markAt: [[4, -1]] }), BANDS, glyphs))
      .toEqual(["sprite u-test frame 0: m-blade reaches above the body's top row (its rows 0–2, the body's 1–11)"]);
    expect(shapeProblems(unit({ body: 'small', mark: 'blade', markAt: [[4, 6]] }, [{ top: 0, bottom: 8 }]), BANDS, glyphs))
      .toEqual(["sprite u-test frame 0: m-blade reaches below the body's bottom row (its rows 7–9, the body's 0–8)"]);
    // frame 1 crouches: the same point leaves its rows, frame 0's doesn't
    const crouch = unit({ body: 'medium', mark: 'blade', markAt: [[4, 1], [4, 1]] }, [{ top: 1 }, { top: 3 }]);
    expect(shapeProblems(crouch, { ...BANDS, medium: [9, 11] }, glyphs))
      .toEqual(["sprite u-test frame 1: m-blade reaches above the body's top row (its rows 2–4, the body's 3–11)"]);
  });

  it('rejects an empty frame', () => {
    expect(shapeProblems(unit({ body: 'medium', mark: 'none' }, [{ top: 0, bottom: -1 }]), BANDS, glyphs)).toEqual(['sprite u-test frame 0: nothing is drawn']);
  });
});

describe('framePixels and rimPixels with a mark', () => {
  const gray = content.factions['gray-rot']!.palette;

  it("bakes the glyph at markAt over the body, mirrored with flip, filling exactly composedBox's box", () => {
    const s = good();
    const f = framePixels(s, 0, { glyphs });
    expect([at(f, 5, 5), at(f, 6, 6), at(f, 7, 7), at(f, 4, 6), at(f, 8, 6)]).toEqual([K, W, K, V, null]);
    const flipped = framePixels(s, 0, { glyphs, flip: true });
    expect([at(flipped, 3, 6), at(flipped, 4, 5), at(flipped, 5, 6)]).toEqual([W, K, V]);
    expect(opaqueBox(f)).toEqual(composedBox(s, 0, glyphs));
    expect(opaqueBox(flipped)).toEqual(composedBox(s, 0, glyphs, true));
  });

  it("bakes the accent at accentAt, and the Gray Rot swap doesn't touch either glyph", () => {
    const s = unit({ body: 'medium', mark: 'blade', accent: 'splash', markAt: [[4, 4]], accentAt: [[6, 6]] });
    const f = framePixels(s, 0, { glyphs, swap: gray });
    expect(at(f, 1, 1)).toBe(gray.v); // the body takes the Gray Rot's tones
    expect(at(f, 6, 6)).toBe(W); // the blade's core keeps its own `l`
    expect([at(f, 7, 8), at(f, 8, 9)]).toEqual([K, K]); // the splash
    expect(opaqueBox(f)).toEqual(composedBox(s, 0, glyphs));
  });

  it('needs the glyph a shape names', () => {
    expect(() => framePixels(good(), 0)).toThrow(/u-test frame 0 needs the m-blade glyph/);
    expect(() => framePixels(good(), 0, { glyphs: {} })).toThrow(/m-blade/);
    expect(framePixels(unit({ body: 'medium', mark: 'none' }), 0).w).toBe(10);
  });

  it("an Elder's rim outlines the baked frame, mark included", () => {
    const r = rimPixels(good(), 0, false, glyphs);
    const on = (x: number, y: number) => r.px[(y * r.w + x) * 4 + 3]! > 0;
    // the glyph's right edge is column 7, so the rim runs down column 8 (9 in the rim's box) beside it
    expect([on(9, 6), on(9, 7), on(9, 8)]).toEqual([true, true, true]);
    expect(on(7, 2)).toBe(true); // and beside the body's front column, above the glyph
  });
});

describe('marks.json (T021)', () => {
  const ids = content.spriteOrder.filter((id) => id.startsWith('m-'));

  it('holds the seven glyphs, each unswapped and at most 5 × 5, with a light core inside a dark outline', () => {
    expect([...ids].sort()).toEqual(['m-area', 'm-arrow', 'm-blade', 'm-hammer', 'm-heal', 'm-spike', 'm-splash']);
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
    const around = [...near, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
    for (const id of ids) {
      const g = content.sprites[id]!;
      expect(g.factionSwap ?? false, id).toBe(false);
      expect(g.w <= 5 && g.h <= 5 && g.frames.length === 1, `${id} is ${g.w} × ${g.h}`).toBe(true);
      const f = framePixels(g, 0);
      const c = (x: number, y: number) => (x < 0 || y < 0 || x >= f.w || y >= f.h ? null : at(f, x, y));
      let core = 0;
      for (let y = 0; y < f.h; y++) {
        for (let x = 0; x < f.w; x++) {
          const p = c(x, y);
          expect(p === null || p === K || p === W, `${id} (${x}, ${y}) is ${p}`).toBe(true);
          // the core's sides touch only core and outline, and every outline pixel touches the core, at a side or a corner
          if (p === W) { core++; for (const [dx, dy] of near) expect([W, K], `${id} core (${x}, ${y})`).toContain(c(x + dx, y + dy)); }
          if (p === K) expect(around.some(([dx, dy]) => c(x + dx, y + dy) === W), `${id} outline (${x}, ${y})`).toBe(true);
        }
      }
      expect(core, id).toBeGreaterThanOrEqual(4);
    }
    expect(new Set(ids.map((id) => content.sprites[id]!.frames[0]!.join('/'))).size).toBe(ids.length);
  });
});
