/**
 * The data shapes of the Diagnostics Protocol.
 *
 * Every value that crosses from an SDK into the diagnostics tool is one of these. They are plain,
 * JSON-serializable data — no class instances, no live SDK objects — so the same shapes work for
 * every SDK and every host. This file deliberately imports nothing from any SDK package: the tool
 * owns these types, and each SDK maps its own objects onto them.
 */

/** Disposes a subscription or listener. */
export type Unsubscribe = () => void;

// --- queries ---

export interface QueryParams {
  sql: string;
  params?: unknown[];
}

/** A serialized SQL result set. */
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

// --- sync status ---

/** Download progress expressed in operation counts. */
export interface ProgressState {
  downloadedOperations: number;
  totalOperations: number;
  downloadedFraction: number;
}

/** Sync state for a single bucket priority level. */
export interface PriorityState {
  priority: number;
  /** Epoch milliseconds, or null if never synced at this priority. */
  lastSyncedAt: number | null;
  hasSynced: boolean | null;
}

/** A point-in-time, serialized view of the client's sync status. */
export interface SyncState {
  connected: boolean;
  connecting: boolean;
  downloading: boolean;
  uploading: boolean;
  hasSynced: boolean | null;
  /** Epoch milliseconds of the last completed sync, or null. */
  lastSyncedAt: number | null;
  downloadProgress: ProgressState | null;
  priorities: PriorityState[];
  downloadError: string | null;
  uploadError: string | null;
  message: string;
}

/** State for a single sync stream. */
export interface StreamState {
  name: string | null;
  priority: number | null;
  /** True while this stream is actively downloading. */
  active: boolean;
  /** Included by default because the stream sets `auto_subscribe`. */
  autoSubscribed: boolean;
  /** Subscribed to explicitly at runtime. */
  explicitlySubscribed: boolean;
  progress: ProgressState | null;
  params: Record<string, unknown> | null;
  /** Epoch milliseconds at which the subscription expires (TTL), or null. */
  expiresAt: number | null;
  hasSynced: boolean;
  /** Epoch milliseconds of the last sync for this stream, or null. */
  lastSyncedAt: number | null;
}

// --- buckets / upload queue / logs ---

/** Per-bucket download stats, read from the core `ps_buckets` table. */
export interface BucketState {
  name: string;
  downloadedOperations: number;
  /** Total operations for the current checkpoint, or null when the core diagnostics stream is off. */
  totalOperations: number | null;
  /** Downloaded payload size in bytes, or null on cores that don't track it. */
  downloadedSize: number | null;
  lastOp: string | null;
  downloading: boolean;
}

/** Pending upload (CRUD) queue state. */
export interface UploadQueueState {
  count: number;
  /** Byte size, or null when not computed. */
  size: number | null;
}

/** A captured client log line. */
export interface LogRecord {
  timestamp: number;
  level: string;
  message: string;
  args?: unknown[];
}

// --- connection info ---

/** Connection metadata for the attached client. */
export interface ProtocolInfo {
  endpoint: string | null;
  userId: string | null;
  clientId: string | null;
  connectionMethod: string | null;
  params: Record<string, unknown> | null;
  connected: boolean;
  sqliteCoreVersion: string | null;
  /** A label for the SDK behind the integration (e.g. `@powersync/web`, `powersync` (Dart)); null when unknown. */
  sdk: string | null;
}

// --- schema ---
//
// The schema crosses the wire as the SQLite core receives it: the exact JSON payload every SDK
// already sends to `powersync_replace_schema`. No SDK needs a second serializer for diagnostics.

export interface SchemaColumn {
  name: string;
  type: string;
}

export interface SchemaIndexColumn {
  name: string;
  ascending: boolean;
  type: string;
}

export interface SchemaIndex {
  name: string;
  columns: SchemaIndexColumn[];
}

export interface SchemaTable {
  name: string;
  /** The effective view name; equals `name` unless overridden. */
  view_name: string;
  columns: SchemaColumn[];
  indexes: SchemaIndex[];
  local_only: boolean;
  insert_only: boolean;
  /** Previous-value tracking: on/off, or the names of the tracked columns. */
  include_old: boolean | string[];
  include_old_only_when_changed: boolean;
  include_metadata: boolean;
  ignore_empty_update: boolean;
}

/** An application-managed table. Diagnostics reads only `name`; the other fields are core trigger options. */
export interface SchemaRawTable {
  name: string;
  [field: string]: unknown;
}

export interface SchemaPayload {
  tables: SchemaTable[];
  raw_tables: SchemaRawTable[];
}

// --- core diagnostics events ---

/**
 * The slice of the SQLite core's diagnostics event stream the tool consumes: per-bucket target
 * totals (`target_count`) and inferred schema changes. Emitted by the core when the client connects
 * with diagnostics enabled.
 */
export type CoreDiagnosticsEvent =
  | { BucketStateChange: { changes: { name: string; progress: { target_count: number } }[]; incremental?: boolean } }
  | { SchemaChange: unknown };

// --- actions ---

/** Control actions the tool can invoke on the live client. */
export type ActionName =
  | 'reconnect'
  | 'disconnect'
  | 'clearData'
  | 'requestCheckpoint'
  | 'subscribeStream'
  | 'unsubscribeStream';

/** Arguments for `subscribeStream` / `unsubscribeStream`. */
export interface StreamActionArgs {
  name: string;
  params?: Record<string, unknown>;
  /** Seconds. Defaults to 0 so a forgotten debug subscription is evicted once released. */
  ttl?: number;
  priority?: 0 | 1 | 2 | 3;
}

export interface ActionRequest {
  action: ActionName;
  args?: StreamActionArgs;
}
