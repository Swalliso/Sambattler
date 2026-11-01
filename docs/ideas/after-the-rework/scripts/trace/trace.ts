// Battle-flow trace for the fun review (read-only on the worktree): bot:balanced against each
// battle-1 general on a map, M5 rules against `rework`. Samples per 10 s window and per beat phase.
import { protoContent } from '../../../../../tools/lib/content.ts';
import { buildState } from '../../../../../tools/lib/run.ts';
import { runHeadless } from '../../../../../src/sim/index.ts';
import type { BattleState } from '../../../../../src/sim/index.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d; };
const proto = opt('--proto', '');
const map = opt('--map', 'bogwater-hollow');
const seeds = Number(opt('--seeds', '20'));
const enemies = opt('--enemies', 'general:scripted,general:mother-mold,general:lichen-baron,general:blightwright').split(',');
const player = opt('--player', 'bot:balanced');
const commander = opt('--commander', '');
const content = protoContent(proto);
const BEAT = 20; // seconds; phase bins for both rule sets so the baseline shows a flat profile
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : NaN; };
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;

for (const enemy of enemies) {
  const phase = new Array(BEAT).fill(0);
  const firstContact: number[] = [];
  const quietShare: number[] = []; // after first contact, share of seconds with no unit damage at all
  const longestLull: number[] = [];
  const supply60: number[] = [], supply120: number[] = [], supply180: number[] = [], supply300: number[] = [];
  const counts: Record<string, number[]> = {};
  const add = (k: string, v: number) => (counts[k] ??= []).push(v);
  const builtByEnemy: Record<string, number> = {};
  const builtByPlayer: Record<string, number> = {};
  let decisions = 0, pWins = 0;
  const lengths: number[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const state = buildState(content, { seed, map, player, enemy, ...(commander ? { commander, powerPolicy: 'auto' as const } : {}) });
    const tr = state.rules.tickRate;
    let fc = Infinity;
    const perSec = new Map<number, number>();
    let bursts = 0, shieldedReleasesP = 0, releasesP = 0, shieldedReleasesE = 0, releasesE = 0, surfacedP = 0, surfacedE = 0;
    let unitsReleasedP = 0, unitsReleasedE = 0, waveCapped = 0, merges = 0;
    const burrowedSeen = new Set<number>();
    let flyersP = 0, flyersE = 0;
    runHeadless(state, {
      until: 'end',
      onTick: (s: BattleState) => {
        const sec = Math.floor(s.tick / tr);
        for (const e of s.events) {
          if (e.t === 'hit') {
            // only unit-vs-unit and tower/turret-vs-unit damage counts as "fighting"; skip building and Heartcap hits
            const isUnit = s.units.some((u) => u.id === e.target) || e.target > 0 && !s.buildings.some((b) => b.id === e.target);
            if (isUnit && e.target > 0) {
              perSec.set(sec, (perSec.get(sec) ?? 0) + e.amount);
              if (fc === Infinity) fc = s.tick / tr;
              phase[sec % BEAT] += e.amount;
            }
          } else if (e.t === 'burst') bursts++;
          else if (e.t === 'release') {
            if (e.side === 'player') { if (e.units > 0) releasesP++; unitsReleasedP += e.units; if (e.shielded.length) shieldedReleasesP++; }
            else { if (e.units > 0) releasesE++; unitsReleasedE += e.units; if (e.shielded.length) shieldedReleasesE++; }
          } else if (e.t === 'waveCapped') waveCapped += e.units;
          else if (e.t === 'merged') merges++;
          else if (e.t === 'buildingPlaced') {
            const b = s.buildings.find((x) => x.id === e.id);
            if (b) { const tgt = b.side === 'enemy' ? builtByEnemy : builtByPlayer; tgt[b.buildingId] = (tgt[b.buildingId] ?? 0) + 1; }
          } else if (e.t === 'spawned') {
            const u = s.units.find((x) => x.id === e.id);
            if (u?.flying) { if (u.side === 'player') flyersP++; else flyersE++; }
            if (u?.burrowed) burrowedSeen.add(u.id);
          }
        }
        for (const u of s.units) if (burrowedSeen.has(u.id) && !u.burrowed) { burrowedSeen.delete(u.id); if (u.side === 'player') surfacedP++; else surfacedE++; }
        const t = s.tick / tr;
        const sup = () => s.sides.player.supplyUsed + s.sides.enemy.supplyUsed;
        if (t === 60) supply60.push(sup()); if (t === 120) supply120.push(sup()); if (t === 180) supply180.push(sup()); if (t === 300) supply300.push(sup());
      },
    });
    const end = Math.floor(state.tick / tr);
    lengths.push(end);
    if (state.outcome?.by === 'decision') decisions++;
    if (state.outcome?.winner === 'player') pWins++;
    firstContact.push(fc);
    if (Number.isFinite(fc)) {
      let quiet = 0, lull = 0, best = 0;
      for (let t = Math.ceil(fc); t < end; t++) {
        if (!perSec.get(t)) { quiet++; lull++; best = Math.max(best, lull); } else lull = 0;
      }
      quietShare.push(quiet / Math.max(1, end - Math.ceil(fc)));
      longestLull.push(best);
    }
    add('bursts', bursts); add('releasesP', releasesP); add('shieldedP', shieldedReleasesP); add('releasesE', releasesE); add('shieldedE', shieldedReleasesE);
    add('unitsPerReleaseP', releasesP ? unitsReleasedP / releasesP : 0); add('unitsPerReleaseE', releasesE ? unitsReleasedE / releasesE : 0);
    add('surfacedP', surfacedP); add('surfacedE', surfacedE); add('flyersP', flyersP); add('flyersE', flyersE); add('waveCapped', waveCapped); add('merges', merges);
  }
  const tot = phase.reduce((a, b) => a + b, 0);
  const prof = phase.map((v) => (BEAT * v) / Math.max(1, tot));
  const peak = Math.max(...prof), low = Math.min(...prof);
  // share of damage in the 6 busiest consecutive seconds of the beat (30% of the cycle)
  let best6 = 0;
  for (let i = 0; i < BEAT; i++) { let s6 = 0; for (let k = 0; k < 6; k++) s6 += phase[(i + k) % BEAT]; best6 = Math.max(best6, s6); }
  console.log(`\n== ${proto || 'M5'} | ${player}${commander ? ` (${commander})` : ''} vs ${enemy} | ${map} | ${seeds} seeds`);
  console.log(`player wins ${pWins}/${seeds}, decisions ${decisions}, median length ${med(lengths)} s`);
  console.log(`first unit contact median ${med(firstContact).toFixed(0)} s; after contact, quiet seconds ${(100 * mean(quietShare)).toFixed(0)}%, longest lull median ${med(longestLull)} s`);
  console.log(`supply on field (both) median: 1:00 ${med(supply60)}, 2:00 ${med(supply120)}, 3:00 ${med(supply180)}, 5:00 ${med(supply300)}`);
  console.log(`unit damage by second of the 20 s cycle (1.0 = flat): ${prof.map((v) => v.toFixed(2)).join(' ')}`);
  console.log(`  peak ${peak.toFixed(2)}, trough ${low.toFixed(2)}, busiest 6 s hold ${(100 * best6 / Math.max(1, tot)).toFixed(0)}% of damage (30% if flat)`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: mean ${mean(v).toFixed(1)}`);
  console.log(`  enemy built: ${JSON.stringify(builtByEnemy)}`);
  console.log(`  player built: ${JSON.stringify(builtByPlayer)}`);
}
