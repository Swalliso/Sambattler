// The one unit drawer (SPEC §5.8, §10.4, §13.6): a unit's sprite at its foot point and its own size, with
// its team mark, Elder aura and gold rim under it, and its shield ring, selection box, tier
// pips and HP bar over it, drawn in that order. v1's renderer draws every unit through it, and R2a's views
// will too (R4a, call 5). It takes the foot point in native pixels and imports nothing from the renderer,
// so any view can use it.
import type { Content } from '../data/registry.ts';
import type { Side, Tier } from '../sim/index.ts';
import type { Atlas, Faction, Region } from './atlas.ts';

export const INK_DEEP = '#120a16';
/** A pip's size (the `i-pip` sprite, a gold core in a dark outline), and the gap between two pips. */
export const PIP_SIZE = { w: 5, h: 5 };
const PIP_GAP = 1;

/** A box on the canvas, in native pixels. */
export interface Box { x: number; y: number; w: number; h: number }

export interface LayoutOpts {
  /** Below full HP: the HP bar shows, and the pips sit above it. */
  damaged?: boolean;
  /** The pip sprite's size; `PIP_SIZE` when unset. */
  pip?: { w: number; h: number };
}

/** Where a unit's parts go (SPEC §5.8, §10.4): every tier at its sprite's own size, so size means armor. */
export interface UnitLayout {
  /** The sprite's box. */
  body: Box;
  /** An Elder's gold rim, one pixel outside the body and drawn under it; null below Elder (R4-Q3). */
  rim: Box | null;
  /** One pip per tier above base, left to right, centred over the sprite. */
  pips: Box[];
  /** The HP bar's fill, on a 1-px dark backing; null at full HP. */
  bar: Box | null;
}

/** `tier - 1` pip boxes, centred on `cx`, with their tops at `top`. */
export function pipBoxes(cx: number, top: number, tier: Tier, pip: { w: number; h: number } = PIP_SIZE): Box[] {
  const n = tier - 1;
  const span = n * pip.w + Math.max(0, n - 1) * PIP_GAP;
  const x0 = Math.round(cx - span / 2);
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (pip.w + PIP_GAP), y: top, w: pip.w, h: pip.h }));
}

/**
 * Lays out a unit drawn from `region` with its foot at (footX, footY). The pips sit one clear row above
 * the HP bar's backing when the unit is damaged, else above the rim or the sprite, so they touch neither.
 */
export function unitLayout(region: Region, footX: number, footY: number, tier: Tier, opts: LayoutOpts = {}): UnitLayout {
  const body = { x: Math.round(footX - region.ax), y: Math.round(footY - region.ay), w: region.w, h: region.h };
  const rim = tier === 3 ? { x: body.x - 1, y: body.y - 1, w: body.w + 2, h: body.h + 2 } : null;
  const bar = opts.damaged ? { x: body.x + 1, y: body.y - 3, w: body.w - 2, h: 2 } : null;
  const pip = opts.pip ?? PIP_SIZE;
  const under = bar ? bar.y - 1 : rim ? rim.y : body.y;
  return { body, rim, pips: pipBoxes(body.x + body.w / 2, under - 1 - pip.h, tier, pip), bar };
}

export interface UnitSpriteOpts {
  /** The sprite, its frame (0 and 1 walk, 2 attack), the faction it's baked for, and whether it faces left. */
  sprite: string;
  faction: Faction;
  frame: number;
  flip: boolean;
  /** The foot point, in native pixels. */
  x: number;
  y: number;
  tier: Tier;
  side: Side;
  /** The unit's id, which staggers its Elder pulse and mound crumbs. */
  id: number;
  /** HP left as a fraction of the most it has; below 1 shows the HP bar. */
  hpFrac: number;
  /** The arrival shield (§5.3, #8): what's left of it, or undefined for none. */
  shieldFrac?: number;
  /** Combat rework (the Rhizomorph): tunnelling, so drawn as a moving mound. */
  burrowed?: boolean;
  /** The faction's glow (its mat's), for the Elder's aura and a mound's seam. */
  glow: string;
  /** The color-blind assist's team mark under the unit. */
  assist?: boolean;
  selected?: boolean;
  /** The clock in ms, for the pulses and the crumbs. */
  time: number;
  /** Opacity, for R2a's dimmed preview; 1 when unset. */
  alpha?: number;
}

