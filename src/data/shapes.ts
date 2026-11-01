// The shape language as data checks (SPEC §5.8, §14.3; R4a): the body and the weapon mark a unit's data gives
// it, a frame's measured boxes, and every way a sprite's shape block breaks the rules. Pure arithmetic on the
// sprite rows and the `m-` glyphs' rows: src/data is the bottom layer (§13.2), so this file imports nothing
// from src/render, and src/render/compose.ts, which bakes the glyphs onto the frames, imports it.
import type { ArmorTypeT, BuildingDef, DamageTypeT, SpriteBands, SpriteDef, SpriteShape, UnitDef } from './schema.ts';

export type Body = SpriteShape['body'];
export type Mark = SpriteShape['mark'];
/** A box of a frame's pixels: its left column, top row, width and height. */
export interface Box { x: number; y: number; w: number; h: number }
/** Sprites by id; the checks and the bake look up `m-<mark>` in it, so a content's whole sprite table will do. */
export type Glyphs = Readonly<Record<string, SpriteDef>>;

const BODY: Record<ArmorTypeT, Body> = { light: 'small', medium: 'medium', heavy: 'big', structure: 'structure' };
/** A slot's width in native px: 2 tiles of 16 (§4.6). */
const SLOT_PX = 32;

/** The body an armor gives (§5.8): light units are small, medium are medium, heavy are big. Structure has no band. */
export function bodyOf(armor: ArmorTypeT): Body {
  return BODY[armor];
}

/** A weapon's mark (§5.8): a blade for slash, a hammer for crush, and for pierce an arrow if it shoots, else a spike. */
function weaponMark(type: DamageTypeT, projectileSpeed: number): Mark {
  if (type === 'slash') return 'blade';
  if (type === 'crush') return 'hammer';
  return projectileSpeed > 0 ? 'arrow' : 'spike';
}

/**
 * The mark a unit carries (§5.8; R4-Q2, §18.2 #55): the area mark for armor-ignoring damage (`burst`), the
 * heal mark for a healer that deals no damage, and otherwise its damage type's. A splash or cleave that goes
 * through the matrix keeps its type's mark, so the Scythecap carries the blade (A149, A150).
 */
export function markOf(unit: UnitDef): Mark {
  if (unit.tags.includes('burst')) return 'area';
  if (unit.heal && unit.damage === 0) return 'heal';
  return weaponMark(unit.damageType, unit.projectileSpeed);
}

/**
 * The mark an emplacement carries (§5.8, R4-Q5): its attack's type's mark, with the splash accent when its
 * shells splash, since they still hit through the matrix. So the Puffball Mortar carries a hammer (A151).
 * A building with no attack carries none.
 */
export function towerMarkOf(building: BuildingDef): { mark: Mark; accent?: 'splash' } {
  const a = building.attack;
  if (!a) return { mark: 'none' };
  const mark = weaponMark(a.damageType, a.projectileSpeed);
  return a.splashRadius ? { mark, accent: 'splash' } : { mark };
}

/** A spawner's base squad: until R2a writes R1's sizes into the data, a minute's spawns (§11.2, R4a call 8). */
export function baseSquad(building: BuildingDef): number {
  return building.spawn ? building.spawn.count * Math.round(60 / building.spawn.interval) : 0;
}

/** The widest a unit may be drawn, mark included, in a squad of n: floor(32 / k), k = ceil(sqrt(n)) (§4.6, §14.3). */
export function widthBound(n: number): number {
  return Math.floor(SLOT_PX / Math.ceil(Math.sqrt(n)));
}

/** The bounding box of the pixels a palette draws in these rows, or null if it draws none. */
function opaqueBox(rows: readonly string[], palette: SpriteDef['palette']): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!palette[row[x]!]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  });
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** A frame's body: the box of its own opaque pixels, so the mark and an Elder's rim never count (R4a call 2). */
export function bodyBox(sprite: SpriteDef, frame: number): Box | null {
  return opaqueBox(sprite.frames[frame] ?? [], sprite.palette);
}

