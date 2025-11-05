/**
 * ps_sync_state table interface
 *
 * Purpose: Tracks sync state by priority
 *
 * Schema (current version, from migration 8+):
 * - priority (INTEGER NOT NULL PRIMARY KEY)
 * - last_synced_at (TEXT NOT NULL)
 */
export interface PsSyncState {
  /** INTEGER NOT NULL PRIMARY KEY */
  priority: number;

  /** TEXT NOT NULL */
  last_synced_at: string;
}
