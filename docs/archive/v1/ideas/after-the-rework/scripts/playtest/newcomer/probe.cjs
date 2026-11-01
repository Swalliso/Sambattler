const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://swalliso.github.io/Sambattler/dev/?proto=rework&debug=1', { timeout: 20000 });
  console.log(await p.title());
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
