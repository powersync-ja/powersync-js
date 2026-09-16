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
 *
 * When each event is emitted:
 *
 * | `type`        | `payload`              | When                                                        |
 * | ------------- | ---------------------- | ----------------------------------------------------------- |
 * | `status`      | {@link SyncState}      | The sync status changes.                                    |
 * | `streams`     | {@link StreamState}[]  | The sync status changes.                                    |
 * | `buckets`     | {@link BucketState}[]  | An internal table changes, or a core event updates a total. |
 * | `uploadQueue` | {@link UploadQueueState} | The sync status or `ps_crud` changes.                     |
 * | `logs`        | {@link LogRecord}[]    | The SDK logs. Not replayed to late subscribers.             |
 * | `core`        | {@link CoreDiagnosticsEvent} | The SQLite core emits a diagnostics event.            |
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
 * the web, a Dart class over the VM service in Flutter DevTools, an RPC client for a server process.
 * Transport is the implementation's concern: request/response correlation, connection, and
 * reconnection all happen behind these methods, never in the tool. Every method is asynchronous so
 * the interface can sit directly on an RPC boundary.
 *
 * Every value returned or emitted is plain JSON data (see `shapes.ts`). `runQuery` is the universal
 * substrate: the core's internal `ps_*` tables are identical in every SDK, so SQL over the interface
 * reads bucket, oplog, and CRUD state the same way everywhere.
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
   * Subscribes to pushed state (see {@link DiagnosticsEvent}). Resolves once the subscription is
   * in place, with a function that removes it.
   *
   * The implementation must emit the current `status`, `streams`, `buckets` and `uploadQueue`
   * snapshots promptly after subscribing, so a UI that attaches late receives the present state
   * without a separate request.
   */
  observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe>;

  /** Runs a control action (see {@link ActionRequest}). */
  action(request: ActionRequest): Promise<void>;

  /** Releases everything the integration holds: listeners, debug stream subscriptions, connections. */
  close(): Promise<void>;
}
