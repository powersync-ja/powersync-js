import { column, Schema, Table } from '@powersync/web';

export const PIXELS_TABLE = 'pixels';

/**
 * One row per canvas cell. The row id is the deterministic string `${x}:${y}`,
 * so two clients editing the same cell produce PATCH operations against the same
 * id — resolved last-write-wins — rather than duplicate rows.
 */
const pixels = new Table({
  x: column.integer,
  y: column.integer,
  color: column.integer, // palette index (see library/palette.ts)
  updated_by: column.text,
  updated_at: column.text
});

export const AppSchema = new Schema({
  pixels
});

export type Database = (typeof AppSchema)['types'];
export type PixelRecord = Database['pixels'];