/** A glyph's own opaque box, inside its frame. */
export function glyphBox(glyph: SpriteDef): Box | null {
  return opaqueBox(glyph.frames[0] ?? [], glyph.palette);
}

/**
 * The glyphs a frame bakes on, in order: `m-<mark>` at `markAt[frame]`, then `m-<accent>` at
 * `accentAt[frame]`, each by the top-left of its glyph's frame, before the frame is mirrored.
 */
export function placedGlyphs(sprite: SpriteDef, frame: number): { id: string; x: number; y: number }[] {
  const s = sprite.shape;
  if (!s) return [];
  const out: { id: string; x: number; y: number }[] = [];
  const mark = s.mark !== 'none' ? s.markAt?.[frame] : undefined;
  if (mark) out.push({ id: `m-${s.mark}`, x: mark[0], y: mark[1] });
  const accent = s.accent ? s.accentAt?.[frame] : undefined;
  if (accent) out.push({ id: `m-${s.accent}`, x: accent[0], y: accent[1] });
  return out;
}

/** Where a placed glyph's opaque pixels land in the frame, or null if the glyph is missing or empty. */
function placedBox(g: { id: string; x: number; y: number }, glyphs: Glyphs): Box | null {
  const def = glyphs[g.id];
  const b = def ? glyphBox(def) : null;
  return b && { x: g.x + b.x, y: g.y + b.y, w: b.w, h: b.h };
}

/**
 * A baked frame's box: the body's opaque box united with each placed glyph's own opaque box, mirrored with
 * `flip` as the atlas mirrors the frame. It isn't clipped to the sprite's box, so a glyph that leaves the box
 * (a shape problem) widens it. The width bound measures this box (§14.3, R4a call 8).
 */
export function composedBox(sprite: SpriteDef, frame: number, glyphs: Glyphs, flip = false): Box | null {
  let box = bodyBox(sprite, frame);
  for (const g of placedGlyphs(sprite, frame)) {
    const b = placedBox(g, glyphs);
    if (!b) continue;
    if (!box) { box = b; continue; }
    const x = Math.min(box.x, b.x), y = Math.min(box.y, b.y);
    box = { x, y, w: Math.max(box.x + box.w, b.x + b.w) - x, h: Math.max(box.y + box.h, b.y + b.h) - y };
  }
  return box && flip ? { ...box, x: sprite.w - box.x - box.w } : box;
}

const entries = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;
const frames = (n: number) => `${n} ${n === 1 ? 'frame' : 'frames'}`;

/**
 * A shape block's own problems, before any pixel is measured: a mark (other than none) or an accent with no
 * point list, or a point list that doesn't give one point per frame. SpriteSchema runs these as it parses.
 */
export function shapeBlockProblems(sprite: Pick<SpriteDef, 'id' | 'frames' | 'shape'>): string[] {
  const s = sprite.shape;
  if (!s) return [];
  const out: string[] = [];
  const n = sprite.frames.length;
  if (s.mark !== 'none' && !s.markAt) out.push(`sprite ${sprite.id}: its ${s.mark} mark has no markAt`);
  if (s.markAt && s.markAt.length !== n) out.push(`sprite ${sprite.id}: markAt has ${entries(s.markAt.length)} for ${frames(n)}`);
  if (s.accent && !s.accentAt) out.push(`sprite ${sprite.id}: its ${s.accent} accent has no accentAt`);
  if (s.accentAt && s.accentAt.length !== n) out.push(`sprite ${sprite.id}: accentAt has ${entries(s.accentAt.length)} for ${frames(n)}`);
  return out;
}

/** A unit's sprite against its unit (§5.8): the body its armor gives, and the mark §5.8's rule gives. */
export function unitShapeProblems(unit: UnitDef, sprite: SpriteDef): string[] {
  const s = sprite.shape;
  if (!s) return [];
  const out: string[] = [];
  const body = bodyOf(unit.armor), mark = markOf(unit);
  if (s.body !== body) out.push(`unit ${unit.id}: sprite ${sprite.id} has a ${s.body} body, but ${unit.armor} armor draws a ${body} one`);
  if (s.mark !== mark) out.push(`unit ${unit.id}: sprite ${sprite.id} carries the ${s.mark} mark, but its unit's mark is the ${mark}`);
  return out;
}

