// What a unit in rounds draws with (SPEC §5.8, §13.6; S21b/T160). A unit's sprite has walk and attack frames
// and a mirrored variant, so the enemy's face left. An emplacement is a building's sprite, `e-<buildingId>`
// (R4/T029), baked unmirrored with no attack frame, so asking for either drew nothing: the playtest's Gray
// Rot Mortar was invisible while units attacked it (2026-11-03).
import { describe, expect, it } from 'vitest';
import { atlasLayout, regionKey } from '../../../src/render/compose.ts';
import { factionOf } from '../../../src/render/renderer.ts';
import { unitLook } from '../../../src/render/rounds/unitLook.ts';
import type { UnitPose } from '../../../src/render/rounds/unitLook.ts';
import { SIDES } from '../../../src/sim/rounds/index.ts';
import { content } from '../../roundHelpers.ts';

const regions = atlasLayout(content).regions;
const POSES: UnitPose[] = ['still', 'walk', 'attack'];
const towers = Object.keys(content.buildings).filter((id) => content.buildings[id]!.kind === 'tower');

describe('the look of a unit in rounds (T160)', () => {
  it('finds an atlas region for every unit and every emplacement, on both sides, in every pose', () => {
    expect(towers).toContain('puffballMortar');
    const drawn = [...Object.keys(content.units).map((id) => [id, false] as const), ...towers.map((id) => [id, true] as const)];
    for (const [id, emplacement] of drawn) {
      for (const side of SIDES) {
        for (const pose of POSES) {
          for (const step of [0, 1]) {
            const l = unitLook(content, id, emplacement, side, pose, step);
            expect(regions.has(regionKey(l.sprite, factionOf(side), l.frame, l.flip)) || regions.has(regionKey(l.sprite, 'velvet-bloom', l.frame, l.flip)),
              `${side} ${id} ${pose} ${step}: ${l.sprite} frame ${l.frame}${l.flip ? ' mirrored' : ''}`).toBe(true);
          }
        }
      }
    }
  });

  it("draws the Mortar's emplacement unmirrored on both sides, its puff on frame 1 when it fires", () => {
    for (const side of SIDES) {
      expect(unitLook(content, 'puffballMortar', true, side, 'still', 1)).toEqual({ sprite: 'e-puffballMortar', frame: 0, flip: false });
      expect(unitLook(content, 'puffballMortar', true, side, 'attack', 0)).toEqual({ sprite: 'e-puffballMortar', frame: 1, flip: false });
    }
    // a unit keeps its walk and attack frames, and the enemy's face left
    expect(unitLook(content, 'capguard', false, 'enemy', 'attack', 0)).toEqual({ sprite: content.units.capguard!.sprite, frame: 2, flip: true });
    expect(unitLook(content, 'capguard', false, 'player', 'walk', 1)).toEqual({ sprite: content.units.capguard!.sprite, frame: 1, flip: false });
  });
});
