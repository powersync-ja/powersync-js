import type {
  CommonPowerSyncDatabase,
  LogRecord as SdkLogRecord,
  PowerSyncBackendConnector,
  SyncOptions,
  SyncStatus,
  SyncStreamSubscription
} from '@powersync/common';
import type {
  ActionRequest,
  BucketState,
  CoreDiagnosticsEvent,
  DiagnosticsEvent,
  LogRecord,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  SdkIntegration,
  StreamActionArgs,
  SyncState,
  Unsubscribe,
  UploadQueueState
} from '@powersync/diagnostics-core';
import { toStreamStates, toSyncState } from './sync-state.js';

/** Delivers the SQLite core's diagnostics events to the agent. How they arrive is runtime-specific. */
export interface CoreEventSource {
  onEvent(handler: (event: CoreDiagnosticsEvent) => void): Unsubscribe;
  dispose(): void;
}

/**
 * Read access to the live connection. The connector and options are not on the database's public
 * interface, so the code that installs the agent (which can see the concrete database) hands them in.
 */
export interface ConnectionAccess {
  getConnector(): PowerSyncBackendConnector | null;
  getConnectionOptions(): SyncOptions | null;
}

export interface JsAgentOptions {
  /** A label for the SDK behind this agent, e.g. `@powersync/web`. */
  sdk?: string;
  /** Debounce for re-reading bucket stats after internal-table changes. */
  bucketThrottleMs?: number;
  /** Core diagnostics events (per-bucket `target_count`). Omit when core diagnostics are off. */
  coreEvents?: CoreEventSource;
  /** Read access to the live connection; omit if the runtime cannot expose it. */
  connection?: ConnectionAccess;
}

/**
 * The JavaScript `SdkIntegration`: runs next to a live PowerSync database and answers the protocol
 * from it. Every status change is pushed as mapped state; requests are answered by querying the
 * live client. Hosts reach it through a bridge or call it directly when they share the page.
 */
export class JsAgent implements SdkIntegration {
  private handlers = new Set<(event: DiagnosticsEvent) => void>();
  private disposers: Array<() => void> = [];
  private started = false;
  /** Debug subscriptions created through `action`, keyed by name + params, so they can be released. */
  private streamHandles = new Map<string, SyncStreamSubscription>();
  // Retained so reconnect / clear work after a disconnect, when the connection no longer exposes them.
  private lastConnector: PowerSyncBackendConnector | null = null;
  private lastConnectionOptions: SyncOptions | null = null;
  // Per-bucket total operation counts from the core diagnostics stream (not stored in ps_buckets).
  private bucketTargets = new Map<string, number>();

  constructor(
    private db: CommonPowerSyncDatabase,
    private options: JsAgentOptions = {}
  ) {}

  // --- SdkIntegration ---

