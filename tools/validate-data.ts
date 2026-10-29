// npm run validate:data — zod-validates every data file and checks cross-references (SPEC §14.1).
import { ContentError, loadContent } from '../src/data/registry.ts';
import { readRawContent } from './lib/content.ts';

try {
  const raw = readRawContent();
  const c = loadContent(raw);
  console.log(`data OK: ${Object.keys(raw).length} files · ${Object.keys(c.buildings).length} buildings · ` +
    `${Object.keys(c.units).length} units · ${Object.keys(c.maps).length} maps · ${Object.keys(c.sprites).length} sprites · ` +
    `${Object.keys(c.generals).length} general(s) · ${Object.keys(c.bots).length} bots · ${Object.keys(c.scenarios).length} scenarios · ` +
    `${Object.keys(c.upgrades).length} upgrade tracks · ${c.relicOrder.length} relics · ${c.eventOrder.length} events · ` +
    `${c.eliteOrder.length} elite modifiers · ${Object.keys(c.commanders).length} commander(s) · ${c.audio.sounds.length} sounds`);
} catch (e) {
  if (e instanceof ContentError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
