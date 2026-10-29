// The battlefield's frame (docs/ui-ux-plan.md, Phase 1a: clean field, rich frame). The void around the
// field becomes the earth it sits in: a roots ceiling, a soil bed with each side's buried threads, roots
// at the sides and each Heartcap's crown rising into the ceiling. All of it is text sprites
// (data/sprites/frame.json), baked once per layout on a canvas at the field's own pixel scale and lined up
// with the field's pixels. Ambient spores (src/render/spores.ts) drift over it on a second canvas, thicker
// with each Sporestorm stack. Both canvases sit behind the field and the bands and take no input.
import type { Content } from '../data/registry.ts';
import type { Atlas, Faction } from './atlas.ts';
import { SporeDrift } from './spores.ts';

const BG = '#141018';
const LILAC = '201, 162, 255';
const ASH = '184, 196, 168';
/** A Heartcap strip is two 16 px tiles; its crown is centred on it. */
const HEART_CX = 16;
/** Spores per 10 000 native px² of frame, at rest and per Sporestorm stack. */
const SPORE_BASE = 1.6;
const SPORE_PER_STACK = 1.4;

/** Where each glowing knot (`l`) sits in a hyphae tile, for its light pool. */
function knots(content: Content, id: string): [number, number][] {
  const out: [number, number][] = [];
  content.sprites[id]?.frames[0]!.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === 'l') out.push([x, y]);
  });
  return out;
}

export class FieldFrame {
  readonly el: HTMLElement;
  private back: HTMLCanvasElement;
  private bg: CanvasRenderingContext2D;
  private drift: SporeDrift;
  private knotsBloom: [number, number][];
  private knotsRot: [number, number][];
  /** Frame size in native px, and the field's top-left corner inside it. */
  private w = 0;
  private h = 0;
  private ox = 0;
  private oy = 0;
  private layoutKey = '';

  /**
   * @param fieldW, fieldH the field canvas's native size
   * @param still spores hold still (`?test=1`), so screenshots and browser tests are stable
   */
  constructor(content: Content, private atlas: Atlas, private fieldW: number, private fieldH: number, still = false) {
    this.back = document.createElement('canvas');
    this.bg = this.back.getContext('2d', { alpha: false })!;
    this.drift = new SporeDrift(still);
    this.el = document.createElement('div');
    this.el.className = 'fieldframe';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.append(this.back, this.drift.canvas);
    this.knotsBloom = knots(content, 'f-hyphae');
    this.knotsRot = knots(content, 'f-hyphae-rot');
  }

  /**
   * Sizes both canvases to cover the frame's box and lines their pixels up with the field's. Rects are
   * screen pixels (getBoundingClientRect); `ui` turns them back into layout pixels.
   */
  layout(field: DOMRect, box: DOMRect, ui: number): void {
    const s = field.width / this.fieldW;
    if (!(s > 0) || box.width <= 0 || box.height <= 0) return;
    const ox = Math.ceil((field.left - box.left) / s), oy = Math.ceil((field.top - box.top) / s);
    const left = field.left - ox * s, top = field.top - oy * s;
    const w = Math.ceil((box.right - left) / s), h = Math.ceil((box.bottom - top) / s);
    for (const c of [this.back, this.drift.canvas]) {
      c.style.left = `${(left - box.left) / ui}px`;
      c.style.top = `${(top - box.top) / ui}px`;
      c.style.width = `${(w * s) / ui}px`;
      c.style.height = `${(h * s) / ui}px`;
    }
    const key = `${w}x${h}+${ox}+${oy}`;
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.back.width = w;
    this.back.height = h;
    this.drift.resize(w, h);
    this.bake();
  }

  /** Copies of a sprite side by side across [x0, x1), on the field's tile grid. */
  private row(id: string, faction: Faction, y: number, x0: number, x1: number): void {
    const r = this.atlas.get(id, faction, 0);
    if (!r) return;
    const src = this.atlas.canvas as CanvasImageSource;
    for (let x = this.ox - Math.ceil((this.ox - x0) / r.w) * r.w; x < x1; x += r.w) this.bg.drawImage(src, r.x, r.y, r.w, r.h, x, y, r.w, r.h);
  }

