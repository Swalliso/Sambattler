// The route map (SPEC §8.2): six rows, one node picked per row, every node connected to every node
// in the next row. Rows: Battle · Battle/Event/Grove · Battle/Elite · Event+Grove · Battle/Elite ·
// Boss. Assignment uses the `route` stream: maps come from a bag of the playable maps (no repeats
// until it runs dry; `testOnly` maps never appear), each elite gets a modifier, and the two event
// nodes draw distinct events. Generals are drawn last (so a seed's maps and events don't depend on
// them): each battle row's nominal battle index picks the eligible generals (`appearsIn`), nodes in
// a row get distinct generals, and a general repeats only once every eligible one has been used. The
// boss row gets the boss general.
import { MILESTONE, nextInt } from '../sim/index.ts';
import type { Content, Rng4 } from '../sim/index.ts';

export type NodeKind = 'battle' | 'elite' | 'event' | 'grove' | 'boss';

export interface RouteNode {
  kind: NodeKind;
  map?: string;
  general?: string;
  /** Elite modifier id (elite nodes only). */
  elite?: string;
  /** Event id (event nodes only). */
  event?: string;
}

/** The general a battle uses when content has no named general for it (the M3 stand-in). */
export const STAND_IN_GENERAL = 'scripted';

/** Each route row's nominal battle index for general eligibility (row 3 can be battle 2 or 3, and so on). */
const ROW_INDEX = [1, 2, 3, 3, 4, 5];

/** Maps a run may use: shipped by this milestone and not test-only, sorted by id. */
export function mapPool(content: Content): string[] {
  return Object.values(content.maps)
    .filter((m) => !m.testOnly && m.milestone <= MILESTONE)
    .map((m) => m.id)
    .sort();
}

export const isBattle = (n: RouteNode): boolean => n.kind === 'battle' || n.kind === 'elite' || n.kind === 'boss';

export function generateRoute(content: Content, rng: Rng4): RouteNode[][] {
  const shape: RouteNode['kind'][][] = [
    ['battle'],
    ['battle', 'event', 'grove'],
    ['battle', 'elite'],
    nextInt(rng, 2) === 0 ? ['event', 'grove'] : ['grove', 'event'],
    ['battle', 'elite'],
    ['boss'],
  ];
  const pool = mapPool(content);
  if (!pool.length) throw new Error('no playable maps');
  let bag: string[] = [];
  const drawMap = (exclude: string[]): string => {
    if (!bag.length) bag = [...pool];
    const choices = bag.filter((m) => !exclude.includes(m));
    const from = choices.length ? choices : bag;
    const m = from[nextInt(rng, from.length)]!;
    bag.splice(bag.indexOf(m), 1);
    return m;
  };
  const events = [...content.eventOrder];
  const drawEvent = (): string => events.splice(nextInt(rng, events.length), 1)[0]!;
  const route = shape.map((kinds) => {
    const used: string[] = [];
    return kinds.map((kind): RouteNode => {
      if (kind === 'event') return { kind, event: drawEvent() };
      if (kind === 'grove') return { kind };
      const map = drawMap(used);
      used.push(map);
      const node: RouteNode = { kind, map, general: STAND_IN_GENERAL };
      if (kind === 'elite') node.elite = content.eliteOrder[nextInt(rng, content.eliteOrder.length)]!;
      return node;
    });
  });
  assignGenerals(content, route, rng);
  return route;
}

/** Named generals (SPEC §7.7, §8.2), in content order; the scripted stand-in only if none exist. */
function assignGenerals(content: Content, route: RouteNode[][], rng: Rng4): void {
  const named = Object.values(content.generals).filter((g) => g.adaptive && g.milestone <= MILESTONE);
  const boss = named.find((g) => g.boss);
  const regular = named.filter((g) => !g.boss);
  const fought: string[] = [];
  route.forEach((row, r) => {
    const inRow: string[] = [];
    for (const node of row) {
      if (!isBattle(node)) continue;
      if (node.kind === 'boss') { if (boss) node.general = boss.id; continue; }
      const eligible = regular.filter((g) => g.appearsIn.includes(ROW_INDEX[r]!)).map((g) => g.id);
      if (!eligible.length) continue;
      const fresh = eligible.filter((id) => !fought.includes(id) && !inRow.includes(id));
      const notInRow = eligible.filter((id) => !inRow.includes(id));
      const from = fresh.length ? fresh : notInRow.length ? notInRow : eligible;
      node.general = from[nextInt(rng, from.length)]!;
      inRow.push(node.general);
    }
    fought.push(...inRow);
  });
}
