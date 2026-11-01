const out = [];
for (const seed of [778, 779, 780, 781, 782, 783]) {
  await page.goto(`https://swalliso.github.io/Sambattler/dev/?proto=rework&debug=1&scene=route&seed=${seed}&autoplay=battles:1`, { waitUntil: 'domcontentloaded' });
  let r = null;
  for (let i = 0; i < 60; i++) { await h.sleep(500); r = await page.evaluate(() => window.__GAME__ && window.__GAME__.run()); if (r && r.battles.length >= 1) break; }
  out.push({ seed, commander: r && r.commander, screen: r && r.screen, heart: r && r.heartcap, b: r && r.battles.map(b => b.map + ' ' + b.winner + ' by ' + b.by) });
}
return out;
