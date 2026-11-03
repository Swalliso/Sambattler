// npm run screenshot -- --name <file> --params "<query>" [--url <base>] [--browser chromium|firefox]
//                       [--filter deuteranopia|protanopia] [--size WxH] [--click <selector>]... [--settings '<json>']
// Builds if dist/ is stale, serves it with `vite preview` (or reuses --url), opens the page in
// Playwright at 1280×720 (or --size; DPR 1), runs the §15.6 assertions and writes
// artifacts/screenshots/<name>.png + <name>.json. Exit 1 on any failed assertion. --click presses
// buttons before the capture (e.g. `#settings-btn` opens the settings screen, `#help-tab-keys` a Help
// tab), and --settings writes the settings record before the game boots (e.g. '{"colorAssist":true}').
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium, firefox } from 'playwright';
import type { Page } from 'playwright';
import { nodeContent, ROOT } from './lib/content.ts';
import { CVD_MATRICES, cvdMatrixValues } from './lib/cvd.ts';
import type { CvdFilter } from './lib/cvd.ts';
import { RUN_SCENES, battleStateForParams, runForParams, sceneOf } from './lib/params.ts';
import { generalKit, hashRun, intelDots, isBattle, nodeBattleIndex } from '../src/run/index.ts';
import type { RunState } from '../src/run/index.ts';
import { battleOutcome } from '../src/ui/words.ts';
import { COUNTER_KINDS } from '../src/sim/index.ts';
import { formationOf as roundFormationOf, hashState as hashRoundState, summarize as summarizeRound } from '../src/sim/index.ts';
import type { BattleState as RoundState } from '../src/sim/index.ts';

interface Args {
  name: string; params: string; url?: string; browser: 'chromium' | 'firefox'; filter?: CvdFilter;
  width: number; height: number; clicks: string[]; settings?: string;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { name: 'shot', params: '', browser: 'chromium', width: 1280, height: 720, clicks: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!, v = argv[i + 1];
    if (k === '--name') { a.name = v!; i++; }
    else if (k === '--params') { a.params = v ?? ''; i++; }
    else if (k === '--url') { a.url = v!; i++; }
    else if (k === '--browser') { a.browser = v as Args['browser']; i++; }
    else if (k === '--filter') {
      if (!v || !(v in CVD_MATRICES)) throw new Error(`--filter wants ${Object.keys(CVD_MATRICES).join(' or ')}, got ${v}`);
      a.filter = v as CvdFilter; i++;
    }
    else if (k === '--size') {
      const m = /^(\d+)x(\d+)$/.exec(v ?? '');
      if (!m) throw new Error(`--size wants WxH, got ${v}`);
      a.width = Number(m[1]); a.height = Number(m[2]); i++;
    } else if (k === '--click') { a.clicks.push(v!); i++; }
    else if (k === '--settings') { JSON.parse(v!); a.settings = v; i++; }
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
    const page = await browser.newPage({ viewport: { width: args.width, height: args.height }, deviceScaleFactor: 1 });
    if (args.settings) await page.addInitScript((v) => localStorage.setItem('spore-sprawl/settings/v1', v), args.settings);
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    const url = `${base.replace(/\/$/, '')}/?${q.toString()}`;
    await page.goto(url);
    await page.waitForFunction(() => window.__GAME__?.ready === true, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready.then(() => true)); // the self-hosted fonts have swapped in
    await page.waitForTimeout(300); // a few frames so effects and layout settle
    for (const sel of args.clicks) {
      await page.click(sel);
      await page.waitForTimeout(150);
    }
    if (args.filter) {
      await page.evaluate((matrix) => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
        svg.innerHTML = `<filter id="cvd"><feColorMatrix type="matrix" values="${matrix}"/></filter>`;
        document.body.append(svg);
        document.documentElement.style.filter = 'url(#cvd)';
      }, cvdMatrixValues(args.filter));
    }

    // 1. no console or page errors
    const bridgeErrors = await page.evaluate(() => window.__GAME__!.errors);
    for (const e of [...consoleErrors, ...bridgeErrors]) failures.push(`console/page error: ${e}`);

