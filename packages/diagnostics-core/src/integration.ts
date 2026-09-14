import type {
  ActionRequest,
  BucketState,
  CoreDiagnosticsEvent,
  LogRecord,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  StreamState,
  SyncState,
  Unsubscribe,
  UploadQueueState
} from './shapes.js';

/**
 * An event pushed from an SDK to the tool.
 *
 * Reactivity never crosses a process or realm boundary on its own, so the SDK side pushes a fresh
 * serialized snapshot on every change and the UI rebuilds its own state from this stream. Snapshots
 * are already mapped to the protocol shapes; the UI never sees an SDK's native status object.
 */
export type DiagnosticsEvent =
  | { type: 'status'; payload: SyncState }
  | { type: 'streams'; payload: StreamState[] }
  | { type: 'buckets'; payload: BucketState[] }
  | { type: 'uploadQueue'; payload: UploadQueueState }
  | { type: 'logs'; payload: LogRecord[] }
  | { type: 'core'; payload: CoreDiagnosticsEvent };

/**
 * The seam between the diagnostics tool and any PowerSync SDK.
 *
 * The tool (`diagnostics-core` + `diagnostics-ui`) depends only on this interface. Each environment
 * provides one implementation using whatever it already has: a JS class next to the live database on
 * the web, a Dart class over the VM service in Flutter DevTools, a WebSocket client for a server
 * process. Transport is the implementation's concern — request/response correlation, connection, and
 * reconnection all happen behind these methods, never in the tool.
 *
 * Every value returned or emitted is plain JSON data (see `shapes.ts`).
 */
export interface SdkIntegration {
  /** Runs read or write SQL against the live database. The universal way to read `ps_*` state. */
  runQuery(params: QueryParams): Promise<QueryResult>;

  /** The schema as the SQLite core receives it (the `powersync_replace_schema` payload). */
  getSchema(): Promise<SchemaPayload>;

  /** Endpoint, user, client id, connection method and params, core version. */
  getInfo(): Promise<ProtocolInfo>;

  /** The current sync status, mapped to the protocol shape. */
  currentSyncStatus(): Promise<SyncState>;

  /** Pending upload (CRUD) operations. */
  getUploadQueueStats(): Promise<UploadQueueState>;

  /**
   * Subscribes to pushed state. The implementation must emit the current `status`, `streams`,
   * `buckets` and `uploadQueue` snapshots promptly after subscribing, so a UI that attaches late
   * receives the present state without a separate request.
   */
  observeEvents(handler: (event: DiagnosticsEvent) => void): Unsubscribe;

  /** Runs a control action (reconnect, clear, stream subscribe/unsubscribe, checkpoint request). */
  action(request: ActionRequest): Promise<void>;

  /** Releases everything the integration holds: listeners, debug stream subscriptions, connections. */
  close(): Promise<void>;
}
