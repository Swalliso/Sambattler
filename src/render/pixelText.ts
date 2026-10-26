// A 3×5 pixel font for the few words drawn on the battlefield (damage numbers, merge pops), so
// text stays crisp under integer pixel scaling instead of blurring like canvas fillText.

const GLYPHS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111',
  B: '110101110101110', D: '110101101101110', E: '111100110100111', L: '100100100100111',
  M: '101111111101101', O: '010101101101010', R: '110101110101101',
  '!': '010010010000010', '+': '000010111010000', '-': '000000111000000', ' ': '000000000000000',
};

export const GLYPH_W = 3;
export const GLYPH_H = 5;
const ADVANCE = GLYPH_W + 1;

export function textWidth(text: string): number {
  return text.length * ADVANCE - 1;
}

function glyphs(g: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  for (let i = 0; i < text.length; i++) {
    const bits = GLYPHS[text[i]!.toUpperCase()] ?? GLYPHS[' ']!;
    for (let p = 0; p < 15; p++) if (bits[p] === '1') g.fillRect(x + i * ADVANCE + (p % 3), y + Math.floor(p / 3), 1, 1);
  }
}

/** Draws `text` with its top-left at (x, y), with a one-pixel dark outline for contrast. */
export function pixelText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, outline = '#120a16'): void {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = outline;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) glyphs(g, text, x + dx, y + dy);
  g.fillStyle = color;
  glyphs(g, text, x, y);
}