    const scene = sceneOf(q);
    if (scene === 'battle' || scene === 'report') return await roundCapture(page, q, args, url, failures);

    // 2. browser hash == Node hash at the same tick (a run's battle, or the run's state on run screens)
    const browserTick = await page.evaluate(() => window.__GAME__!.tick);
    const browserHash = await page.evaluate(() => window.__GAME__!.hash);
    const content = nodeContent();
    let nodeHash = '';
    let nodeTick = 0;
    let runBattle: RoundState | null = null;
    let runBrief: unknown = null;
    let nodeRun: RunState | null = null;
    // the title and the Underroot hold no run or battle yet: the bridge's hash is empty
    if (RUN_SCENES.includes(scene)) {
      const r = runForParams(content, q);
      nodeRun = r.run;
      runBattle = r.battle;
      nodeHash = runBattle ? hashRoundState(runBattle) : hashRun(r.run);
      nodeTick = runBattle?.tick ?? 0;
      runBrief = await page.evaluate(() => window.__GAME__!.run());
    }
    if (nodeTick !== browserTick) failures.push(`tick mismatch: browser ${browserTick}, node ${nodeTick}`);
    if (nodeHash !== browserHash) failures.push(`hash mismatch at tick ${browserTick}: browser ${browserHash}, node ${nodeHash}`);

