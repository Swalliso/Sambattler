// URL parameters (SPEC §15.6), Milestone 1 subset. Later scenes and flags are recognised and refused
// with a visible message rather than ignored silently.
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
  flags: string[];
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
    flags: (q.get('flags') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    debug: q.get('debug') === '1',
    test: q.get('test') === '1',
  };
}
