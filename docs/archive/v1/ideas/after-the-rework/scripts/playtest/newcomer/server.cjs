const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--remote-debugging-port=9437', '--window-size=1440,900', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.newPage();
  console.log('ready');
  setInterval(() => {}, 1 << 30);
})();
