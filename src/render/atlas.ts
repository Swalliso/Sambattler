// Bakes every text sprite (SPEC §14.3) into one atlas with a simple shelf packer (SPEC §13.6).
// Sprites marked `factionSwap` get a Gray Rot variant baked from the faction palette, and unit
// sprites also get mirrored variants so enemy units face left, and an Elder's gold rim for each
// frame. The layout and each region's pixels come from the pure functions in compose.ts; this
// file paints them onto the canvas.
import type { Content } from '../data/registry.ts';
import { atlasLayout, framePixels, regionKey, rimKey, rimPixels } from './compose.ts';
import type { Faction, Region } from './compose.ts';

export type { Faction, Region } from './compose.ts';

export interface Atlas {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  get(id: string, faction: Faction, frame: number, flip?: boolean): Region | undefined;
  /** A unit frame's Elder rim (R4-Q3), one pixel bigger all round, for both factions. */
  rim(id: string, frame: number, flip?: boolean): Region | undefined;
  frames(id: string): number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function bakeAtlas(content: Content): Atlas {
  const gray = content.factions['gray-rot']?.palette ?? {};
  const { jobs, regions, width: W, height: H } = atlasLayout(content);
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const img = ctx.createImageData(W, H);
  for (const j of jobs) {
    const r = regions.get(j.key)!;
    const f = j.rim ? rimPixels(j.sprite, j.frame, j.flip) : framePixels(j.sprite, j.frame, { swap: j.faction === 'gray-rot' ? gray : undefined, flip: j.flip });
    for (let py = 0; py < f.h; py++) img.data.set(f.px.subarray(py * f.w * 4, (py + 1) * f.w * 4), ((r.y + py) * W + r.x) * 4);
  }
  ctx.putImageData(img, 0, 0);
  return {
    canvas,
    get: (id, faction, frame, flip = false) =>
      regions.get(regionKey(id, faction, frame, flip)) ?? regions.get(regionKey(id, 'velvet-bloom', frame, flip)),
    rim: (id, frame, flip = false) => regions.get(rimKey(id, frame, flip)),
    frames: (id) => content.sprites[id]?.frames.length ?? 0,
  };
}

/** Draws one sprite region into a small standalone canvas (tray cards, portraits). */
export function spriteToCanvas(atlas: Atlas, id: string, faction: Faction, frame = 0): HTMLCanvasElement {
  const r = atlas.get(id, faction, frame);
  const c = document.createElement('canvas');
  c.width = r?.w ?? 1; c.height = r?.h ?? 1;
  if (r) {
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  }
  return c;
}
