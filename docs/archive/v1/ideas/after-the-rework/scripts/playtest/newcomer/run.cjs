// Usage (from the repo root): node docs/archive/v1/ideas/after-the-rework/scripts/playtest/newcomer/run.cjs '<async js body using page, shot(name), state(), sleep(ms), log(...)>'
const { chromium } = require('playwright');
const DIR = require('path').join(__dirname, '../../../../../../reports/after-the-rework/playtest/newcomer');
const body = process.argv[2] || '';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9437');
  const ctx = browser.contexts()[0];
  let page = ctx.pages()[0];
  if (!page) page = await ctx.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log(...a);
  const shot = async (name) => { const p = `${DIR}/${name}.png`; await page.screenshot({ path: p }); log('shot', p); return p; };
  const state = async () => page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) return { noGame: true, url: location.href };
    let s = null;
    try { s = g.summary(); } catch (e) { s = String(e); }
    let r = null;
    try { r = g.run(); } catch (e) { r = String(e); }
    let extra = null;
    try {
      const b = g.battle();
      if (b) {
        const pl = b.sides?.player, en = b.sides?.enemy;
        extra = {
          phase: b.phase, tick: b.tick, t: (b.tick / 20).toFixed(1),
          gold: pl && Math.round(pl.gold), egold: en && Math.round(en.gold),
          units: b.units.length,
          pu: b.units.filter((u) => u.side === 'player').length,
          eu: b.units.filter((u) => u.side === 'enemy').length,
          pb: b.buildings.filter((x) => x.side === 'player').map((x) => x.buildingId).join(','),
          eb: b.buildings.filter((x) => x.side === 'enemy').map((x) => x.buildingId).join(','),
          hp: pl && [Math.round(pl.heartcapHp), Math.round(en.heartcapHp)],
          sup: pl && `${pl.supplyUsed}/${pl.supplyCap}`, esup: en && `${en.supplyUsed}/${en.supplyCap}`,
          lanes: b.lanes.map((l) => `p${l.pBorder}|e${l.eBorder}/${l.owner.length}`).join(' '),
          storm: b.sporestorm, draft: !!(pl && pl.draft), held: b.held,
          stance: pl && pl.stance ? pl.stance.map((x) => x.hold ? 'H' : 'A').join('') : null,
          pTypes: [...new Set(b.units.filter((u) => u.side === 'player').map((u) => u.unitId + (u.tier > 1 ? '*' + u.tier : '')))].join(','),
          eTypes: [...new Set(b.units.filter((u) => u.side === 'enemy').map((u) => u.unitId + (u.tier > 1 ? '*' + u.tier : '')))].join(','),
          outcome: b.outcome || null,
        };
      }
    } catch (e) { extra = String(e); }
    return { scene: g.scene, tick: g.tick, errors: g.errors.slice(-5), run: r, extra };
  });
  const fn = new Function('page', 'shot', 'state', 'sleep', 'log', 'DIR', `return (async () => { ${body} })();`);
  try {
    await fn(page, shot, state, sleep, log, DIR);
  } catch (e) {
    console.error('ERR', e && e.stack || e);
  }
  process.exit(0);
})();
