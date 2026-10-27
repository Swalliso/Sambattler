// The route map (SPEC §8.2): six rows, one node picked per row, every node connected to every node
// in the next row. Rows: Battle · Battle/Event/Grove · Battle/Elite · Event+Grove · Battle/Elite ·
// Boss. Assignment uses the `route` stream: maps come from a bag of the playable maps (no repeats
// until it runs dry; `testOnly` maps never appear), each elite gets a modifier, and the two event
// nodes draw distinct events. Until M4 every battle is fought against the scripted general.
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

/** The general every battle uses until M4 brings named generals (the kickoff stand-in). */
export const STAND_IN_GENERAL = 'scripted';

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
  return shape.map((kinds) => {
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
}
