// npm run og-image: renders the link preview (Open Graph / Twitter card) image, public/og-image.png at
// 1200×630, from the title screen with its menu hidden, so the card always matches the game's own art.
// Vite copies public/ to the site root, and vite.config.ts points the meta tags at it.
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { ROOT } from './lib/content.ts';

async function main(): Promise<void> {
  const server = await createServer({ root: ROOT, server: { host: '127.0.0.1', port: 0, watch: null, hmr: false } });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not open a TCP port');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${address.port}/?scene=title&test=1`);
    await page.waitForFunction(() => window.__GAME__?.ready === true, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.addStyleTag({ content: '.title-menu, .title-foot, .dev-badge { display: none !important; } .title-blurb { margin-bottom: 0; }' });
    await page.waitForTimeout(300);
    const out = join(ROOT, 'public', 'og-image.png');
    await page.screenshot({ path: out });
    console.log(`wrote ${out}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
