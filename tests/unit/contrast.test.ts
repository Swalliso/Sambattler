// Contrast (docs/archive/v1/ui-ux-plan.md Phase 4, the design system's Accessibility section): text at 4.5:1 or
// better on its ground, and control edges and the focus ring at 3:1 or better. The colors are read from
// the tokens in src/ui/styles.css, so a token change that breaks a pair fails here. Each pair names where
// it is used; translucent grounds (the tooltip) are composited over the void first.
//
// Team contrast (SPEC §2, R4-Q4, A159): the factions' body tones, as plain colour and as the colour-vision
// filters show them (tools/lib/cvd.ts, the screenshot tool's matrices). Under both filters the sides' v, l and
// d tones differ by 1.5:1 or more; each side's v and l stand 1.75:1 off every t-soil tone and its d 1.5:1 off
// the units' k outline, plain and under both filters. Units carry no mark glyph (T077), so no mark is checked.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyCvd, type CvdFilter, type Rgb } from '../../tools/lib/cvd.ts';
import { ROOT } from '../../tools/lib/content.ts';

const css = readFileSync(join(ROOT, 'src/ui/styles.css'), 'utf8');
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const tokens = new Map([...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));

type Rgba = [number, number, number, number];

function color(name: string): Rgba {
  let v = tokens.get(name);
  if (!v) throw new Error(`no token --${name}`);
  for (let m = /^var\(--([\w-]+)\)$/.exec(v); m; m = /^var\(--([\w-]+)\)$/.exec(v)) v = tokens.get(m[1]!)!;
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16)).concat(1) as Rgba;
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(v);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])];
  throw new Error(`--${name}: ${v} is not a color this test reads`);
}

function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg[3];
  return [0, 1, 2].map((i) => fg[i]! * a + bg[i]! * (1 - a)).concat(1) as Rgba;
}

function luminance(c: Rgba): number {
  const ch = (x: number) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
}

function contrast(fg: string, ground: string): number {
  let g = color(ground);
  if (g[3] < 1) g = over(g, color('bg'));
  let f = color(fg);
  if (f[3] < 1) f = over(f, g);
  const [hi, lo] = [luminance(f), luminance(g)].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** [text, ground, where] at 4.5:1. */
const TEXT: [string, string, string][] = [
  ...['bg', 'panel', 'panel-2', 'panel-selected', 'well', 'tooltip-bg'].map((g) => ['text', g, 'body text and labels'] as [string, string, string]),
  ...['bg', 'panel', 'panel-2', 'panel-selected', 'tooltip-bg'].map((g) => ['muted', g, 'hints, eyebrows, the settings screen’s notes'] as [string, string, string]),
  ['lilac', 'panel-2', 'player text, win headlines'], ['lilac', 'panel', 'the run bar’s Heartcap'], ['lilac', 'panel-selected', 'a lit card’s name'],
  ['rot-light', 'panel-2', 'enemy text'], ['rot-light', 'panel', 'the enemy Heartcap'],
  ['gold', 'panel-2', 'prices'], ['gold', 'well', 'price chips, gold earned'], ['gold', 'panel', 'the tip callout'],
  ['amber', 'panel-2', 'Amber on the report'], ['amber', 'panel', 'Amber on the summary'],
  ['danger', 'panel-2', 'an unaffordable price'], ['danger', 'well', 'an unaffordable price chip'],
  ['danger-soft', 'panel-2', 'losses and costs'], ['danger-soft', 'panel-selected', 'a lit unaffordable price'], ['danger-soft', 'panel', 'the Abandon run button'],
  ['warn', 'panel-2', 'the counter warning'], ['ok', 'tooltip-bg', 'a legal placement'], ['sprout', 'well', 'gain chips'],
  ['role-defense', 'panel-2', 'the Defense tag'], ['role-utility', 'panel-2', 'the Utility tag'], ['role-army', 'panel-2', 'the Army tag'], ['role-economy', 'panel-2', 'the Economy tag'],
  ['rarity-common', 'panel-2', 'Common'], ['rarity-uncommon', 'panel-2', 'Uncommon'], ['rarity-rare', 'panel-2', 'Rare'],
  ['ink', 'gold', 'a strong cell in the matrix'], ['ink', 'lilac', 'text on lilac fills'], ['ink', 'stalk', 'text on stalk'],
  ['text', 'violet-deep', 'the primary button'], ['weak-cell-text', 'weak-cell', 'a weak cell in the matrix'],
];

/** [edge, ground, where] at 3:1. */
const EDGES: [string, string, string][] = [
  ['line-strong', 'panel', 'a control’s resting edge on a band or sheet'], ['line-strong', 'panel-2', 'a control’s edge on a raised surface'],
  ['line-strong', 'bg', 'a control’s edge on the void'], ['line-strong', 'well', 'a segmented control’s well'],
  ...['bg', 'panel', 'panel-2', 'panel-selected', 'well'].map((g) => ['lilac', g, 'the focus ring, hover and the lit choice'] as [string, string, string]),
  ['gold-deep', 'panel-2', 'a price chip’s edge'], ['gold-deep', 'panel', 'the gold chip'],
  ['danger', 'panel', 'the Abandon run button’s edge'],
  ['bark', 'panel-2', 'a common card’s edge'], ['rarity-uncommon-line', 'panel-2', 'an uncommon card’s edge'], ['rarity-rare-line', 'panel-2', 'a rare card’s edge'],
  ['violet', 'panel-2', 'the player’s territory and bars'], ['rot', 'panel-2', 'the enemy’s territory and bars'],
];

describe('contrast', () => {
  for (const [fg, ground, where] of TEXT) {
    it(`text: ${fg} on ${ground} (${where}) is 4.5:1 or better`, () => {
      expect(contrast(fg, ground)).toBeGreaterThanOrEqual(4.5);
    });
  }
  for (const [fg, ground, where] of EDGES) {
    it(`edge: ${fg} on ${ground} (${where}) is 3:1 or better`, () => {
      expect(contrast(fg, ground)).toBeGreaterThanOrEqual(3);
    });
  }
});

const json = (path: string) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
type SpriteJson = { id: string; palette: Record<string, string | null> };
const sprites = (sheet: string) => (json(`data/sprites/${sheet}.json`) as { sprites: SpriteJson[] }).sprites;
const factions = readdirSync(join(ROOT, 'data/factions')).sort()
  .map((dir) => json(`data/factions/${dir}/faction.json`) as { id: string; palette: Record<string, string> });
const tones = (list: SpriteJson[], keys?: string[]) =>
  [...new Set(list.flatMap((s) => Object.entries(s.palette).filter(([k, v]) => v && (!keys || keys.includes(k))).map(([, v]) => v!)))];
const SOIL = tones(sprites('terrain').filter((s) => s.id.startsWith('t-soil')));
const OUTLINE = tones(sprites('units').filter((s) => s.id.startsWith('u-')), ['k']);

type View = CvdFilter | 'plain';
const FILTERS: CvdFilter[] = ['deuteranopia', 'protanopia'];

function seen(hex: string, view: View): Rgba {
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16)) as unknown as Rgb;
  return [...(view === 'plain' ? rgb : applyCvd(rgb, view)), 1] as Rgba;
}

