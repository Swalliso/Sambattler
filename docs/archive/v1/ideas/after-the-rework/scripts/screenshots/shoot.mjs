// Screenshots of the live dev site for the battle-feel review. Usage (from the repo root):
// node docs/archive/v1/ideas/after-the-rework/scripts/screenshots/shoot.mjs <outdir> <json-list>
// Each job: { name, params, waitMs, crops: [[x,y,w,h,scale], ...], clicks?: [selector], keys?: [key], w?, h? }
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const [outDir, jobsFile] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const jobs = JSON.parse(readFileSync(jobsFile, 'utf8'));
const browser = await chromium.launch();
for (const job of jobs) {
  const page = await browser.newPage({ viewport: { width: job.w ?? 1280, height: job.h ?? 720 }, deviceScaleFactor: 1 });
  await page.goto(`https://swalliso.github.io/Sambattler/dev/?${job.params}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#battlefield', { timeout: 30000 }).catch(() => {});
  for (const k of job.keys ?? []) { await page.keyboard.press(k); await page.waitForTimeout(150); }
  for (const c of job.clicks ?? []) { await page.click(c).catch((e) => console.error('click', c, e.message)); await page.waitForTimeout(200); }
  await page.waitForTimeout(job.waitMs ?? 800);
  if (job.hover) { await page.hover(job.hover).catch((e) => console.error('hover', e.message)); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${outDir}/${job.name}.png` });
  let i = 0;
  for (const [x, y, w, h, s] of job.crops ?? []) {
    const url = await page.evaluate(([x, y, w, h, s]) => {
      const src = document.getElementById('battlefield');
      const o = document.createElement('canvas');
      o.width = w * s; o.height = h * s;
      const g = o.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(src, x, y, w, h, 0, 0, w * s, h * s);
      return o.toDataURL('image/png');
    }, [x, y, w, h, s]);
    writeFileSync(`${outDir}/${job.name}-crop${i++}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  if (job.text) {
    const t = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent?.trim()).join(' | '), job.text);
    console.log(job.name, 'TEXT:', t);
  }
  await page.close();
}
await browser.close();
console.log('done');
