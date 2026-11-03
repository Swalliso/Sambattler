// Plain words (src/ui/words.ts): the UI's rewording of upgrade levels and building descriptions, kept until
// it moves into data. Every rewording must name an id and level that exist and keep every number the data's
// own text gives, so the two can't drift apart. Relics read their v2 text from the data since R2b's S6 (T077).
import { describe, expect, it } from 'vitest';
import { REWORDED, buildingDescription, relicText, upgradeText } from '../../src/ui/words.ts';
import { content } from '../helpers.ts';

const numbers = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).map(Number);

describe('plain words', () => {
  it("reads every relic's text from the data, so no v1 sentence shows over a v2 effect (T077)", () => {
    expect(REWORDED).not.toHaveProperty('relics');
    for (const id of Object.keys(content.relics)) {
      expect(relicText(content, id)).toBe(content.relics[id]!.text);
      expect(relicText(content, id), id).not.toMatch(/wave|column|turret|capture|supply cap|supply.line|cooldown|destroyed|building.*HP|per income/i);
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
