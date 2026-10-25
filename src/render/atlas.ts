// Bakes every text sprite (SPEC §14.3) into one atlas with a simple shelf packer (SPEC §13.6).
// Sprites marked `factionSwap` get a Gray Rot variant baked from the faction palette, and unit
// sprites also get mirrored variants so enemy units face left.
import type { Content } from '../data/registry.ts';
import type { SpriteDef } from '../data/schema.ts';

export interface Region { x: number; y: number; w: number; h: number; ax: number; ay: number }
export type Faction = 'velvet-bloom' | 'gray-rot';

export interface Atlas {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  get(id: string, faction: Faction, frame: number, flip?: boolean): Region | undefined;
  frames(id: string): number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function bakeAtlas(content: Content): Atlas {
  const gray = content.factions['gray-rot']?.palette ?? {};
  interface Job { key: string; sprite: SpriteDef; frame: number; faction: Faction; flip: boolean }
  const jobs: Job[] = [];
  for (const id of content.spriteOrder) {
    const s = content.sprites[id]!;
    const isUnit = id.startsWith('u-');
    const factions: Faction[] = s.factionSwap ? ['velvet-bloom', 'gray-rot'] : ['velvet-bloom'];
    for (const faction of factions) {
      for (let f = 0; f < s.frames.length; f++) {
        for (const flip of isUnit ? [false, true] : [false]) {
          jobs.push({ key: `${id}|${faction}|${f}|${flip ? 1 : 0}`, sprite: s, frame: f, faction, flip });
        }
      }
    }
  }
  // shelf packing: tallest first
  const order = [...jobs].sort((a, b) => b.sprite.h - a.sprite.h || (a.key < b.key ? -1 : 1));
  const W = 1024;
  let x = 0, y = 0, shelf = 0;
  const regions = new Map<string, Region>();
  for (const j of order) {
    const { w, h } = j.sprite;
    if (x + w > W) { x = 0; y += shelf + 1; shelf = 0; }
    regions.set(j.key, { x, y, w, h, ax: j.flip ? w - j.sprite.anchor[0] : j.sprite.anchor[0], ay: j.sprite.anchor[1] });
    x += w + 1;
    shelf = Math.max(shelf, h);
  }
  const H = y + shelf + 1;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const img = ctx.createImageData(W, H);
  for (const j of jobs) {
    const r = regions.get(j.key)!;
    const rows = j.sprite.frames[j.frame]!;
    for (let py = 0; py < j.sprite.h; py++) {
      const row = rows[py]!;
      for (let px = 0; px < j.sprite.w; px++) {
        const ch = row[px]!;
        let col = j.sprite.palette[ch];
        if (j.faction === 'gray-rot' && j.sprite.factionSwap && gray[ch]) col = gray[ch];
        if (!col) continue;
        const [cr, cg, cb] = hexToRgb(col);
        const dx = j.flip ? j.sprite.w - 1 - px : px;
        const o = ((r.y + py) * W + r.x + dx) * 4;
        img.data[o] = cr; img.data[o + 1] = cg; img.data[o + 2] = cb; img.data[o + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return {
    canvas,
    get: (id, faction, frame, flip = false) =>
      regions.get(`${id}|${faction}|${frame}|${flip ? 1 : 0}`) ?? regions.get(`${id}|velvet-bloom|${frame}|${flip ? 1 : 0}`),
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
