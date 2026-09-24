import type { QueryResult } from '@powersync/diagnostics-core';

/** Turns a protocol result (rows as arrays in `columns` order) into one object per row. */
export function rowsToObjects(result: QueryResult): Record<string, unknown>[] {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])));
}
