// npm run verify (SPEC §15.1): typecheck → lint → validate:data → test → golden verify → a sim smoke (3 battles
// against the scripted general) → an adaptive-general smoke (2 battles) → the power smokes (SPEC §16 M5,
// verification 2; R2a/T110) → a rule scenario from the CLI → bench --quick (G11's round budgets, R2a/T118). Stops at
// the first failure with a non-zero exit code.
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/content.ts';

const steps: [string, string[]][] = [
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['validate:data', ['run', 'validate:data']],
  ['test', ['run', 'test']],
  ['golden verify', ['run', 'golden', '--', 'verify']],
  // a battle against a general that plans first (R2a/T071)
  ['sim smoke (3 seeds)', ['run', 'sim', '--', '--seeds', '1..3', '--player', 'bot:balanced', '--enemy', 'general:scripted', '--summary', '--assert', 'rejectedCommands=0', '--assert', 'rounds<=9']],
  // the counter cycle (R2a/T103): a mono Sporeling colony knits into Elders, which count as elite at their parts' supply (R2-Q3)
  ['sim smoke, adaptive general (2 seeds)', ['run', 'sim', '--', '--seeds', '4..5', '--player', 'bot:mono:sporelingBurrow', '--enemy', 'general:mother-mold', '--flags', 'merging,adaptive', '--summary',
    '--assert', 'rejectedCommands=0', '--assert', 'counters[0].round=4', '--assert', 'counters[0].kind=elite']],
  // the power once per clash (R2a/T110), with the adaptive general off so the counter cycle can't move them: Vesper's
  // Spore Burst; Cordis's Puppet Bloom with the starter kit on seed 11, where T107 found trios (R2-Q7); and Armilla's
  // Rhizome Tithe, which is refused in a battle in rounds until T082, so it asserts only that nothing else is (T089
  // restores `powerGold`)
  ...([
    ['vesper', ['--seed', '3'], ['stats.player.powerUses>=1']],
    ['cordis', ['--seed', '11', '--enemy', 'general:mother-mold', '--kit', 'sporelingBurrow,gillNest,truffleCellar'], ['stats.player.powerMerges>=1']],
    ['armilla', ['--seed', '3'], []],
  ] as const).map(([c, args, asserts]): [string, string[]] => [
    `sim smoke, ${c}'s power`,
    ['run', 'sim', '--', ...args, '--player', 'bot:balanced', '--commander', c, '--power-policy', 'auto', '--flags', 'merging,powers', '--summary',
      '--assert', 'rejectedCommands=0', ...asserts.flatMap((a) => ['--assert', a])],
  ]),
  // a rule scenario from the CLI (§16 R2 step 4, R2a/T132): the 45 s cap decides the lane on surviving supply
  ['sim scenario, clash-cap', ['run', 'sim', '--', '--scenario', 'clash-cap', '--until', 'r1', '--assert', 'roundLog[0].lanes[0].capped=true']],
  // G11's round budgets on the bench's cases (R2a/T118)
  ['bench --quick', ['run', 'bench', '--', '--quick']],
];

const results: string[] = [];
let failed = false;
for (const [name, args] of steps) {
  const t0 = Date.now();
  console.log(`\n▶ ${name}`);
  const r = spawnSync('npm', ['--silent', ...args], { cwd: ROOT, stdio: 'inherit' });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status !== 0) {
    results.push(`FAIL  ${name} (${secs}s)`);
    failed = true;
    break;
  }
  results.push(`ok    ${name} (${secs}s)`);
}
console.log(`\nverify summary\n${results.map((r) => `  ${r}`).join('\n')}`);
process.exitCode = failed ? 1 : 0;
