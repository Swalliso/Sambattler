// The sim, the run and meta layers, and the data layer under them must stay pure (SPEC §13.2–13.3).
// ESLint enforces this per directory; this test scans the import graph and source text as a second
// line of defence. It also holds §13.4's layout once R2b moved R2a's staging folders into place.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as sim from '../../src/sim/index.ts';
import { ROOT } from '../../tools/lib/content.ts';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** src/meta may import from src/run, src/sim and src/data; its own modules import each other as `./…`. */
const PURE = ['src/sim', 'src/data', 'src/run', 'src/meta'];
const BANNED_IMPORT = /^(node:|fs$|path$|os$|child_process$)|\/(render|ui|app|meta|tools)\//;
const BANNED_TEXT: [RegExp, string][] = [
  [/\bMath\.(random|sin|cos|tan|asin|acos|atan2?|exp|log(2|10|1p)?|pow|hypot|cbrt|fround)\b/, 'non-deterministic Math'],
  [/\b(window|document|navigator|localStorage|performance|setTimeout|setInterval|requestAnimationFrame|fetch)\b/, 'impure global'],
  [/\bDate\b/, 'wall clock'],
  [/\basync\b|\bawait\b/, 'async'],
  [/\*\*/, 'exponent operator'],
];

describe('purity', () => {
  for (const dir of PURE) {
    // a pure layer's folder arrives with its first module
    if (!existsSync(join(ROOT, dir))) continue;
    for (const f of files(join(ROOT, dir))) {
      const rel = relative(ROOT, f).split(sep).join('/');
      it(`${rel} imports only pure modules and uses no impure globals`, () => {
        const src = readFileSync(f, 'utf8');
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, (m) => (m.startsWith('`') ? '``' : m));
        for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          const spec = m[1]!;
          expect(BANNED_IMPORT.test(spec), `${rel} imports ${spec}`).toBe(false);
          if (dir === 'src/data') expect(/\/(sim|run)\//.test(spec), `${rel} imports a higher layer`).toBe(false);
          if (dir === 'src/sim') expect(/\/run\//.test(spec), `${rel} imports the run layer`).toBe(false);
        }
        for (const [re, what] of BANNED_TEXT) expect(re.test(code), `${rel}: ${what}`).toBe(false);
      });
    }
  }
});

describe('the layout (§13.4, §14.6)', () => {
  const dirs = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? [p, ...dirs(p)] : [];
  });

  it('leaves no rounds/ staging folder (R2b/T043, T048, T050, T151)', () => {
    const left = ['src', 'tools', 'tests', 'data'].flatMap((d) => dirs(join(ROOT, d))).filter((p) => p.endsWith(`${sep}rounds`));
    expect(left.map((p) => relative(ROOT, p))).toEqual([]);
  });

  it("the sim's index exports §14.6's API and none of v1's (R2b/T045)", () => {
    for (const name of ['loadContent', 'createBattle', 'queueCommand', 'step', 'runHeadless', 'hashState', 'snapshot', 'restore', 'legalPlots',
      'plantProblem', 'priceOf', 'sellValue', 'formationOf', 'mergePreview', 'matchupClass', 'survivingSupply', 'incomePreview']) {
      expect(name in sim, name).toBe(true);
    }
    for (const name of ['lanePresence', 'frontierBlocked', 'frontier', 'isBesieged', 'isSuppressed', 'turretPos', 'holdsLane', 'rallyX', 'heldColumns',
      'surgeLanes', 'powerCooldownTicks', 'powerFirstReadyTicks', 'priceAt', 'depthOf', 'incomePerMinute', 'legalPlacements', 'draftCommandDue']) {
      expect(name in sim, name).toBe(false);
    }
  });

  it('the tools take no --rounds switch, since every battle is in rounds (R2b/T050)', () => {
    const tools = files(join(ROOT, 'tools')).filter((f) => readFileSync(f, 'utf8').includes("'--rounds'"));
    expect(tools.map((f) => relative(ROOT, f))).toEqual([]);
  });
});
