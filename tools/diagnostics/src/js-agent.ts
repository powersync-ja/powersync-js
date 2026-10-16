import type {
  CommonPowerSyncDatabase,
  LogLevels,
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
 * Read access to a database's live connection. The connector and options are not on the database's
 * public interface, so the code that installs the agent (which can see the concrete class) reads them.
 */
export interface ConnectionAccess {
  getConnector(db: CommonPowerSyncDatabase): PowerSyncBackendConnector | null;
  getConnectionOptions(db: CommonPowerSyncDatabase): SyncOptions | null;
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
  /**
   * Rarely appropriate. Answers the `clearData` action by replacing the database with an empty one.
   * A host that can delete the database files provides it: dropping files takes milliseconds at any
   * size, where the default, `disconnectAndClear()`, deletes row by row. The agent has let go of the
   * old database when this is called, and requests made meanwhile wait for the replacement. If it
   * throws, the agent keeps the old database. If the agent is closed meanwhile, it does not connect
   * the replacement.
   *
   * Only for an ephemeral client, such as the dashboard's. Deleting the files gives the replacement a
   * new client id, which `disconnectAndClear()` preserves. The client id distinguishes one user's
   * clients, so a new one reads as a new client and orphans backend state keyed to the old, such as
   * custom write checkpoints. A real app should leave this unset.
   */
  reset?: () => Promise<CommonPowerSyncDatabase>;
}

/**
 * The JavaScript `SdkIntegration`: runs next to a live PowerSync database and answers the protocol
 * from it. Every status change is pushed as mapped state; requests are answered by querying the
 * live client. Hosts reach it through a bridge or call it directly when they share the page.
 */
export class JsAgent implements SdkIntegration {
  /**
   * The database the agent serves, awaited by every request. While a reset runs, this is the pending
   * replacement. It never rejects: a failed reset leaves it on the database the agent had.
   */
  private database: Promise<CommonPowerSyncDatabase>;
  /** The database the listeners are on, or null while detached. Reads from any other are dropped. */
  private attached: CommonPowerSyncDatabase | null = null;
  private closed = false;
  private handlers = new Set<(event: DiagnosticsEvent) => void>();
  private disposers: Array<() => void> = [];
  /** Debug subscriptions created through `action`, keyed by name + params, so they can be released. */
  private streamHandles = new Map<string, SyncStreamSubscription>();
  // Retained so reconnect / clear work after a disconnect, when the connection no longer exposes them.
  private lastConnector: PowerSyncBackendConnector | null = null;
  private lastConnectionOptions: SyncOptions | null = null;
  // Per-bucket total operation counts from the core diagnostics stream (not stored in ps_buckets).
  private bucketTargets = new Map<string, number>();

  constructor(
    db: CommonPowerSyncDatabase,
    private options: JsAgentOptions = {}
  ) {
    this.database = Promise.resolve(db);
  }

  // --- SdkIntegration ---

  async runQuery({ sql, params }: QueryParams): Promise<QueryResult> {
    const db = await this.database;
    const records = await db.getAll<Record<string, unknown>>(sql, params);
    const columns = records.length > 0 ? Object.keys(records[0]) : [];
    return { columns, rows: records.map((record) => columns.map((column) => record[column])) };
  }

  async getSchema(): Promise<SchemaPayload> {
    const db = await this.database;
    // The core payload: what the client already sends to `powersync_replace_schema`.
    return db.schema.toJSON() as SchemaPayload;
  }

  async getInfo(): Promise<ProtocolInfo> {
    const db = await this.database;
    const connection = this.options.connection;

    let endpoint: string | null = null;
    let token: string | null = null;
    try {
      const credentials = await connection?.getConnector(db)?.fetchCredentials();
      endpoint = credentials?.endpoint ?? null;
      token = credentials?.token ?? null;
    } catch {
      // Credentials are unavailable before connect().
    }

    let clientId: string | null = null;
    try {
      clientId = await db.getClientId();
    } catch {
      // Non-fatal.
    }

    let sqliteCoreVersion: string | null = null;
    try {
      const [row] = await db.getAll<{ v: string }>('SELECT powersync_rs_version() AS v');
      sqliteCoreVersion = row?.v ?? null;
    } catch {
      // Non-fatal.
    }

    const connectionOptions = connection?.getConnectionOptions(db) ?? null;
    return {
      endpoint,
      token,
      clientId,
      connectionMethod: connectionOptions?.connectionMethod ?? null,
      params: connectionOptions?.params ?? null,
      connected: db.currentStatus?.connected ?? false,
      sqliteCoreVersion,
      sdk: this.options.sdk ?? null
    };
  }

  async observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe> {
    const db = await this.database;
    this.handlers.add(handler);
    this.start(db);
    // A late subscriber receives the present state at once.
    this.replay(db, handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async action(request: ActionRequest): Promise<void> {
    const db = await this.database;
    switch (request.action) {
      case 'disconnect':
        await db.disconnect();
        break;
      case 'clearData':
        if (this.options.reset) {
          await this.replaceDatabase(this.options.reset);
        } else {
          await db.disconnectAndClear();
        }
        // A later clear may be replacing the database already; this waits for it and connects the newest.
        await this.reconnect(await this.database);
        break;
      case 'reconnect':
        await db.disconnect();
        await this.reconnect(db);
        break;
      case 'requestCheckpoint': {
        // Confirms the client is caught up right now. Needs `checkpointMode: 'requests'` on connect.
        const checkpoint = await db.requestCheckpoint();
        await checkpoint.waitForSync({ signal: AbortSignal.timeout(120_000) });
        break;
      }
      case 'subscribeStream': {
        const { name, params, ttl, priority } = request.args as StreamActionArgs;
        // TTL defaults to 0 so a forgotten debug subscription is evicted as soon as it is released.
        const handle = await db.syncStream(name, params).subscribe({ ttl: ttl ?? 0, priority });
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
    this.closed = true;
    this.detach();
    this.options.coreEvents?.dispose();
    this.handlers.clear();
  }

  /** Lets go of the database: debug subscriptions, listeners and the log capture. Subscribers stay. */
  private detach(): void {
    for (const handle of this.streamHandles.values()) {
      handle.unsubscribe();
    }
    this.streamHandles.clear();
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers = [];
    this.attached = null;
  }

  /** Swaps the database for the empty one `reset` returns. Requests made meanwhile wait for the swap. */
  private async replaceDatabase(reset: () => Promise<CommonPowerSyncDatabase>): Promise<void> {
    const previous = this.database;
    const replacement = this.release(previous).then(() => reset());
    // If the swap fails, the agent carries on with the old database, so the clear can be retried.
    const current = replacement.catch(() => previous);
    this.database = current;
    this.resume(await current);
    await replacement;
  }

  /** Disconnects the database and drops the agent's listeners on it. */
  private async release(database: Promise<CommonPowerSyncDatabase>): Promise<void> {
    const db = await database;
    await db.disconnect();
    this.detach();
    this.bucketTargets.clear();
  }

  /** Listens on `db` again and brings every subscriber up to date. */
  private resume(db: CommonPowerSyncDatabase): void {
    if (this.handlers.size === 0) {
      return;
    }
    this.start(db);
    for (const handler of this.handlers) {
      this.replay(db, handler);
    }
  }

  // --- push bridge ---

  /** Listens on `db` until `detach()`. Every listener reads the database it was attached to. */
  private start(db: CommonPowerSyncDatabase): void {
    if (this.attached || this.closed) {
      return;
    }
    this.attached = db;

    this.disposers.push(
      db.registerListener({
        statusChanged: (status: SyncStatus) => {
          this.captureConnection(db);
          this.pushStatus(status);
          void this.pushUploadQueue(db);
          void this.pushBuckets(db);
        }
      })
    );
    this.captureConnection(db);

    if (this.options.coreEvents) {
      // The source outlives a reset; it is disposed with the agent.
      this.disposers.push(this.options.coreEvents.onEvent((event) => this.handleCoreEvent(event)));
    }

    this.captureLogs(db);

    // Re-read bucket stats and the upload queue when internal tables change, so a local write shows up
    // before the sync status moves.
    this.disposers.push(
      db.onChangeWithCallback(
        {
          onChange: () => {
            void this.pushBuckets(db);
            void this.pushUploadQueue(db);
          }
        },
        { tables: ['ps_buckets', 'ps_oplog', 'ps_crud'], throttleMs: this.options.bucketThrottleMs ?? 300 }
      )
    );
  }

  private replay(db: CommonPowerSyncDatabase, handler: (event: DiagnosticsEvent) => void): void {
    const status = db.currentStatus;
    handler({ type: 'status', payload: toSyncState(status) });
    handler({ type: 'streams', payload: toStreamStates(status) });
    void this.readUploadQueue(db)
      .then((payload) => {
        if (this.attached === db) handler({ type: 'uploadQueue', payload });
      })
      .catch(() => {});
    void this.readBuckets(db)
      .then((payload) => {
        if (this.attached === db) handler({ type: 'buckets', payload });
      })
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

  private async readUploadQueue(db: CommonPowerSyncDatabase): Promise<UploadQueueState> {
    const stats = await db.getUploadQueueStats(true);
    return { count: stats.count, size: stats.size ?? null };
  }

  private async pushUploadQueue(db: CommonPowerSyncDatabase): Promise<void> {
    try {
      const payload = await this.readUploadQueue(db);
      // A read that finishes after a reset describes the database the agent has let go of.
      if (this.attached === db) this.emit({ type: 'uploadQueue', payload });
    } catch {
      // Non-fatal: queue stats are best-effort.
    }
  }

  private async pushBuckets(db: CommonPowerSyncDatabase): Promise<void> {
    try {
      const payload = await this.readBuckets(db);
      if (this.attached === db) this.emit({ type: 'buckets', payload });
    } catch {
      // Non-fatal: the diagnostic tables may not exist yet.
    }
  }

  private async readBuckets(db: CommonPowerSyncDatabase): Promise<BucketState[]> {
    const downloading = db.currentStatus?.downloading ?? false;
    const withSize =
      'SELECT name, count_at_last + count_since_last AS ops, downloaded_size AS size, last_op FROM ps_buckets ORDER BY name';
    const withoutSize = 'SELECT name, count_at_last + count_since_last AS ops, last_op FROM ps_buckets ORDER BY name';

    let rows: Record<string, unknown>[];
    try {
      rows = await db.getAll(withSize);
    } catch {
      // `downloaded_size` is absent on older cores.
      rows = await db.getAll(withoutSize);
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

  /** Wraps `db.logger.log` so every SDK log record is forwarded; restored on detach. */
  private captureLogs(db: CommonPowerSyncDatabase): void {
    const logger = db.logger;
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
    this.emit({ type: 'newLogs', payload: [entry] });
  }

  private handleCoreEvent(event: CoreDiagnosticsEvent): void {
    this.emit({ type: 'core', payload: event });
    if ('BucketStateChange' in event) {
      for (const bucket of event.BucketStateChange.changes) {
        this.bucketTargets.set(bucket.name, bucket.progress.target_count);
      }
      // While detached for a reset, the targets are kept and the replay afterwards reads the buckets.
      if (this.attached) {
        void this.pushBuckets(this.attached);
      }
    }
  }

  private captureConnection(db: CommonPowerSyncDatabase): void {
    const connection = this.options.connection;
    const connector = connection?.getConnector(db) ?? null;
    if (connector) {
      this.lastConnector = connector;
      this.lastConnectionOptions = connection?.getConnectionOptions(db) ?? null;
    }
  }

  private async reconnect(db: CommonPowerSyncDatabase): Promise<void> {
    // Once closed, the host owns the database; connecting it would start a sync nobody stops.
    if (this.lastConnector && !this.closed) {
      await db.connect(this.lastConnector, this.lastConnectionOptions ?? undefined);
    }
  }
}

function streamKey(name: string, params?: Record<string, unknown>): string {
  return `${name}|${JSON.stringify(params ?? null)}`;
}

// The SDK's log levels. `typeof LogLevels` makes the compiler hold these to the values in
// `@powersync/common`, which stays a type-only import because it is an optional peer.
const LOG_LEVELS: typeof LogLevels = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };

/** Maps a numeric SDK log level to its name. */
function logLevelName(level: number): string {
  if (level >= LOG_LEVELS.error) return 'error';
  if (level >= LOG_LEVELS.warn) return 'warn';
  if (level >= LOG_LEVELS.info) return 'info';
  if (level >= LOG_LEVELS.debug) return 'debug';
  return 'trace';
}
