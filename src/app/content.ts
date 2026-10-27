// Browser content: every data/**/*.json file bundled by Vite and validated by the same registry the
// Node tools use (zod validation runs at startup in every build).
import { applyProto } from '../data/proto.ts';
import { loadContent } from '../data/registry.ts';
import type { Content, RawContent } from '../data/registry.ts';

const files = import.meta.glob('../../data/**/*.json', { eager: true, import: 'default' });

/** `proto` is a balance-backlog prototype spec from `?proto=` (src/data/proto.ts); problems are warned and skipped. */
export function browserContent(proto: string | null = null): Content {
  let raw: RawContent = {};
  for (const [path, json] of Object.entries(files)) raw[path.replace(/^\.\.\/\.\.\/data\//, '')] = json;
  if (proto) {
    const applied = applyProto(raw, proto);
    for (const p of applied.problems) console.warn(`${p}; ignored`);
    raw = applied.raw;
  }
  return loadContent(raw);
}
