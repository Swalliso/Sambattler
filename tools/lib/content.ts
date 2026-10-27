// Node-side loader: reads every JSON file under data/ into the RawContent map the registry expects.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyProto } from '../../src/data/proto.ts';
import { loadContent } from '../../src/data/registry.ts';
import type { Content, RawContent } from '../../src/data/registry.ts';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const DATA_DIR = join(ROOT, 'data');

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.json')) out.push(p);
  }
}

export function readRawContent(dataDir = DATA_DIR): RawContent {
  const files: string[] = [];
  walk(dataDir, files);
  const raw: RawContent = {};
  for (const f of files) {
    const rel = relative(dataDir, f).split(sep).join('/');
    try {
      raw[rel] = JSON.parse(readFileSync(f, 'utf8'));
    } catch (e) {
      throw new Error(`${rel}: invalid JSON (${(e as Error).message})`, { cause: e });
    }
  }
  return raw;
}

let cached: Content | undefined;
export function nodeContent(): Content {
  cached ??= loadContent(readRawContent());
  return cached;
}

/** Content with a balance-backlog prototype spec applied (`b1,besiegedBy:melee`; see src/data/proto.ts). */
export function protoContent(spec: string): Content {
  if (!spec) return loadContent(readRawContent());
  const { raw, problems } = applyProto(readRawContent(), spec);
  if (problems.length) throw new Error(problems.join('\n'));
  return loadContent(raw);
}