    let dom: Record<string, unknown> | null = null;
    // 4b. run screens: the DOM shows what the run state holds
    if (scene === 'title') {
      dom = await page.evaluate(() => ({
        wordmark: document.querySelector('#title .wordmark')?.textContent ?? '',
        primary: document.querySelector('#title .title-menu .primary')?.id ?? null,
        menu: [...document.querySelectorAll('#title .title-menu > .btn')].map((b) => b.textContent ?? ''),
      }));
      const d = dom as { wordmark: string; primary: string | null; menu: string[] };
      if (d.wordmark !== 'Spore & Sprawl') failures.push(`the title's wordmark reads "${d.wordmark}"`);
      if (!d.primary) failures.push('the title has no primary button');
      for (const want of ['How to play', 'Settings']) if (!d.menu.some((t) => t.includes(want))) failures.push(`the title menu has no ${want}`);
    } else if (scene === 'draft') {
      dom = await page.evaluate(() => [...document.querySelectorAll('#draft .draft-card')].map((c) => ({
        type: c.querySelector('.draft-type')?.textContent ?? '', rarity: c.querySelector('.draft-rarity')?.textContent ?? '',
        name: c.querySelector('.draft-name')?.textContent ?? '', text: c.querySelector('.draft-text')?.textContent ?? '',
      }))).then((cards) => ({ cards }));
      const cards = (dom as { cards: { type: string; rarity: string; name: string; text: string }[] }).cards;
      const offer = runBattle?.sides.player.draft?.offer.length ?? 0;
      if (!offer) failures.push('no draft is open in the Node state');
      if (cards.length !== offer) failures.push(`draft shows ${cards.length} cards, the state offers ${offer}`);
      for (const c of cards) if (!c.type || !c.rarity || !c.name || !c.text) failures.push(`draft card missing type, rarity, name or text: ${JSON.stringify(c)}`);
    } else if (scene === 'run' && runBattle) {
      // a run's battle (`round=`, `phase=`; T157): a cap under your Heartcap per life, lit for each one left (A063)
      dom = await page.evaluate(() => ({
        caps: document.querySelectorAll('#hud-hp-player #hud-lives .cap').length,
        lit: document.querySelectorAll('#hud-hp-player #hud-lives .cap.lit').length,
      }));
      const d = dom as { caps: number; lit: number };
      const lives = (runBrief as { lives: { left: number; max: number } } | null)?.lives;
      if (!lives) failures.push('the bridge has no run');
      else if (d.caps !== lives.max || d.lit !== lives.left) failures.push(`#hud-lives shows ${d.lit} of ${d.caps} caps lit, the run has ${lives.left} of ${lives.max}`);
    } else if (scene === 'route' || scene === 'run') {
      dom = await page.evaluate(() => ({
        rows: document.querySelectorAll('.route-row').length,
        nodes: [...document.querySelectorAll<HTMLElement>('.route-node')].map((n) => ({
          node: n.dataset.node ?? '', kind: n.getAttribute('data-kind'), icon: !!n.querySelector('canvas.node-icon'), map: n.querySelector('.node-map')?.textContent ?? null,
          kit: [...n.querySelectorAll<HTMLElement>('.node-kit [data-building]')].map((b) => `${b.dataset.building}:${b.dataset.level}`),
        })),
        open: document.querySelectorAll('.route-node.open').length,
      }));
      const d = dom as { rows: number; nodes: { node: string; kind: string; icon: boolean; map: string | null; kit: string[] }[]; open: number };
      if (d.rows !== 6) failures.push(`route shows ${d.rows} rows (expected 6)`);
      for (const n of d.nodes) {
        if (!n.icon) failures.push(`a ${n.kind} node has no icon`);
        if (['battle', 'elite', 'boss'].includes(n.kind) && !n.map) failures.push(`a ${n.kind} node does not name its map`);
      }
      if (!d.open) failures.push('no node is selectable in the current row');
      // each battle node lists its general's kit at the battle index it shows (§8.2, T105)
      for (const [r, list] of nodeRun!.route.entries()) {
        for (const [i, node] of list.entries()) {
          if (!isBattle(node)) continue;
          const k = generalKit(content, nodeRun!, node, nodeBattleIndex(nodeRun!, r));
          const want = k.kit.map((id) => `${id}:${k.upgrades[id] ?? 0}`);
          const got = d.nodes.find((n) => n.node === `${r}:${i}`)?.kit ?? [];
          if (got.join() !== want.join()) failures.push(`node ${r}:${i} lists the kit ${got.join(' ') || '(none)'}, generalKit has ${want.join(' ')}`);
        }
      }
    } else if (scene === 'summary') {
      dom = await page.evaluate(() => ({
        title: document.getElementById('summary-title')?.textContent ?? '',
        battles: [...document.querySelectorAll('.summary-battle')].map((r) => r.querySelector('.result')?.textContent ?? ''),
        sparklines: document.querySelectorAll('.summary-battle .sparkline').length,
      }));
      const d = dom as { title: string; battles: string[]; sparklines: number };
      if (!d.title) failures.push('the summary has no title');
      // the summary's battles are the run's, each with how it was decided and a sparkline when it has rounds (§8.8)
      const want = nodeRun!.battles.map(battleOutcome);
      if (d.battles.join('|') !== want.join('|')) failures.push(`summary lists ${JSON.stringify(d.battles)}, the run has ${JSON.stringify(want)}`);
      const sparks = nodeRun!.battles.filter((b) => b.rounds.length).length;
      if (d.sparklines !== sparks) failures.push(`summary shows ${d.sparklines} sparklines, the run has ${sparks} battles with rounds`);
    }

