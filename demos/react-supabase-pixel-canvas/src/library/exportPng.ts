import { buildPixelImageData, GRID_SIZE } from './palette';
import type { CanvasPixel } from './powersync/hooks';

/**
 * Render the canvas to a PNG at a fixed high resolution and trigger a download.
 * Rendered fresh from the pixel data (not lifted off the on-screen canvas) so
 * the output is independent of screen size, DPR, and the selection highlight.
 */
export async function exportCanvasPng(pixels: ReadonlyArray<CanvasPixel>, scale = 32): Promise<void> {
  const size = GRID_SIZE * scale;

  // Paint the 32x32 image, then scale it up with smoothing off for crisp pixels.
  const small = document.createElement('canvas');
  small.width = GRID_SIZE;
  small.height = GRID_SIZE;
  small.getContext('2d')!.putImageData(buildPixelImageData(pixels), 0, 0);

  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pixel-canvas-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
