// Can the adaptive general answer a swarm under `rework` with an existing knob? Mono Sporeling and mono
// Veilstalker against an adaptive general on Bogwater, with the swarm read on or off and A2's counter floor.
import { protoContent } from '../../../../../tools/lib/content.ts';
import { buildState } from '../../../../../tools/lib/run.ts';
import { runHeadless } from '../../../../../src/sim/index.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d; };
const seeds = Number(opt('--seeds', '50'));
const general = opt('--general', 'general:lichen-baron');
const specs = opt('--specs', 'rework|rework,ai.counter.swarmMaxSupply:null|rework,a2|rework,ai.counter.swarmMaxSupply:null,a2').split('|');
const monos = opt('--mono', 'sporelingBurrow,veilstalkerHollow').split(',');

for (const spec of specs) {
  const content = protoContent(spec);
  const parts: string[] = [];
  for (const mono of monos) {
    let generalWins = 0;
    const built: Record<string, number> = {};
    const kinds: Record<string, number> = {};
    for (let seed = 1; seed <= seeds; seed++) {
      const state = buildState(content, { seed, map: 'bogwater-hollow', player: `bot:mono:${mono}`, enemy: general, flags: { merging: true, adaptiveGeneral: true } });
      runHeadless(state, {
        until: 'end',
        onTick: (s) => {
          for (const e of s.events) {
            if (e.t === 'buildingPlaced') { const b = s.buildings.find((x) => x.id === e.id); if (b && b.side === 'enemy') built[b.buildingId] = (built[b.buildingId] ?? 0) + 1; }
            if (e.t === 'counterWarned' && e.side === 'enemy') kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
          }
        },
      });
      if (state.outcome?.winner === 'enemy') generalWins++;
    }
    const top = Object.entries(built).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ');
    parts.push(`  vs mono ${mono}: general wins ${generalWins}/${seeds}; reads ${JSON.stringify(kinds)}; builds ${top}`);
  }
  console.log(`${spec} (${general}):\n${parts.join('\n')}`);
}
