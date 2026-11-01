// Fun-review measurement (a reference copy, see ../README.md): per-battle records for single battles
// (bot:balanced + commander, power auto, vs the four battle-1 generals on Bogwater, as the engagement
// check plays them) and per-run records (as the runs check plays them), with extra pacing numbers:
// lead changes on the territory front, when the result stops being in doubt, first contact, deaths,
// gold banked, gaps between the bot's commands, the loser's state when its Heartcap is first hit.
// Usage (from the repo root): npx tsx docs/archive/v1/ideas/after-the-rework/scripts/measure/fun.ts --proto <spec> --commander <id> --seeds N --runs N --out file.json
import { writeFileSync } from 'node:fs';
import { protoContent } from '../../../../../../../tools/lib/content.ts';
import { buildState } from '../../../../../../../tools/lib/run.ts';
import { runHeadless } from '../../../../../../../src/sim/index.ts';
import type { BattleState, Side } from '../../../../../../../src/sim/index.ts';
import { simulateRun } from '../../../../../../../src/run/index.ts';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const proto = opt('--proto') ?? '';
const commander = opt('--commander')!;
const nSeeds = Number(opt('--seeds') ?? 30);
const nRuns = Number(opt('--runs') ?? 0);
const out = opt('--out')!;
const content = protoContent(proto);
const MARKS = [30, 60, 90, 120, 150, 180, 240, 300, 420, 600];
const SIDES: Side[] = ['player', 'enemy'];

/** Territory lead from the 1 s front samples: + means the player holds more ground (summed over lanes). */
function leadStats(state: BattleState) {
  const width = state.map.width;
  const lanes = state.frontLine;
  const n = Math.min(...lanes.map((l) => l.length));
  const series: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let lead = 0;
    for (const l of lanes) lead += l[i]![1] + l[i]![2] - (width - 1);
    series.push([l0(lanes)[i]![0], lead]);
  }
  let last = 0, changes = 0, firstLeader: Side | null = null, firstLeadTick = Infinity, lastChangeTick = 0;
  let maxP = 0, maxE = 0;
  for (const [tick, lead] of series) {
    const s = Math.sign(lead);
    if (lead > maxP) maxP = lead;
    if (-lead > maxE) maxE = -lead;
    if (s === 0) continue;
    if (last === 0) { firstLeader = s > 0 ? 'player' : 'enemy'; firstLeadTick = tick; lastChangeTick = tick; }
    else if (s !== last) { changes++; lastChangeTick = tick; }
    last = s;
  }
  return { changes, firstLeader, firstLeadTick, lastChangeTick, maxP, maxE, finalLead: series.length ? series[series.length - 1]![1] : 0 };
}
/** Supply of the units actually on the field (under waves, supplyUsed also counts units waiting in buildings). */
const fieldSupply = (s: BattleState, side: Side) => s.units.reduce((n, u) => (u.side === side && u.hp > 0 ? n + u.supply : n), 0);
const l0 = (lanes: [number, number, number][][]) => lanes[0]!;

function battleRecord(state: BattleState, extra: Record<string, unknown>) {
  const tr = state.rules.tickRate;
  const w = state.outcome?.winner ?? null;
  const ls = leadStats(state);
  const winnerMaxDeficit = w === 'player' ? ls.maxE : w === 'enemy' ? ls.maxP : 0;
  return {
    ...extra,
    winner: w, by: state.outcome?.by ?? null, len: state.tick / tr,
    leadChanges: ls.changes, firstLeader: ls.firstLeader, firstLeadAt: ls.firstLeadTick / tr,
    firstLeaderWon: ls.firstLeader !== null && ls.firstLeader === w,
    lastLeadChangeAt: ls.lastChangeTick / tr, winnerMaxDeficit, maxP: ls.maxP, maxE: ls.maxE, finalLead: ls.finalLead,
  };
}

