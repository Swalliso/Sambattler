// G4–G8 and G13 in round form (SPEC §12.3; R2a/T122), on battles of rounds played on the pool. G4's 40 battles are
// played once: G6's second clause and G13 read them too. The battle-level bands are the user's, set from R2a's
// measurement at 100 damage a supply (§18.2 #35, T125, 2026-11-03).
import { beforeAll, describe, it } from 'vitest';
import { nodeContent } from '../../tools/lib/content.ts';
import {
  evaluateG4, evaluateG5, evaluateG6, evaluateG7, evaluateG8, evaluateG13, g4Battles,
} from '../../tools/lib/balance.ts';
import type { RoundBattleRecord } from '../../tools/lib/balance.ts';
import { assertVerdict, filePool } from './verdict.ts';

const content = nodeContent();
const pool = filePool();
let g4: RoundBattleRecord[];

describe('the battle guardrails in rounds (§12.3)', () => {
  beforeAll(async () => { g4 = await g4Battles(content, pool.run); }, 60_000);
  it('G4 rounds per battle: bot:balanced vs the scripted general over 200 battles, median 6–8 rounds, ≤20% reach round 9, the bot wins 30–70%', () => assertVerdict(evaluateG4(content, g4)));
  it('G5 snowball: +150 starting gold wins 55–75%', async () => assertVerdict(await evaluateG5(content, pool.run)), 60_000);
  it("G6 comeback: 1550 behind at round 4, the behind side wins 20–45%; the winner's Heartcap is hit in ≥50% of G4's battles", async () => assertVerdict(await evaluateG6(content, pool.run, g4)), 60_000);
  it('G7 merging: merge-on wins 55–70% of the mirror, ≤50% with ~25% Slayers', async () => assertVerdict(await evaluateG7(content, pool.run)), 120_000);
  it('G8 adaptation: mono bots drop ≥20 points against the adaptive general; bot:balanced wins 40–65%, bot:answer at most 80%', async () => assertVerdict(await evaluateG8(content, pool.run)), 120_000);
  it("G13 clash stalls over G4's battles: ≤15% at the cap, a median clash of 15–40 s", () => assertVerdict(evaluateG13(content, g4)));
});
