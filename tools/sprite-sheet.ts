// npm run sprite-sheet -- [--sheet <path>] [--name <file>] [--filter deuteranopia|protanopia]
// Shows the user, and the tools, when a sprite is drawn off its shape (SPEC §5.8, §14.3, §15.6, §17 #20;
// R4a, T023). It validates a sprite sheet (default data/sprites/units.json) with SpriteSheetSchema and renders
// every frame through the atlas's own framePixels into a Playwright page (setContent, no server): at 2× and
// 4×, the Velvet Bloom facing right and the Gray Rot facing left (mirrored where the atlas mirrors, on unit
// sprites), on the field's soil. The 4× frames overlay the measurements: green lines where the body's top edge
// may sit for its band, and the body's measured box in cyan. Under each sprite it lists its problems:
// shapeProblems, and its unit's body (or an emplacement's, for `e-<buildingId>`). Units carry no weapon mark
// (§5.8, 2026-11-01). For a unit's sprite it adds strips of frame 0 on its squad's k × k grid in a 32 px slot,
// at the base squad, base + 1 (a Rhizome Vault beside it) and base + 2 (the Velvet Shrine), and lists each
// overflow: for a sprite with a shape, a squad of base or base + 1 that its width overflows is a problem
// (§14.3); base + 2 is §18.2 #11's, listed only. Units come from the default data plus the units that exist
// only under ?proto=rework. --filter shows the art through tools/lib/cvd.ts's matrices (the annotations stay
// unfiltered). Writes artifacts/sprite-sheet/<name>.png and <name>.json (the name is the sheet's file name by
// default, with -d or -p under a filter) and exits 1 if any sprite has a problem.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { applyProto } from '../src/data/proto.ts';
import type { RawContent } from '../src/data/registry.ts';
import { BuildingSchema, FactionSchema, SpriteSheetSchema, UnitSchema } from '../src/data/schema.ts';
import type { BuildingDef, SpriteBands, SpriteDef, UnitDef } from '../src/data/schema.ts';
import { baseSquad, bodyBox, emplacementShapeProblems, shapeProblems, unitShapeProblems, widthBound } from '../src/data/shapes.ts';
import type { Box } from '../src/data/shapes.ts';
import { framePixels } from '../src/render/compose.ts';
import type { FramePixels } from '../src/render/compose.ts';
import { slotGrid, slotPositions } from '../src/sim/formation.ts';
import { readRawContent, ROOT } from './lib/content.ts';
import { applyCvd, CVD_MATRICES } from './lib/cvd.ts';
import type { CvdFilter } from './lib/cvd.ts';

interface Args { sheet: string; name?: string; filter?: CvdFilter }

function parseArgs(argv: string[]): Args {
  const a: Args = { sheet: 'data/sprites/units.json' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!, v = argv[i + 1];
    if (k === '--sheet') { a.sheet = v!; i++; }
    else if (k === '--name') { a.name = v!; i++; }
    else if (k === '--filter') {
      if (!v || !(v in CVD_MATRICES)) throw new Error(`--filter wants ${Object.keys(CVD_MATRICES).join(' or ')}, got ${v}`);
      a.filter = v as CvdFilter; i++;
    } else throw new Error(`unknown option ${k}`);
  }
  return a;
}

/** What the sheet is checked against: units and buildings (preset-only ones too), the Gray Rot's swap and the soil. */
interface World { units: UnitDef[]; buildings: BuildingDef[]; gray: Record<string, string>; soil?: SpriteDef }

/**
 * Reads the data files on their own, not through loadContent, so a sheet whose sprites the registry rejects
 * still renders with its problems listed.
 */
