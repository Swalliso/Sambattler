// npm run verify (SPEC §15.1): typecheck → lint → validate:data → test → golden verify → a sim
// smoke test (3 seeds, scripted general) → an adaptive-general smoke (2 seeds) → the commander-power
// smokes (SPEC §16 M5, verification 2) → bench --quick. Stops at the first failure with a non-zero exit code.
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/content.ts';

const steps: [string, string[]][] = [
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['validate:data', ['run', 'validate:data']],
  ['test', ['run', 'test']],
  ['golden verify', ['run', 'golden', '--', 'verify']],
  ['sim smoke (3 seeds)', ['run', 'sim', '--', '--seeds', '1..3', '--player', 'bot:balanced', '--enemy', 'general:scripted', '--summary', '--assert', 'rejectedCommands=0', '--assert', 'durationTicks<=12000']],
  ['sim smoke, adaptive general (2 seeds)', ['run', 'sim', '--', '--seeds', '4..5', '--player', 'bot:mono:sporelingBurrow', '--enemy', 'general:mother-mold', '--flags', 'merging,adaptive', '--summary', '--assert', 'rejectedCommands=0', '--assert', 'counters[0].kind=swarm', '--assert', 'counters[0].warnedAt=2400', '--assert', 'counters[0].activeAt=4800']],
  ...([['armilla', 'powerGold'], ['cordis', 'powerMerges']] as const).map(([c, stat]): [string, string[]] => [
    `sim smoke, ${c}'s power`,
    ['run', 'sim', '--', '--seed', '3', '--player', 'bot:balanced', '--commander', c, '--power-policy', 'auto', '--flags', 'merging,adaptive,powers', '--summary',
      '--assert', 'rejectedCommands=0', '--assert', `stats.player.${stat}>=1`],
  ]),
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
