import { useQuery } from '@powersync/react';

import type { PixelRecord } from './AppSchema';

export type CanvasPixel = Pick<PixelRecord, 'id' | 'x' | 'y' | 'color'>;

/**
 * Watch every pixel. Differential (`rowComparator`) so an emission only happens
 * when a cell's colour actually changes — `updated_at`/`updated_by` churn and
 * unrelated crud-queue activity don't trigger repaints.
 */
export function usePixels() {
  return useQuery<CanvasPixel>('SELECT id, x, y, color FROM pixels', [], {
    rowComparator: {
      keyBy: (p) => p.id,
      compareBy: (p) => String(p.color)
    }
  });
}

export type CanvasStats = { placed: number; artists: number };

/** Booth stats: cells currently coloured by a real user + distinct artists. */
export function useCanvasStats() {
  return useQuery<CanvasStats>(
    `SELECT
       COUNT(*) FILTER (WHERE updated_by IS NOT NULL AND updated_by != 'seed' AND updated_by != '') AS placed,
       COUNT(DISTINCT CASE WHEN updated_by != 'seed' AND updated_by != '' THEN updated_by END) AS artists
     FROM pixels`,
    []
  );
}

/**
 * Number of local writes not yet uploaded. `ps_crud` is an internal PowerSync
 * table; we name it explicitly in `tables` so the watch re-runs on every queue
 * change regardless of EXPLAIN-based table resolution.
 */
export function usePendingUploadCount() {
  return useQuery<{ count: number }>('SELECT COUNT(*) AS count FROM ps_crud', [], {
    tables: ['ps_crud'],
    throttleMs: 300
  });
}
