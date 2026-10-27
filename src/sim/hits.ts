// The pending-hit queue (SPEC §14.4): hits stay sorted by (tick, sourceId, seq).
import type { BattleState, PendingHit } from './state.ts';

export function insertHit(state: BattleState, h: PendingHit): void {
  const hits = state.hits;
  let lo = 0, hi = hits.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const m = hits[mid]!;
    const before = m.tick < h.tick || (m.tick === h.tick && (m.sourceId < h.sourceId || (m.sourceId === h.sourceId && m.seq < h.seq)));
    if (before) lo = mid + 1; else hi = mid;
  }
  hits.splice(lo, 0, h);
}