    // 4e. the Underroot (SPEC §16 M5): three commander cards, each with its passive, power and starter kit
    if (scene === 'underroot') {
      const u = await page.evaluate(() => ({
        tab: document.querySelector('.uc-tabs .btn.on')?.getAttribute('data-tab') ?? null,
        cards: [...document.querySelectorAll<HTMLElement>('.commander-card')].map((c) => ({
          id: c.dataset.commander ?? '', on: c.classList.contains('on'), visible: c.offsetParent !== null,
          passive: c.querySelector('.uc-passive .uc-text')?.textContent ?? '',
          power: c.querySelector('.uc-power')?.textContent ?? '',
          starter: [...c.querySelectorAll<HTMLElement>('.uc-starter [data-building]')].map((b) => b.dataset.building ?? ''),
        })),
        bans: [...document.querySelectorAll<HTMLButtonElement>('.ban')].map((b) => ({ id: b.dataset.ban ?? '', disabled: b.disabled, core: b.classList.contains('core') })),
        begin: !!document.getElementById('underroot-begin'),
      }));
      dom = { ...(dom ?? {}), underroot: u };
      const want = q.get('tab') === 'bans' ? 'bans' : 'commanders';
      if (u.tab !== want) failures.push(`the Underroot opened on tab ${u.tab}, expected ${want}`);
      if (!u.begin) failures.push('the Underroot has no Begin run button');
      const ids = Object.keys(content.commanders);
      if (u.cards.length !== ids.length) failures.push(`the Underroot shows ${u.cards.length} commander cards (expected ${ids.length})`);
      if (u.cards.filter((c) => c.on).length !== 1) failures.push('exactly one commander card should be selected');
      for (const id of ids) {
        const c = content.commanders[id]!;
        const card = u.cards.find((x) => x.id === id);
        if (!card) { failures.push(`no card for ${c.name}`); continue; }
        if (want === 'commanders' && !card.visible) failures.push(`${c.name}'s card is not visible`);
        if (card.passive !== c.passive.text) failures.push(`${c.name}'s card shows passive "${card.passive}"`);
        if (!card.power.includes(c.power.name) || !card.power.includes(c.power.text)) failures.push(`${c.name}'s card doesn't show ${c.power.name} and its text`);
        if (card.starter.join() !== c.starter.join()) failures.push(`${c.name}'s card shows starter kit ${card.starter.join()} (expected ${c.starter.join()})`);
      }
      const chosen = content.commanders[u.cards.find((c) => c.on)?.id ?? '']!;
      const roster = content.factions['velvet-bloom']!.buildings;
      if (u.bans.length !== roster.length) failures.push(`the bans tab lists ${u.bans.length} buildings (expected ${roster.length})`);
      for (const b of u.bans) if (chosen && chosen.core.includes(b.id) !== b.core) failures.push(`ban ${b.id}: core marking is wrong for ${chosen.name}`);
    }

    // 4c. intel bars (SPEC §7.6) on the route and the summary: five kinds with the run's dots once a battle has been read
    if (scene === 'route' || (scene === 'run' && !runBattle) || scene === 'summary') {
      const intelDom = await page.evaluate(() => [...document.querySelectorAll('#route-intel .intel-kind')].map((e) => ({
        kind: e.getAttribute('data-kind'), dots: Number(e.getAttribute('data-dots')), text: e.textContent ?? '',
      })));
      dom = { ...(dom ?? {}), intel: intelDom };
      const r = runForParams(content, q).run;
      if (r.intel) {
        const want = intelDots(r.intel);
        if (intelDom.length !== COUNTER_KINDS.length) failures.push(`${scene} shows ${intelDom.length} intel bars (expected ${COUNTER_KINDS.length})`);
        for (const k of COUNTER_KINDS) {
          const got = intelDom.find((x) => x.kind === k);
          if (!got || got.dots !== want[k]) failures.push(`intel bar ${k}: ${got?.dots ?? '-'} dots, the run has ${want[k]}`);
        }
      } else if (intelDom.length) {
        failures.push('intel bars shown before any battle was read');
      }
    }

    // 4d. the settings screen, when a --click opened it
    const settingsDom = await settingsCheck(page, failures);
    if (settingsDom) dom = { ...(dom ?? {}), settings: settingsDom };

    // 5. artifacts
    const dir = join(ROOT, 'artifacts', 'screenshots');
    mkdirSync(dirname(join(dir, args.name)), { recursive: true }); // a name may hold folders (phase4/1280x720/title)
    await page.screenshot({ path: join(dir, `${args.name}.png`) });
    const report = {
      name: args.name, url, browser: args.browser, filter: args.filter ?? null, size: `${args.width}x${args.height}`, clicks: args.clicks,
      scene, tick: browserTick, browserHash, nodeHash, dom, run: runBrief,
      failures,
    };
    writeFileSync(join(dir, `${args.name}.json`), JSON.stringify(report, null, 2));
    console.log(`${failures.length ? 'FAIL' : 'PASS'}  ${args.name}: ${scene} · tick ${browserTick} · hash ${browserHash} (node ${nodeHash}) · artifacts/screenshots/${args.name}.png`);
    for (const f of failures) console.log(`      - ${f}`);
  } finally {
    await browser.close();
    server?.kill();
  }
  return failures.length ? 1 : 0;
}

