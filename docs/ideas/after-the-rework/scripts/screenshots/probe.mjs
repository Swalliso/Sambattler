import { chromium } from 'playwright';
const [base, ...ticks] = process.argv.slice(2);
const browser = await chromium.launch();
for (const t of ticks) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`https://swalliso.github.io/Sambattler/dev/?${base}&ticks=${t}&paused=1&debug=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME__?.ready, null, { timeout: 30000 }).catch(() => {});
  const r = await page.evaluate(() => { const b = window.__GAME__.battle(); return { tick: b.tick, hp: [b.sides.player.heartcapHp, b.sides.enemy.heartcapHp], storm: b.sporestorm, units: [b.units.filter(u=>u.side==='player').length, b.units.filter(u=>u.side==='enemy').length], supply:[b.sides.player.supplyUsed,b.sides.enemy.supplyUsed], borders: b.lanes.map(l => [l.pBorder, l.eBorder]), bldg:[b.buildings.filter(x=>x.side==='player').length,b.buildings.filter(x=>x.side==='enemy').length], phase: b.phase }; });
  console.log(JSON.stringify(r));
  await page.close();
}
await browser.close();
