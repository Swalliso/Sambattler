// npm run screenshot -- --name <file> --params "<query>" [--url <base>] [--browser chromium|firefox]
//                       [--filter deuteranopia|protanopia]
// Builds if dist/ is stale, serves it with `vite preview` (or reuses --url), opens the page in
// Playwright at 1280×720 (DPR 1), runs the §15.6 assertions and writes
// artifacts/screenshots/<name>.png + <name>.json. Exit 1 on any failed assertion.
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, firefox } from 'playwright';
import { nodeContent, ROOT } from './lib/content.ts';
import { RUN_SCENES, runForParams, sceneOf, stateForParams } from './lib/params.ts';
import { hashRun } from '../src/run/index.ts';
import { hashState, summarize } from '../src/sim/index.ts';
import type { BattleState } from '../src/sim/index.ts';

interface Args { name: string; params: string; url?: string; browser: 'chromium' | 'firefox'; filter?: 'deuteranopia' | 'protanopia' }

function parseArgs(argv: string[]): Args {
  const a: Args = { name: 'shot', params: '', browser: 'chromium' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!, v = argv[i + 1];
    if (k === '--name') { a.name = v!; i++; }
    else if (k === '--params') { a.params = v ?? ''; i++; }
    else if (k === '--url') { a.url = v!; i++; }
    else if (k === '--browser') { a.browser = v as Args['browser']; i++; }
    else if (k === '--filter') { a.filter = v as Args['filter']; i++; }
    else throw new Error(`unknown option ${k}`);
  }
  return a;
}

function newestMtime(dir: string): number {
  let t = 0;
  if (!existsSync(dir)) return 0;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    t = Math.max(t, s.isDirectory() ? newestMtime(p) : s.mtimeMs);
  }
  return t;
}

function ensureBuild(): void {
  const distIndex = join(ROOT, 'dist', 'index.html');
  const built = existsSync(distIndex) ? statSync(distIndex).mtimeMs : 0;
  const src = Math.max(newestMtime(join(ROOT, 'src')), newestMtime(join(ROOT, 'data')), statSync(join(ROOT, 'index.html')).mtimeMs);
  if (built >= src) return;
  console.error('dist/ is stale: running npm run build');
  const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error('build failed');
}

async function waitForServer(url: string, ms: number): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 150));
  }
  throw new Error(`server at ${url} did not start`);
}

