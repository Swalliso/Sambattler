// Browser content: every data/**/*.json file bundled by Vite and validated by the same registry the
// Node tools use (zod validation runs at startup in every build).
import { loadContent } from '../data/registry.ts';
import type { Content, RawContent } from '../data/registry.ts';

const files = import.meta.glob('../../data/**/*.json', { eager: true, import: 'default' });

export function browserContent(): Content {
  const raw: RawContent = {};
  for (const [path, json] of Object.entries(files)) raw[path.replace(/^\.\.\/\.\.\/data\//, '')] = json;
  return loadContent(raw);
}
