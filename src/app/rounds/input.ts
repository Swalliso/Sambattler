// Mouse and keyboard for a battle in rounds (SPEC §10.3), by phase. Everything becomes a session change or a
// queued command. Any key or press releases the planning hold (plan Call 14), except choosing a card, which
// changes only the view. Begin by key needs a fresh
// keydown, ignores auto-repeat and waits about 400 ms after planning opens, while the button stays instant, so
// one held or double-tapped key can't skip the aftermath and start the next clash with no planning (R2-Q12,
// A065). Planning keys in a clash or the aftermath are refused with a callout. Help is modal while it's open,
// and the settings screen keeps keys to itself. It stands beside v1's input.
import type { RoundsView } from './battleView.ts';
import type { RoundSession } from './session.ts';

/** How long after planning opens Begin by key waits (R2-Q12). */
export const BEGIN_KEY_MS = 400;

export interface RoundInputHooks {
  begin(): void;
  /** Space, Enter or a click in the aftermath. */
  skip(): void;
  toggleDebug(): void;
}

/** Binds mouse and keyboard to one battle; returns a function that removes the window listeners. */
export function bindRoundInput(session: RoundSession, view: RoundsView, hooks: RoundInputHooks): () => void {
  const canvas = view.canvas;
  const planningOnly = () => view.say('refused', 'Planting, selling and merge toggles are for planning');
  canvas.addEventListener('mousemove', (ev) => {
    const t = view.tileAt(ev);
    session.hover = { col: t.col, row: t.row };
    session.shift = ev.shiftKey;
  });
  canvas.addEventListener('mouseleave', () => { session.hover = null; });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    session.cancel();
  });
  canvas.addEventListener('click', (ev) => {
    session.shift = ev.shiftKey;
    const t = view.tileAt(ev);
    session.hover = { col: t.col, row: t.row };
    const phase = session.state.phase;
    if (phase === 'aftermath') { hooks.skip(); return; }
    // in a clash a click inspects a unit, or a building on its plot (§10.3)
    if (phase === 'clash') { session.selectIn(t.x, t.y, t.col, t.row); return; }
    if (phase !== 'planning') return;
    if (session.placing) {
      const g = session.ghost();
      if (!session.plant() && g?.reason) view.say('refused', g.reason);
      return;
    }
    session.selectAt(t.col, t.row);
  });

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.target instanceof HTMLInputElement) return;
    if (view.helpOpen) {
      // Help is modal: H or Esc closes it, and everything else waits
      if (ev.key === 'h' || ev.key === 'H' || ev.key === 'Escape') { ev.preventDefault(); view.toggleHelp(); }
      return;
    }
    // Tab moves along the top band once `I` has put focus there (§10.2)
    if (ev.key === 'Tab' && ev.target instanceof Element && ev.target.closest('[data-native-tab]')) return;
    session.shift = ev.shiftKey;
    const phase = session.state.phase;
    const planning = phase === 'planning';
    // choosing a card is the view's alone, so it keeps the hold: a bot player's queued Begin waits on (T135's marks capture)
    if (/^[1-9]$/.test(ev.key)) {
      if (!planning) { planningOnly(); return; }
      const id = session.cards()[Number(ev.key) - 1];
      if (id) session.pick(id);
      return;
    }
    session.hold = false;
    switch (ev.key) {
      case 'Escape': session.cancel(); break;
      case ' ':
      case 'Enter':
        // Begin must not also press a focused button, and Space must not scroll
        ev.preventDefault();
        if (planning) {
          if (!ev.repeat && performance.now() - session.planningSince >= BEGIN_KEY_MS) hooks.begin();
        } else if (phase === 'clash') {
          if (ev.key === ' ') session.paused = !session.paused;
        } else if (phase === 'aftermath') hooks.skip();
        break;
      case ']': if (phase === 'clash' || phase === 'aftermath') session.speed = Math.min(3, session.speed + 1); break;
      case '[': if (phase === 'clash' || phase === 'aftermath') session.speed = Math.max(1, session.speed - 1); break;
      case 'Tab':
        ev.preventDefault();
        session.cycle();
        break;
      case 'x': case 'X': case 'Delete': case 'Backspace':
        if (!planning) planningOnly();
        else view.sell();
        break;
      case 'm': case 'M':
        if (!planning) planningOnly();
        else session.toggleMerge();
        break;
      case 'q': case 'Q':
        if (phase !== 'clash') view.say('refused', 'The commander power works only in a clash');
        break;
      case 'i': case 'I': view.focusChips(); break;
      case 'h': case 'H': view.toggleHelp(); break;
      case 'F3': ev.preventDefault(); hooks.toggleDebug(); break;
    }
  };
  const onKeyUp = (ev: KeyboardEvent) => { session.shift = ev.shiftKey; };
  const onPress = (ev: PointerEvent) => {
    if (ev.target instanceof Element && ev.target.closest('#tray')) return;
    session.hold = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointerdown', onPress);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerdown', onPress);
  };
}
