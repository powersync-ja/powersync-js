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
 * | `newLogs`     | {@link LogRecord}[]    | The SDK logs. Not replayed to late subscribers.             |
 * | `core`        | {@link CoreDiagnosticsEvent} | The SQLite core emits a diagnostics event.            |
 */
export type DiagnosticsEvent =
  | { type: 'status'; payload: SyncState }
  | { type: 'streams'; payload: StreamState[] }
  | { type: 'buckets'; payload: BucketState[] }
  | { type: 'uploadQueue'; payload: UploadQueueState }
  | { type: 'newLogs'; payload: LogRecord[] }
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

  /**
   * Subscribes to pushed state (see {@link DiagnosticsEvent}). Resolves once the subscription is
   * in place, with a function that removes it.
   *
   * The implementation must emit the current `status`, `streams`, `buckets` and `uploadQueue`
   * snapshots promptly after subscribing. That is how a subscriber reads the present state; there
   * is no request for it.
   */
  observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe>;

  /** Runs a control action (see {@link ActionRequest}). */
  action(request: ActionRequest): Promise<void>;

  /** Releases everything the integration holds: listeners, debug stream subscriptions, connections. */
  close(): Promise<void>;
}

/** One database a multi-source host serves. */
export interface DiagnosticsSource {
  id: string;
  /** A label for the SDK behind it, e.g. `@powersync/web`. */
  sdk: string | null;
}

/**
 * An {@link SdkIntegration} that fronts several databases and can switch between them.
 *
 * A host that multiplexes databases (a dev server that several app tabs and node processes attach to)
 * implements this on top of the base interface. Its methods act on the selected source, or on the
 * first one while none is selected. Hosts with one fixed database implement the base interface only;
 * the UI checks with {@link hasSources} and shows a picker and an empty state only when they apply.
 */
export interface SourceAwareIntegration extends SdkIntegration {
  /**
   * Subscribes to the list of attached databases. Emits the current list promptly after
   * subscribing and again whenever a database attaches or detaches.
   */
  observeSources(handler: (sources: DiagnosticsSource[]) => void): Promise<Unsubscribe>;
  /** Selects the database the other methods act on; `null` means the first attached one. */
  selectSource(sourceId: string | null): Promise<void>;
}

/** Whether `integration` fronts several databases (see {@link SourceAwareIntegration}). */
export function hasSources(integration: SdkIntegration): integration is SourceAwareIntegration {
  return typeof (integration as Partial<SourceAwareIntegration>).observeSources === 'function';
}
