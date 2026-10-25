// Shared fixtures for the unit suite: a live battle on the flat test map (or Bogwater Hollow) with
// idle controllers, plus helpers to drop units and buildings in by hand.
import { nodeContent } from '../tools/lib/content.ts';
import { addBuilding, addUnit } from '../src/sim/create.ts';
import { createBattle, makeConfig, step } from '../src/sim/index.ts';
import type { BattleConfig, BattleState, Side } from '../src/sim/index.ts';

export const content = nodeContent();

export function liveState(opts: { map?: string; test?: BattleConfig['test']; seed?: number; borders?: [number, number] } = {}): BattleState {
  const s = createBattle(content, makeConfig(content, {
    seed: opts.seed ?? 1, mapId: opts.map ?? 'test-flat', player: 'human', enemy: 'human',
    ...(opts.test ? { test: opts.test } : {}),
  }));
  s.phase = 'live';
  if (opts.borders) setBorders(s, opts.borders[0], opts.borders[1]);
  return s;
}

export function setBorders(s: BattleState, p: number, e: number, lane = 0): void {
  const L = s.lanes[lane]!;
  L.pBorder = p; L.eBorder = e;
  for (let c = 0; c < s.map.width; c++) L.owner[c] = c <= p ? 1 : c >= e ? 2 : 0;
  L.capture.player = { column: p + 1, progress: 0 };
  L.capture.enemy = { column: e - 1, progress: 0 };
}

export function unit(s: BattleState, side: Side, id: string, x: number, y: number) {
  return addUnit(s, side, id, 0, x, y, 0);
}

export function building(s: BattleState, side: Side, id: string, col: number, row: number) {
  return addBuilding(s, side, id, 0, col, row, content.buildings[id]!.cost);
}

export function steps(s: BattleState, n: number): void {
  for (let i = 0; i < n; i++) step(s);
}