function single(seed: number, enemy: string) {
  const state = buildState(content, { seed, map: 'bogwater-hollow', player: 'bot:balanced', enemy, commander, powerPolicy: 'auto' });
  const tr = state.rules.tickRate;
  const t = {
    firstFlip: Infinity, firstDeath: Infinity, firstBuildingLost: Infinity,
    firstHit: { player: Infinity, enemy: Infinity } as Record<Side, number>,
    twoThirds: { player: Infinity, enemy: Infinity } as Record<Side, number>,
    third: { player: Infinity, enemy: Infinity } as Record<Side, number>,
    minHpFrac: { player: 1, enemy: 1 } as Record<Side, number>,
    atFirstHit: { player: null, enemy: null } as Record<Side, null | { buildings: number; units: number; supply: number; foeSupply: number; foeUnits: number }>,
    firstBuildingLostBy: { player: Infinity, enemy: Infinity } as Record<Side, number>,
    supply: {} as Record<number, Record<Side, number>>, field: {} as Record<number, Record<Side, number>>, gold: {} as Record<number, number>, units: {} as Record<number, Record<Side, number>>,
    deaths: { player: 0, enemy: 0 } as Record<Side, number>, deathsBy2: 0, flips: 0, flipsBy3: 0,
    breaches: 0, powers: 0, releases: 0, merges: 0, peakSupply: 0,
  };
  runHeadless(state, {
    until: 'end',
    onTick: (s) => {
      const tick = s.tick, secs = tick / tr;
      if (t.firstFlip === Infinity) {
        const w = s.map.width, home = s.map.homeCols;
        if (s.lanes.some((l) => l.pBorder !== home - 1 || l.eBorder !== w - home)) t.firstFlip = tick;
      }
      for (const e of s.events) {
        if (e.t === 'died') { t.deaths[e.side]++; if (t.firstDeath === Infinity) t.firstDeath = tick; if (secs <= 120) t.deathsBy2++; }
        else if (e.t === 'buildingDestroyed') { if (t.firstBuildingLost === Infinity) t.firstBuildingLost = tick; if (t.firstBuildingLostBy[e.side] === Infinity) t.firstBuildingLostBy[e.side] = tick; }
        else if (e.t === 'columnFlipped') { t.flips++; if (secs <= 180) t.flipsBy3++; }
        else if (e.t === 'heartcapBreach') t.breaches++;
        else if (e.t === 'power' && e.side === 'player') t.powers++;
        else if (e.t === 'release') t.releases++;
        else if (e.t === 'merged') t.merges++;
      }
      for (const side of SIDES) {
        const sd = s.sides[side];
        const frac = sd.heartcapHp / sd.heartcapMaxHp;
        if (frac < t.minHpFrac[side]) t.minHpFrac[side] = frac;
        if (sd.heartcapHp < sd.heartcapMaxHp && t.firstHit[side] === Infinity) {
          t.firstHit[side] = tick;
          const foe: Side = side === 'player' ? 'enemy' : 'player';
          t.atFirstHit[side] = {
            buildings: s.buildings.filter((b) => b.side === side && b.hp > 0).length,
            units: s.units.filter((u) => u.side === side && u.hp > 0).length,
            supply: sd.supplyUsed, foeSupply: s.sides[foe].supplyUsed,
            foeUnits: s.units.filter((u) => u.side === foe && u.hp > 0).length,
          };
        }
        if (frac <= 2 / 3 && t.twoThirds[side] === Infinity) t.twoThirds[side] = tick;
        if (frac <= 1 / 3 && t.third[side] === Infinity) t.third[side] = tick;
      }
      const tot = fieldSupply(s, 'player') + fieldSupply(s, 'enemy');
      if (tot > t.peakSupply) t.peakSupply = tot;
      if (tick % tr === 0 && MARKS.includes(secs)) {
        t.supply[secs] = { player: s.sides.player.supplyUsed, enemy: s.sides.enemy.supplyUsed };
        t.units[secs] = { player: s.units.filter((u) => u.side === 'player').length, enemy: s.units.filter((u) => u.side === 'enemy').length };
        t.field[secs] = { player: fieldSupply(s, 'player'), enemy: fieldSupply(s, 'enemy') };
        t.gold[secs] = s.sides.player.gold;
      }
    },
  });
  const w = state.outcome?.winner ?? null;
  const loser: Side | null = w ? (w === 'player' ? 'enemy' : 'player') : null;
  const end = state.tick;
  const cmds = state.log.filter((c) => c.side === 'player' && c.type !== 'begin');
  const byType: Record<string, number> = {};
  for (const c of cmds) byType[c.type] = (byType[c.type] ?? 0) + 1;
  // gaps between the bot's commands after 0:00 (deploy picks at tick 0 count as the start)
  const times = [0, ...cmds.map((c) => c.tick).filter((x) => x > 0), end];
  let maxGap = 0;
  for (let i = 1; i < times.length; i++) maxGap = Math.max(maxGap, times[i]! - times[i - 1]!);
  const firstLive = cmds.find((c) => c.tick > 0)?.tick ?? Infinity;
  const fin = (x: number) => (Number.isFinite(x) ? x / tr : null);
  return battleRecord(state, {
    seed, enemy, commander,
    firstFlip: fin(t.firstFlip), firstDeath: fin(t.firstDeath), firstBuildingLost: fin(t.firstBuildingLost),
    deaths: t.deaths, deathsBy2: t.deathsBy2, flips: t.flips, flipsBy3: t.flipsBy3,
    supply: t.supply, field: t.field, units: t.units, gold: t.gold, peakSupply: t.peakSupply,
    maxGoldBanked: state.stats.player.maxGoldBanked,
    breaches: t.breaches, powers: t.powers, releases: t.releases, merges: t.merges,
    cmds: cmds.length, cmdsAtZero: cmds.filter((c) => c.tick === 0).length, cmdByType: byType, maxCmdGap: maxGap / tr, firstLiveCmd: fin(firstLive),
    loser,
    loserFirstHit: loser ? fin(t.firstHit[loser]) : null,
    loserTwoThirds: loser ? fin(t.twoThirds[loser]) : null,
    loserThird: loser ? fin(t.third[loser]) : null,
    loserFirstBuildingLost: loser ? fin(t.firstBuildingLostBy[loser]) : null,
    loserAtFirstHit: loser ? t.atFirstHit[loser] : null,
    winnerMinHp: w ? t.minHpFrac[w] : null,
    loserMinHp: loser ? t.minHpFrac[loser] : null,
  });
}

