/**
 * ps_crud table interface
 *
 * Purpose: Stores CRUD operations for virtual table
 *
 * Schema:
 * - id (INTEGER PRIMARY KEY AUTOINCREMENT)
 * - data (TEXT) - JSON data for the operation
 * - tx_id (INTEGER) - Transaction ID (added in migration 2)
 */
export interface PSCrud {
  /** INTEGER PRIMARY KEY AUTOINCREMENT */
  id: number;

  /** JSON data for the operation - TEXT */
  data: string | null;

  /** Transaction ID (added in migration 2) - INTEGER */
  tx_id: number | null;
}
