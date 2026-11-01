// node docs/archive/v1/ideas/after-the-rework/scripts/playtest/newcomer/play.cjs <seconds> <shotname> : unpause, play, pause, screenshot, print state + callouts
const { chromium } = require('playwright');
(async () => {
  const secs = Number(process.argv[2] || 5); const name = process.argv[3] || 'tmp';
  const b = await chromium.connectOverCDP('http://127.0.0.1:9437');
  const page = b.contexts()[0].pages()[0];
  const callouts = new Set();
  await page.keyboard.press('Space');
  const end = Date.now() + secs * 1000;
  while (Date.now() < end) {
    const c = await page.evaluate(() => [...document.querySelectorAll('[class*=callout], [class*=toast], [class*=banner], [role=status]')].map(e => e.innerText.trim()).filter(Boolean));
    c.forEach((x) => callouts.add(x.replace(/\s+/g, ' ')));
    const draft = await page.evaluate(() => !!window.__GAME__.battle()?.sides.player.draft);
    if (draft) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  const ph = await page.evaluate(() => window.__GAME__.battle()?.phase);
  const draftOpen = await page.evaluate(() => !!window.__GAME__.battle()?.sides.player.draft);
  if (ph === 'live' && !draftOpen) await page.keyboard.press('Space');
  await new Promise((r) => setTimeout(r, 150));
  await page.screenshot({ path: `${__dirname}/../../../../../../reports/after-the-rework/playtest/newcomer/${name}.png` });
  const st = await page.evaluate(() => {
    const b = window.__GAME__.battle(); if (!b) return { scene: window.__GAME__.scene };
    const pl = b.sides.player, en = b.sides.enemy;
    const cnt = (side) => { const m = {}; b.units.filter((u) => u.side === side).forEach((u) => { const k = u.unitId + (u.tier > 1 ? '*' + u.tier : '') + (u.flying ? '(f)' : ''); m[k] = (m[k] || 0) + 1; }); return m; };
    return {
      t: (b.tick / 20).toFixed(1), phase: b.phase, gold: Math.round(pl.gold), egold: Math.round(en.gold),
      hp: [Math.round(pl.heartcapHp), Math.round(en.heartcapHp)], sup: `${pl.supplyUsed}/${pl.supplyCap}`, esup: `${en.supplyUsed}/${en.supplyCap}`,
      lanes: b.lanes.map((l) => `p${l.pBorder}|e${l.eBorder}/${l.owner.length}`).join(' '), storm: b.sporestorm,
      draft: pl.draft ? pl.draft : null, power: pl.powerCooldown,
      pb: b.buildings.filter((x) => x.side === 'player').map((x) => `${x.buildingId}@${x.col},${x.row}:${Math.round(x.hp)}`).join(' '),
      eb: b.buildings.filter((x) => x.side === 'enemy').map((x) => `${x.buildingId}@${x.col},${x.row}`).join(' '),
      pu: cnt('player'), eu: cnt('enemy'), clouds: (b.clouds || []).length, outcome: b.outcome || null,
      stance: pl.stance ? pl.stance.map((s) => s.hold ? 'H' : 'A').join('') : null,
      intent: document.querySelector('[class*=intent]')?.innerText.replace(/\s+/g, ' ').slice(0, 200),
    };
  });
  console.log(JSON.stringify(st));
  console.log('callouts:', JSON.stringify([...callouts]));
  process.exit(0);
})();
