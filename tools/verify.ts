// npm run verify (SPEC §15.1): typecheck → lint → validate:data → test → golden verify → a sim
// smoke test (3 seeds, scripted general) → an adaptive-general smoke (2 seeds) → the commander-power
// smokes (SPEC §16 M5, verification 2) → a round smoke (3 battles in rounds, R2a) → an adaptive round smoke
// (2 battles in rounds, R2a) → bench --quick. Stops at
// the first failure with a non-zero exit code.
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/content.ts';

const steps: [string, string[]][] = [
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['validate:data', ['run', 'validate:data']],
  ['test', ['run', 'test']],
  ['golden verify', ['run', 'golden', '--', 'verify']],
  ['sim smoke (3 seeds)', ['run', 'sim', '--', '--seeds', '1..3', '--player', 'bot:balanced', '--enemy', 'general:scripted', '--summary', '--assert', 'rejectedCommands=0', '--assert', 'durationTicks<=12000']],
  // seeds 3..4: on R1's chosen set (R2a S1) the general reads the merged swarm as Elite on 6 of seeds 1..10, seed 5 among
  // them (v1's read, A041; R2-Q3 replaces it in rounds). The timings hold on every seed.
  ['sim smoke, adaptive general (2 seeds)', ['run', 'sim', '--', '--seeds', '3..4', '--player', 'bot:mono:sporelingBurrow', '--enemy', 'general:mother-mold', '--flags', 'merging,adaptive', '--summary', '--assert', 'rejectedCommands=0', '--assert', 'counters[0].kind=swarm', '--assert', 'counters[0].warnedAt=2400', '--assert', 'counters[0].activeAt=4800']],
  ...([['armilla', 'powerGold'], ['cordis', 'powerMerges']] as const).map(([c, stat]): [string, string[]] => [
    `sim smoke, ${c}'s power`,
    ['run', 'sim', '--', '--seed', '3', '--player', 'bot:balanced', '--commander', c, '--power-policy', 'auto', '--flags', 'merging,adaptive,powers', '--summary',
      '--assert', 'rejectedCommands=0', '--assert', `stats.player.${stat}>=1`],
  ]),
  // a battle in rounds against a general that plans first (R2a/T071); `--rounds` goes when R2b makes rounds the battle
  ['round smoke (3 seeds)', ['run', 'sim', '--', '--rounds', '--seeds', '1..3', '--player', 'bot:balanced', '--enemy', 'general:scripted', '--summary', '--assert', 'rejectedCommands=0', '--assert', 'rounds<=9']],
  // the counter cycle in rounds (R2a/T103): a mono Sporeling colony knits into Elders, which count as elite at their parts' supply (R2-Q3)
  ['round smoke, adaptive general (2 seeds)', ['run', 'sim', '--', '--rounds', '--seeds', '4..5', '--player', 'bot:mono:sporelingBurrow', '--enemy', 'general:mother-mold', '--flags', 'merging,adaptive', '--summary',
    '--assert', 'rejectedCommands=0', '--assert', 'counters[0].round=4', '--assert', 'counters[0].kind=elite']],
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
