const { chromium } = require('playwright');
(async () => {
  const ctx = await chromium.launchPersistentContext(__dirname + '/../../../../../../reports/after-the-rework/playtest/strategist/profile2', {
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: ['--remote-debugging-port=9477'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  console.log('READY');
  await new Promise(() => {});
})();
