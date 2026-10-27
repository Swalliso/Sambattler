// Fixed-capacity ring buffer of short-lived visual effects (SPEC §13.6): hit sparks tinted by
// effectiveness, death puffs, building rubble, spawn puffs, merge pops, damage numbers and heals. Entries
// are reused, never allocated after construction.
import { GLYPH_H, pixelText, textWidth } from './pixelText.ts';

/**
 * kind: 1 strong spark, 2 normal spark, 3 weak spark, 4/5 death puff (player/enemy), 6 rubble,
 * 7 spawn puff, 8 merge pop (flag = tier, value = 0 player / 1 enemy), 9 damage number
 * (flag = 1 strong / 2 normal / 3 weak, value = amount), 10 heal plus
 */
interface Fx { kind: number; x: number; y: number; t0: number; flag: number; value: number }

const LIFE = [0, 220, 160, 140, 380, 380, 600, 300, 1100, 650, 450];
const NUMBER_COLOR = ['', '#f0c85a', '#ffffff', '#a39cab'];

export class Effects {
  private buf: Fx[];
  private head = 0;

  constructor(capacity: number) {
    this.buf = Array.from({ length: capacity }, () => ({ kind: 0, x: 0, y: 0, t0: -1e9, flag: 0, value: 0 }));
  }

  add(kind: number, x: number, y: number, t0: number, flag: number, value = 0): void {
    const e = this.buf[this.head]!;
    e.kind = kind; e.x = x; e.y = y; e.t0 = t0; e.flag = flag; e.value = value;
    this.head = (this.head + 1) % this.buf.length;
  }

  draw(g: CanvasRenderingContext2D, now: number, sx: (x: number) => number, tile: number): void {
    for (const e of this.buf) {
      if (!e.kind) continue;
      const age = now - e.t0;
      const life = LIFE[e.kind]!;
      if (age < 0 || age > life) continue;
      const k = age / life;
      const x = Math.round(sx(e.x)), y = Math.round(e.y * tile);
      switch (e.kind) {
        case 1: // strong: large bright gold spark
          g.fillStyle = k < 0.5 ? '#fff3b0' : '#f0c85a';
          g.fillRect(x - 2, y - 2, 5, 5);
          g.fillStyle = '#f0c85a';
          g.fillRect(x - 4, y, 9, 1);
          g.fillRect(x, y - 4, 1, 9);
          break;
        case 2: // normal: small white spark
          g.fillStyle = '#ffffff';
          g.fillRect(x - 1, y - 1, 3, 3);
          break;
        case 3: // weak: small dull gray spark
          g.fillStyle = '#8d8794';
          g.fillRect(x, y, 2, 2);
          break;
        case 4:
        case 5: {
          const r = 2 + Math.round(k * 5);
          g.globalAlpha = 1 - k;
          g.fillStyle = e.kind === 4 ? '#c9a2ff' : '#b8c4a8';
          g.fillRect(x - r, y - 1, 1, 2); g.fillRect(x + r, y - 1, 1, 2);
          g.fillRect(x - 1, y - r, 2, 1); g.fillRect(x - 1, y + r, 2, 1);
          g.globalAlpha = 1;
          break;
        }
        case 6: {
          g.globalAlpha = 1 - k;
          g.fillStyle = '#7a5236';
          for (let i = 0; i < 8; i++) g.fillRect(x - 12 + ((i * 7) % 24), y - 8 + ((i * 11) % 16) + Math.round(k * 6), 3, 3);
          g.globalAlpha = 1;
          break;
        }
        case 7: {
          g.globalAlpha = 0.7 * (1 - k);
          g.fillStyle = '#e8d9b5';
          const r = 1 + Math.round(k * 4);
          g.fillRect(x - r, y - r, r * 2, r * 2);
          g.globalAlpha = 1;
          break;
        }
        case 10: { // heal: a small green plus rising over the healed unit
          g.globalAlpha = 1 - k;
          g.fillStyle = '#7be0a0';
          const py = y - 6 - Math.round(k * 6);
          g.fillRect(x - 1, py - 3, 2, 6);
          g.fillRect(x - 3, py - 1, 6, 2);
          g.globalAlpha = 1;
          break;
        }
        case 8: { // "BLOOMED!" / "ELDER!" rising from the merge point, with a burst ring
          const text = e.flag === 3 ? 'ELDER!' : 'BLOOMED!';
          const color = e.flag === 3 ? '#f0c85a' : e.value === 0 ? '#c9a2ff' : '#b8c4a8';
          if (k < 0.35) {
            const r = 3 + Math.round((k / 0.35) * 9);
            g.globalAlpha = 1 - k / 0.35;
            g.fillStyle = color;
            for (let a = 0; a < 12; a++) {
              const dx = [r, 0, -r, 0, r * 0.7, -r * 0.7, r * 0.7, -r * 0.7, r * 0.38, -r * 0.38, r * 0.92, -r * 0.92][a]!;
              const dy = [0, r, 0, -r, r * 0.7, r * 0.7, -r * 0.7, -r * 0.7, r * 0.92, -r * 0.92, -r * 0.38, r * 0.38][a]!;
              g.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1);
            }
          }
          g.globalAlpha = k < 0.75 ? 1 : (1 - k) / 0.25;
          pixelText(g, text, x - textWidth(text) / 2, y - 18 - Math.round(k * 8), color);
          g.globalAlpha = 1;
          break;
        }
        case 9: { // damage number, tinted by effectiveness
          const text = String(e.value);
          g.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
          pixelText(g, text, x - textWidth(text) / 2, y - 10 - GLYPH_H - Math.round(k * 7), NUMBER_COLOR[e.flag] ?? '#ffffff');
          g.globalAlpha = 1;
          break;
        }
      }
    }
  }
}
