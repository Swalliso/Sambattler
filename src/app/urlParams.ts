// URL parameters (SPEC §15.6), Milestone 2 subset. Later scenes and flags are recognised and refused
// with a visible message rather than ignored silently.
import { parseFlags } from '../sim/index.ts';
import type { Flags } from '../sim/index.ts';

export interface Params {
  scene: string;
  map: string;
  seed: number | null;
  battleIndex: number;
  player: string;
  enemy: string | null;
  scenario: string | null;
  ticks: number | 'end' | null;
  paused: boolean;
  /** The exact flag set from `?flags=`, or null for the milestone's defaults. */
  flags: Flags | null;
  flagProblems: string[];
  debug: boolean;
  test: boolean;
}

export function parseParams(search: string): Params {
  const q = new URLSearchParams(search);
  const num = (k: string): number | null => {
    const v = q.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const ticksRaw = q.get('ticks');
  const flagList = q.get('flags');
  const parsed = flagList === null ? null : parseFlags(flagList);
  return {
    scene: q.get('scene') ?? 'battle',
    map: q.get('map') ?? 'bogwater-hollow',
    seed: num('seed'),
    battleIndex: num('battleIndex') ?? 1,
    player: q.get('player') ?? 'human',
    enemy: q.get('enemy'),
    scenario: q.get('scenario'),
    ticks: ticksRaw === 'end' ? 'end' : ticksRaw === null ? null : Number(ticksRaw),
    paused: q.get('paused') === '1',
    flags: parsed ? parsed.flags : null,
    flagProblems: parsed ? parsed.problems : [],
    debug: q.get('debug') === '1',
    test: q.get('test') === '1',
  };
}
