// Does the existing Hold work as a comeback lever? bot:balanced as the player under `rework`, with
// scripted holds only while behind 2:1 on army (supplyUsed, which counts stored units), against none.
// Also: who collects the column-keyed comeback gold, the eventual winner or loser.
import { protoContent } from '../../../../../../../tools/lib/content.ts';
import { buildState } from '../../../../../../../tools/lib/run.ts';
import { queueCommand, runHeadless } from '../../../../../../../src/sim/index.ts';
import type { BattleState } from '../../../../../../../src/sim/index.ts';
const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d; };
const proto = opt('--proto', 'rework');
const seeds = Number(opt('--seeds', '30'));
const enemy = opt('--enemy', 'general:scripted');
const content = protoContent(proto);
for (const policy of ['none', 'behind']) {
  let wins = 0, decisions = 0, holds = 0, cbWin = 0, cbLose = 0, everBehind = 0, wonAfterBehind = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const state = buildState(content, { seed, map: 'bogwater-hollow', player: 'bot:balanced', enemy });
    const tr = state.rules.tickRate;
    const beat = state.compiled.player.waveBeatTicks!;
    let since = -1, behindSeen = false;
    runHeadless(state, {
      until: 'end',
      onTick: (s: BattleState) => {
        const p = s.sides.player.supplyUsed, e = s.sides.enemy.supplyUsed;
        const behind = s.tick >= 60 * tr && e >= 10 && p <= 0.5 * e;
        if (behind) { if (since < 0) since = s.tick; } else since = -1;
        const on = since >= 0 && s.tick - since >= 20 * tr;
        if (on) behindSeen = true;
        if (policy !== 'behind' || !on || s.tick % beat !== 1) return;
        for (let li = 0; li < s.lanes.length; li++) {
          const st = s.sides.player.stance![li]!;
          if (!st.hold && s.tick + 1 >= st.readyAt) { queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'stance', lane: li, hold: true }); holds++; }
        }
      },
    });
    const w = state.outcome?.winner;
    if (w === 'player') wins++;
    if (state.outcome?.by === 'decision') decisions++;
    if (behindSeen) { everBehind++; if (w === 'player') wonAfterBehind++; }
    const l = w === 'player' ? 'enemy' : 'player';
    cbWin += state.stats[w!].goldEarned.comeback; cbLose += state.stats[l].goldEarned.comeback;
  }
  console.log(`${proto} vs ${enemy} [${policy}]: wins ${wins}/${seeds}, decisions ${decisions}, player behind 2:1 for 20s in ${everBehind} (won ${wonAfterBehind}), holds ${(holds / seeds).toFixed(1)}/battle, comeback gold: winners ${(cbWin / seeds).toFixed(0)} vs losers ${(cbLose / seeds).toFixed(0)} per battle`);
}