const battles = [];
for (const enemy of ['general:scripted', 'general:mother-mold', 'general:lichen-baron', 'general:blightwright']) {
  for (let seed = 1; seed <= nSeeds; seed++) battles.push(single(seed, enemy));
}

const runs = [];
for (let seed = 1; seed <= nRuns; seed++) {
  const recs: ReturnType<typeof battleRecord>[] = [];
  const r = simulateRun(content, seed, { player: 'bot:balanced', draft: 'greedy', route: 'random', power: 'auto' }, {
    commander,
    onBattle: (b) => recs.push(battleRecord(b.state, {
      index: b.record.index, kind: b.record.kind, general: b.record.general, elite: b.record.elite ?? null, map: b.record.map,
      hpBefore: b.record.heartcapBefore, hpAfter: b.record.heartcapAfter, drafted: b.record.drafted.length,
      breaches: 0,
    })),
  });
  runs.push({
    seed, commander, outcome: r.outcome, battleCount: r.battleCount, reachedBoss: r.reachedBoss, minutes: r.totalBattleTicks / content.balance.tickRate / 60,
    hp: r.heartcap, battles: recs,
  });
}
writeFileSync(out, JSON.stringify({ proto, commander, nSeeds, nRuns, battles, runs }));
console.log(`${proto || 'base'} ${commander}: ${battles.length} battles, ${runs.length} runs -> ${out}`);
