// The color-blind assist's preview on the settings screen: a strip of field with the Velvet Bloom's mat
// and two of its units on the left and the Gray Rot's on the right, drawn with the renderer's own mat
// tiles, team marks and unit sprites, so it shows exactly what the field will with the assist on or off.
import type { Content } from '../data/registry.ts';
import type { Side } from '../sim/index.ts';
import type { Atlas } from './atlas.ts';
import { TILE, factionOf, matTile, teamMark } from './renderer.ts';

export const PREVIEW_COLS = 8;
export const PREVIEW_ROWS = 2;
/** Where the units stand: feet this far down (native px), leaving room for the marks below them. */
const FOOT_Y = 26;
/** Each unit by the building that spawns it, and its x in native px. */
const CAST: [Side, string, number][] = [
  ['player', 'sporelingBurrow', 22], ['player', 'gillNest', 44], ['enemy', 'capguardHall', 84], ['enemy', 'sporelingBurrow', 106],
];

export function drawAssistPreview(canvas: HTMLCanvasElement, content: Content, atlas: Atlas, assist: boolean): void {
  const W = PREVIEW_COLS * TILE, H = PREVIEW_ROWS * TILE;
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const sprite = (id: string, side: Side, x: number, y: number, flip = false, anchor = false) => {
    const r = atlas.get(id, factionOf(side), 0, flip);
    if (!r) return 0;
    g.drawImage(atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, anchor ? x - r.ax : x, anchor ? y - r.ay : y, r.w, r.h);
    return r.w;
  };
  for (let row = 0; row < PREVIEW_ROWS; row++) {
    for (let col = 0; col < PREVIEW_COLS; col++) sprite(((col * 7 + row * 13) & 3) === 0 ? 't-soil2' : 't-soil', 'player', col * TILE, row * TILE);
  }
  const half = PREVIEW_COLS / 2;
  for (const side of ['player', 'enemy'] as Side[]) {
    const tile = matTile(content.factions[factionOf(side)]!.mat, side, assist);
    for (let row = 0; row < PREVIEW_ROWS; row++) {
      for (let col = 0; col < half; col++) g.drawImage(tile, (side === 'player' ? col : half + col) * TILE, row * TILE);
    }
  }
  for (const [side, building, x] of CAST) {
    const unit = content.units[content.buildings[building]?.spawn?.unit ?? '']!;
    const r = atlas.get(unit.sprite, factionOf(side), 0, side === 'enemy');
    if (!r) continue;
    if (assist) teamMark(g, x, FOOT_Y, r.w, side);
    sprite(unit.sprite, side, x, FOOT_Y, side === 'enemy', true);
  }
}