/**
 * One unit: its sprite at its foot point and its own size whatever its tier, with tier pips (and an
 * Elder's gold rim under the sprite), its shield ring, HP bar and selection box. A tunnelling Rhizomorph
 * is a mound.
 */
export function drawUnitSprite(g: CanvasRenderingContext2D, atlas: Atlas, o: UnitSpriteOpts): void {
  const a = o.alpha ?? 1;
  g.globalAlpha = a;
  if (o.burrowed) { mound(g, o.x, o.y, o.side, o.id, o.glow, o.time, !!o.selected); g.globalAlpha = 1; return; }
  const r = atlas.get(o.sprite, o.faction, o.frame, o.flip);
  if (!r) { g.globalAlpha = 1; return; }
  const L = unitLayout(r, o.x, o.y, o.tier, { damaged: o.hpFrac < 1, pip: atlas.get('i-pip', 'velvet-bloom', 0) });
  const { body } = L;
  if (o.assist) teamMark(g, Math.round(o.x), Math.round(o.y), body.w, o.side);
  if (o.tier === 3) elderAura(g, o.x, o.y, body.w, o.glow, o.time + o.id * 37, a);
  const rim = L.rim && atlas.rim(o.sprite, o.frame, o.flip);
  if (L.rim && rim) g.drawImage(atlas.canvas as CanvasImageSource, rim.x, rim.y, rim.w, rim.h, L.rim.x, L.rim.y, rim.w, rim.h);
  g.drawImage(atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, body.x, body.y, body.w, body.h);
  if (o.shieldFrac !== undefined) shieldRing(g, o.x, body.y + body.h / 2, body.w, body.h, o.shieldFrac, a);
  if (o.selected) {
    g.strokeStyle = '#ffe9a8';
    g.strokeRect(body.x - 0.5, body.y - 0.5, body.w + 1, body.h + 1);
  }
  if (L.pips.length) drawPips(g, atlas, body.x + body.w / 2, L.pips[0]!.y, o.tier);
  if (L.bar) hpBar(g, L.bar.x, L.bar.y, L.bar.w, o.hpFrac, o.side);
  g.globalAlpha = 1;
}

/**
 * The sprite an emplacement stands on in its slot (§5.8, R4-Q5; R4a call 4): `e-<buildingId>` where the data
 * draws one, else the building's own. v1's battle keeps drawing a tower as its building; R2a's clash view
 * draws the emplacement through this.
 */
export function emplacementSprite(content: Pick<Content, 'sprites' | 'buildings'>, buildingId: string): string {
  const e = `e-${buildingId}`;
  return e in content.sprites ? e : content.buildings[buildingId]!.sprite;
}

/**
 * Color-blind assist: a mark under a unit's feet that peeks out either side of the sprite. The Velvet
 * Bloom's is a light lilac ring; the Gray Rot's is a dark bar with pale dashes along its foot.
 */
export function teamMark(g: CanvasRenderingContext2D, cx: number, footY: number, w: number, side: Side): void {
  const half = Math.max(5, Math.round(w / 2) + 1);
  const x0 = cx - half, x1 = cx + half - 1;
  if (side === 'player') {
    g.fillStyle = INK_DEEP;
    g.fillRect(x0, footY + 2, x1 - x0 + 1, 1);
    g.fillStyle = '#c9a2ff';
    g.fillRect(x0, footY - 1, 1, 2);
    g.fillRect(x1, footY - 1, 1, 2);
    g.fillRect(x0 + 1, footY + 1, x1 - x0 - 1, 1);
  } else {
    g.fillStyle = INK_DEEP;
    g.fillRect(x0, footY, x1 - x0 + 1, 3);
    g.fillStyle = '#b8c4a8';
    for (let x = x0 + 1; x < x1; x += 3) g.fillRect(x, footY + 2, 1, 1);
  }
}

