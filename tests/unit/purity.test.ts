// The sim (and the data layer under it) must stay pure (SPEC §13.2–13.3). ESLint enforces this per
// directory; this test scans the import graph and source text as a second line of defence.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from '../../tools/lib/content.ts';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const PURE = ['src/sim', 'src/data'];
const BANNED_IMPORT = /^(node:|fs$|path$|os$|child_process$)|\/(render|ui|app|run|meta|tools)\//;
const BANNED_TEXT: [RegExp, string][] = [
  [/\bMath\.(random|sin|cos|tan|asin|acos|atan2?|exp|log(2|10|1p)?|pow|hypot|cbrt|fround)\b/, 'non-deterministic Math'],
  [/\b(window|document|navigator|localStorage|performance|setTimeout|setInterval|requestAnimationFrame|fetch)\b/, 'impure global'],
  [/\bDate\b/, 'wall clock'],
  [/\basync\b|\bawait\b/, 'async'],
  [/\*\*/, 'exponent operator'],
];

describe('purity', () => {
  for (const dir of PURE) {
    for (const f of files(join(ROOT, dir))) {
      const rel = relative(ROOT, f).split(sep).join('/');
      it(`${rel} imports only pure modules and uses no impure globals`, () => {
        const src = readFileSync(f, 'utf8');
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, (m) => (m.startsWith('`') ? '``' : m));
        for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          const spec = m[1]!;
          expect(BANNED_IMPORT.test(spec), `${rel} imports ${spec}`).toBe(false);
          if (dir === 'src/data') expect(spec.includes('/sim/'), `${rel} imports the sim`).toBe(false);
        }
        for (const [re, what] of BANNED_TEXT) expect(re.test(code), `${rel}: ${what}`).toBe(false);
      });
    }
  }
});
