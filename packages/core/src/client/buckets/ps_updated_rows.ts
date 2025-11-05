/**
 * ps_updated_rows table interface
 *
 * Purpose: Tracks which rows have been updated
 *
 * Schema:
 * - row_type (TEXT)
 * - row_id (TEXT)
 *
 * PRIMARY KEY (row_type, row_id)
 *
 * Note: Created WITHOUT ROWID (added in migration 5)
 */
export interface PsUpdatedRows {
  /** TEXT */
  row_type: string | null

  /** TEXT */
  row_id: string | null
}
