// URL parameters (SPEC §15.6), Milestone 3 subset. Later scenes and flags are recognised and refused
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
  /** `?sound=1` turns sound on in an automated browser (it is off there by default; `?test=1` always wins). */
  sound: boolean;
  /** A balance-backlog prototype spec (`?proto=b1,besiegedBy:melee`), or null for the shipped rules. */
  proto: string | null;
  /** `run` (play a whole run with bots) or `battles:<n>` (the first n battles), for route and summary screens. */
  autoplay: { battles: number | 'all' } | null;
}

/** Battle-only parameters: with any of them and no `scene`, the page opens a single battle (as in M1–M2). */
const BATTLE_PARAMS = ['player', 'enemy', 'ticks', 'scenario', 'map', 'battleIndex', 'flags', 'paused'];

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
  const auto = q.get('autoplay');
  const am = auto?.match(/^battles:(\d+)$/);
  return {
    // no scene: the title screen, unless battle parameters ask for a single battle
    scene: q.get('scene') ?? (BATTLE_PARAMS.some((k) => q.has(k)) ? 'battle' : 'title'),
    map: q.get('map') ?? 'bogwater-hollow',
    seed: num('seed'),
    battleIndex: num('battleIndex') ?? 1,
    player: q.get('player') ?? (q.get('scene') === 'draft' ? 'bot:balanced' : 'human'),
    enemy: q.get('enemy'),
    scenario: q.get('scenario'),
    ticks: ticksRaw === 'end' ? 'end' : ticksRaw === null ? null : Number(ticksRaw),
    paused: q.get('paused') === '1',
    flags: parsed ? parsed.flags : null,
    flagProblems: parsed ? parsed.problems : [],
    debug: q.get('debug') === '1',
    test: q.get('test') === '1',
    sound: q.get('sound') === '1',
    proto: q.get('proto') || null,
    autoplay: auto === 'run' ? { battles: 'all' } : am ? { battles: Number(am[1]) } : null,
  };
}