/** Combat rework (the Rhizomorph): a tunnelling unit is a mound of earth on the move, kicking up crumbs behind it. */
export function mound(g: CanvasRenderingContext2D, cx: number, footY: number, side: Side, id: number, glow: string, t: number, selected: boolean): void {
  const x = Math.round(cx), y = Math.round(footY);
  // a dark outline, the earth, a lit crest and a glowing seam where the hyphae break the surface
  g.fillStyle = INK_DEEP;
  g.fillRect(x - 8, y - 3, 16, 4);
  g.fillRect(x - 6, y - 5, 12, 2);
  g.fillRect(x - 3, y - 6, 6, 1);
  g.fillStyle = '#5c4330';
  g.fillRect(x - 7, y - 3, 14, 3);
  g.fillRect(x - 5, y - 5, 10, 2);
  g.fillStyle = '#7a5236';
  g.fillRect(x - 4, y - 5, 6, 1);
  g.fillRect(x - 2, y - 6, 3, 1);
  g.fillStyle = glow;
  g.fillRect(x - 3, y - 2, 1, 1);
  g.fillRect(x + 1, y - 3, 1, 1);
  g.fillRect(x + 4, y - 2, 1, 1);
  // crumbs thrown up behind it as it goes
  const back = side === 'player' ? -1 : 1;
  g.fillStyle = '#7a5236';
  for (let i = 0; i < 4; i++) {
    const k = (Math.floor(t / 110) + id + i) % 5;
    g.fillRect(x + back * (8 + 2 * k), y - 2 - (k % 3), 1, 1);
  }
  if (selected) {
    g.strokeStyle = '#ffe9a8';
    g.strokeRect(x - 9.5, y - 7.5, 19, 10);
  }
}

/**
 * Tier insignia from the `ui` sheet (`i-pip`, a gold core in a dark outline): one for Bloomed, two for
 * Elder, centred on `cx` with their tops at `y`. R2a's merge preview draws them too.
 */
export function drawPips(g: CanvasRenderingContext2D, atlas: Atlas, cx: number, y: number, tier: Tier): void {
  const pip = atlas.get('i-pip', 'velvet-bloom', 0);
  if (!pip) return;
  for (const p of pipBoxes(cx, y, tier, pip)) g.drawImage(atlas.canvas as CanvasImageSource, pip.x, pip.y, pip.w, pip.h, p.x, p.y, pip.w, pip.h);
}

/** A slow pulsing halo under an Elder's feet. */
export function elderAura(g: CanvasRenderingContext2D, cx: number, footY: number, w: number, color: string, t: number, alpha = 1): void {
  g.globalAlpha = alpha * (0.22 + 0.08 * Math.sin(t / 300));
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(cx, footY - 1, w * 0.55, 3.5, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = alpha;
}

/**
 * The arrival shield (§5.3, #8): a pale bubble round a shielded unit, fading as the shield wears down
 * (`frac`: what is left of the shield it set out with).
 */
export function shieldRing(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, frac: number, alpha = 1): void {
  const k = Math.max(0, Math.min(1, frac));
  g.globalAlpha = alpha * (0.2 + 0.5 * k);
  g.strokeStyle = '#cfe8ff';
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(Math.round(cx) + 0.5, Math.round(cy) + 0.5, w * 0.62 + 1, h * 0.58 + 1, 0, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = alpha * (0.08 + 0.1 * k);
  g.fillStyle = '#cfe8ff';
  g.fill();
  g.globalAlpha = alpha;
}

/** An HP bar in the side's colour on a dark backing, `h` px tall: units, buildings and the Heartcaps. */
export function hpBar(g: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number, side: Side, h = 2): void {
  g.fillStyle = INK_DEEP;
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = side === 'player' ? '#c9a2ff' : '#b8c4a8';
  g.fillRect(x, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, frac)))), h);
}
