// The shape language's checks (SPEC §5.8, §11.3, §14.3; R4a, T017): the body a unit's armor gives it, a
// frame's measured box, and every way a sprite's shape block breaks the rules. Units and emplacements carry
// no weapon mark (§5.8, the user's decision of 2026-11-01; T077), and the last cases keep it that way.
import { describe, expect, it } from 'vitest';
import { loadContent } from '../../src/data/registry.ts';
import type { Content } from '../../src/data/registry.ts';
import { SpriteSchema } from '../../src/data/schema.ts';
import type { SpriteBands, SpriteDef, SpriteShape } from '../../src/data/schema.ts';
import { baseSquad, bodyBox, bodyOf, emplacementShapeProblems, shapeProblems, unitShapeProblems, widthBound } from '../../src/data/shapes.ts';
import { nodeContent, readRawContent } from '../../tools/lib/content.ts';

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

  it('the data has no mark glyphs', () => {
    expect(content.spriteOrder.filter((id) => id.startsWith('m-'))).toEqual([]);
  });
});

// The core six and the Mortar's emplacement, redrawn from the approved sheet (§5.8, §11.2, §14.3; R4a-S3, T027).
describe('the core six and the Mortar', () => {
  /** The core six's units, with the Burster, which R2a made default data. */
  const CORE = ['u-sporeling', 'u-capguard', 'u-gillArcher', 'u-amanitaKnight', 'u-hammercap', 'u-burster'];

  it('declare the body their armor gives, in band and within their squad width, in all three frames', () => {
    for (const id of CORE) {
      const s = content.sprites[id]!, u = Object.values(content.units).find((x) => x.sprite === id)!;
      const spawner = Object.values(content.buildings).find((b) => b.squad?.unit === u.id)!;
      expect(s.shape, id).toEqual({ body: bodyOf(u.armor) });
      expect(s.frames, id).toHaveLength(3);
      expect([...shapeProblems(s, content.bands[content.spriteSheet[id]!]), ...unitShapeProblems(u, s)], id).toEqual([]);
      for (let f = 0; f < 3; f++) expect(bodyBox(s, f)!.w, `${id} frame ${f}`).toBeLessThanOrEqual(widthBound(baseSquad(spawner) + 1));
    }
  });

  it('every tower with an attack stands on an e-<id> emplacement with a structure body, and no mark', () => {
    const towers = Object.values(content.buildings).filter((b) => b.kind === 'tower' && b.attack);
    expect(towers.map((b) => b.id)).toContain('puffballMortar');
    for (const b of towers) {
      const s = content.sprites[`e-${b.id}`]!;
      expect(s.shape, s.id).toEqual({ body: 'structure' });
      expect([...emplacementShapeProblems(b, s), ...shapeProblems(s, content.bands[content.spriteSheet[s.id]!])], s.id).toEqual([]);
    }
  });
});

// The whole roster (§4.6, §5.8, §11.2, §17 #20; R4a-S4, T030): every unit sprite declares a shape, no two
// silhouettes overlap too much, and every unit fits its squad's k × k grid with a Rhizome Vault beside it
// (call 8). The Velvet Shrine's +2 may overflow under §18.2 #11's first guess: `npm run sprite-sheet` lists it,
// and nothing here fails it.
describe('the whole roster', () => {
  const unitSprites = (c: Content) => c.spriteOrder.filter((id) => id.startsWith('u-')).map((id) => c.sprites[id]!);
  /** Frame 0's opaque pixels, as points from the sprite's anchor. */
  const mask = (s: SpriteDef) => {
    const m = new Set<string>();
    s.frames[0]!.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (s.palette[row[x]!]) m.add(`${x - s.anchor[0]},${y - s.anchor[1]}`); });
    return m;
  };
  /** Two frame 0s overlaid on their anchors: shared pixels over all pixels. */
  const iou = (a: SpriteDef, b: SpriteDef) => {
    const ma = mask(a), mb = mask(b);
    let both = 0;
    for (const p of ma) if (mb.has(p)) both++;
    return both / (ma.size + mb.size - both);
  };

  it('every unit sprite declares a shape, or the data fails to load', () => {
    for (const s of unitSprites(content)) expect(s.shape, s.id).toBeDefined();
    const raw = structuredClone(readRawContent());
    delete (raw['sprites/units.json'] as { sprites: SpriteDef[] }).sprites.find((s) => s.id === 'u-tender')!.shape;
    expect(() => loadContent(raw)).toThrow(/unit tender: sprite u-tender declares no shape, and every unit sprite needs one/);
  });

  it('no two silhouettes overlap too much: an IoU below 0.75 on their anchors, or boxes 2 px apart', () => {
    const us = unitSprites(content);
    expect(iou(us[0]!, us[0]!)).toBe(1);
    const alike: string[] = [];
    for (let i = 0; i < us.length; i++) {
      for (let j = i + 1; j < us.length; j++) {
        const a = us[i]!, b = us[j]!, ba = bodyBox(a, 0)!, bb = bodyBox(b, 0)!;
        const apart = Math.abs(ba.w - bb.w) >= 2 || Math.abs(ba.h - bb.h) >= 2;
        if (!apart && iou(a, b) >= 0.75) alike.push(`${a.id} ~ ${b.id}: IoU ${iou(a, b).toFixed(2)}`);
      }
    }
    expect(alike).toEqual([]);
  });

  it("every unit's width fits its spawner's base squad + 1, in every frame", () => {
    expect([4, 5, 9, 10].map(widthBound)).toEqual([16, 10, 10, 8]);
    const checked = new Set<string>();
    for (const u of Object.values(content.units)) {
      const s = content.sprites[u.sprite]!;
      for (const b of Object.values(content.buildings).filter((x) => x.squad?.unit === u.id)) {
        const n = baseSquad(b) + 1;
        for (let f = 0; f < s.frames.length; f++) expect(bodyBox(s, f)!.w, `${s.id} frame ${f}, ${b.id}'s squad of ${n}`).toBeLessThanOrEqual(widthBound(n));
        checked.add(s.id);
      }
    }
    expect([...checked].sort()).toEqual(unitSprites(content).map((s) => s.id).sort());
  });
});
