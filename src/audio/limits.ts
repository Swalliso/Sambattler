// Which sounds may play (SPEC §13.9): a per-sound cooldown, a voice cap with priority, and speed
// thinning for frequent sounds. No WebAudio here, so the policy is unit-tested in Node.
import type { SoundBankDef, SoundDef } from '../data/schema.ts';

/** A sound that is playing. Times are in milliseconds on the engine's clock. */
export interface Voice {
  id: string;
  priority: number;
  start: number;
  end: number;
  /** Fades the voice out quickly (it was stolen). */
  stop(): void;
}

export interface Admission {
  /** Multiplies the sound's gain (frequent sounds play quieter at 2× and 3×). */
  gain: number;
  /** A playing voice this sound takes over; the limiter has already dropped it. */
  stolen: Voice | null;
}

type Rule = Pick<SoundDef, 'priority' | 'cooldownMs' | 'frequent'>;

export class VoiceLimiter {
  readonly voices: Voice[] = [];
  private last = new Map<string, number>();

  constructor(private maxVoices: number, private thinning: SoundBankDef['speedThinning']) {}

  /**
   * Admits a sound under `key` (the sound id, or a finer key such as one per Heartcap) at time `now`,
   * or returns null: it played too recently, or every voice is busy with one of equal or higher
   * priority. When the cap is reached, the oldest voice of the lowest lower priority is stolen.
   */
  admit(key: string, rule: Rule, now: number, speed = 1): Admission | null {
    this.prune(now);
    const i = Math.min(3, Math.max(1, Math.round(speed))) - 1;
    const cooldown = rule.cooldownMs * (rule.frequent ? this.thinning.cooldown[i]! : 1);
    const last = this.last.get(key);
    if (last !== undefined && now - last < cooldown) return null;
    let stolen: Voice | null = null;
    if (this.voices.length >= this.maxVoices) {
      for (const v of this.voices) {
        if (!stolen || v.priority < stolen.priority || (v.priority === stolen.priority && v.start < stolen.start)) stolen = v;
      }
      if (!stolen || stolen.priority >= rule.priority) return null;
      this.release(stolen);
    }
    this.last.set(key, now);
    return { gain: rule.frequent ? this.thinning.gain[i]! : 1, stolen };
  }

  add(v: Voice): void { this.voices.push(v); }

  release(v: Voice): void {
    const i = this.voices.indexOf(v);
    if (i >= 0) this.voices.splice(i, 1);
  }

  /** Drops voices that have finished. */
  prune(now: number): void {
    for (let i = this.voices.length - 1; i >= 0; i--) if (this.voices[i]!.end <= now) this.voices.splice(i, 1);
  }
}
