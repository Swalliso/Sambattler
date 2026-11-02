// The shape language's checks (SPEC §5.8, §11.3, §14.3; R4a, T017): the body a unit's armor gives it, a
// frame's measured box, and every way a sprite's shape block breaks the rules. Units and emplacements carry
// no weapon mark (§5.8, the user's decision of 2026-11-01; T077), and the last cases keep it that way.
import { describe, expect, it } from 'vitest';
import { SpriteSchema } from '../../src/data/schema.ts';
import type { SpriteBands, SpriteDef, SpriteShape } from '../../src/data/schema.ts';
import { baseSquad, bodyBox, bodyOf, emplacementShapeProblems, shapeProblems, unitShapeProblems, widthBound } from '../../src/data/shapes.ts';
import { nodeContent, protoContent } from '../../tools/lib/content.ts';

const content = nodeContent();
const BANDS: SpriteBands = { small: [8, 9], medium: [11, 12], big: [15, 16] };

/**
 * A unit sprite in a 10 × 12 box, facing +x. Each frame's body is columns 1–5 from row `top` to row `bottom`
 * (the box's last row by default), so its box is (1, top) and 5 wide.
 */
function unit(shape: SpriteShape | undefined, frames: { top: number; bottom?: number }[] = [{ top: 1 }]): SpriteDef {
  const w = 10, h = 12;
  return {
    id: 'u-test', w, h, anchor: [3, 11], factionSwap: true, palette: { '.': null, k: '#1a1020', v: '#8a4fd8' },
    frames: frames.map(({ top, bottom = h - 1 }) => Array.from({ length: h }, (_, y) => (y >= top && y <= bottom ? '.vvvvv....' : '..........'))),
    ...(shape ? { shape } : {}),
  };
}
/** A medium unit drawn to its shape: a body 11 px tall. */
const good = () => unit({ body: 'medium' });

describe('bodyOf (§5.8)', () => {
  it('the body follows the armor', () => {
    expect([bodyOf('light'), bodyOf('medium'), bodyOf('heavy'), bodyOf('structure')]).toEqual(['small', 'medium', 'big', 'structure']);
  });

  it("holds a unit's sprite to its unit, and an emplacement's to its building", () => {
    const knight = content.units.amanitaKnight!, mortar = content.buildings.puffballMortar!;
    expect(unitShapeProblems(knight, unit({ body: 'big' }))).toEqual([]);
    expect(unitShapeProblems(knight, unit({ body: 'medium' }))).toEqual(['unit amanitaKnight: sprite u-test has a medium body, but heavy armor draws a big one']);
    expect(unitShapeProblems(knight, unit(undefined))).toEqual([]);
    const e = (shape: SpriteShape) => ({ ...unit(shape), id: 'e-puffballMortar' });
    expect(emplacementShapeProblems(mortar, e({ body: 'structure' }))).toEqual([]);
    expect(emplacementShapeProblems(mortar, e({ body: 'big' }))).toEqual([
      "building puffballMortar: sprite e-puffballMortar has a big body, but an emplacement's is structure",
    ]);
  });
});

describe('bodyBox', () => {
  it("measures a frame's own opaque pixels", () => {
    expect(bodyBox(good(), 0)).toEqual({ x: 1, y: 1, w: 5, h: 11 });
    expect(bodyBox(unit(undefined, [{ top: 0, bottom: -1 }]), 0)).toBeNull();
  });
});

describe('shapeProblems', () => {
  it('passes a sprite drawn to its shape, and a sprite with no shape', () => {
    expect(shapeProblems(good(), BANDS)).toEqual([]);
    expect(shapeProblems(unit(undefined), undefined)).toEqual([]);
  });

  it('a heavy sprite drawn 11 px tall is a big body out of band, and only shapeProblems checks bands', () => {
    const s = unit({ body: 'big' });
    expect(bodyBox(s, 0)!.h).toBe(11);
    expect(shapeProblems(s, BANDS)).toEqual(['sprite u-test frame 0: big body out of band (11 px tall, the band is 15–16)']);
    expect(SpriteSchema.safeParse(s).success).toBe(true);
    expect(shapeProblems(s, undefined)).toEqual(['sprite u-test: its sheet has no bands for its big body']);
    // structure has no band
    expect(shapeProblems(unit({ body: 'structure' }), undefined)).toEqual([]);
  });

  it('checks every frame, and rejects an empty one', () => {
    const crouch = unit({ body: 'medium' }, [{ top: 1 }, { top: 3 }]);
    expect(shapeProblems(crouch, BANDS)).toEqual(['sprite u-test frame 1: medium body out of band (9 px tall, the band is 11–12)']);
    expect(shapeProblems(unit({ body: 'medium' }, [{ top: 0, bottom: -1 }]), BANDS)).toEqual(['sprite u-test frame 0: nothing is drawn']);
  });
});

describe('no weapon marks (§5.8, 2026-11-01)', () => {
  it('a shape block holds the body alone, so a mark or its points fail to parse', () => {
    for (const extra of [{ mark: 'blade' }, { markAt: [[4, 4]] }, { accent: 'splash' }]) {
      expect(SpriteSchema.safeParse({ ...good(), shape: { body: 'medium', ...extra } }).success, JSON.stringify(extra)).toBe(false);
    }
  });

  it('the data has no mark glyphs, in the default content or under ?proto=rework', () => {
    for (const c of [content, protoContent('rework')]) expect(c.spriteOrder.filter((id) => id.startsWith('m-'))).toEqual([]);
  });
});

// The core six and the Mortar's emplacement, redrawn from the approved sheet (§5.8, §11.2, §14.3; R4a-S3, T027).
describe('the core six and the Mortar', () => {
  const rework = protoContent('rework');
  const CORE = ['u-sporeling', 'u-capguard', 'u-gillArcher', 'u-amanitaKnight', 'u-hammercap'];

  it('declare the body their armor gives, in band and within their squad width, in all three frames', () => {
    for (const [c, ids] of [[content, CORE], [rework, [...CORE, 'u-burster']]] as const) {
      for (const id of ids) {
        const s = c.sprites[id]!, u = Object.values(c.units).find((x) => x.sprite === id)!;
        const spawner = Object.values(c.buildings).find((b) => b.spawn?.unit === u.id)!;
        expect(s.shape, id).toEqual({ body: bodyOf(u.armor) });
        expect(s.frames, id).toHaveLength(3);
        expect([...shapeProblems(s, c.bands[c.spriteSheet[id]!]), ...unitShapeProblems(u, s)], id).toEqual([]);
        for (let f = 0; f < 3; f++) expect(bodyBox(s, f)!.w, `${id} frame ${f}`).toBeLessThanOrEqual(widthBound(baseSquad(spawner) + 1));
      }
    }
  });

  it('every tower with an attack stands on an e-<id> emplacement with a structure body, and no mark', () => {
    for (const c of [content, rework]) {
      const towers = Object.values(c.buildings).filter((b) => b.kind === 'tower' && b.attack);
      expect(towers.map((b) => b.id)).toContain('puffballMortar');
      for (const b of towers) {
        const s = c.sprites[`e-${b.id}`]!;
        expect(s.shape, s.id).toEqual({ body: 'structure' });
        expect([...emplacementShapeProblems(b, s), ...shapeProblems(s, c.bands[c.spriteSheet[s.id]!])], s.id).toEqual([]);
      }
    }
  });
});
