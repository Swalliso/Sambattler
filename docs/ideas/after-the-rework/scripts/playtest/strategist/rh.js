const log = [];
for (let i = 0; i < 14; i++) {
  const o = await h.adv(6);
  const rh = await page.evaluate(() => { const b = window.__GAME__.battle(); return b.units.filter(u => u.unitId === 'rhizomorph').map(u => ({ side: u.side, x: +u.x.toFixed(1), y: +u.y.toFixed(1), hp: u.hp, tier: u.tier, burrowed: u.burrowed ?? u.burrow ?? u.underground ?? null, keys: Object.keys(u).filter(k => !['id','side','lane','unitId','tier','x','y','px','py','spawnY','hp','maxHp','supply','cooldown','targetId','lastCombatTick','mergeOn','sourceBuildingId'].includes(k)) })); });
  log.push(o.clock + ' ' + JSON.stringify(rh) + ' eb=' + o.bl.filter(x=>x.startsWith('e:')).join(';'));
  if (rh.some(r => r.side === 'player' && r.x > 12)) { await h.shot('sb_rh_' + i); }
  if (o.r !== 'time') break;
}
return log;
