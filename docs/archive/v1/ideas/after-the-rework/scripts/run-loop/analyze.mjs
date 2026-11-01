// node docs/archive/v1/ideas/after-the-rework/scripts/run-loop/analyze.mjs <file.json> [...]: summarizes runstats.ts output.
import { readFileSync } from 'node:fs';

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');
const med = (xs) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const clock = (ticks) => { const s = Math.round(ticks / 20); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  const { runs, battles, spoils, nodes } = d;
  const n = runs.length;
  const won = runs.filter((r) => r.outcome === 'victory').length;
  const boss = new Set(battles.filter((b) => b.kind === 'boss').map((b) => b.seed)).size;
  const endedAt = {};
  for (const r of runs) if (r.outcome === 'defeat') endedAt[r.battles] = (endedAt[r.battles] ?? 0) + 1;
  const endBy = {};
  for (const r of runs) if (r.endBy) endBy[r.endBy] = (endBy[r.endBy] ?? 0) + 1;
  const lostAt = {}, playedAt = {};
  for (const b of battles) { playedAt[b.index] = (playedAt[b.index] ?? 0) + 1; if (b.winner !== 'player') lostAt[b.index] = (lostAt[b.index] ?? 0) + 1; }
  const runMins = runs.map((r) => r.ticks / 20 / 60);
  const winMins = runs.filter((r) => r.outcome === 'victory').map((r) => r.ticks / 20 / 60);
  const winBattles = runs.filter((r) => r.outcome === 'victory').map((r) => r.battles);
  console.log(`\n== ${f.split('/').pop()} (proto ${d.proto || 'none'}, ${d.commander}, drafts ${d.draft}, route ${d.route})`);
  console.log(`runs ${n}: won ${won} (${pct(won, n)}), reached boss ${boss} (${pct(boss, n)}), boss fights won ${won}/${boss}`);
  console.log(`  defeats ended in battle: ${JSON.stringify(endedAt)}; how: ${JSON.stringify(endBy)}`);
  console.log(`  battles lost by index: ${Object.keys(playedAt).map((i) => `${i}: ${lostAt[i] ?? 0}/${playedAt[i]}`).join(', ')}`);
  console.log(`  battle minutes per run: mean ${mean(runMins).toFixed(1)}, median ${med(runMins).toFixed(1)}; winners: median ${med(winMins).toFixed(1)} over ${mean(winBattles).toFixed(2)} battles`);
  const rows = battles.length;
  const durs = battles.map((b) => b.ticks);
  const dec = battles.filter((b) => b.by === 'decision').length;
  const decLost = battles.filter((b) => b.by === 'decision' && b.winner !== 'player').length;
  console.log(`  battles ${rows}: median ${clock(med(durs))}, Decisions ${dec} (${pct(dec, rows)}), Decision losses ${decLost}`);
  const hurt = battles.filter((b) => b.hpBefore < b.hpMax).length;
  const wonB = battles.filter((b) => b.winner === 'player');
  const wonScratched = wonB.filter((b) => b.hpAfter < b.hpBefore || (b.by === 'rout' && b.hpAfter < Math.min(b.hpMax, b.hpBefore + 0.1 * b.hpMax))).length;
  console.log(`  battles entered below full Heartcap: ${hurt}/${rows}; won battles where the run Heartcap ended lower than before (+repair): ${wonScratched}/${wonB.length}`);
  const opened = mean(battles.map((b) => b.draftsOpened));
  const picked = mean(battles.map((b) => b.drafted.length));
  console.log(`  in-battle drafts opened per battle ${opened.toFixed(2)}, cards taken ${picked.toFixed(2)}`);
  // offers
  const offers = battles.flatMap((b) => b.offers);
  const cards = offers.flat();
  const kind = (c) => c.split(':')[0];
  const rar = (c) => c.split('|')[1];
  const count = (arr, f2) => arr.reduce((m, x) => { const k = f2(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  console.log(`  in-battle offers ${offers.length}, cards ${cards.length}: by type ${JSON.stringify(count(cards, kind))}, by rarity ${JSON.stringify(count(cards, rar))}`);
  console.log(`    offers with a relic ${pct(offers.filter((o) => o.some((c) => kind(c) === 'relic')).length, offers.length)}, with a rare relic ${pct(offers.filter((o) => o.some((c) => kind(c) === 'relic' && rar(c) === 'rare')).length, offers.length)}, all upgrades ${pct(offers.filter((o) => o.every((c) => kind(c) === 'up')).length, offers.length)}`);
  const taken = battles.flatMap((b) => b.drafted);
  console.log(`    taken by type ${JSON.stringify(count(taken, (c) => c.split(':')[0]))}`);
  // spoils
  const sp = spoils.filter((s) => s.label === 'Spoils'), el = spoils.filter((s) => s.label !== 'Spoils');
  console.log(`  spoils picks ${sp.length} (${(sp.length / n).toFixed(2)} a run), elite relic picks ${el.length}; spoils taken by type ${JSON.stringify(count(sp.map((s) => s.picked), (c) => c.split(':')[0]))}`);
  // end-of-run loadout
  const atEnd = runs.map((r) => ({ kit: r.kit.length, relics: r.relics.length, ups: Object.values(r.upgrades).reduce((a, b) => a + b, 0) }));
  const bossRuns = runs.filter((r) => battles.some((b) => b.seed === r.seed && b.kind === 'boss'));
  const bossLoad = bossRuns.map((r) => { const b = battles.find((x) => x.seed === r.seed && x.kind === 'boss'); return b; });
  console.log(`  at the boss: kit ${mean(bossLoad.map((b) => b.kitSize)).toFixed(1)}, relics ${mean(bossLoad.map((b) => b.relics)).toFixed(1)}, upgrade levels ${mean(bossLoad.map((b) => b.upgradeLevels)).toFixed(1)}; at run end (all): kit ${mean(atEnd.map((x) => x.kit)).toFixed(1)}, relics ${mean(atEnd.map((x) => x.relics)).toFixed(1)}, ups ${mean(atEnd.map((x) => x.ups)).toFixed(1)}`);
  const relicFreq = count(runs.flatMap((r) => r.relics), (x) => x);
  console.log(`  relics owned at run end (runs of ${n}): ${Object.entries(relicFreq).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const kitFreq = count(runs.flatMap((r) => r.kit), (x) => x);
  console.log(`  kit at run end: ${Object.entries(kitFreq).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  // nodes
  const groves = nodes.filter((x) => x.kind === 'grove-choice');
  const evs = nodes.filter((x) => x.kind === 'event-choice');
  const routeKinds = count(nodes.filter((x) => ['battle', 'elite', 'event', 'grove', 'boss'].includes(x.kind)), (x) => `r${x.row + 1}:${x.kind}`);
  console.log(`  route picks: ${JSON.stringify(routeKinds)}`);
  console.log(`  grove: ${JSON.stringify(count(groves, (x) => x.detail))}; events: ${JSON.stringify(count(evs, (x) => x.detail))}`);
  // general / elite loss rates
  const byGen = {};
  for (const b of battles) { const k = `${b.index}:${b.general}${b.elite ? '+' + b.elite : ''}`; byGen[k] ??= [0, 0]; byGen[k][0]++; if (b.winner !== 'player') byGen[k][1]++; }
  const g2 = {};
  for (const b of battles) { const k = b.general; g2[k] ??= [0, 0]; g2[k][0]++; if (b.winner !== 'player') g2[k][1]++; }
  console.log(`  losses by general: ${Object.entries(g2).map(([k, [p, l]]) => `${k} ${l}/${p}`).join(', ')}`);
  const el2 = {};
  for (const b of battles.filter((x) => x.kind !== 'boss')) { const k = b.kind; el2[k] ??= [0, 0]; el2[k][0]++; if (b.winner !== 'player') el2[k][1]++; }
  console.log(`  losses by node kind: ${Object.entries(el2).map(([k, [p, l]]) => `${k} ${l}/${p}`).join(', ')}`);
  const b1 = battles.filter((b) => b.index === 1);
  const g1 = {};
  for (const b of b1) { g1[b.general] ??= [0, 0]; g1[b.general][0]++; if (b.winner !== 'player') g1[b.general][1]++; }
  console.log(`  battle 1 by general: ${Object.entries(g1).map(([k, [p, l]]) => `${k} ${l}/${p}`).join(', ')}`);
}