function ratio(a: string, b: string, view: View): number {
  const [hi, lo] = [luminance(seen(a, view)), luminance(seen(b, view))].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The pairs [what, a, b] whose ratio under `view` falls below `floor`, each with its ratio, so a failure names the tones. */
function under(floor: number, view: View, pairs: [string, string, string][]): string[] {
  return pairs.map(([what, a, b]) => [what, ratio(a, b, view)] as const).filter(([, r]) => r < floor).map(([what, r]) => `${what}: ${r.toFixed(2)}:1`);
}

describe('team contrast', () => {
  it('reads both factions, the soil tones and the outline', () => {
    expect(factions.map((f) => f.id)).toEqual(['gray-rot', 'velvet-bloom']);
    expect(SOIL.length).toBeGreaterThanOrEqual(3);
    expect(OUTLINE).toEqual(['#1a1020']);
  });
  const [a, b] = factions as [(typeof factions)[0], (typeof factions)[0]];
  for (const view of FILTERS) {
    it(`team: the sides' v, l and d tones differ by 1.5:1 or more under ${view}`, () => {
      expect(under(1.5, view, ['v', 'l', 'd'].map((k) => [`${k} ${a.palette[k]} / ${b.palette[k]}`, a.palette[k]!, b.palette[k]!]))).toEqual([]);
    });
  }
  for (const f of factions) {
    for (const view of ['plain', ...FILTERS] as View[]) {
      it(`soil: ${f.id}'s v and l tones stand 1.75:1 or more off every t-soil tone (${view})`, () => {
        const pairs = ['v', 'l'].flatMap((k) => SOIL.map((soil) => [`${k} ${f.palette[k]} on ${soil}`, f.palette[k]!, soil] as [string, string, string]));
        expect(under(1.75, view, pairs)).toEqual([]);
      });
      it(`outline: ${f.id}'s d tone stands 1.5:1 or more off the k outline (${view})`, () => {
        expect(under(1.5, view, OUTLINE.map((k) => [`d ${f.palette.d} on ${k}`, f.palette.d!, k]))).toEqual([]);
      });
    }
  }
});
