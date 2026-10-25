// npm run verify (SPEC §15.1): typecheck → lint → validate:data → test → golden verify → a sim
// smoke test (3 seeds) → bench --quick. Stops at the first failure with a non-zero exit code.
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/content.ts';

const steps: [string, string[]][] = [
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['validate:data', ['run', 'validate:data']],
  ['test', ['run', 'test']],
  ['golden verify', ['run', 'golden', '--', 'verify']],
  ['sim smoke (3 seeds)', ['run', 'sim', '--', '--seeds', '1..3', '--player', 'bot:balanced', '--enemy', 'general:scripted', '--summary', '--assert', 'rejectedCommands=0', '--assert', 'durationTicks<=12000']],
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
