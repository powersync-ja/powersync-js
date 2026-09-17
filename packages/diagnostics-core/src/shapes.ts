/**
 * The data shapes of the Diagnostics Protocol.
 *
 * Every value that crosses from an SDK into the diagnostics tool is one of these. They are plain,
 * JSON-serializable data — no class instances, no live SDK objects — so the same shapes work for
 * every SDK and every host. This file deliberately imports nothing from any SDK package: the tool
 * owns these types, and each SDK maps its own objects onto them.
 *
 * Conventions: every time is epoch milliseconds; a value that does not apply is `null`; every
 * shape is plain JSON (strings, numbers, booleans, null, arrays, plain objects).
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
  /** Column names, in order. */
  columns: string[];
  /** One object per row, keyed by column name. */
  rows: Record<string, unknown>[];
  rowCount: number;
}

// --- sync status ---

/** Download progress expressed in operation counts. */
export interface ProgressState {
  downloadedOperations: number;
  totalOperations: number;
  /** `0` to `1`. */
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
  /** `count_at_last + count_since_last` from `ps_buckets`. */
  downloadedOperations: number;
  /** Total operations for the current checkpoint, or null when the core diagnostics stream is off. */
  totalOperations: number | null;
  /** Downloaded payload size in bytes, or null on cores that don't track it. */
  downloadedSize: number | null;
  lastOp: string | null;
  downloading: boolean;
}

/** Pending upload (CRUD) queue state. Recoverable in any SDK with SQL against `ps_crud`. */
export interface UploadQueueState {
  count: number;
  /** Byte size, or null when not computed. */
  size: number | null;
}

/** A captured client log line. */
export interface LogRecord {
  /** Epoch milliseconds. */
  timestamp: number;
  /** One of `trace`, `debug`, `info`, `warn`, `error`. */
  level: string;
  message: string;
  args?: unknown[];
}

// --- connection info ---

/** Connection metadata for the attached client. */
export interface ProtocolInfo {
  /** The PowerSync service endpoint. */
  endpoint: string | null;
  /** Derive from the token subject when the SDK does not expose it. */
  userId: string | null;
  /** The PowerSync client id. */
  clientId: string | null;
  /** For example `http` or `websocket`. */
  connectionMethod: string | null;
  /** Client parameters sent on connect. */
  params: Record<string, unknown> | null;
  connected: boolean;
  /** Core extension version, from `SELECT powersync_rs_version()`. */
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

/**
 * The schema as the SQLite core receives it: the exact JSON the client sends to
 * `powersync_replace_schema`. Every SDK already produces this, so `getSchema` costs no SDK a second
 * serializer.
 */
export interface SchemaPayload {
  tables: SchemaTable[];
  /** Application-managed tables. */
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

/**
 * Control actions the tool can invoke on the live client.
 *
 * | Action              | Args                       | Effect                                                                 |
 * | ------------------- | -------------------------- | ---------------------------------------------------------------------- |
 * | `reconnect`         |                            | Disconnect, then connect again with the last connector.                |
 * | `disconnect`        |                            | Disconnect the client.                                                 |
 * | `clearData`         |                            | Clear the local database, then connect again.                          |
 * | `requestCheckpoint` |                            | Confirm the client is caught up. Needs checkpoint requests enabled.    |
 * | `subscribeStream`   | {@link StreamActionArgs}   | Subscribe to a sync stream. `ttl` defaults to `0`.                     |
 * | `unsubscribeStream` | `{ name, params?, mode? }` | Release a subscription created with `subscribeStream` (`mode: 'release'`, the default, which starts its TTL), or drop every subscription to the stream so it stops syncing now (`mode: 'all'`). |
 * | `unsubscribeAllStreams` |                        | Drop every subscription made at runtime, on any stream. What a tool does when a session ends. |
 */
export const ACTION_NAMES = [
  'reconnect',
  'disconnect',
  'clearData',
  'requestCheckpoint',
  'subscribeStream',
  'unsubscribeStream',
  'unsubscribeAllStreams'
] as const;

/** One of {@link ACTION_NAMES}. Hosts that validate requests at a boundary build their check from that list, so it cannot drift from this type. */
export type ActionName = (typeof ACTION_NAMES)[number];

/**
 * How `unsubscribeStream` lets go of a stream: `release` lets go of the subscription the tool made,
 * and the stream stays until its TTL runs out; `all` drops every subscription to the stream, the
 * app's included, so it stops syncing now.
 */
export const UNSUBSCRIBE_MODES = ['release', 'all'] as const;

export type UnsubscribeMode = (typeof UNSUBSCRIBE_MODES)[number];

/** Arguments for `subscribeStream` / `unsubscribeStream`. */
export interface StreamActionArgs {
  name: string;
  params?: Record<string, unknown>;
  /** Seconds. Defaults to 0 so a forgotten debug subscription is evicted once released. */
  ttl?: number;
  priority?: 0 | 1 | 2 | 3;
  /** For `unsubscribeStream`. Defaults to `release`. */
  mode?: UnsubscribeMode;
}

/** A control action and its arguments (only the stream actions take any). */
export interface ActionRequest {
  action: ActionName;
  args?: StreamActionArgs;
}
