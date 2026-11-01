const r = await h.advance(6);
const u = await page.evaluate(() => { const b = window.__GAME__.battle(); return { st: b.sides.player.stance, u: b.units.map(u => u.side[0] + ':' + u.unitId + u.tier + '@L' + u.lane + ' x' + u.x.toFixed(1) + ' hp' + u.hp) }; });
const label = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /Keeping|Hold|Advanc/.test(e.textContent)).map(e => e.textContent + ' | title=' + (e.getAttribute('title') || (e.parentElement && e.parentElement.getAttribute('title')) || '')));
return { r, u, label };
