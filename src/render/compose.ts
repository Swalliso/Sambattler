// The atlas's bake as pure functions (SPEC §13.6, §14.3), touching no DOM: a sprite frame's pixels after
// the faction swap and the mirror, an Elder's gold rim around a unit frame, and the atlas's shelf-packed
// layout. The atlas (src/render/atlas.ts) paints them onto its canvas, and unit tests read them without one.
import type { Content } from '../data/registry.ts';
import type { SpriteDef } from '../data/schema.ts';

export type Faction = 'velvet-bloom' | 'gray-rot';
/** A baked frame's place in the atlas, and its anchor (a unit's foot), mirrored with the frame. */
export interface Region { x: number; y: number; w: number; h: number; ax: number; ay: number }
/** A frame as RGBA pixels, row by row, transparent where the sprite has no colour. */
export interface FramePixels { w: number; h: number; px: Uint8ClampedArray }
/** One region the atlas bakes: a sprite's frame for a faction, mirrored or not, or (`rim`) a unit frame's Elder rim. */
export interface AtlasJob {
  key: string; sprite: SpriteDef; frame: number; faction: Faction; flip: boolean;
  w: number; h: number; ax: number; ay: number; rim?: boolean;
}
export interface AtlasLayout { jobs: AtlasJob[]; regions: Map<string, Region>; width: number; height: number }

/** The atlas's width in pixels; its height grows with the shelves. */
export const ATLAS_WIDTH = 1024;

/** The atlas's key for a frame. */
export const regionKey = (id: string, faction: Faction, frame: number, flip: boolean): string => `${id}|${faction}|${frame}|${flip ? 1 : 0}`;
/** The atlas's key for a unit frame's Elder rim, one for both factions. */
export const rimKey = (id: string, frame: number, flip: boolean): string => `rim|${id}|${frame}|${flip ? 1 : 0}`;
/** An Elder's rim (R4-Q3): gold, team-neutral, like the pips. */
export const RIM_GOLD = '#f0c85a';

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/**
 * One frame of a sprite as pixels. `swap` is a faction's palette (the Gray Rot's), applied to the keys it
 * covers when the sprite is `factionSwap`; `flip` mirrors the frame, as enemy units face left.
 */
export function framePixels(sprite: SpriteDef, frame: number, opts: { swap?: Readonly<Record<string, string>>; flip?: boolean } = {}): FramePixels {
  const { w, h } = sprite;
  const swap = sprite.factionSwap ? opts.swap : undefined;
  const rows = sprite.frames[frame]!;
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = rows[y]!;
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      let col = sprite.palette[ch];
      if (swap?.[ch]) col = swap[ch];
      if (!col) continue;
      const [r, g, b] = hexToRgb(col);
      const o = (y * w + (opts.flip ? w - 1 - x : x)) * 4;
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
    }
  }
  return { w, h, px };
}

/**
 * An Elder's gold rim around a unit frame (SPEC §5.8, §14.3): the 1-px outline of the frame's opaque mask,
 * every clear pixel beside it on a side, in a box one pixel bigger all round, with the anchor moved by
 * (+1, +1). It mirrors with `flip`, and the mask is the same for both factions.
 */
export function rimPixels(sprite: SpriteDef, frame: number, flip = false): FramePixels & { ax: number; ay: number } {
  const f = framePixels(sprite, frame, { flip });
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < f.w && y < f.h && f.px[(y * f.w + x) * 4 + 3]! > 0;
  const w = f.w + 2, h = f.h + 2;
  const px = new Uint8ClampedArray(w * h * 4);
  const [r, g, b] = hexToRgb(RIM_GOLD);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = x - 1, sy = y - 1;
      if (opaque(sx, sy) || !(opaque(sx - 1, sy) || opaque(sx + 1, sy) || opaque(sx, sy - 1) || opaque(sx, sy + 1))) continue;
      const o = (y * w + x) * 4;
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
    }
  }
  return { w, h, px, ax: (flip ? sprite.w - sprite.anchor[0] : sprite.anchor[0]) + 1, ay: sprite.anchor[1] + 1 };
}

/**
 * Every region the atlas bakes, shelf-packed tallest first into a sheet `ATLAS_WIDTH` wide, keyed by
 * `regionKey`: each sprite's frames, a Gray Rot variant of each `factionSwap` sprite, and a mirrored
 * variant of each unit (`u-`) sprite. Each unit frame and mirror also gets an Elder rim (`rimKey`), shared by
 * both factions; Bloomed units have none (R4-Q3).
 */
export function atlasLayout(content: Content): AtlasLayout {
  const jobs: AtlasJob[] = [];
  for (const id of content.spriteOrder) {
    const s = content.sprites[id]!;
    const isUnit = id.startsWith('u-');
    const factions: Faction[] = s.factionSwap ? ['velvet-bloom', 'gray-rot'] : ['velvet-bloom'];
    for (const faction of factions) {
      for (let f = 0; f < s.frames.length; f++) {
        for (const flip of isUnit ? [false, true] : [false]) {
          const ax = flip ? s.w - s.anchor[0] : s.anchor[0];
          jobs.push({ key: regionKey(id, faction, f, flip), sprite: s, frame: f, faction, flip, w: s.w, h: s.h, ax, ay: s.anchor[1] });
        }
      }
    }
    if (!isUnit) continue;
    for (let f = 0; f < s.frames.length; f++) {
      for (const flip of [false, true]) {
        const ax = (flip ? s.w - s.anchor[0] : s.anchor[0]) + 1;
        jobs.push({ key: rimKey(id, f, flip), sprite: s, frame: f, faction: 'velvet-bloom', flip, w: s.w + 2, h: s.h + 2, ax, ay: s.anchor[1] + 1, rim: true });
      }
    }
  }
  const order = [...jobs].sort((a, b) => b.h - a.h || (a.key < b.key ? -1 : 1));
  let x = 0, y = 0, shelf = 0;
  const regions = new Map<string, Region>();
  for (const j of order) {
    if (x + j.w > ATLAS_WIDTH) { x = 0; y += shelf + 1; shelf = 0; }
    regions.set(j.key, { x, y, w: j.w, h: j.h, ax: j.ax, ay: j.ay });
    x += j.w + 1;
    shelf = Math.max(shelf, j.h);
  }
  return { jobs, regions, width: ATLAS_WIDTH, height: y + shelf + 1 };
}
