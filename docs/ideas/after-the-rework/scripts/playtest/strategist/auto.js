// env: PLAN = JSON [[name,col,row,cost],...], UNTIL = seconds of clock, STEP = seconds per step
const plan = JSON.parse(process.env.PLAN || '[]');
const until = Number(process.env.UNTIL || 60);
const step = Number(process.env.STEP || 10);
const log = [];
let o = await h.units();
const toSec = (c) => { const [m, s] = c.split(':').map(Number); return m * 60 + s; };
while (o && o.phase === 'live' && toSec(o.clock) < until) {
  // buy what the plan says, in order, while affordable
  while (plan.length && o.gold >= plan[0][3] + 1) {
    const [name, col, row] = plan.shift();
    await h.place(name, col, row);
    o = await h.adv(0.3);
    log.push(o.clock + ' BUY ' + name + ' @' + col + ',' + row + ' gold->' + o.gold);
  }
  o = await h.adv(Math.min(step, until - toSec(o.clock)));
  const pu = o.u.filter(x => x.startsWith('p:')).length, eu = o.u.filter(x => x.startsWith('e:')).length;
  const pb = o.bl.filter(x => x.startsWith('p:')).length, eb = o.bl.filter(x => x.startsWith('e:')).length;
  const big = o.u.filter(x => /[23]@/.test(x)).map(x => x.split(' ')[0]).join(',');
  log.push(`${o.clock} g${o.gold}/${o.egold} sup ${o.sup}/${o.esup} H ${o.heart} storm${o.storm} pw${o.power} ${o.lanes.join(' ')} units ${pu}v${eu} blds ${pb}v${eb} big[${big}] ${o.r}`);
  if (o.r !== 'time') break;
}
return { log, left: plan, last: o };
