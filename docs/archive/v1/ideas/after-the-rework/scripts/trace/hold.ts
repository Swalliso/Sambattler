// Does Hold matter under `rework`? bot:balanced as the player, with scripted holds layered on:
// none, every other beat (doubled waves every 40 s), and the opening only.
import { protoContent } from '../../../../../../../tools/lib/content.ts';
import { buildState } from '../../../../../../../tools/lib/run.ts';
import { queueCommand, runHeadless } from '../../../../../../../src/sim/index.ts';
import type { BattleState } from '../../../../../../../src/sim/index.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d; };
const proto = opt('--proto', 'rework');
const map = opt('--map', 'bogwater-hollow');
const seeds = Number(opt('--seeds', '30'));
const enemies = opt('--enemies', 'general:scripted,general:mother-mold,general:lichen-baron,general:blightwright').split(',');
const content = protoContent(proto);

type Policy = 'none' | 'alternate' | 'opening';
for (const enemy of enemies) {
  const line: string[] = [];
  for (const policy of ['none', 'alternate', 'opening'] as Policy[]) {
    let wins = 0, decisions = 0, accepted = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const state = buildState(content, { seed, map, player: 'bot:balanced', enemy });
      const beat = state.compiled.player.waveBeatTicks!;
      runHeadless(state, {
        until: 'end',
        onTick: (s: BattleState) => {
          if (policy === 'none' || s.tick % beat !== 1) return;
          const k = Math.floor(s.tick / beat); // beats passed
          if (policy === 'opening' && k !== 1) return;
          if (policy === 'alternate' && k % 2 !== 1) return;
          for (let li = 0; li < s.lanes.length; li++) {
            const st = s.sides.player.stance![li]!;
            if (!st.hold && s.tick + 1 >= st.readyAt) { queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'stance', lane: li, hold: true }); accepted++; }
          }
        },
      });
      if (state.outcome?.winner === 'player') wins++;
      if (state.outcome?.by === 'decision') decisions++;
    }
    line.push(`${policy}: ${wins}/${seeds} wins (${decisions} Decisions, ${(accepted / seeds).toFixed(1)} holds a battle)`);
  }
  console.log(`${proto} ${map} vs ${enemy}: ${line.join(' | ')}`);
}
