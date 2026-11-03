// Building roles and the tray's order (playtest 2026-10-28: a player never noticed the economy buildings). The
// card's one-line summary and its tooltip are the tray's (`src/ui/hud/tray.ts`), read from the round state.
import type { Content } from '../data/registry.ts';
import type { BuildingKind } from '../sim/index.ts';

export const ROLE_LABEL: Record<BuildingKind, string> = { economy: 'Economy', spawner: 'Army', tower: 'Defense', utility: 'Utility' };
const ROLE_ORDER: Record<BuildingKind, number> = { economy: 0, spawner: 1, tower: 2, utility: 3 };

/** The tray's order, which the 1–9 hotkeys follow: economy first, then army, defense and utility, each in kit order. */
export function trayOrder(content: Content, kit: readonly string[]): string[] {
  return [...kit].sort((a, b) => ROLE_ORDER[content.buildings[a]!.kind] - ROLE_ORDER[content.buildings[b]!.kind]);
}
