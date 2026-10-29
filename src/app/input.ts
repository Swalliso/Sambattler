// Mouse and keyboard (SPEC §10.3). Everything becomes a Session change or a queued command.
import { unitRadius } from '../sim/world.ts';
import { trayOrder } from '../ui/buildingInfo.ts';
import type { BattleView } from './battleView.ts';
import type { Session } from './session.ts';
import { sfx } from './sound.ts';

export interface InputHooks {
  begin(): void;
  toggleDebug(): void;
}

/** Binds mouse and keyboard to one battle; returns a function that removes the window listeners. */
export function bindInput(session: Session, view: BattleView, hooks: InputHooks): () => void {
  const canvas = view.canvas;
  canvas.addEventListener('mousemove', (ev) => {
    const t = view.tileAt(ev);
    session.hover = { col: t.col, row: t.row };
    session.aim = { x: t.x, y: t.y };
    session.shift = ev.shiftKey;
  });
  canvas.addEventListener('mouseleave', () => { session.hover = null; session.aim = null; });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    cancel();
  });
  canvas.addEventListener('click', (ev) => {
    session.shift = ev.shiftKey;
    const t = view.tileAt(ev);
    session.hover = { col: t.col, row: t.row };
    if (session.targeting) {
      session.aim = { x: t.x, y: t.y };
      if (!session.firePower()) sfx('illegal');
      return;
    }
    if (session.placing) {
      if (!session.placeAtGhost()) sfx('illegal');
      return;
    }
    select(t.x, t.y);
  });

  function cancel(): void {
    if (session.targeting) session.targeting = false;
    else if (session.placing) session.placing = null;
    else session.selected = null;
    view.inspect.resetConfirm();
  }

  function select(x: number, y: number): void {
    const s = session.state;
    let best: number | null = null, bestD = Infinity;
    for (const u of s.units) {
      const r = unitRadius(s, u) + 0.3;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d <= r && d < bestD) { best = u.id; bestD = d; }
    }
    if (best === null) {
      for (const b of s.buildings) {
        const def = s.compiled[b.side].buildings[b.buildingId]!;
        if (x >= b.col && x < b.col + def.w && y >= b.row && y < b.row + def.h) best = b.id;
      }
    }
    session.selected = best;
    view.inspect.resetConfirm();
  }

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.target instanceof HTMLInputElement) return;
    session.shift = ev.shiftKey;
    const s = session.state;
    const card = view.draft.cardForKey(s, ev.key);
    if (view.draft.open) {
      // the draft is modal: number keys pick a card, everything else waits
      if (card) session.issue({ type: 'draftPick', cardId: card });
      return;
    }
    if (view.helpOpen) {
      // the help overlay is modal: H or Esc closes it, everything else waits
      if (ev.key === 'h' || ev.key === 'H' || ev.key === 'Escape') { ev.preventDefault(); view.toggleHelp(); }
      return;
    }
    // inside the top band's chips or the relics popover, Tab moves focus as usual (it cycles buildings elsewhere)
    if (ev.key === 'Tab' && ev.target instanceof Element && ev.target.closest('[data-native-tab]')) return;
    if (/^[1-9]$/.test(ev.key)) {
      const id = trayOrder(session.content, s.sides.player.kit)[Number(ev.key) - 1];
      if (id) view.pick(id);
      return;
    }
    switch (ev.key) {
      case 'Escape': cancel(); break;
      case ' ':
        // in deploy, Space begins the battle as Enter does (playtest round 3); once it is live, it pauses
        ev.preventDefault();
        if (s.phase === 'deploy') hooks.begin();
        else session.paused = !session.paused;
        break;
      case ']': session.speed = Math.min(3, session.speed + 1); break;
      case '[': session.speed = Math.max(1, session.speed - 1); break;
      case 'Enter':
        // Begin must not also activate a focused inspector button (a pending sell would confirm)
        if (s.phase === 'deploy') { ev.preventDefault(); hooks.begin(); }
        break;
      case 'Tab': {
        ev.preventDefault();
        const mine = s.buildings.filter((b) => b.side === 'player');
        if (!mine.length) break;
        const i = mine.findIndex((b) => b.id === session.selected);
        session.selected = mine[(i + 1) % mine.length]!.id;
        session.placing = null;
        view.inspect.resetConfirm();
        break;
      }
      case 'x': case 'X': case 'Delete': case 'Backspace':
        if (session.selected !== null) view.inspect.requestSell(s, session.selected);
        break;
      case 'm': case 'M':
        if (session.selected !== null) session.toggleMerge(session.selected);
        break;
      case 'f': case 'F': session.toggleAllStances(); break;
      case 'q': case 'Q': view.togglePower(); break;
      case 'h': case 'H': view.toggleHelp(); break;
      case 'r': case 'R': view.top.kit.toggle(); break;
      case 'i': case 'I': view.top.focusChips(); break;
      case 'F3': ev.preventDefault(); hooks.toggleDebug(); break;
    }
  };
  const onKeyUp = (ev: KeyboardEvent) => { session.shift = ev.shiftKey; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
