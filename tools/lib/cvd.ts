// Colour-vision filters (SPEC §2, §15.6): the deuteranopia and protanopia matrices that the screenshot
// tool applies as an SVG feColorMatrix, and the same maths as a pure function, so the screenshot tool,
// the sprite-sheet tool and the contrast test all use one set of numbers (R4a, call 7).

export type CvdFilter = 'deuteranopia' | 'protanopia';
export type Rgb = readonly [number, number, number];

/** Each filter's 3 × 3 matrix over linear RGB, row by row (output r, g, b from input r, g, b). */
export const CVD_MATRICES: Record<CvdFilter, readonly Rgb[]> = {
  deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
  protanopia: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
};

/** The `values` of an feColorMatrix for a filter: its matrix with no offsets, and alpha passed through. */
export function cvdMatrixValues(filter: CvdFilter): string {
  return [...CVD_MATRICES[filter].map((row) => `${row.join(' ')} 0 0`), '0 0 0 1 0'].join('  ');
}

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l: number) => {
  const c = Math.min(1, Math.max(0, l));
  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
};

/**
 * An sRGB colour (0–255 per channel) as the filter shows it. Like the screenshot tool's feColorMatrix,
 * whose `color-interpolation-filters` defaults to linearRGB, it decodes to linear light, applies the
 * matrix and re-encodes. The result isn't rounded, so ratios computed from it are exact.
 */
export function applyCvd(rgb: Rgb, filter: CvdFilter): [number, number, number] {
  const lin = rgb.map(toLinear);
  const [r, g, b] = CVD_MATRICES[filter].map((row) => row[0] * lin[0]! + row[1] * lin[1]! + row[2] * lin[2]!);
  return [toSrgb(r!), toSrgb(g!), toSrgb(b!)];
}