const FILTERS: Record<string, string> = {
  deuteranopia: '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
  protanopia: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
};

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const q = new URLSearchParams(args.params);
  if (!q.has('seed')) q.set('seed', '1');
  q.set('test', '1');
  let server: ChildProcess | undefined;
  let base = args.url;
  if (!base) {
    ensureBuild();
    base = 'http://localhost:4173/';
    try { await waitForServer(base, 300); } catch {
      server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
      await waitForServer(base, 20000);
    }
  }
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  const browser = await (args.browser === 'firefox' ? firefox : chromium).launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    const url = `${base.replace(/\/$/, '')}/?${q.toString()}`;
    await page.goto(url);
    await page.waitForFunction(() => window.__GAME__?.ready === true, null, { timeout: 60000 });
    await page.waitForTimeout(300); // a few frames so effects and layout settle
    if (args.filter) {
      await page.evaluate((matrix) => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
        svg.innerHTML = `<filter id="cvd"><feColorMatrix type="matrix" values="${matrix}"/></filter>`;
        document.body.append(svg);
        document.documentElement.style.filter = 'url(#cvd)';
      }, FILTERS[args.filter]!);
    }

    // 1. no console or page errors
    const bridgeErrors = await page.evaluate(() => window.__GAME__!.errors);
    for (const e of [...consoleErrors, ...bridgeErrors]) failures.push(`console/page error: ${e}`);

    // 2. browser hash == Node hash at the same tick (the battle's state, or the run's on run screens)
    const scene = sceneOf(q);
    const browserTick = await page.evaluate(() => window.__GAME__!.tick);
    const browserHash = await page.evaluate(() => window.__GAME__!.hash);
    const summary = await page.evaluate(() => window.__GAME__!.summary());
    const content = nodeContent();
    let node: BattleState | null;
    let nodeHash: string;
    let runBrief: unknown = null;
    if (RUN_SCENES.includes(scene)) {
      const r = runForParams(content, q);
      node = r.battle;
      nodeHash = node ? hashState(node) : hashRun(r.run);
      runBrief = await page.evaluate(() => window.__GAME__!.run());
    } else {
      node = stateForParams(content, q);
      nodeHash = hashState(node);
    }
    if ((node?.tick ?? 0) !== browserTick) failures.push(`tick mismatch: browser ${browserTick}, node ${node?.tick ?? 0}`);
    if (nodeHash !== browserHash) failures.push(`hash mismatch at tick ${browserTick}: browser ${browserHash}, node ${nodeHash}`);

    let canvasCheck: { distinct: number; playerTint: boolean; enemyTint: boolean } | null = null;
    let hud: { gold?: string | null; supply?: string | null } | null = null;
    let dom: Record<string, unknown> | null = null;
    if (node && summary) {
      // 3. canvas not blank: ≥12 distinct colours on a sampled grid; both team tints in their home columns
      const pal = { player: content.factions['velvet-bloom']!.mat.strand, enemy: content.factions['gray-rot']!.mat.strand };
      // (a script string, not a function: tsx would inject __name helpers the page does not have)
      canvasCheck = await page.evaluate(`(() => {
        const pal = ${JSON.stringify(pal)}, homeCols = ${node.map.homeCols}, mapW = ${node.map.width};
        const c = document.getElementById('battlefield');
        const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const hex = (i) => '#' + [img[i], img[i + 1], img[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        const colors = new Set();
        for (let y = 2; y < c.height; y += 6) for (let x = 2; x < c.width; x += 6) colors.add(hex((y * c.width + x) * 4));
        // a pixel counts as a team tint if it is within a small RGB distance of that team's strand colour
        // (the Sporestorm haze and capture fills shift colours slightly) and nearer to it than to the other team's
        const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        const P = rgb(pal.player), E = rgb(pal.enemy);
        const d2 = (i, q) => (img[i] - q[0]) ** 2 + (img[i + 1] - q[1]) ** 2 + (img[i + 2] - q[2]) ** 2;
        const has = (x0, x1, color) => {
          const mine = color === pal.player ? P : E, theirs = color === pal.player ? E : P;
          for (let y = 0; y < c.height; y++) for (let x = x0; x < x1; x++) {
            const i = (y * c.width + x) * 4;
            if (d2(i, mine) <= 40 * 40 && d2(i, mine) < d2(i, theirs)) return true;
          }
          return false;
        };
        const T = 16, strip = 2;
        return {
          distinct: colors.size,
          playerTint: has(strip * T, (strip + homeCols) * T, pal.player),
          enemyTint: has((strip + mapW - homeCols) * T, (strip + mapW) * T, pal.enemy),
        };
      })()`) as { distinct: number; playerTint: boolean; enemyTint: boolean };
      if (canvasCheck.distinct < 12) failures.push(`canvas looks blank: ${canvasCheck.distinct} distinct colours sampled (need ≥12)`);
      if (!canvasCheck.playerTint) failures.push('violet mat tint missing from the player home columns');
      if (!canvasCheck.enemyTint) failures.push('gray mat tint missing from the enemy home columns');

      // 4. the HUD agrees with the state
      hud = await page.evaluate(() => ({
        gold: document.getElementById('hud-gold')?.textContent,
        supply: document.getElementById('hud-supply')?.textContent,
      }));
      if (hud.gold !== String(summary.gold.player)) failures.push(`#hud-gold "${hud.gold}" != summary gold ${summary.gold.player}`);
      if (hud.supply !== summary.supply.player.text) failures.push(`#hud-supply "${hud.supply}" != summary supply ${summary.supply.player.text}`);
    }

    // 4b. run screens: the DOM shows what the run state holds
    if (scene === 'draft') {
      dom = await page.evaluate(() => [...document.querySelectorAll('#draft .draft-card')].map((c) => ({
        type: c.querySelector('.draft-type')?.textContent ?? '', rarity: c.querySelector('.draft-rarity')?.textContent ?? '',
        name: c.querySelector('.draft-name')?.textContent ?? '', text: c.querySelector('.draft-text')?.textContent ?? '',
      }))).then((cards) => ({ cards }));
      const cards = (dom as { cards: { type: string; rarity: string; name: string; text: string }[] }).cards;
      const offer = node?.sides.player.draft?.offer.length ?? 0;
      if (!offer) failures.push('no draft is open in the Node state');
      if (cards.length !== offer) failures.push(`draft shows ${cards.length} cards, the state offers ${offer}`);
      for (const c of cards) if (!c.type || !c.rarity || !c.name || !c.text) failures.push(`draft card missing type, rarity, name or text: ${JSON.stringify(c)}`);
    } else if (scene === 'route' || scene === 'run') {
      dom = await page.evaluate(() => ({
        rows: document.querySelectorAll('.route-row').length,
        nodes: [...document.querySelectorAll('.route-node')].map((n) => ({
          kind: n.getAttribute('data-kind'), icon: !!n.querySelector('canvas.node-icon'), map: n.querySelector('.node-map')?.textContent ?? null,
        })),
        open: document.querySelectorAll('.route-node.open').length,
      }));
      const d = dom as { rows: number; nodes: { kind: string; icon: boolean; map: string | null }[]; open: number };
      if (d.rows !== 6) failures.push(`route shows ${d.rows} rows (expected 6)`);
      for (const n of d.nodes) {
        if (!n.icon) failures.push(`a ${n.kind} node has no icon`);
        if (['battle', 'elite', 'boss'].includes(n.kind) && !n.map) failures.push(`a ${n.kind} node does not name its map`);
      }
      if (!d.open) failures.push('no node is selectable in the current row');
    } else if (scene === 'summary') {
      dom = await page.evaluate(() => ({
        title: document.getElementById('summary-title')?.textContent ?? '',
        battles: [...document.querySelectorAll('.summary-battle')].map((r) => r.querySelector('.result')?.textContent ?? ''),
      }));
      const d = dom as { title: string; battles: string[] };
      const n = (runBrief as { battles: unknown[] } | null)?.battles.length ?? -1;
      if (!d.title) failures.push('the summary has no title');
      if (d.battles.length !== n) failures.push(`summary lists ${d.battles.length} battles, the run has ${n}`);
      for (const r of d.battles) if (!/^(Won|Lost) by (Rout|Decision)$/.test(r)) failures.push(`summary row without a result: "${r}"`);
    }

    // 5. artifacts
    const dir = join(ROOT, 'artifacts', 'screenshots');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, `${args.name}.png`) });
    const report = {
      name: args.name, url, browser: args.browser, filter: args.filter ?? null,
      scene, tick: browserTick, browserHash, nodeHash, canvas: canvasCheck, hud, dom, run: runBrief,
      summary: node ? { ...summarize(node), stats: undefined } : null,
      failures,
    };
    writeFileSync(join(dir, `${args.name}.json`), JSON.stringify(report, null, 2));
    console.log(`${failures.length ? 'FAIL' : 'PASS'}  ${args.name}: ${scene} · tick ${browserTick} · hash ${browserHash} (node ${nodeHash})${canvasCheck ? ` · ${canvasCheck.distinct} colours` : ''} · artifacts/screenshots/${args.name}.png`);
    for (const f of failures) console.log(`      - ${f}`);
  } finally {
    await browser.close();
    server?.kill();
  }
  return failures.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 2; });
