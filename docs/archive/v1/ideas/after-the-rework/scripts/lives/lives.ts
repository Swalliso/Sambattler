// Scratch script (a reference copy, see ../README.md): whole runs like `npm run experiment -- --checks runs` (bot:balanced,
// greedy drafts, random route, power auto), with an optional emulated "lives" rule: a non-boss Rout
// loss costs schedule[battleIndex-1] of max HP instead of ending the run. No rule is changed; the
// emulation relabels the loss a Decision and sets the battle's final Heartcap before finishBattle.
// Usage (from the repo root): npx tsx docs/archive/v1/ideas/after-the-rework/scripts/lives/lives.ts <proto|-> <commander> <seeds> <out.json> [schedule e.g. 0.25,0.35,0.5,0.5]
import { writeFileSync } from 'node:fs';
import { protoContent } from '../../../../../../../tools/lib/content.ts';
import { autoContext, autoDecide, createRun, finishBattle } from '../../../../../../../src/run/index.ts';
import { createBattle, queueCommand, step } from '../../../../../../../src/sim/index.ts';

const [protoArg, commander, seedsArg, outPath, schedArg] = process.argv.slice(2);
const proto = protoArg === '-' ? '' : protoArg!;
const content = protoContent(proto);
const seeds = Number(seedsArg);
const sched = schedArg ? schedArg.split(',').map(Number) : [];
const bossStipend = Number(process.env.BOSS_STIPEND ?? 1);
const mirror = process.env.MIRROR === '1';
const policies = { route: 'random' as const, draft: 'greedy' as const, player: 'bot:balanced', power: 'auto' as const };
const battles: unknown[] = [];
const runs: unknown[] = [];
const groves: string[] = [];
for (let seed = 1; seed <= seeds; seed++) {
  const run = createRun(content, { seed, player: policies.player, autoDraft: 'greedy', commander, powerPolicy: 'auto' });
  const ctx = autoContext(content, seed, policies, run.commander);
  let bossHpIn = -1;
  for (let guard = 0; !run.outcome && guard < 200; guard++) {
    const s = run.screen;
    if (s.kind === 'battle') {
      const hpBefore = run.heartcap.hp;
      const row = run.path.length - 1;
      const node = run.route[row]![run.path[row]!]!;
      if (node.kind === 'boss') bossHpIn = hpBefore / run.heartcap.max;
      if (node.kind === 'boss' && bossStipend !== 1) {
        // scratch emulation of a boss-only modifier (no such knob exists yet): the boss's stipend ×bossStipend
        s.config.modifiers = [...(s.config.modifiers ?? []), { side: 'enemy', source: 'scratch:boss', effects: { modifiers: [{ stat: 'side.stipend', op: 'mul', value: bossStipend }] } }];
      }
      if (node.kind === 'boss' && mirror) {
        // scratch emulation of a 'mirror' boss: it also fields the player's kit, at the player's upgrade levels where higher
        const en = s.config.enemy, pl = s.config.player;
        const add = pl.kit.filter((id) => !en.kit.includes(id));
        en.kit = [...en.kit, ...add];
        en.aiWeights = { ...(en.aiWeights ?? {}), ...Object.fromEntries(add.map((id) => [id, 1])) };
        const up = { ...(en.upgrades ?? {}) };
        for (const [id, lvl] of Object.entries(pl.upgrades ?? {})) if (en.kit.includes(id)) up[id] = Math.max(up[id] ?? 0, lvl as number);
        en.upgrades = up;
      }
      const state = createBattle(content, s.config);
      queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
      let minEnemy = 1;
      for (let g = 0; state.phase !== 'ended' && g < 100000; g++) {
        step(state);
        const e = state.sides.enemy;
        const f = e.heartcapHp / e.heartcapMaxHp;
        if (f < minEnemy) minEnemy = f;
      }
      const index = run.battles.length + 1;
      const ps = state.sides.player;
      let emulated = false;
      const cost = sched.length ? sched[Math.min(index, sched.length) - 1]! : 0;
      if (cost > 0 && state.outcome && state.outcome.winner !== 'player' && state.outcome.by === 'rout' && node.kind !== 'boss') {
        state.outcome = { ...state.outcome, by: 'decision' };
        ps.heartcapHp = Math.max(0, Math.round(hpBefore - (cost - content.balance.decisionLossDamage) * run.heartcap.max));
        emulated = true;
      }
      const rec = finishBattle(content, run, state);
      battles.push({ seed, index, kind: rec.kind, general: rec.general, map: rec.map, elite: rec.elite, winner: rec.winner, by: emulated ? 'rout' : rec.by,
        ticks: rec.durationTicks, hpBefore, hpAfter: rec.heartcapAfter, hpMax: run.heartcap.max, minEnemy: Math.round(minEnemy * 1000) / 1000 });
    } else if (s.kind === 'summary') break;
    else {
      if (s.kind === 'grove') {
        const hp = run.heartcap.hp;
        autoDecide(ctx, run);
        groves.push(run.heartcap.hp > hp ? 'repair' : 'graft');
        continue;
      }
      autoDecide(ctx, run);
    }
  }
  const ticks = run.battles.reduce((n, b) => n + b.durationTicks, 0);
  runs.push({ seed, outcome: run.outcome, battles: run.battles.length, ticks, hp: run.heartcap.hp, max: run.heartcap.max, bossHpIn,
    lost: run.battles.filter((b) => b.winner !== 'player').length });
}
writeFileSync(outPath!, JSON.stringify({ proto, commander, seeds, sched, runs, battles, groves }));
console.log(`done ${proto || 'base'} ${commander} [${sched}]`);
