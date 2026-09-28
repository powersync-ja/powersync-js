import React from 'react';

import { buildPixelImageData, GRID_SIZE } from '@/library/palette';
import type { CanvasPixel } from '@/library/powersync/hooks';

export interface PixelCanvasProps {
  pixels: ReadonlyArray<CanvasPixel>;
  interactive?: boolean;
  onPixelTap?: (x: number, y: number) => void;
  /** Cell to briefly outline (e.g. the just-placed pixel). */
  highlight?: { x: number; y: number } | null;
  className?: string;
}

/**
 * Shared canvas renderer for both the booth and draw pages. Paints the pixel
 * data into an offscreen 32x32 buffer, then blits it (nearest-neighbour) to the
 * display canvas, which is sized to its CSS box scaled by devicePixelRatio.
 */
export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  pixels,
  interactive = false,
  onPixelTap,
  highlight = null,
  className
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = React.useRef<HTMLCanvasElement | null>(null);

  // Build (and cache) the 32x32 offscreen buffer whenever the pixels change.
  React.useEffect(() => {
    if (!offscreenRef.current) {
      const off = document.createElement('canvas');
      off.width = GRID_SIZE;
      off.height = GRID_SIZE;
      offscreenRef.current = off;
    }
    offscreenRef.current.getContext('2d')!.putImageData(buildPixelImageData(pixels), 0, 0);
    draw();
  }, [pixels]);

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

    if (highlight) {
      const cell = canvas.width / GRID_SIZE;
      ctx.lineWidth = Math.max(2, cell * 0.12);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeRect(highlight.x * cell, highlight.y * cell, cell, cell);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.strokeRect(highlight.x * cell, highlight.y * cell, cell, cell);
    }
  }, [highlight]);

  // Redraw when the highlight changes.
  React.useEffect(() => {
    draw();
  }, [draw]);

  // Keep the backing store sized to the element box * devicePixelRatio.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        draw();
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !onPixelTap) {
      return;
    }
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE)));
    const y = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE)));
    onPixelTap(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`pixel-canvas${interactive ? ' pixel-canvas--interactive' : ''}${className ? ` ${className}` : ''}`}
      onPointerDown={handlePointer}
    />
  );
};

export default PixelCanvas;
