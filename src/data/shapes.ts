// The shape language as data checks (SPEC §5.8, §14.3; R4a): the body a unit's armor gives it, a frame's
// measured box, and every way a sprite's shape block breaks the rules. Pure arithmetic on the sprite rows:
// src/data is the bottom layer (§13.2), so this file imports nothing from src/render. Units and emplacements
// carry no weapon mark (§5.8, the user's decision of 2026-11-01): a silhouette tells its archetype, and its
// card and the planning screen's matchup marks tell what it counters.
import type { ArmorTypeT, BuildingDef, SpriteBands, SpriteDef, SpriteShape, UnitDef } from './schema.ts';

export type Body = SpriteShape['body'];
/** A box of a frame's pixels: its left column, top row, width and height. */
export interface Box { x: number; y: number; w: number; h: number }

const BODY: Record<ArmorTypeT, Body> = { light: 'small', medium: 'medium', heavy: 'big', structure: 'structure' };
/** A slot's width in native px: 2 tiles of 16 (§4.6). */
const SLOT_PX = 32;

/** The body an armor gives (§5.8): light units are small, medium are medium, heavy are big. Structure has no band. */
export function bodyOf(armor: ArmorTypeT): Body {
  return BODY[armor];
}

/** A spawner's base squad: its `squad.count`, R1's size (§11.2, R4a call 8). A building with no squad fields none. */
export function baseSquad(building: BuildingDef): number {
  return building.squad?.count ?? 0;
}

/** The widest a unit may be drawn in a squad of n: floor(32 / k), k = ceil(sqrt n) (§4.6, §14.3). */
export function widthBound(n: number): number {
  return Math.floor(SLOT_PX / Math.ceil(Math.sqrt(n)));
}

/**
 * A frame's body: the box of its own opaque pixels, or null if it draws none. An Elder's rim is a region of
 * its own, so it never counts (R4a call 2). The band measures its height and the width bound its width.
 */
export function bodyBox(sprite: SpriteDef, frame: number): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  (sprite.frames[frame] ?? []).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!sprite.palette[row[x]!]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  });
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** A unit's sprite against its unit (§5.8): the body its armor gives. */
export function unitShapeProblems(unit: UnitDef, sprite: SpriteDef): string[] {
  const s = sprite.shape;
  const body = bodyOf(unit.armor);
  if (!s || s.body === body) return [];
  return [`unit ${unit.id}: sprite ${sprite.id} has a ${s.body} body, but ${unit.armor} armor draws a ${body} one`];
}

/** An emplacement's sprite (`e-<buildingId>`) against its building (§5.8, R4-Q5): a structure body. */
export function emplacementShapeProblems(building: BuildingDef, sprite: SpriteDef): string[] {
  const s = sprite.shape;
  if (!s || s.body === 'structure') return [];
  return [`building ${building.id}: sprite ${sprite.id} has a ${s.body} body, but an emplacement's is structure`];
}

/**
 * Every way a sprite breaks its shape block (§5.8, §14.3), each naming the sprite and, where it's one frame's,
 * the frame. Bands are checked here and nowhere else: each frame draws something, and its opaque height lies
 * within its body's band (the sheet's `bands`; structure has none). A sprite with no shape has none.
 */
export function shapeProblems(sprite: SpriteDef, bands: SpriteBands | undefined): string[] {
  const s = sprite.shape;
  if (!s) return [];
  const id = `sprite ${sprite.id}`;
  const out: string[] = [];
  const band = s.body === 'structure' ? undefined : bands?.[s.body];
  if (s.body !== 'structure' && !band) out.push(`${id}: its sheet has no bands for its ${s.body} body`);
  for (let f = 0; f < sprite.frames.length; f++) {
    const body = bodyBox(sprite, f);
    if (!body) out.push(`${id} frame ${f}: nothing is drawn`);
    else if (band && (body.h < band[0] || body.h > band[1])) out.push(`${id} frame ${f}: ${s.body} body out of band (${body.h} px tall, the band is ${band[0]}–${band[1]})`);
  }
  return out;
}
