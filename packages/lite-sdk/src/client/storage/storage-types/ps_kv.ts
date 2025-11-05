/**
 * ps_kv (Key-Value Store) table interface
 *
 * Purpose: Stores key-value pairs (e.g., client_id)
 *
 * Schema:
 * - key (TEXT PRIMARY KEY NOT NULL)
 * - value (BLOB)
 */
export interface PSKeyValue {
  /** TEXT PRIMARY KEY NOT NULL */
  key: string;

  /** BLOB */
  value: Uint8Array | null;
}