function loadWorld(): World {
  const raw = readRawContent();
  const { raw: rework, problems } = applyProto(raw, 'rework');
  for (const p of problems) console.warn(`warning: ${p}`);
  const entries = <T extends { id: string }>(from: RawContent, file: RegExp, parse: (v: unknown) => T[]): T[] =>
    Object.keys(from).sort().filter((p) => file.test(p)).flatMap((p) => parse(from[p]));
  /** The default data's entries, then the ones only the rework preset adds. */
  const both = <T extends { id: string }>(file: RegExp, parse: (v: unknown) => T[]): T[] => {
    const base = entries(raw, file, parse), ids = new Set(base.map((e) => e.id));
    return [...base, ...entries(rework, file, parse).filter((e) => !ids.has(e.id))];
  };
  const units = both(/^factions\/[^/]+\/units\.json$/, (v) => UnitSchema.array().parse(v));
  const buildings = both(/^factions\/[^/]+\/buildings\.json$/, (v) => BuildingSchema.array().parse(v));
  const sheetOf = (file: string) => {
    const r = SpriteSheetSchema.safeParse(raw[file]);
    if (!r.success) console.warn(`warning: data/${file} doesn't validate, so its sprites are left out`);
    return r.success ? r.data.sprites : [];
  };
  const gray = FactionSchema.safeParse(raw['factions/gray-rot/faction.json']);
  return { units, buildings, gray: gray.success ? gray.data.palette : {}, soil: sheetOf('sprites/terrain.json').find((s) => s.id === 't-soil') };
}

/** One squad strip: a spawner's squad of n in its slot, and whether the sprite's width overflows it. */
interface Strip { building: string; label: string; n: number; k: number; bound: number; width: number; over: boolean; counts: boolean }
interface SpriteReport {
  id: string; w: number; h: number; shape: SpriteDef['shape'] | null; units: string[]; building: string | null;
  frames: { body: Box | null }[];
  strips: Strip[]; problems: string[]; overflows: string[];
}

function report(s: SpriteDef, world: World, bands: SpriteBands | undefined): SpriteReport {
  const frames = s.frames.map((_, f) => ({ body: bodyBox(s, f) }));
  const units = world.units.filter((u) => u.sprite === s.id);
  const building = s.id.startsWith('e-') ? world.buildings.find((b) => b.id === s.id.slice(2)) : undefined;
  const problems = [
    ...shapeProblems(s, bands),
    ...units.flatMap((u) => unitShapeProblems(u, s)),
    ...(building ? emplacementShapeProblems(building, s) : []),
  ];
  const width = Math.max(0, ...frames.map((f) => f.body?.w ?? 0));
  const strips: Strip[] = [];
  for (const u of units) {
    for (const b of world.buildings.filter((x) => x.spawn?.unit === u.id)) {
      const base = baseSquad(b);
      const labels = ['base', 'base + 1: a Rhizome Vault', "base + 2: the Velvet Shrine's"];
      labels.forEach((label, i) => {
        const n = base + i, bound = widthBound(n);
        strips.push({ building: b.id, label, n, k: slotGrid(n).k, bound, width, over: width > bound, counts: i < 2 });
      });
    }
  }
  const overflows: string[] = [];
  for (const st of strips) {
    if (!st.over) continue;
    const line = `${s.id} is ${st.width} px wide, over the ${st.bound} px a unit has in ${st.building}'s squad of ${st.n} (${st.label})`;
    if (st.counts && s.shape) problems.push(`sprite ${line}`);
    else overflows.push(line);
  }
  return { id: s.id, w: s.w, h: s.h, shape: s.shape ?? null, units: units.map((u) => u.id), building: building?.id ?? null, frames, strips, problems, overflows };
}

// ---- drawing: each canvas is a list of ops that a small script in the page runs ----

/** `img` draws image `i` of the page's table at scale s; `rect` strokes a 1-px frame, or fills. */
type Op =
  | { t: 'img'; i: number; x: number; y: number; s: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; c: string; fill?: boolean };
interface Canvas { id: string; w: number; h: number; ops: Op[] }
/** An image the page decodes once: RGBA rows, base64. */
interface Image { b64: string; w: number; h: number }

const COLORS = { band: '#5fd38d', body: '#4fd6ff', slot: 'rgba(255,255,255,0.55)', grid: 'rgba(255,255,255,0.18)' };

