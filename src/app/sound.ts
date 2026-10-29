// The page's sound (SPEC §13.9): one AudioEngine, the player's volume settings, the first-gesture
// unlock, the S hotkey, and hover and click sounds for every button (delegated, so every screen gets
// them without wiring). Everything here is a no-op until installSound() runs with sound enabled.
import { AudioEngine, audioAvailable } from '../audio/engine.ts';
import type { PlayOptions } from '../audio/engine.ts';
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { soundControl, syncSoundControls } from '../ui/soundControls.ts';
import type { SoundLevels, SoundPrefs } from '../ui/soundControls.ts';
import { loadSettings, saveSettings } from './settings.ts';

let engine: AudioEngine | null = null;
let levels: SoundLevels = { master: 0, sfx: 0, ambient: 0, muted: true };

/** Buttons whose click has its own sound; the rest click. `data-sfx` on a button overrides both. */
const CLICK_SOUNDS: [string, string][] = [['.route-node', 'ui-node'], ['.choice', 'ui-choice'], ['.draft-card', 'draft-pick']];

/** Sound stays off under ?test=1, in automated browsers (unless ?sound=1) and where WebAudio is missing. */
export function soundEnabled(o: { test: boolean; force: boolean }): boolean {
  if (o.test || !audioAvailable()) return false;
  return o.force || !navigator.webdriver;
}

export function installSound(content: Content, enabled: boolean): AudioEngine {
  const s = loadSettings();
  levels = { master: s.masterVolume, sfx: s.sfxVolume, ambient: s.ambientVolume, muted: s.muted };
  const e = new AudioEngine(content.audio, content.sounds, enabled);
  engine = e;
  e.setVolumes(levels);
  e.setAmbient(true);
  // the hotkey is a setting, so it works (and saves) even with sound off
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 's' && ev.key !== 'S') return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
    const t = ev.target;
    if (t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && t.type !== 'range')) return;
    soundPrefs.toggleMute();
  });
  if (!enabled) return e;
  // browsers allow audio only after a gesture; keep listening, so a context the browser suspended resumes
  const unlock = () => e.unlock();
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  e.setHidden(document.hidden);
  document.addEventListener('visibilitychange', () => e.setHidden(document.hidden));
  let hovered: Element | null = null;
  document.addEventListener('pointerover', (ev) => {
    const b = (ev.target as Element).closest?.('button') ?? null;
    if (b === hovered) return;
    hovered = b;
    if (b && !b.disabled) sfx('ui-hover');
  });
  document.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest?.('button');
    if (!b || b.disabled || b.dataset.sfx === 'none') return;
    sfx(b.dataset.sfx ?? CLICK_SOUNDS.find(([sel]) => b.matches(sel))?.[1] ?? 'ui-click');
  }, true);
  return e;
}

/** Plays a sound by id (nothing happens while sound is off). */
export function sfx(id: string, opts?: PlayOptions): void {
  engine?.play(id, opts);
}

/** The battle's speed, 1–3: frequent sounds thin out when it is faster. */
export function soundSpeed(speed: number): void { engine?.setSpeed(speed); }

/** A paused battle: the ambient bed softens. */
export function soundDim(dimmed: boolean): void { engine?.setDimmed(dimmed); }

function apply(): void {
  engine?.setVolumes(levels);
  syncSoundControls(levels);
}

function persist(): void {
  saveSettings({ masterVolume: levels.master, sfxVolume: levels.sfx, ambientVolume: levels.ambient, muted: levels.muted });
}

/** The player's sound settings, kept in memory (so they hold even when storage is blocked) and saved. */
export const soundPrefs: SoundPrefs = {
  get: () => ({ ...levels }),
  set(patch, commit) {
    levels = { ...levels, ...patch };
    apply();
    if (commit) persist();
  },
  toggleMute() {
    levels = { ...levels, muted: !levels.muted };
    apply();
    persist();
    if (!levels.muted) sfx('ui-toggle');
  },
};

/** A mute button with a volume popover (`opens` up from the battle's bottom band, down from the run bar). */
export function soundToggle(atlas: Atlas, opens: 'up' | 'down'): HTMLElement {
  return soundControl(atlas, soundPrefs, opens);
}
