/**
 * ps_oplog (Operation Log) table interface
 *
 * Purpose: Stores operation log entries for sync
 *
 * Schema (current version, from migration 5+):
 * - bucket (INTEGER NOT NULL) - Foreign key to ps_buckets.id
 * - op_id (INTEGER NOT NULL) - Operation ID
 * - row_type (TEXT) - Type of row (table name)
 * - row_id (TEXT) - Row identifier
 * - key (TEXT) - Key field
 * - data (TEXT) - JSON data
 * - hash (INTEGER NOT NULL) - Hash for checksumming
 *
 * Indexes:
 * - ps_oplog_row on (row_type, row_id)
 * - ps_oplog_opid on (bucket, op_id)
 * - ps_oplog_key on (bucket, key)
 */
export interface PSOplog {
  /** Foreign key to ps_buckets.id - INTEGER NOT NULL */
  bucket: number;

  /** Operation ID - INTEGER NOT NULL - stored as bigint to match SQLite INTEGER (64-bit) */
  op_id: bigint;

  /** Type of row (table name) - TEXT */
  row_type: string | null;

  /** Row identifier - TEXT */
  row_id: string | null;

  /** Key field - TEXT */
  key: string | null;

  /** JSON data - TEXT */
  data: string | null;

  /** Hash for checksumming - INTEGER NOT NULL - stored as bigint to match SQLite INTEGER (64-bit) */
  hash: bigint;
}
