/*
 * A fake SdkIntegration for the isolated playground. It answers the protocol with canned data and
 * simulates a short download so the UI is lively. It knows nothing about any SDK: the UI package's
 * only contract is the protocol, and this is the protocol side.
 */
import type {
  ActionRequest,
  BucketState,
  DiagnosticsEvent,
  LogRecord,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  SdkIntegration,
  StreamActionArgs,
  StreamState,
  SyncState,
  Unsubscribe,
  UploadQueueState
} from '@powersync/diagnostics-core';

const SCHEMA: SchemaPayload = {
  tables: [
    {
      name: 'tasks',
      view_name: 'tasks',
      local_only: false,
      insert_only: false,
      include_old: false,
      include_old_only_when_changed: false,
      include_metadata: true,
      ignore_empty_update: false,
      columns: [
        { name: 'description', type: 'TEXT' },
        { name: 'completed', type: 'INTEGER' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'list_id', type: 'TEXT' }
      ],
      indexes: [{ name: 'by_user', columns: [{ name: 'user_id', ascending: true, type: 'TEXT' }] }]
    },
    {
      name: 'lists',
      view_name: 'lists',
      local_only: false,
      insert_only: false,
      include_old: false,
      include_old_only_when_changed: false,
      include_metadata: false,
      ignore_empty_update: false,
      columns: [
        { name: 'name', type: 'TEXT' },
        { name: 'owner_id', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' }
      ],
      indexes: []
    },
    {
      name: 'drafts',
      view_name: 'drafts',
      local_only: true,
      insert_only: false,
      include_old: false,
      include_old_only_when_changed: false,
      include_metadata: false,
      ignore_empty_update: true,
      columns: [
        { name: 'body', type: 'TEXT' },
        { name: 'updated_at', type: 'INTEGER' }
      ],
      indexes: []
    }
  ],
  raw_tables: []
};

const UPLOAD_QUEUE: UploadQueueState = { count: 1543, size: 812345 };

/** Rows for the Data Inspector. Not a SQL engine: it pattern-matches the query text. */
function fakeRows(sql: string): Record<string, unknown>[] {
  // Reject obviously invalid SQL so the error path is demonstrable (a real client surfaces SQLite errors).
  const head = sql.trim().split(/[\s(]/)[0].toLowerCase();
  if (!['select', 'with', 'pragma', 'explain'].includes(head)) {
    throw new Error(`near "${sql.trim().split(/\s+/)[0] || ''}": syntax error`);
  }
  if (/sqlite_master/i.test(sql)) {
    return [
      { name: 'tasks', type: 'view' },
      { name: 'lists', type: 'view' },
      { name: 'drafts', type: 'view' },
      { name: 'ps_buckets', type: 'table' },
      { name: 'ps_crud', type: 'table' },
      { name: 'ps_oplog', type: 'table' },
      { name: 'ps_kv', type: 'table' },
      { name: 'ps_untyped', type: 'table' }
    ];
  }
  if (/ps_oplog/i.test(sql)) {
    const types = ['todos', 'lists', 'users'];
    return Array.from({ length: 60 }, (_, index) => ({
      op_id: 5000 - index,
      row_type: types[index % types.length],
      row_id: `row-${(index * 13 + 5).toString(16)}`,
      data: JSON.stringify({ description: `Row ${index}`, completed: index % 2, priority: index % 4 })
    }));
  }
  if (/ps_buckets/i.test(sql)) {
    return [
      { name: 'user_tasks[]', ops: 142, size: 48213, last_op: '1042' },
      { name: 'global[]', ops: 18, size: 3120, last_op: '88' }
    ];
  }
  if (/count\(\*\)/i.test(sql) && /ps_crud/i.test(sql)) {
    return [{ n: UPLOAD_QUEUE.count }];
  }
  if (/ps_crud/i.test(sql)) {
    const ops = ['PUT', 'PATCH', 'DELETE'];
    const tables = ['todos', 'lists', 'users', 'comments'];
    // Oldest first (lowest id = next to upload), matching a real ps_crud ORDER BY id.
    return Array.from({ length: UPLOAD_QUEUE.count }, (_, index) => {
      const op = ops[index % ops.length];
      const type = tables[index % tables.length];
      const rowId = `row-${(index * 7 + 3).toString(16)}`;
      const data =
        op === 'DELETE'
          ? { op, type, id: rowId }
          : { op, type, id: rowId, data: { description: `Item ${index}`, completed: index % 2, priority: index % 4 } };
      return { id: 4200 + index, op, tbl: type, data: JSON.stringify(data) };
    });
  }
  return [
    { id: 'a1', description: 'Buy milk', completed: 0, user_id: 'mock-user-123' },
    { id: 'b2', description: 'Ship diagnostics POC', completed: 1, user_id: 'mock-user-123' }
  ];
}

function stream(overrides: Partial<StreamState> & { name: string }): StreamState {
  return {
    priority: 3,
    active: true,
    autoSubscribed: false,
    explicitlySubscribed: true,
    progress: null,
    params: null,
    expiresAt: null,
    hasSynced: false,
    lastSyncedAt: null,
    ...overrides
  };
}

function streamKey(name: string, params?: Record<string, unknown> | null): string {
  return `${name}|${JSON.stringify(params ?? null)}`;
}

export class MockIntegration implements SdkIntegration {
  private handlers = new Set<(event: DiagnosticsEvent) => void>();
  private connected = true;
  private downloading = false;
  private hasSynced = true;
  private downloadProgress: SyncState['downloadProgress'] = null;
  private streams: StreamState[] = [
    stream({
      name: 'user_tasks',
      autoSubscribed: true,
      explicitlySubscribed: false,
      hasSynced: true,
      lastSyncedAt: Date.now()
    }),
    stream({
      name: 'project_docs',
      priority: 1,
      params: { project_id: 'p-42' },
      expiresAt: Date.now() + 3_600_000,
      progress: { downloadedOperations: 45, totalOperations: 120, downloadedFraction: 45 / 120 }
    }),
    stream({
      name: 'comments',
      priority: 2,
      active: false,
      expiresAt: Date.now() + 120_000,
      hasSynced: true,
      lastSyncedAt: Date.now() - 5000
    })
  ];
  // Totals arrive through the core diagnostics stream; the mock feeds them in `simulate()`.
  private bucketTotals = new Map<string, number>();
  private timers: ReturnType<typeof setInterval>[] = [];
  private seededLogs = false;

  // --- SdkIntegration ---

  async runQuery({ sql }: QueryParams): Promise<QueryResult> {
    if (/powersync_rs_version/i.test(sql)) {
      return { columns: ['v'], rows: [{ v: '0.4.2 (mock core)' }], rowCount: 1 };
    }
    const rows = fakeRows(sql);
    return { columns: rows.length ? Object.keys(rows[0]) : [], rows, rowCount: rows.length };
  }

  async getSchema(): Promise<SchemaPayload> {
    return SCHEMA;
  }

  async getInfo(): Promise<ProtocolInfo> {
    return {
      endpoint: 'http://localhost:6060',
      userId: 'mock-user-123',
      clientId: 'mock-client-7f3a',
      connectionMethod: 'websocket',
      params: { store_id: '42' },
      connected: this.connected,
      sqliteCoreVersion: '0.4.2 (mock core)',
      sdk: '@powersync/web (mock)'
    };
  }

  async currentSyncStatus(): Promise<SyncState> {
    return this.syncState();
  }

  async getUploadQueueStats(): Promise<UploadQueueState> {
    return UPLOAD_QUEUE;
  }

  async observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe> {
    this.handlers.add(handler);
    // A late subscriber receives the present state at once.
    handler({ type: 'status', payload: this.syncState() });
    handler({ type: 'streams', payload: this.streams });
    handler({ type: 'buckets', payload: this.buckets() });
    handler({ type: 'uploadQueue', payload: UPLOAD_QUEUE });
    // Logs are not replayed by the protocol, so the first subscriber gets the seed lines directly.
    if (!this.seededLogs) {
      this.seededLogs = true;
      handler({ type: 'logs', payload: SEED_LOGS });
    }
    return () => {
      this.handlers.delete(handler);
    };
  }

  async action(request: ActionRequest): Promise<void> {
    switch (request.action) {
      case 'disconnect':
        this.connected = false;
        this.pushStatus();
        break;
      case 'clearData':
        this.connected = false;
        this.hasSynced = false;
        this.pushStatus();
        await this.connect();
        break;
      case 'reconnect':
        this.connected = false;
        this.pushStatus();
        await this.connect();
        break;
      case 'requestCheckpoint':
        // A short catch-up wait so the "Sync now" button shows its syncing state.
        await new Promise<void>((resolve) => setTimeout(resolve, 1500));
        break;
      case 'subscribeStream': {
        const { name, params, ttl, priority } = request.args as StreamActionArgs;
        this.streams.push(
          stream({
            name,
            params: params ?? null,
            priority: priority ?? 3,
            expiresAt: ttl ? Date.now() + ttl * 1000 : null
          })
        );
        this.pushStatus();
        break;
      }
      case 'unsubscribeStream': {
        const { name, params } = request.args as StreamActionArgs;
        const key = streamKey(name, params);
        this.streams = this.streams.filter((entry) => streamKey(entry.name ?? '', entry.params) !== key);
        this.pushStatus();
        break;
      }
    }
  }

  async close(): Promise<void> {
    this.stopTimers();
    this.handlers.clear();
  }

  // --- simulation ---

  /** Playground-only: seed logs, feed bucket totals, then run a short download to a completed sync. */
  simulate(): void {
    this.stopTimers();

    let count = 0;
    const messages = ['Downloaded 32 operations', 'Heartbeat ok', 'Compacted oplog', 'Token refreshed'];
    this.timers.push(
      setInterval(() => {
        this.emit({ type: 'logs', payload: [log('debug', `${messages[count % messages.length]} (#${++count})`)] });
      }, 5000)
    );

    // The core diagnostics stream reports per-bucket targets; that is where the Buckets tab totals come from.
    const changes = [
      { name: 'user_tasks[]', progress: { target_count: 142 } },
      { name: 'global[]', progress: { target_count: 18 } }
    ];
    for (const change of changes) this.bucketTotals.set(change.name, change.progress.target_count);
    this.emit({ type: 'core', payload: { BucketStateChange: { changes, incremental: false } } });

    this.downloading = true;
    this.hasSynced = false;
    let fraction = 0;
    const download = setInterval(() => {
      fraction += 0.2;
      this.downloadProgress = {
        downloadedOperations: Math.round(fraction * 142),
        totalOperations: 142,
        downloadedFraction: Math.min(fraction, 1)
      };
      if (fraction >= 1) {
        clearInterval(download);
        this.downloading = false;
        this.hasSynced = true;
        this.downloadProgress = null;
      }
      this.pushStatus();
      this.emit({ type: 'buckets', payload: this.buckets() });
    }, 800);
    this.timers.push(download);
  }

  private async connect(): Promise<void> {
    this.connected = true;
    this.pushStatus();
    this.simulate();
  }

  private syncState(): SyncState {
    const now = Date.now();
    return {
      connected: this.connected,
      connecting: false,
      downloading: this.downloading,
      uploading: false,
      hasSynced: this.hasSynced,
      lastSyncedAt: this.hasSynced ? now : null,
      downloadProgress: this.downloadProgress,
      // Staggered times so precise timestamps show sync order; priority 2 intentionally absent (→ N/A).
      priorities: [
        { priority: 0, hasSynced: true, lastSyncedAt: now - 4200 },
        { priority: 1, hasSynced: this.hasSynced, lastSyncedAt: this.hasSynced ? now - 1730 : null },
        { priority: 3, hasSynced: this.hasSynced, lastSyncedAt: this.hasSynced ? now - 215 : null }
      ],
      downloadError: null,
      uploadError: null,
      message: 'mock status'
    };
  }

  private buckets(): BucketState[] {
    return fakeRows('SELECT * FROM ps_buckets').map((row) => ({
      name: String(row.name),
      downloadedOperations: Number(row.ops),
      totalOperations: this.bucketTotals.get(String(row.name)) ?? null,
      downloadedSize: Number(row.size),
      lastOp: String(row.last_op),
      downloading: this.downloading
    }));
  }

  private pushStatus(): void {
    this.emit({ type: 'status', payload: this.syncState() });
    this.emit({ type: 'streams', payload: this.streams });
  }

  private emit(event: DiagnosticsEvent): void {
    for (const handler of this.handlers) handler(event);
  }

  private stopTimers(): void {
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
  }
}

function log(level: string, message: string, args?: unknown[]): LogRecord {
  return { timestamp: Date.now(), level, message, args };
}

const SEED_LOGS: LogRecord[] = [
  log('info', 'PowerSync client connected'),
  log('debug', 'Applied checkpoint 1042 (2 buckets)'),
  log('info', 'Sync stream user_tasks subscribed'),
  log('warn', 'Upload queue is large (1543 pending operations)'),
  log('error', 'Failed to upload batch', ['network timeout after 30s'])
];
