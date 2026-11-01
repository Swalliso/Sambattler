// 5 s samples: field supply and supplyUsed (field + stored) per side, buildings, gold. For checking A1's trigger definition.
import { writeFileSync } from 'node:fs';
import { protoContent } from '../../../../../../../tools/lib/content.ts';
import { buildState } from '../../../../../../../tools/lib/run.ts';
import { runHeadless } from '../../../../../../../src/sim/index.ts';
import type { BattleState, Side } from '../../../../../../../src/sim/index.ts';
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const proto = opt('--proto') ?? '';
const commander = opt('--commander')!;
const nSeeds = Number(opt('--seeds') ?? 20);
const content = protoContent(proto);
const field = (s: BattleState, side: Side) => s.units.reduce((n, u) => (u.side === side && u.hp > 0 ? n + u.supply : n), 0);
const stored = (s: BattleState, side: Side) => s.buildings.reduce((n, b) => (b.side === side && b.hp > 0 ? n + (b.stored ?? 0) : n), 0);
const out = [];
for (const enemy of ['general:scripted', 'general:mother-mold', 'general:lichen-baron', 'general:blightwright']) {
  for (let seed = 1; seed <= nSeeds; seed++) {
    const state = buildState(content, { seed, map: 'bogwater-hollow', player: 'bot:balanced', enemy, commander, powerPolicy: 'auto' });
    const tr = state.rules.tickRate;
    const ts: number[][] = [];
    runHeadless(state, {
      until: 'end',
      onTick: (s) => {
        if (s.tick % (5 * tr) !== 0) return;
        ts.push([s.tick / tr, field(s, 'player'), field(s, 'enemy'), s.sides.player.supplyUsed, s.sides.enemy.supplyUsed,
          stored(s, 'player'), stored(s, 'enemy'),
          s.buildings.filter((b) => b.side === 'player' && b.hp > 0).length, s.buildings.filter((b) => b.side === 'enemy' && b.hp > 0).length,
          s.sides.player.gold, s.sides.enemy.gold]);
      },
    });
    out.push({ seed, enemy, commander, winner: state.outcome?.winner ?? null, by: state.outcome?.by ?? null, len: state.tick / tr, ts });
  }
}
writeFileSync(opt('--out')!, JSON.stringify({ proto, commander, cols: ['t', 'fieldP', 'fieldE', 'usedP', 'usedE', 'storedP', 'storedE', 'bldP', 'bldE', 'goldP', 'goldE'], battles: out }));
console.log(`${proto || 'base'} ${commander}: ${out.length} battles`);
