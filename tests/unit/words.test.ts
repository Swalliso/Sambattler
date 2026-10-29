// Plain words (src/ui/words.ts): the UI's rewording of relics, upgrade levels and building descriptions,
// kept until the next golden refresh moves it into data. Every rewording must name an id and level that
// exist and keep every number the data's own text gives, so the two can't drift apart.
import { describe, expect, it } from 'vitest';
import { REWORDED, buildingDescription, relicText, upgradeText } from '../../src/ui/words.ts';
import { content } from '../helpers.ts';

const numbers = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).map(Number);

describe('plain words', () => {
  it('rewords only relics that exist, keeping their numbers', () => {
    for (const [id, text] of Object.entries(REWORDED.relics)) {
      const r = content.relics[id];
      expect(r, id).toBeDefined();
      for (const n of numbers(r!.text)) expect(numbers(text), `${id}: ${n}`).toContain(n);
      expect(relicText(content, id)).toBe(text);
    }
  });

  it('rewords only upgrade levels that exist, keeping their numbers', () => {
    for (const [key, text] of Object.entries(REWORDED.upgrades)) {
      const [id, level] = key.split(':') as [string, string];
      const data = content.upgrades[id]?.levels[Number(level) - 1]?.text;
      expect(data, key).toBeDefined();
      for (const n of numbers(data!)) expect(numbers(text), `${key}: ${n}`).toContain(n);
      expect(upgradeText(content, id, Number(level))).toBe(text);
    }
  });

  it('rewords only buildings that exist, keeping their numbers', () => {
    for (const [id, text] of Object.entries(REWORDED.buildings)) {
      const b = content.buildings[id];
      expect(b, id).toBeDefined();
      for (const n of numbers(b!.description)) expect(numbers(text), `${id}: ${n}`).toContain(n);
      expect(buildingDescription(content, id)).toBe(text);
    }
  });

  it('falls back to the data and leaves no jargon behind', () => {
    expect(relicText(content, 'thickCaps')).toBe(content.relics.thickCaps!.text);
    const all = [
      ...Object.keys(content.relics).map((id) => relicText(content, id)),
      ...Object.keys(content.upgrades).flatMap((id) => content.upgrades[id]!.levels.map((_, i) => upgradeText(content, id, i + 1))),
      ...Object.keys(content.buildings).map((id) => buildingDescription(content, id)),
    ];
    for (const s of all) expect(s).not.toMatch(/orthogonal|income tick|surcharge|knit|interval/i);
  });
});