/** An emplacement's sprite (`e-<buildingId>`) against its building (§5.8, R4-Q5): a structure body, and its attack's mark and accent. */
export function emplacementShapeProblems(building: BuildingDef, sprite: SpriteDef): string[] {
  const s = sprite.shape;
  if (!s) return [];
  const out: string[] = [];
  const want = towerMarkOf(building);
  if (s.body !== 'structure') out.push(`building ${building.id}: sprite ${sprite.id} has a ${s.body} body, but an emplacement's is structure`);
  if (s.mark !== want.mark || s.accent !== want.accent) {
    const say = (m: { mark: Mark; accent?: 'splash' }) => `the ${m.mark} mark${m.accent ? ` with the ${m.accent} accent` : ''}`;
    out.push(`building ${building.id}: sprite ${sprite.id} carries ${say(s)}, but its attack's is ${say(want)}`);
  }
  return out;
}

/**
 * Every way a sprite breaks its shape block (§5.8, §14.3), each naming the sprite and, where it's one frame's,
 * the frame. Bands are checked here and nowhere else. A sprite with no shape has none.
 * - the block: a point per frame for the mark and the accent, and an `m-` glyph for each;
 * - the body: each frame's opaque height within its band (the sheet's `bands`; structure has none);
 * - each placed glyph, in each frame: inside the sprite's w × h box; within the body's rows, so it never
 *   makes a unit look taller than its band (R4a call 10); and, for a unit, not in the body's back half,
 *   since units face +x until mirrored (A165). An emplacement has no front, so its marks may stand anywhere.
 */
export function shapeProblems(sprite: SpriteDef, bands: SpriteBands | undefined, glyphs: Glyphs): string[] {
  const s = sprite.shape;
  if (!s) return [];
  const id = `sprite ${sprite.id}`;
  const out = shapeBlockProblems(sprite);
  if (s.mark !== 'none' && !glyphs[`m-${s.mark}`]) out.push(`${id}: no m-${s.mark} glyph for its ${s.mark} mark`);
  if (s.accent && !glyphs[`m-${s.accent}`]) out.push(`${id}: no m-${s.accent} glyph for its ${s.accent} accent`);
  const band = s.body === 'structure' ? undefined : bands?.[s.body];
  if (s.body !== 'structure' && !band) out.push(`${id}: its sheet has no bands for its ${s.body} body`);
  for (let f = 0; f < sprite.frames.length; f++) {
    const at = `${id} frame ${f}`;
    const body = bodyBox(sprite, f);
    if (!body) { out.push(`${at}: nothing is drawn`); continue; }
    if (band && (body.h < band[0] || body.h > band[1])) out.push(`${at}: ${s.body} body out of band (${body.h} px tall, the band is ${band[0]}–${band[1]})`);
    const bottom = body.y + body.h - 1;
    for (const g of placedGlyphs(sprite, f)) {
      const b = placedBox(g, glyphs);
      if (!b) continue;
      if (b.x < 0 || b.y < 0 || b.x + b.w > sprite.w || b.y + b.h > sprite.h) out.push(`${at}: ${g.id} leaves the ${sprite.w} × ${sprite.h} box`);
      const rows = `its rows ${b.y}–${b.y + b.h - 1}, the body's ${body.y}–${bottom}`;
      if (b.y < body.y) out.push(`${at}: ${g.id} reaches above the body's top row (${rows})`);
      if (b.y + b.h - 1 > bottom) out.push(`${at}: ${g.id} reaches below the body's bottom row (${rows})`);
      // the glyph's centre behind the body's, both doubled to stay in whole pixels
      if (s.body !== 'structure' && 2 * b.x + b.w < 2 * body.x + body.w) out.push(`${at}: ${g.id} sits in the body's back half`);
    }
  }
  return out;
}
