const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9437');
  b.contexts().forEach((c, i) => console.log(i, c.pages().map(p => p.url())));
  process.exit(0);
})();