function filtered(f: FramePixels, filter: CvdFilter | undefined): FramePixels {
  if (!filter) return f;
  const px = new Uint8ClampedArray(f.px);
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const [r, g, b] = applyCvd([px[i]!, px[i + 1]!, px[i + 2]!], filter);
    px[i] = Math.round(r); px[i + 1] = Math.round(g); px[i + 2] = Math.round(b);
  }
  return { ...f, px };
}
/** A 1-px frame just outside a box of native pixels drawn at scale s from (ox, oy). */
const around = (b: Box, ox: number, oy: number, s: number, c: string): Op => ({ t: 'rect', x: ox + b.x * s - 1, y: oy + b.y * s - 1, w: b.w * s + 2, h: b.h * s + 2, c });
const hline = (x: number, y: number, w: number, c: string): Op => ({ t: 'rect', x, y, w, h: 1, c, fill: true });

class Painter {
  readonly canvases: Canvas[] = [];
  readonly images: Image[] = [];
  private readonly index = new Map<string, number>();
  private soil?: FramePixels;
  constructor(private readonly world: World, private readonly filter: CvdFilter | undefined) {
    if (world.soil) this.soil = filtered(framePixels(world.soil, 0), filter);
  }

  /** Draws pixels at (x, y) at scale s, each distinct image stored once. */
  img(f: FramePixels, x: number, y: number, s: number): Op {
    const b64 = Buffer.from(f.px.buffer, f.px.byteOffset, f.px.byteLength).toString('base64');
    const key = `${f.w}x${f.h}:${b64}`;
    let i = this.index.get(key);
    if (i === undefined) { i = this.images.push({ b64, w: f.w, h: f.h }) - 1; this.index.set(key, i); }
    return { t: 'img', i, x, y, s };
  }

  /** A frame as pixels, as the atlas bakes it. */
  frame(s: SpriteDef, f: number, gray: boolean, flip: boolean): FramePixels {
    return filtered(framePixels(s, f, { swap: gray ? this.world.gray : undefined, flip }), this.filter);
  }

  /** A canvas w × h with the soil tiled at scale s; returns its id. */
  canvas(w: number, h: number, s: number, ops: Op[]): string {
    const id = `c${this.canvases.length}`;
    const bg: Op[] = [];
    if (this.soil) {
      const t = this.soil.w * s;
      for (let y = 0; y < h; y += t) for (let x = 0; x < w; x += t) bg.push(this.img(this.soil, x, y, s));
    }
    this.canvases.push({ id, w, h, ops: [...bg, ...ops] });
    return id;
  }

  /** One frame at scale s, facing right for the Velvet Bloom or left for the Gray Rot, measured if asked. */
  cell(s: SpriteDef, f: number, scale: number, gray: boolean, measured: boolean, bands: SpriteBands | undefined): string {
    const flip = gray && s.id.startsWith('u-');
    const pad = 2 * scale;
    const mirror = (b: Box): Box => (flip ? { ...b, x: s.w - b.x - b.w } : b);
    const body = measured ? bodyBox(s, f) : null;
    const band = body && s.shape && s.shape.body !== 'structure' ? bands?.[s.shape.body] : undefined;
    // the body's top row may sit from (bottom + 1 - max) down to (bottom + 1 - min); room above for a short body's lines
    const bottom = body ? body.y + body.h : 0;
    const top = pad + (band ? Math.max(0, band[1] - bottom) : 0) * scale;
    const ops: Op[] = [this.img(this.frame(s, f, gray, flip), pad, top, scale)];
    if (body) {
      if (band) for (const row of [bottom - band[1], bottom - band[0]]) ops.push(hline(0, top + row * scale, s.w * scale + 2 * pad, COLORS.band));
      ops.push(around(mirror(body), pad, top, scale, COLORS.body));
    }
    return this.canvas(s.w * scale + 2 * pad, s.h * scale + top + pad, scale, ops);
  }

