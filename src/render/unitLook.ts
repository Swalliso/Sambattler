// What a unit in rounds draws with (SPEC §5.8, §13.6). A unit's sprite has two walk frames and an attack frame,
// and a mirrored variant so the enemy's face left. An emplacement is one unit under its tower's id, drawn as
// R4a's emplacement (R4/T029): a building's sprite, baked unmirrored with no attack frame, so it never mirrors
// and fires on its own frame 1, as the colony's buildings draw for both sides (S21b/T160).
import type { Content } from '../data/registry.ts';
import type { Side } from '../sim/index.ts';
import { emplacementSprite } from './unitSprite.ts';

/** How a unit stands this frame: still, walking (on step 0 or 1) or attacking. */
export type UnitPose = 'still' | 'walk' | 'attack';

export interface UnitLook { sprite: string; frame: number; flip: boolean }

/** The sprite, frame and facing a unit draws with; `out` is filled and returned, so a frame allocates nothing. */
export function unitLook(content: Content, unitId: string, emplacement: boolean, side: Side, pose: UnitPose, step: number,
  out: UnitLook = { sprite: '', frame: 0, flip: false }): UnitLook {
  if (emplacement) {
    out.sprite = emplacementSprite(content, unitId);
    out.frame = pose === 'attack' && content.sprites[out.sprite]!.frames.length > 1 ? 1 : 0;
    out.flip = false;
    return out;
  }
  out.sprite = content.units[unitId]!.sprite;
  out.frame = pose === 'attack' ? 2 : pose === 'walk' ? step % 2 : 0;
  out.flip = side === 'enemy';
  return out;
}