  /** One sprite, mirrored around its own centre for the enemy's side. */
  private sprite(id: string, faction: Faction, x: number, y: number, mirror: boolean): void {
    const r = this.atlas.get(id, faction, 0);
    if (!r) return;
    const g = this.bg;
    g.save();
    if (mirror) { g.translate(x + r.w, 0); g.scale(-1, 1); x = 0; }
    g.drawImage(this.atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, x, y, r.w, r.h);
    g.restore();
  }

  /** A soft light pool rising from below, fading out with distance. */
  private pool(x: number, y: number, r: number, rgb: string, a: number): void {
    const g = this.bg;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${rgb}, ${a})`);
    grad.addColorStop(0.5, `rgba(${rgb}, ${a / 4})`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  private bake(): void {
    const g = this.bg, W = this.w, H = this.h, ox = this.ox, oy = this.oy, fw = this.fieldW, fh = this.fieldH;
    const bloom: Faction = 'velvet-bloom', rot: Faction = 'gray-rot';
    g.imageSmoothingEnabled = false;
    g.fillStyle = BG;
    g.fillRect(0, 0, W, H);
    const earth = this.atlas.get('f-earth', bloom, 0)?.h ?? 32;
    for (let y = oy - Math.ceil(oy / earth) * earth; y < H; y += earth) this.row('f-earth', bloom, y, 0, W);
    // roots down each side, lit on the side facing the field
    const side = this.atlas.get('f-side', bloom, 0);
    if (side) {
      for (let y = oy; y < oy + fh; y += side.h) {
        this.sprite('f-side', bloom, ox - side.w, y, false);
        this.sprite('f-side', bloom, ox + fw, y, true);
      }
    }
    const ceiling = this.atlas.get('f-ceiling', bloom, 0);
    if (ceiling) this.row('f-ceiling', bloom, oy - ceiling.h, 0, W);
    const bed = oy + fh;
    this.row('f-bed', bloom, bed, 0, W);
    // each side's threads under its own half of the field
    const mid = ox + fw / 2;
    g.save();
    g.beginPath(); g.rect(0, bed, mid, H - bed); g.clip();
    this.row('f-hyphae', bloom, bed, 0, mid);
    g.restore();
    g.save();
    g.beginPath(); g.rect(mid, bed, W - mid, H - bed); g.clip();
    this.row('f-hyphae-rot', bloom, bed, mid, W);
    g.restore();
    // each Heartcap's crown rises into the ceiling behind it
    const crown = this.atlas.get('f-crown', bloom, 0);
    if (crown) {
      this.sprite('f-crown', bloom, ox + HEART_CX - crown.w / 2, oy - crown.h, false);
      this.sprite('f-crown', rot, ox + fw - HEART_CX - crown.w / 2, oy - crown.h, true);
    }
    // light pools: around each glowing knot, and each Heartcap's glow up into the ceiling
    const tile = this.atlas.get('f-hyphae', bloom, 0)?.w ?? 192;
    for (let x = ox - Math.ceil(ox / tile) * tile; x < W; x += tile) {
      for (const [kx, ky] of this.knotsBloom) if (x + kx < mid) this.pool(x + kx + 0.5, bed + ky + 0.5, 12, LILAC, 0.10);
      for (const [kx, ky] of this.knotsRot) if (x + kx >= mid) this.pool(x + kx + 0.5, bed + ky + 0.5, 12, ASH, 0.07);
    }
    this.pool(ox + HEART_CX, oy - 6, 46, LILAC, 0.10);
    this.pool(ox + fw - HEART_CX, oy - 6, 46, ASH, 0.08);
  }

  /**
   * Drifts and draws the spores. `rate` is the game's speed (0 while paused, held or over); spores hold
   * still under reduced motion and in test mode. Nothing is drawn when nothing moved.
   */
  frame(stacks: number, now: number, rate: number): void {
    this.drift.frame(SPORE_BASE + SPORE_PER_STACK * stacks, now, rate);
  }
}
