import { AbstractPowerSyncDatabase } from '@powersync/web';

import { WHITE_INDEX } from '../palette';

/** Deterministic row id for a cell. */
export const pixelId = (x: number, y: number): string => `${x}:${y}`;

/**
 * Place (or recolour) a single pixel. This is an UPDATE against a pre-seeded
 * row, so it produces a PATCH crud op resolved last-write-wins on the server.
 */
export async function placePixel(
  db: AbstractPowerSyncDatabase,
  x: number,
  y: number,
  color: number,
  userId: string
): Promise<void> {
  await db.execute(`UPDATE pixels SET color = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`, [
    color,
    userId,
    pixelId(x, y)
  ]);
}

/**
 * Admin reset: blank every cell. Applies instantly locally; when connected this
 * queues ~1024 PATCH uploads that propagate the clear to all clients. For a fast
 * server-side reset, run the equivalent UPDATE in the Supabase SQL editor.
 */
export async function clearCanvas(db: AbstractPowerSyncDatabase, userId: string): Promise<void> {
  await db.execute(`UPDATE pixels SET color = ?, updated_by = ?, updated_at = datetime('now')`, [WHITE_INDEX, userId]);
}
