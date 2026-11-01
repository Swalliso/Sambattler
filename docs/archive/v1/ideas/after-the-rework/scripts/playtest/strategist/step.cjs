// usage (from the repo root): node docs/archive/v1/ideas/after-the-rework/scripts/playtest/strategist/step.cjs <actions.js or inline code> [shotname]
// The code runs as an async function body with (page, h) in scope; h has helpers.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '../../../../../../reports/after-the-rework/playtest/strategist');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9477');
  const ctx = browser.contexts()[0];
  let page = ctx.pages()[0];
  if (!page) page = await ctx.newPage();
  const arg = process.argv[2] || '';
  const code = fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg;
  const h = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    shot: async (name) => { const p = path.join(D, 'shots', name + '.png'); await page.screenshot({ path: p }); console.log('SHOT', p); return p; },
    state: () => page.evaluate(() => {
      const g = window.__GAME__; if (!g) return null;
      const b = g.battle();
      const out = { scene: g.scene, tick: g.tick, run: g.run() };
      if (b) {
        const s = b;
        out.phase = s.phase; out.held = s.held; out.clock = (s.tick/20/60|0)+':'+String(((s.tick/20)%60)|0).padStart(2,'0');
        out.gold = { p: s.sides.player.gold, e: s.sides.enemy.gold };
        out.supply = { p: s.sides.player.supplyUsed+'/'+s.sides.player.supplyCap, e: s.sides.enemy.supplyUsed+'/'+s.sides.enemy.supplyCap };
        out.heart = { p: s.sides.player.heartcapHp+'/'+s.sides.player.heartcapMaxHp, e: s.sides.enemy.heartcapHp+'/'+s.sides.enemy.heartcapMaxHp };
        out.storm = s.sporestorm;
        out.power = s.sides.player.powerCooldown;
        out.lanes = s.lanes.map((l) => ({ rows: l.rowStart+'-'+l.rowEnd, pB: l.pBorder, eB: l.eBorder, own: l.owner.map(o=>o===1?'P':o===2?'E':'.').join('') }));
        const cnt = (side) => { const m = {}; for (const u of s.units) if (u.side===side) { const k = u.unitId + (u.tier>1?('*'+u.tier):''); m[k]=(m[k]||0)+1; } return m; };
        out.units = { p: cnt('player'), e: cnt('enemy') };
        const bl = (side) => s.buildings.filter(x=>x.side===side).map(x=>x.buildingId+'@L'+x.lane+'c'+x.col+'r'+x.row+(x.hp<x.maxHp?('('+x.hp+')'):''));
        out.buildings = { p: bl('player'), e: bl('enemy') };
        out.kit = s.sides.player.kit; out.ekit = s.sides.enemy.kit;
        out.draft = s.sides.player.draft || null;
        out.outcome = s.outcome || null;
        out.ai = s.sides.enemy.ai ? { doctrine: s.sides.enemy.ai.doctrine, pending: s.sides.enemy.ai.pendingCounter || s.sides.enemy.ai.counter || null } : null;
      }
      return out;
    }),

    tile: async (x, y) => page.evaluate(([x, y]) => {
      const c = document.getElementById('battlefield'); const r = c.getBoundingClientRect();
      const k = r.width / c.width; return { cx: r.left + (x + 2) * 16 * k, cy: r.top + y * 16 * k };
    }, [x, y]),
    paused: () => page.evaluate(() => /\bPaused\b/.test(document.body.innerText)),
    callouts: () => page.evaluate(() => { const el = document.querySelector('.callouts, [class*=callout]'); return el ? el.innerText : ''; }),
    intent: () => page.evaluate(() => { const el = [...document.querySelectorAll('*')].find(e => /GENERAL'S INTENT/i.test(e.innerText||'') && e.children.length < 8 && (e.innerText||'').length < 300); return el ? el.innerText : ''; }),
  };
  h.place = async (name, col, row) => {
    const names = await page.evaluate(() => [...document.querySelectorAll('.card')].filter(e => e.getBoundingClientRect().y > 600 && e.getBoundingClientRect().width > 0).map(e => e.innerText));
    const idx = names.findIndex(t => t.includes(name));
    if (idx < 0) { console.log('NO CARD', name, names); return false; }
    if (idx < 9) await page.keyboard.press(String(idx + 1));
    else { const cards = page.locator('.card').filter({ hasText: name }); const n = await cards.count(); for (let i = 0; i < n; i++) { const bb = await cards.nth(i).boundingBox(); if (bb && bb.y > 600) { await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); break; } } }
    await h.sleep(120);
    const { cx, cy } = await h.tile(col + 0.5, row + 0.5);
    await page.mouse.move(cx, cy); await h.sleep(150);
    await page.mouse.click(cx, cy); await h.sleep(150);
    await page.keyboard.press('Escape').catch(() => {});
    return true;
  };
  h.power = async (x, y) => { await page.keyboard.press('q'); await h.sleep(150); if (x !== undefined) { const { cx, cy } = await h.tile(x, y); await page.mouse.move(cx, cy); await h.sleep(100); await page.mouse.click(cx, cy); } await h.sleep(150); };
  h.advance = async (sec, maxReal = 100000) => {
    const t0 = await page.evaluate(() => window.__GAME__.tick);
    const unpause = async () => { await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.keyboard.press('Space'); };
    if (await h.paused()) await unpause();
    const start = Date.now();
    let reason = 'time', lastT = t0, lastMove = Date.now();
    while (Date.now() - start < maxReal) {
      await h.sleep(150);
      const st = await page.evaluate(() => { const b = window.__GAME__.battle(); return b ? { t: b.tick, held: b.held, phase: b.phase, draft: !!b.sides.player.draft } : { t: -1, phase: 'none' }; });
      if (st.phase !== 'live') { reason = 'phase:' + st.phase; break; }
      if (st.held || st.draft) { reason = 'draft'; break; }
      if (st.t >= t0 + sec * 20) break;
      if (st.t !== lastT) { lastT = st.t; lastMove = Date.now(); }
      else if (Date.now() - lastMove > 1500) { if (await h.paused()) await unpause(); lastMove = Date.now(); }
    }
    if (!(await h.paused())) { const st = await page.evaluate(() => { const b = window.__GAME__.battle(); return b && b.phase === 'live' && !b.held; }); if (st) await page.keyboard.press('Space'); }
    return reason;
  };
  h.brief = async () => { const s = await h.state(); if (!s || !s.phase) return s; return { clock: s.clock, gold: s.gold, supply: s.supply, heart: s.heart, storm: s.storm, power: s.power, lanes: s.lanes.map(l => l.pB + '|' + l.own + '|' + l.eB), units: s.units, bp: s.buildings.p, be: s.buildings.e, draft: s.draft, outcome: s.outcome }; };
  h.units = async () => page.evaluate(() => { const b = window.__GAME__.battle(); if (!b) return null; return { clock: (b.tick/20/60|0)+':'+String(((b.tick/20)%60)|0).padStart(2,'0'), phase: b.phase, gold: b.sides.player.gold, egold: b.sides.enemy.gold, sup: b.sides.player.supplyUsed+'/'+b.sides.player.supplyCap, esup: b.sides.enemy.supplyUsed+'/'+b.sides.enemy.supplyCap, heart: b.sides.player.heartcapHp+' vs '+b.sides.enemy.heartcapHp, storm: b.sporestorm, power: b.sides.player.powerCooldown, lanes: b.lanes.map(l => l.pBorder + '|' + l.owner.map(o=>o===1?'P':o===2?'E':'.').join('') + '|' + l.eBorder), st: b.sides.player.stance.map(s=>s.hold), u: b.units.map(u => u.side[0] + ':' + u.unitId + u.tier + '@L' + u.lane + ' x' + u.x.toFixed(1) + ',' + u.y.toFixed(1) + ' hp' + u.hp + (u.shield ? ' sh' + u.shield : '')), bl: b.buildings.map(x => x.side[0] + ':' + x.buildingId + '@L' + x.lane + 'c' + x.col + 'r' + x.row + ' hp' + x.hp + (x.stored ? ' st' + x.stored : '')), draft: b.sides.player.draft || null, outcome: b.outcome || null }; });
  h.adv = async (sec) => { const r = await h.advance(sec); const o = await h.units(); if (o) o.r = r; return o; };
  try {
    const fn = new Function('page', 'h', 'require', 'process', `return (async () => { ${code} })();`);
    const r = await fn(page, h, require, process);
    if (r !== undefined) console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
  } catch (e) { console.error('ERR', e.message); }
  if (process.argv[3]) await h.shot(process.argv[3]);
  await browser.close().catch(()=>{}); // for CDP-connected browsers, close() just disconnects
  process.exit(0);
})();