/** 4d. The settings screen, when a --click opened it: every setting, the three volumes, and it fits the window. */
async function settingsCheck(page: Page, failures: string[]): Promise<Record<string, unknown> | null> {
  const settingsDom = await page.evaluate(() => {
    const card = document.getElementById('settings');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return {
      settings: [...card.querySelectorAll<HTMLElement>('[data-setting]')].map((e) => e.dataset.setting ?? ''),
      sliders: card.querySelectorAll('input[data-level]').length,
      preview: !!card.querySelector('#assist-preview canvas'),
      overflow: card.scrollHeight - card.clientHeight,
      inside: r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth,
    };
  });
  if (!settingsDom) return null;
  const want = ['damageNumbers', 'defaultSpeed', 'screenShake', 'uiScale', 'reducedMotion', 'colorAssist'];
  for (const k of want) if (!settingsDom.settings.includes(k)) failures.push(`the settings screen has no ${k} row`);
  if (settingsDom.sliders !== 3) failures.push(`the settings screen shows ${settingsDom.sliders} volume sliders (expected 3)`);
  if (!settingsDom.preview) failures.push('the settings screen has no color-blind assist preview');
  if (settingsDom.overflow > 0 || !settingsDom.inside) failures.push(`the settings screen doesn't fit the window (scrolls ${settingsDom.overflow} px)`);
  return settingsDom;
}

/**
 * 4f. Power targeting (`targeting=1`, in a clash): the power button is aiming, the aim callout names the power,
 * and a point power's reticle with its radius is on the field, its ring easy to see.
 */
async function targetingCheck(page: Page, node: RoundState, failures: string[]): Promise<Record<string, unknown>> {
  const content = nodeContent();
  const commander = node.config.player.power ? Object.values(content.commanders).find((c) => c.power.id === node.config.player.power) : undefined;
  const def = commander?.power ?? null;
  const aim = await page.evaluate(() => ({
    pressed: document.getElementById('power-btn')?.getAttribute('aria-pressed') ?? null,
    state: document.getElementById('power-btn')?.dataset.state ?? null,
    reticle: document.getElementById('battlefield')?.dataset.reticle ?? null,
    callout: document.getElementById('aim-callout')?.textContent ?? null,
  }));
  if (!def) { failures.push('targeting=1 but the player has no commander power'); return aim; }
  if (aim.pressed !== 'true' || aim.state !== 'aiming') failures.push(`the power button is not aiming (pressed ${aim.pressed}, state ${aim.state})`);
  if (!aim.callout?.includes(def.name)) failures.push(`the aim callout doesn't name ${def.name}: "${aim.callout}"`);
  if (def.target !== 'point') return aim;
  const r = aim.reticle?.split(',').map(Number);
  if (!r || r.length !== 3) { failures.push('no reticle on the field'); return aim; }
  if (r[2] !== def.radius) failures.push(`reticle radius ${r[2]} != ${def.name}'s ${def.radius}`);
  // the ring itself: lilac pixels on the circle around the aim point
  const hits = await page.evaluate(`(() => {
    const c = document.getElementById('battlefield'), g = c.getContext('2d');
    const T = 16, cx = Math.round((${r[0]} + 2) * T), cy = Math.round(${r[1]} * T), rad = ${r[2]} * T;
    let n = 0;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const d = g.getImageData(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), 1, 1).data;
      if (d[2] > 150 && d[0] > 120 && d[2] > d[1] + 30) n++;
    }
    return n;
  })()`) as number;
  if (hits < 24) failures.push(`the reticle ring is hard to see: ${hits}/48 sampled points are lilac`);
  return { ...aim, ringPixels: hits };
}

