/**
 * The Diagnostics Port contract.
 *
 * Everything the diagnostics UI needs collapses to this narrow, JSON-serializable surface:
 * a read/write SQL query, a handful of request/response calls, and a set of push channels.
 * The agent (next to a live PowerSync client) and the client (in the UI) exchange
 * {@link WireMessage}s that carry only plain data — never live SDK objects — so the same
 * contract works over a same-origin BroadcastChannel, an extension message bridge, or any
 * other duplex transport.
 */

/** Disposes a subscription or listener. */
export type Unsubscribe = () => void;

/** A serialized SQL result set. */
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

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

/** State for a single sync stream (edition 3 streams). */
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

/** Per-bucket download stats, read directly from the core `ps_buckets` table. */
export interface BucketState {
  name: string;
  downloadedOperations: number;
  /** Total operations for the current checkpoint, or null when not derivable without the checkpoint line. */
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

/** Connection metadata for the attached client. */
export interface PortInfo {
  endpoint: string | null;
  userId: string | null;
  clientId: string | null;
  connectionMethod: string | null;
  params: Record<string, unknown> | null;
  connected: boolean;
  sqliteCoreVersion: string | null;
  /** A label supplied by whoever installs the agent (e.g. `@powersync/web`); null when not provided. */
  sdk: string | null;
}

// The serialized schema types are the SDK's canonical ones, produced by `db.schema.serialize()`.
export type {
  SerializedColumn,
  SerializedIndex,
  SerializedIndexColumn,
  SerializedRawTable,
  SerializedSchema,
  SerializedTable,
  SerializedTrackPrevious
} from '@powersync/common';

/** Write/control actions the UI can invoke on the live client. */
export type ActionName = 'reconnect' | 'disconnect' | 'clearData' | 'subscribeStream' | 'unsubscribeStream';

export interface ActionRequest {
  action: ActionName;
  args?: unknown;
}

/** Push channels the agent streams to the client. */
export type Channel = 'status' | 'streams' | 'buckets' | 'logs' | 'uploadQueue';

export type RequestMethod = 'query' | 'getSchema' | 'getInfo' | 'getUploadQueueStats' | 'action';

export interface QueryParams {
  sql: string;
  params?: unknown[];
}

// --- wire messages ---

/** Presence handshake: each side announces itself so late joiners receive current state. */
export interface AnnounceMessage {
  type: 'announce';
  role: 'agent' | 'client';
}

export type RequestMessage =
  | { type: 'req'; id: string; method: 'query'; params: QueryParams }
  | { type: 'req'; id: string; method: 'getSchema' }
  | { type: 'req'; id: string; method: 'getInfo' }
  | { type: 'req'; id: string; method: 'getUploadQueueStats' }
  | { type: 'req'; id: string; method: 'action'; params: ActionRequest };

export interface ResponseMessage {
  type: 'res';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface SubscribeMessage {
  type: 'sub';
  channel: Channel;
}

export interface UnsubscribeMessage {
  type: 'unsub';
  channel: Channel;
}

export type EventMessage =
  | { type: 'event'; channel: 'status'; payload: SyncState }
  | { type: 'event'; channel: 'streams'; payload: StreamState[] }
  | { type: 'event'; channel: 'buckets'; payload: BucketState[] }
  | { type: 'event'; channel: 'uploadQueue'; payload: UploadQueueState }
  | { type: 'event'; channel: 'logs'; payload: LogRecord[] };

export type WireMessage =
  | AnnounceMessage
  | RequestMessage
  | ResponseMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | EventMessage;

/** The default BroadcastChannel name for same-origin transports. */
export const DEFAULT_CHANNEL_NAME = 'powersync-diagnostics';
