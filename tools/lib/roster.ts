// The player's roster, for the tools. The balance harness (balance.ts) and R1's clash check (clash.ts)
// both read it, and balance.ts's clash bars import clash.ts, so it sits below both.
import type { Content } from '../../src/data/registry.ts';

const ROSTER = 'velvet-bloom';

/** The player roster's buildings (the faction list; the Gray Rot mirrors it until M7). */
export function rosterIds(content: Content): string[] {
  return [...content.factions[ROSTER]!.buildings];
}