/**
 * A battle scene (`scene=battle`, `scene=report`), checked with §15.6's assertions 2–5 after assertion 1's errors: the page's hash against `battleStateForParams`'s at the same round, phase and tick; a
 * canvas that isn't blank with each team's mycelium inside its own colony's columns; the band's gold, plots,
 * round and Heartcaps against the bridge's summary, with no lives in a single battle, and in planning the
 * general's formation as drawn against Node's `formationOf`, unit for unit (T143); and the PNG with a JSON of
 * the round, phase, tick and hash.
 */
/** What assertion 4 reads off the top band: the gold, plots and round chips and both Heartcaps' numbers. */
type HudField = 'gold' | 'plots' | 'round' | 'hpPlayer' | 'hpEnemy';

async function roundCapture(page: Page, q: URLSearchParams, args: Args, url: string, failures: string[]): Promise<number> {
  const content = nodeContent();
  const got = await page.evaluate(() => {
    const g = window.__GAME__ as unknown as { round: number; phase: string | null; tick: number; hash: string };
    return { round: g.round, phase: g.phase, tick: g.tick, hash: g.hash };
  });
  // 2. browser hash == Node hash at the same round, phase and clash tick; a checkpoint Node can't reach fails with its message
  let node: RoundState | null = null;
  try { node = battleStateForParams(content, q); } catch (e) { failures.push(`node: ${(e as Error).message}`); }
  const nodeHash = node ? hashRoundState(node) : '';
  if (node) {
    const want = { round: node.round, phase: node.phase, tick: node.tick };
    if (got.round !== want.round || got.phase !== want.phase || got.tick !== want.tick) {
      failures.push(`checkpoint mismatch: browser round ${got.round} ${got.phase} tick ${got.tick}, node round ${want.round} ${want.phase} tick ${want.tick}`);
    }
    if (got.hash !== nodeHash) failures.push(`hash mismatch at round ${got.round} ${got.phase} tick ${got.tick}: browser ${got.hash}, node ${nodeHash}`);
  }
  // 3. canvas not blank: ≥12 distinct colours on a sampled grid; each team's strand tint inside its own colony's columns
  let canvas: { distinct: number; playerTint: boolean; enemyTint: boolean } | null = null;
  if (node) {
    const pal = { player: content.factions['velvet-bloom']!.mat.strand, enemy: content.factions['gray-rot']!.mat.strand };
    // (a script string, not a function: tsx would inject __name helpers the page does not have)
    canvas = await page.evaluate(`(() => {
      const pal = ${JSON.stringify(pal)}, colonyCols = ${node.map.homeCols}, mapW = ${node.map.width};
      const c = document.getElementById('battlefield');
      const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const hex = (i) => '#' + [img[i], img[i + 1], img[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      const colors = new Set();
      for (let y = 2; y < c.height; y += 6) for (let x = 2; x < c.width; x += 6) colors.add(hex((y * c.width + x) * 4));
      const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const P = rgb(pal.player), E = rgb(pal.enemy);
      const d2 = (i, q) => (img[i] - q[0]) ** 2 + (img[i + 1] - q[1]) ** 2 + (img[i + 2] - q[2]) ** 2;
      const has = (x0, x1, mine, theirs) => {
        for (let y = 0; y < c.height; y++) for (let x = x0; x < x1; x++) {
          const i = (y * c.width + x) * 4;
          if (d2(i, mine) <= 40 * 40 && d2(i, mine) < d2(i, theirs)) return true;
        }
        return false;
      };
      const T = 16, strip = 2;
      return {
        distinct: colors.size,
        playerTint: has(strip * T, (strip + colonyCols) * T, P, E),
        enemyTint: has((strip + mapW - colonyCols) * T, (strip + mapW) * T, E, P),
      };
    })()`) as { distinct: number; playerTint: boolean; enemyTint: boolean };
    if (canvas.distinct < 12) failures.push(`canvas looks blank: ${canvas.distinct} distinct colours sampled (need ≥12)`);
    if (!canvas.playerTint) failures.push('violet mat tint missing from your colony\'s columns');
    if (!canvas.enemyTint) failures.push('gray mat tint missing from the general\'s colony\'s columns');
  }
  // 4. the band agrees with the summary, with no lives in a single battle (A063), and in planning the general's
  //    whole colony and formation are drawn before your first command, as Node's formationOf has them (§7.5, §10.2)
  // (a script string, not a function: tsx would inject __name helpers the page does not have)
  const hud = await page.evaluate(`(() => {
    const t = (sel) => document.querySelector(sel)?.textContent ?? null;
    const s = window.__GAME__.summary();
    return {
      shown: { gold: t('#hud-gold'), plots: t('#hud-plots'), round: t('#hud-round'), hpPlayer: t('#hud-hp-player .heart-hp b'), hpEnemy: t('#hud-hp-enemy .heart-hp b') },
      want: s ? {
        gold: String(s.gold.player), plots: s.plots.player.planted + '/' + s.plots.player.owned, round: String(s.round),
        hpPlayer: String(s.heartcap.player), hpEnemy: String(s.heartcap.enemy),
      } : null,
      lives: document.querySelectorAll('#hud-lives').length,
    };
  })()`) as { shown: Record<HudField, string | null>; want: Record<HudField, string> | null; lives: number };
  if (!hud.want) failures.push('the bridge has no summary');
  else for (const k of Object.keys(hud.want) as HudField[]) if (hud.shown[k] !== hud.want[k]) failures.push(`HUD ${k} shows "${hud.shown[k]}", summary ${hud.want[k]}`);
  if (hud.lives) failures.push('#hud-lives shows in a single battle');
  let preview: { squads: number; units: number } | null = null;
  if (node?.phase === 'planning') {
    const drawn = await page.evaluate(() => (window.__GAME__ as unknown as { preview(): { enemy: { squads: { building: number; ghost?: true; units: { x: number; y: number }[] }[] } } | null }).preview()?.enemy ?? null);
    const plans = roundFormationOf(node, 'enemy');
    const want = plans.map((q) => ({ building: q.building, units: q.units.map((u) => ({ x: u.x, y: u.y })) }));
    const got = drawn ? drawn.squads.filter((q) => !q.ghost).map((q) => ({ building: q.building, units: q.units.map((u) => ({ x: u.x, y: u.y })) })) : null;
    if (!got) failures.push('preview().enemy is null in planning: the general\'s formation isn\'t drawn');
    else if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`preview().enemy ${JSON.stringify(got)} != Node's formationOf(state, 'enemy') ${JSON.stringify(want)}`);
    preview = { squads: want.length, units: want.reduce((n, q) => n + q.units.length, 0) };
  }
  const dom: Record<string, unknown> = {};
  if (q.get('targeting') === '1' && node) dom.aim = await targetingCheck(page, node, failures);
  const settingsDom = await settingsCheck(page, failures);
  if (settingsDom) dom.settings = settingsDom;
  // 5. the PNG and its JSON
  const dir = join(ROOT, 'artifacts', 'screenshots');
  mkdirSync(dirname(join(dir, args.name)), { recursive: true });
  await page.screenshot({ path: join(dir, `${args.name}.png`) });
  const report = {
    name: args.name, url, browser: args.browser, filter: args.filter ?? null, size: `${args.width}x${args.height}`, clicks: args.clicks,
    scene: sceneOf(q), round: got.round, phase: got.phase, tick: got.tick, browserHash: got.hash, nodeHash, canvas, hud: hud.shown, preview, dom,
    summary: node ? { ...summarizeRound(node), stats: undefined } : null,
    failures,
  };
  writeFileSync(join(dir, `${args.name}.json`), JSON.stringify(report, null, 2));
  console.log(`${failures.length ? 'FAIL' : 'PASS'}  ${args.name}: ${sceneOf(q)} · round ${got.round} ${got.phase} · tick ${got.tick} · hash ${got.hash} (node ${nodeHash})${canvas ? ` · ${canvas.distinct} colours` : ''} · artifacts/screenshots/${args.name}.png`);
  for (const f of failures) console.log(`      - ${f}`);
  return failures.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 2; });
