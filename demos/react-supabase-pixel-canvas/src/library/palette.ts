import type { PixelRecord } from './powersync/AppSchema';

/** Side length of the (square) canvas in cells. */
export const GRID_SIZE = 32;

export const PIXEL_COUNT = GRID_SIZE * GRID_SIZE;

/**
 * Colours are stored on each pixel as an index into this palette rather than a
 * hex string, so the booth controls the available colours centrally. This is
 * the classic r/place 2017 set trimmed to 12.
 */
export const PALETTE = [
  '#FFFFFF', // 0  white
  '#E4E4E4', // 1  light grey
  '#888888', // 2  grey
  '#222222', // 3  black
  '#E50000', // 4  red
  '#E59500', // 5  orange
  '#A06A42', // 6  brown
  '#E5D900', // 7  yellow
  '#02BE01', // 8  green
  '#00D3DD', // 9  cyan
  '#0083C7', // 10 blue
  '#820080' // 11 purple
] as const;

/** Default / blank pixel colour (white). */
export const WHITE_INDEX = 0;

export const clampColorIndex = (index: number): number =>
  Math.max(0, Math.min(PALETTE.length - 1, Math.round(index)));

/** Parse the hex entries into [r, g, b] triples once, for fast ImageData writes. */
const RGB = PALETTE.map((hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as const;
});

/**
 * Build a GRID_SIZE x GRID_SIZE ImageData from pixel rows. Any cell without a
 * row (or with an out-of-range colour) falls back to white. Shared by the
 * on-screen renderer and the PNG exporter so they always agree.
 */
export function buildPixelImageData(pixels: ReadonlyArray<Pick<PixelRecord, 'x' | 'y' | 'color'>>): ImageData {
  const data = new Uint8ClampedArray(PIXEL_COUNT * 4);
  // Default every cell to opaque white.
  data.fill(255);

  for (const p of pixels) {
    if (p.x == null || p.y == null || p.x < 0 || p.x >= GRID_SIZE || p.y < 0 || p.y >= GRID_SIZE) {
      continue;
    }
    const [r, g, b] = RGB[clampColorIndex(p.color ?? WHITE_INDEX)];
    const offset = (p.y * GRID_SIZE + p.x) * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
  }

  return new ImageData(data, GRID_SIZE, GRID_SIZE);
}
