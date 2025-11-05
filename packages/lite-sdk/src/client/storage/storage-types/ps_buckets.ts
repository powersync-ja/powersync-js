/**
 * ps_buckets table interface
 *
 * Purpose: Tracks sync buckets and their state
 *
 * Schema (current version, from migration 5+):
 * - id (INTEGER PRIMARY KEY)
 * - name (TEXT NOT NULL) - Bucket name (unique)
 * - last_applied_op (INTEGER NOT NULL DEFAULT 0)
 * - last_op (INTEGER NOT NULL DEFAULT 0)
 * - target_op (INTEGER NOT NULL DEFAULT 0)
 * - add_checksum (INTEGER NOT NULL DEFAULT 0)
 * - op_checksum (INTEGER NOT NULL DEFAULT 0)
 * - pending_delete (INTEGER NOT NULL DEFAULT 0)
 * - count_at_last (INTEGER NOT NULL DEFAULT 0)
 * - count_since_last (INTEGER NOT NULL DEFAULT 0)
 *
 * Index: ps_buckets_name (UNIQUE on name)
 */
export interface PSBucket {
  /** INTEGER PRIMARY KEY */
  id: number;

  /** Bucket name (unique) - TEXT NOT NULL */
  name: string;

  /** INTEGER NOT NULL DEFAULT 0 - stored as bigint to match SQLite INTEGER (64-bit) */
  last_applied_op: bigint;

  /** INTEGER NOT NULL DEFAULT 0 - stored as bigint to match SQLite INTEGER (64-bit) */
  last_op: bigint;

  /** INTEGER NOT NULL DEFAULT 0 - stored as bigint to match SQLite INTEGER (64-bit) */
  target_op: bigint;

  /** INTEGER NOT NULL DEFAULT 0 - stored as bigint to match SQLite INTEGER (64-bit) */
  add_checksum: bigint;

  /** INTEGER NOT NULL DEFAULT 0 - stored as bigint to match SQLite INTEGER (64-bit) */
  op_checksum: bigint;

  /** INTEGER NOT NULL DEFAULT 0 */
  pending_delete: boolean;

  /** Added in migration 9 - INTEGER NOT NULL DEFAULT 0 */
  count_at_last: number;

  /** Added in migration 9 - INTEGER NOT NULL DEFAULT 0 */
  count_since_last: number;
}
