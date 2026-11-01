// Time series per single battle (10 s samples): territory lead, field supply, buildings, Heartcap, gold.
// Usage (from the repo root): npx tsx docs/archive/v1/ideas/after-the-rework/scripts/measure/fun2.ts --proto <spec> --commander <id> --seeds N --out file.json
import { writeFileSync } from 'node:fs';
import { protoContent } from '../../../../../../../tools/lib/content.ts';
import { buildState } from '../../../../../../../tools/lib/run.ts';
import { runHeadless } from '../../../../../../../src/sim/index.ts';
import type { BattleState, Side } from '../../../../../../../src/sim/index.ts';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const proto = opt('--proto') ?? '';
const commander = opt('--commander')!;
const nSeeds = Number(opt('--seeds') ?? 30);
const content = protoContent(proto);
const field = (s: BattleState, side: Side) => s.units.reduce((n, u) => (u.side === side && u.hp > 0 ? n + u.supply : n), 0);
const bvalue = (s: BattleState, side: Side) => s.buildings.reduce((n, b) => (b.side === side && b.hp > 0 ? n + (s.library?.buildings?.[b.buildingId]?.cost ?? 100) * (b.hp / b.maxHp) : n), 0);
const out = [];
for (const enemy of ['general:scripted', 'general:mother-mold', 'general:lichen-baron', 'general:blightwright']) {
  for (let seed = 1; seed <= nSeeds; seed++) {
    const state = buildState(content, { seed, map: 'bogwater-hollow', player: 'bot:balanced', enemy, commander, powerPolicy: 'auto' });
    const tr = state.rules.tickRate;
    const ts: number[][] = [];
    runHeadless(state, {
      until: 'end',
      onTick: (s) => {
        if (s.tick % (10 * tr) !== 0) return;
        let lead = 0;
        for (const l of s.lanes) lead += l.pBorder + l.eBorder - (s.map.width - 1);
        ts.push([
          s.tick / tr, lead, field(s, 'player'), field(s, 'enemy'),
          s.buildings.filter((b) => b.side === 'player' && b.hp > 0).length, s.buildings.filter((b) => b.side === 'enemy' && b.hp > 0).length,
          Math.round(bvalue(s, 'player')), Math.round(bvalue(s, 'enemy')),
          s.sides.player.heartcapHp / s.sides.player.heartcapMaxHp, s.sides.enemy.heartcapHp / s.sides.enemy.heartcapMaxHp,
          s.sides.player.gold, s.sides.enemy.gold,
        ]);
      },
    });
    out.push({ seed, enemy, commander, winner: state.outcome?.winner ?? null, by: state.outcome?.by ?? null, len: state.tick / tr, ts });
  }
}
writeFileSync(opt('--out')!, JSON.stringify({ proto, commander, cols: ['t', 'lead', 'fieldP', 'fieldE', 'bldP', 'bldE', 'bvalP', 'bvalE', 'hcP', 'hcE', 'goldP', 'goldE'], battles: out }));
console.log(`${proto || 'base'} ${commander}: ${out.length} battles`);