  async runQuery({ sql, params }: QueryParams): Promise<QueryResult> {
    const rows = await this.db.getAll<Record<string, unknown>>(sql, params);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, rowCount: rows.length };
  }

  async getSchema(): Promise<SchemaPayload> {
    // The core payload: what the client already sends to `powersync_replace_schema`.
    return this.db.schema.toJSON() as SchemaPayload;
  }

  async getInfo(): Promise<ProtocolInfo> {
    const connection = this.options.connection;

    let endpoint: string | null = null;
    let userId: string | null = null;
    try {
      const credentials = await connection?.getConnector()?.fetchCredentials();
      endpoint = credentials?.endpoint ?? null;
      userId = credentials?.token ? decodeJwtSubject(credentials.token) : null;
    } catch {
      // Credentials are unavailable before connect().
    }

    let clientId: string | null = null;
    try {
      clientId = await this.db.getClientId();
    } catch {
      // Non-fatal.
    }

    let sqliteCoreVersion: string | null = null;
    try {
      const [row] = await this.db.getAll<{ v: string }>('SELECT powersync_rs_version() AS v');
      sqliteCoreVersion = row?.v ?? null;
    } catch {
      // Non-fatal.
    }

    const connectionOptions = connection?.getConnectionOptions() ?? null;
    return {
      endpoint,
      userId,
      clientId,
      connectionMethod: connectionOptions?.connectionMethod ?? null,
      params: connectionOptions?.params ?? null,
      connected: this.db.currentStatus?.connected ?? false,
      sqliteCoreVersion,
      sdk: this.options.sdk ?? null
    };
  }

  async currentSyncStatus(): Promise<SyncState> {
    return toSyncState(this.db.currentStatus);
  }

  async getUploadQueueStats(): Promise<UploadQueueState> {
    const stats = await this.db.getUploadQueueStats(true);
    return { count: stats.count, size: stats.size ?? null };
  }

  async observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe> {
    this.handlers.add(handler);
    this.start();
    // A late subscriber receives the present state at once.
    this.replay(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async action(request: ActionRequest): Promise<void> {
    switch (request.action) {
      case 'disconnect':
        await this.db.disconnect();
        break;
      case 'clearData':
        await this.db.disconnectAndClear();
        await this.reconnect();
        break;
      case 'reconnect':
        await this.db.disconnect();
        await this.reconnect();
        break;
      case 'requestCheckpoint': {
        // Confirms the client is caught up right now. Needs `checkpointMode: 'requests'` on connect.
        const checkpoint = await this.db.requestCheckpoint();
        await checkpoint.waitForSync({ signal: AbortSignal.timeout(120_000) });
        break;
      }
      case 'subscribeStream': {
        const { name, params, ttl, priority } = request.args as StreamActionArgs;
        // TTL defaults to 0 so a forgotten debug subscription is evicted as soon as it is released.
        const handle = await this.db.syncStream(name, params).subscribe({ ttl: ttl ?? 0, priority });
        this.streamHandles.set(streamKey(name, params), handle);
        break;
      }
      case 'unsubscribeStream': {
        const { name, params } = request.args as StreamActionArgs;
        const key = streamKey(name, params);
        this.streamHandles.get(key)?.unsubscribe();
        this.streamHandles.delete(key);
        break;
      }
    }
  }

  async close(): Promise<void> {
    for (const handle of this.streamHandles.values()) {
      handle.unsubscribe();
    }
    this.streamHandles.clear();
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers = [];
    this.handlers.clear();
    this.started = false;
  }

  // --- push bridge ---

  private start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.disposers.push(
      this.db.registerListener({
        statusChanged: (status: SyncStatus) => {
          this.captureConnection();
          this.pushStatus(status);
          void this.pushUploadQueue();
          void this.pushBuckets();
        }
      })
    );
    this.captureConnection();

    if (this.options.coreEvents) {
      const source = this.options.coreEvents;
      this.disposers.push(source.onEvent((event) => this.handleCoreEvent(event)));
      this.disposers.push(() => source.dispose());
    }

    this.captureLogs();

    // Re-read bucket stats when internal tables change.
    this.disposers.push(
      this.db.onChangeWithCallback(
        { onChange: () => void this.pushBuckets() },
        { tables: ['ps_buckets', 'ps_oplog', 'ps_crud'], throttleMs: this.options.bucketThrottleMs ?? 300 }
      )
    );
  }

  private replay(handler: (event: DiagnosticsEvent) => void): void {
    const status = this.db.currentStatus;
    handler({ type: 'status', payload: toSyncState(status) });
    handler({ type: 'streams', payload: toStreamStates(status) });
    void this.getUploadQueueStats()
      .then((payload) => handler({ type: 'uploadQueue', payload }))
      .catch(() => {});
    void this.readBuckets()
      .then((payload) => handler({ type: 'buckets', payload }))
      .catch(() => {});
  }

  private emit(event: DiagnosticsEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // One failing subscriber must not break the others.
      }
    }
  }

  private pushStatus(status: SyncStatus): void {
    this.emit({ type: 'status', payload: toSyncState(status) });
    this.emit({ type: 'streams', payload: toStreamStates(status) });
  }

  private async pushUploadQueue(): Promise<void> {
    try {
      this.emit({ type: 'uploadQueue', payload: await this.getUploadQueueStats() });
    } catch {
      // Non-fatal: queue stats are best-effort.
    }
  }

  private async pushBuckets(): Promise<void> {
    try {
      this.emit({ type: 'buckets', payload: await this.readBuckets() });
    } catch {
      // Non-fatal: the diagnostic tables may not exist yet.
    }
  }

  private async readBuckets(): Promise<BucketState[]> {
    const downloading = this.db.currentStatus?.downloading ?? false;
    const withSize =
      'SELECT name, count_at_last + count_since_last AS ops, downloaded_size AS size, last_op FROM ps_buckets ORDER BY name';
    const withoutSize = 'SELECT name, count_at_last + count_since_last AS ops, last_op FROM ps_buckets ORDER BY name';

    let rows: Record<string, unknown>[];
    try {
      rows = await this.db.getAll(withSize);
    } catch {
      // `downloaded_size` is absent on older cores.
      rows = await this.db.getAll(withoutSize);
    }

    return rows.map((row) => {
      const name = String(row.name);
      return {
        name,
        downloadedOperations: Number(row.ops) || 0,
        totalOperations: this.bucketTargets.get(name) ?? null,
        downloadedSize: row.size == null ? null : Number(row.size),
        lastOp: row.last_op == null ? null : String(row.last_op),
        downloading
      };
    });
  }

  /** Wraps `db.logger.log` so every SDK log record is forwarded; restored on close. */
  private captureLogs(): void {
    const logger = this.db.logger;
    if (!logger || typeof logger.log !== 'function') {
      return;
    }
    const original = logger.log.bind(logger);
    logger.log = (record) => {
      original(record);
      try {
        this.pushLog(record);
      } catch {
        // Never let diagnostics break the app's logging.
      }
    };
    this.disposers.push(() => {
      logger.log = original;
    });
  }

  private pushLog(record: SdkLogRecord): void {
    const entry: LogRecord = {
      timestamp: Date.now(),
      level: logLevelName(record.level),
      message: record.message,
      args: record.error == null ? undefined : [record.error instanceof Error ? record.error.message : record.error]
    };
    this.emit({ type: 'logs', payload: [entry] });
  }

  private handleCoreEvent(event: CoreDiagnosticsEvent): void {
    this.emit({ type: 'core', payload: event });
    if ('BucketStateChange' in event) {
      for (const bucket of event.BucketStateChange.changes) {
        this.bucketTargets.set(bucket.name, bucket.progress.target_count);
      }
      void this.pushBuckets();
    }
  }

  private captureConnection(): void {
    const connection = this.options.connection;
    const connector = connection?.getConnector() ?? null;
    if (connector) {
      this.lastConnector = connector;
      this.lastConnectionOptions = connection?.getConnectionOptions() ?? null;
    }
  }

  private async reconnect(): Promise<void> {
    if (this.lastConnector) {
      await this.db.connect(this.lastConnector, this.lastConnectionOptions ?? undefined);
    }
  }
}

function streamKey(name: string, params?: Record<string, unknown>): string {
  return `${name}|${JSON.stringify(params ?? null)}`;
}

/** Maps a numeric SDK log level to its name. */
function logLevelName(level: number): string {
  if (level >= 50) return 'error';
  if (level >= 40) return 'warn';
  if (level >= 30) return 'info';
  if (level >= 20) return 'debug';
  return 'trace';
}

function decodeJwtSubject(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload)) as { sub?: unknown };
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}
