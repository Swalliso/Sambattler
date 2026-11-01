// Scratch script (a reference copy, see ../README.md): run-level stats for the run-loop review. Usage:
//   npx tsx docs/archive/v1/ideas/after-the-rework/scripts/run-loop/runstats.ts <proto|-> <commander> <seeds> <draftPolicy> <out.json> [route]
// Plays whole runs like `npm run experiment -- --checks runs` (bot:balanced, power auto), but steps
// battles by hand so every in-battle offer and spoils offer is recorded.
import { writeFileSync } from 'node:fs';
import { protoContent } from '../../../../../../../tools/lib/content.ts';
import {
  autoContext, autoDecide, createRun, finishBattle,
} from '../../../../../../../src/run/index.ts';
import { createBattle, queueCommand, step, parseCard } from '../../../../../../../src/sim/index.ts';
import type { DraftCard } from '../../../../../../../src/sim/index.ts';

const [protoArg, commander, seedsArg, draftArg, outPath, routeArg, lossHpArg] = process.argv.slice(2);
/** Scratch 'lives' model: a non-boss rout loss costs this fraction of max HP instead of the run (0 = today's rule). */
const lossHp = Number(lossHpArg ?? 0);
const proto = protoArg === '-' ? '' : protoArg!;
const content = protoContent(proto);
const seeds = Number(seedsArg);
const draft = (draftArg ?? 'greedy') as 'greedy' | 'random' | 'first';
const route = (routeArg ?? 'random') as 'random' | 'first' | 'battles';
const policies = { route, draft, player: 'bot:balanced', power: 'auto' as const };

interface BattleRow {
  seed: number; index: number; kind: string; map: string; general: string; elite?: string;
  winner: string; by: string; ticks: number; hpBefore: number; hpAfter: number; hpMax: number;
  draftsOpened: number; drafted: string[]; offers: string[][]; startingGold: number;
  maxGoldBanked: number; buildingsBuilt: number; buildingsSold: number; powerUses: number;
  kitSize: number; relics: number; upgradeLevels: number;
}
const battles: BattleRow[] = [];
const spoils: { seed: number; label: string; offer: string[]; picked: string }[] = [];
const nodes: { seed: number; row: number; kind: string; detail?: string }[] = [];
const runs: { seed: number; outcome: string; battles: number; ticks: number; hp: number; max: number; endBy?: string; kit: string[]; relics: string[]; upgrades: Record<string, number> }[] = [];

for (let seed = 1; seed <= seeds; seed++) {
  const run = createRun(content, { seed, player: policies.player, autoDraft: draft, commander, powerPolicy: 'auto' });
  const ctx = autoContext(content, seed, policies, run.commander);
  for (let guard = 0; !run.outcome && guard < 200; guard++) {
    const s = run.screen;
    if (s.kind === 'battle') {
      const hpBefore = run.heartcap.hp;
      const state = createBattle(content, s.config);
      queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
      const offers: string[][] = [];
      let lastIndex = 0;
      let g = 0;
      while (state.phase !== 'ended' && g < 100000) {
        step(state);
        g++;
        const d = state.sides.player.draft;
        if (d && d.index !== lastIndex) { lastIndex = d.index; offers.push(d.offer.map((c: DraftCard) => `${c.id}|${c.rarity}`)); }
      }
      const ps = state.sides.player;
      const st = state.stats.player;
      const row = run.path.length - 1;
      const node = run.route[row]![run.path[row]!]!;
      if (lossHp > 0 && state.outcome && state.outcome.winner !== 'player' && state.outcome.by === 'rout' && node.kind !== 'boss') {
        // emulate: the loss costs lossHp of max HP (finishBattle then takes the Decision loss's 25%)
        state.outcome = { ...state.outcome, by: 'decision' };
        ps.heartcapHp = Math.max(0, Math.round(hpBefore - (lossHp - content.balance.decisionLossDamage) * run.heartcap.max));
      }
      const rec = finishBattle(content, run, state);
      battles.push({
        seed, index: rec.index, kind: rec.kind, map: rec.map, general: rec.general, ...(rec.elite ? { elite: rec.elite } : {}),
        winner: rec.winner, by: rec.by, ticks: rec.durationTicks, hpBefore, hpAfter: rec.heartcapAfter, hpMax: run.heartcap.max,
        draftsOpened: ps.draftsOpened, drafted: [...st.drafted], offers, startingGold: s.config.player.startingGold,
        maxGoldBanked: st.maxGoldBanked, buildingsBuilt: st.buildingsBuilt, buildingsSold: st.buildingsSold, powerUses: st.powerUses ?? 0,
        kitSize: ps.kit.length, relics: ps.relics.length, upgradeLevels: Object.values(ps.upgrades).reduce((a, b) => a + b, 0),
      });
      void node;
    } else if (s.kind === 'summary') {
      break;
    } else {
      if (s.kind === 'route') {
        const row = run.path.length;
        const before = run.path.length;
        autoDecide(ctx, run);
        const n = run.route[row]![run.path[before]!]!;
        nodes.push({ seed, row, kind: n.kind, ...(n.event ? { detail: n.event } : n.elite ? { detail: n.elite } : {}) });
        continue;
      }
      if (s.kind === 'spoils') {
        const p = s.picks[0]!;
        const offer = p.offer.map((c) => `${c.id}|${c.rarity}`);
        const cardsBefore = run.cards.length;
        autoDecide(ctx, run);
        spoils.push({ seed, label: p.label, offer, picked: run.cards[cardsBefore]?.card ?? 'skip' });
        continue;
      }
      if (s.kind === 'grove') {
        const hp = run.heartcap.hp;
        autoDecide(ctx, run);
        nodes.push({ seed, row: run.path.length - 1, kind: 'grove-choice', detail: run.heartcap.hp > hp ? 'repair' : 'graft' });
        continue;
      }
      if (s.kind === 'event') {
        const ev = s.event;
        const cards = run.cards.length, relics = run.relics.length, hp = run.heartcap.hp, max = run.heartcap.max, amber = run.amber, ng = run.next.startingGold;
        autoDecide(ctx, run);
        const changed = run.cards.length !== cards || run.relics.length !== relics || run.heartcap.hp !== hp || run.heartcap.max !== max || run.amber !== amber || run.next.startingGold !== ng || run.screen.kind === 'prompt' || run.intelHalvings > 0;
        nodes.push({ seed, row: run.path.length - 1, kind: 'event-choice', detail: `${ev}:${changed ? 'took' : 'left'}` });
        continue;
      }
      autoDecide(ctx, run);
    }
  }
  const ticks = run.battles.reduce((n, b) => n + b.durationTicks, 0);
  const last = run.battles[run.battles.length - 1];
  runs.push({ seed, outcome: run.outcome ?? 'incomplete', battles: run.battles.length, ticks, hp: run.heartcap.hp, max: run.heartcap.max,
    ...(run.outcome === 'defeat' && last ? { endBy: `${last.kind}:${last.by}` } : {}), kit: run.kit, relics: run.relics, upgrades: run.upgrades });
}
void parseCard;
writeFileSync(outPath!, JSON.stringify({ proto, commander, seeds, draft, route, lossHp, runs, battles, spoils, nodes }));
console.log(`done ${proto || 'baseline'} ${commander} ${draft} ${seeds}`);