  /** Frame 0 of a unit's sprite at 2×, n of them on the k × k grid of a 32 px slot, the player's side. */
  strip(s: SpriteDef, n: number): string {
    const scale = 2, m = Math.max(16, s.h, s.w);
    const slot = { lane: 0, rank: 0, file: 1, col: 0, row: 0 };
    const ops: Op[] = [];
    const { k } = slotGrid(n);
    for (let i = 1; i < k; i++) {
      const at = Math.round((i * 32) / k);
      ops.push({ t: 'rect', x: (m + at) * scale, y: m * scale, w: 1, h: 32 * scale, c: COLORS.grid, fill: true });
      ops.push(hline(m * scale, (m + at) * scale, 32 * scale, COLORS.grid));
    }
    ops.push(around({ x: m, y: m, w: 32, h: 32 }, 0, 0, scale, COLORS.slot));
    const px = this.frame(s, 0, false, false);
    const spots = slotPositions(n, slot, 'player').map((p) => ({ x: p.x * 16, y: p.y * 16 })).sort((a, b) => a.y - b.y || a.x - b.x);
    for (const p of spots) ops.push(this.img(px, (m + Math.round(p.x - s.anchor[0])) * scale, (m + Math.round(p.y - s.anchor[1])) * scale, scale));
    return this.canvas((32 + 2 * m) * scale, (32 + 2 * m) * scale, scale, ops);
  }
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function section(s: SpriteDef, r: SpriteReport, p: Painter, world: World, bands: SpriteBands | undefined): string {
  const range = s.frames.map((_, f) => f);
  const facing = s.id.startsWith('u-') ? ' ←' : '';
  const groups = [
    { cap: '2× · Velvet Bloom →', ids: range.map((f) => p.cell(s, f, 2, false, false, bands)) },
    { cap: `2× · Gray Rot${facing}`, ids: range.map((f) => p.cell(s, f, 2, true, false, bands)) },
    { cap: '4× measured · Velvet Bloom →', ids: range.map((f) => p.cell(s, f, 4, false, true, bands)) },
    { cap: `4× measured · Gray Rot${facing}`, ids: range.map((f) => p.cell(s, f, 4, true, true, bands)) },
  ];
  const who = [
    ...r.units.map((id) => { const u = world.units.find((x) => x.id === id)!; return `unit ${id} (${u.armor} armor, ${u.damageType}${u.tags.length ? `, ${u.tags.join(' ')}` : ''})`; }),
    ...(r.building ? [`building ${r.building}`] : []),
  ];
  const shape = s.shape ? `${s.shape.body} body` : 'no shape';
  const sizes = `body height ${r.frames.map((f) => f.body?.h ?? 0).join('/')} · width ${r.frames.map((f) => f.body?.w ?? 0).join('/')}`;
  const spawners = [...new Set(r.strips.map((st) => st.building))];
  const strips = spawners.map((b) => `<div class="row"><div class="cap">${esc(b)}'s squad on its k × k grid in a 32 px slot</div>${r.strips.filter((st) => st.building === b).map((st) =>
    `<div class="strip"><canvas id="${p.strip(s, st.n)}"></canvas><div class="${st.over ? (st.counts && s.shape ? 'bad' : 'warn') : 'dim'}">${st.n}, ${esc(st.label)} · k ${st.k} · ${st.bound} px a unit</div></div>`).join('')}</div>`);
  const notes = [...r.problems.map((t) => `<li class="bad">${esc(t)}</li>`), ...r.overflows.map((t) => `<li class="warn">overflow: ${esc(t)}</li>`)];
  return `<section>
  <h2>${esc(s.id)} <span class="dim">${s.w} × ${s.h} · ${esc(shape)}${who.length ? ` · ${esc(who.join(' · '))}` : ''}</span></h2>
  <div class="row">${groups.map((g) => `<div class="group"><div class="cap">${g.cap}</div>${g.ids.map((id) => `<canvas id="${id}"></canvas>`).join('')}</div>`).join('')}</div>
  <div class="dim">${sizes}</div>
  ${strips.join('')}
  ${notes.length ? `<ul>${notes.join('')}</ul>` : ''}
</section>`;
}

/** Decodes the images, runs each canvas's ops, then marks the page done. Plain JS: it runs in the page. */
const DRAW = `
const images = DATA.images.map((im) => {
  const c = document.createElement('canvas');
  c.width = im.w; c.height = im.h;
  const bin = atob(im.b64), px = new Uint8ClampedArray(bin.length);
  for (let i = 0; i < bin.length; i++) px[i] = bin.charCodeAt(i);
  c.getContext('2d').putImageData(new ImageData(px, im.w, im.h), 0, 0);
  return c;
});
for (const cv of DATA.canvases) {
  const el = document.getElementById(cv.id);
  el.width = cv.w; el.height = cv.h;
  const g = el.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (const op of cv.ops) {
    if (op.t === 'img') { const im = images[op.i]; g.drawImage(im, op.x, op.y, im.width * op.s, im.height * op.s); }
    else if (op.fill) { g.fillStyle = op.c; g.fillRect(op.x, op.y, op.w, op.h); }
    else { g.strokeStyle = op.c; g.lineWidth = 1; g.strokeRect(op.x + 0.5, op.y + 0.5, op.w - 1, op.h - 1); }
  }
}
document.body.dataset.done = '1';
`;

function html(title: string, legend: string, sections: string[], p: Painter): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
body { margin: 12px; background: #17110d; color: #e8dcc8; font: 12px/1.4 ui-monospace, Menlo, monospace; }
h1 { font-size: 14px; margin: 0 0 4px; } h2 { font-size: 13px; margin: 0 0 6px; }
section { margin: 0 0 10px; padding: 8px; border: 1px solid #3b2a1e; }
.row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin: 4px 0; }
.group { display: flex; flex-wrap: wrap; gap: 4px; align-items: flex-end; } .cap { width: 100%; color: #b9a77f; }
.strip { width: min-content; font-size: 11px; }
canvas { image-rendering: pixelated; display: block; }
.dim { color: #9a8c76; font-weight: normal; } .bad { color: #ff7a6b; } .warn { color: #e0b84e; }
ul { margin: 4px 0 0; padding-left: 18px; }
</style></head><body><h1>${esc(title)}</h1><div class="dim">${legend}</div>
${sections.join('\n')}
<script>const DATA = ${JSON.stringify({ images: p.images, canvases: p.canvases }).replace(/</g, '\\u003c')};${DRAW}</script></body></html>`;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const path = resolve(ROOT, args.sheet);
  const parsed = SpriteSheetSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    console.log(`FAIL  ${args.sheet} doesn't validate:`);
    for (const i of parsed.error.issues) console.log(`      - ${i.path.join('.')}: ${i.message}`);
    return 1;
  }
  const sheet = parsed.data;
  const world = loadWorld();
  const name = (args.name ?? basename(path, '.json')) + (args.filter ? { deuteranopia: '-d', protanopia: '-p' }[args.filter] : '');
  const painter = new Painter(world, args.filter);
  const reports = sheet.sprites.map((s) => report(s, world, sheet.bands));
  const sections = sheet.sprites.map((s, i) => section(s, reports[i]!, painter, world, sheet.bands));
  const b = sheet.bands;
  const legend = [
    esc(args.sheet), b ? `bands: small ${b.small.join('–')}, medium ${b.medium.join('–')}, big ${b.big.join('–')} px` : 'no bands',
    args.filter ? `art through the ${args.filter} filter` : 'no filter',
    `<span style="color:${COLORS.band}">green</span>: where the body's top edge may sit for its band`,
    `<span style="color:${COLORS.body}">cyan</span>: the body's box`,
  ].join(' · ');

  const dir = join(ROOT, 'artifacts', 'sprite-sheet');
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await page.setContent(html(`sprite sheet · ${sheet.sheet}`, legend, sections, painter));
    await page.waitForFunction(() => document.body.dataset.done === '1', null, { timeout: 30000 });
    await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
  } finally {
    await browser.close();
  }

  const problems = reports.flatMap((r) => r.problems), overflows = reports.flatMap((r) => r.overflows);
  writeFileSync(join(dir, `${name}.json`), JSON.stringify({ sheet: args.sheet, name, filter: args.filter ?? null, bands: sheet.bands ?? null, problems: problems.length, overflows: overflows.length, sprites: reports }, null, 2));
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${sheet.sheet}: ${sheet.sprites.length} sprites · ${problems.length} problem${problems.length === 1 ? '' : 's'} · ${overflows.length} overflow${overflows.length === 1 ? '' : 's'} listed · artifacts/sprite-sheet/${name}.png`);
  for (const r of reports) {
    if (!r.problems.length && !r.overflows.length) continue;
    console.log(`  ${r.id}`);
    for (const t of r.problems) console.log(`      - problem: ${t}`);
    for (const t of r.overflows) console.log(`      - overflow: ${t}`);
  }
  return problems.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 2; });
