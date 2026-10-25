// Deterministic battle statistics (SPEC §5.7). Most counters are updated by the systems; this
// samples the front line every second and tracks maxima.
import { SIDES } from './state.ts';
import type { BattleState } from './state.ts';

export function statsSystem(state: BattleState): void {
  for (const side of SIDES) {
    const st = state.stats[side];
    const g = state.sides[side].gold;
    if (g > st.maxGoldBanked) st.maxGoldBanked = g;
  }
  if (state.tick % state.rules.tickRate === 0 || state.phase === 'ended') {
    for (let i = 0; i < state.lanes.length; i++) {
      const L = state.lanes[i]!;
      const series = state.frontLine[i]!;
      const last = series[series.length - 1];
      if (!last || last[0] !== state.tick) series.push([state.tick, L.pBorder, L.eBorder]);
    }
  }
}
