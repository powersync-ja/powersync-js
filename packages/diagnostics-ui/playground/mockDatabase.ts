/* A fake PowerSync client for the isolated playground. It implements only the surface the
 * DiagnosticsAgent touches, returns canned data, and simulates a short download so the UI is lively.
 * It is cast to CommonPowerSyncDatabase where passed to the agent. */

interface StreamEntry {
  subscription: {
    name: string;
    parameters: Record<string, any> | null;
    active: boolean;
    isDefault: boolean;
    hasExplicitSubscription: boolean;
    expiresAt: Date | null;
    hasSynced: boolean;
    lastSyncedAt: Date | null;
  };
  priority: number | null;
  progress: { downloadedOperations: number; totalOperations: number; downloadedFraction: number } | null;
}

function makeToken(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

export class MockDatabase {
  private statusListeners = new Set<(status: any) => void>();
  private changeHandlers = new Set<() => void>();
  private dyn = {
    connected: true,
    connecting: false,
    downloading: false,
    uploading: false,
    hasSynced: true,
    downloadProgress: null as StreamEntry['progress']
  };
  private streams: StreamEntry[] = [
    {
      subscription: {
        name: 'user_tasks',
        parameters: null,
        active: true,
        isDefault: true,
        hasExplicitSubscription: false,
        expiresAt: null,
        hasSynced: true,
        lastSyncedAt: new Date()
      },
      priority: 3,
      progress: null
    },
    {
      subscription: {
        name: 'project_docs',
        parameters: { project_id: 'p-42' },
        active: true,
        isDefault: false,
        hasExplicitSubscription: true,
        expiresAt: new Date(Date.now() + 3_600_000),
        hasSynced: false,
        lastSyncedAt: null
      },
      priority: 1,
      progress: { downloadedOperations: 45, totalOperations: 120, downloadedFraction: 45 / 120 }
    },
    {
      subscription: {
        name: 'comments',
        parameters: null,
        active: false,
        isDefault: false,
        hasExplicitSubscription: true,
        expiresAt: new Date(Date.now() + 120_000),
        hasSynced: true,
        lastSyncedAt: new Date(Date.now() - 5000)
      },
      priority: 2,
      progress: null
    }
  ];

  readonly schema = {
    serialize: () => ({
      tables: [
        {
          name: 'tasks',
          viewName: 'tasks',
          localOnly: false,
          insertOnly: false,
          trackPrevious: false as boolean,
          trackMetadata: true,
          ignoreEmptyUpdates: false,
          columns: [
            { name: 'description', type: 'TEXT' },
            { name: 'completed', type: 'INTEGER' },
            { name: 'user_id', type: 'TEXT' },
            { name: 'list_id', type: 'TEXT' }
          ],
          indexes: [{ name: 'by_user', columns: [{ name: 'user_id', ascending: true }] }]
        },
        {
          name: 'lists',
          viewName: 'lists',
          localOnly: false,
          insertOnly: false,
          trackPrevious: false as boolean,
          trackMetadata: false,
          ignoreEmptyUpdates: false,
          columns: [
            { name: 'name', type: 'TEXT' },
            { name: 'owner_id', type: 'TEXT' },
            { name: 'created_at', type: 'TEXT' }
          ],
          indexes: []
        },
        {
          name: 'drafts',
          viewName: 'drafts',
          localOnly: true,
          insertOnly: false,
          trackPrevious: false as boolean,
          trackMetadata: false,
          ignoreEmptyUpdates: true,
          columns: [
            { name: 'body', type: 'TEXT' },
            { name: 'updated_at', type: 'INTEGER' }
          ],
          indexes: []
        }
      ],
      rawTables: []
    })
  };

  get currentStatus(): any {
    return this.buildStatus();
  }

  private buildStatus(): any {
    return {
      ...this.dyn,
      lastSyncedAt: this.dyn.hasSynced ? new Date() : undefined,
      downloadError: undefined,
      uploadError: undefined,
      // Staggered times so precise timestamps show sync order; priority 2 intentionally absent (→ N/A).
      priorityStatusEntries: [
        { priority: 0, hasSynced: true, lastSyncedAt: new Date(Date.now() - 4200) },
        { priority: 1, hasSynced: this.dyn.hasSynced, lastSyncedAt: this.dyn.hasSynced ? new Date(Date.now() - 1730) : undefined },
        { priority: 3, hasSynced: this.dyn.hasSynced, lastSyncedAt: this.dyn.hasSynced ? new Date(Date.now() - 215) : undefined }
      ],
      syncStreams: this.streams,
      getMessage: () => 'mock status'
    };
  }

  private emitStatus(): void {
    const status = this.buildStatus();
    for (const listener of this.statusListeners) listener(status);
  }

  private emitChange(): void {
    for (const handler of this.changeHandlers) handler();
  }

  registerListener(listener: { statusChanged?: (status: any) => void }): () => void {
    if (listener.statusChanged) {
      this.statusListeners.add(listener.statusChanged);
    }
    return () => {
      if (listener.statusChanged) this.statusListeners.delete(listener.statusChanged);
    };
  }

  onChangeWithCallback(handler: { onChange: () => void }): () => void {
    this.changeHandlers.add(handler.onChange);
    return () => this.changeHandlers.delete(handler.onChange);
  }

  async getUploadQueueStats(): Promise<{ count: number; size: number | null }> {
    return { count: 1543, size: 812345 };
  }

  // The agent wraps `logger.log` to stream records to the logs channel.
  readonly logger = {
    log: (_record: { level: number; message: string; error?: unknown }) => {}
  };

  async getAll<T = any>(sql: string): Promise<T[]> {
    // The mock isn't a real SQL engine — but reject obviously-invalid SQL so the Data Inspector's
    // error path is demonstrable in the playground (a real client surfaces real SQLite errors).
    const head = sql.trim().split(/[\s(]/)[0].toLowerCase();
    if (!['select', 'with', 'pragma', 'explain'].includes(head)) {
      throw new Error(`near "${sql.trim().split(/\s+/)[0] || ''}": syntax error`);
    }
    if (/powersync_rs_version/i.test(sql)) {
      return [{ v: '0.4.2 (mock core)' }] as T[];
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
      ] as T[];
    }
    if (/ps_oplog/i.test(sql)) {
      const types = ['todos', 'lists', 'users'];
      return Array.from({ length: 60 }, (_, i) => ({
        op_id: 5000 - i,
        row_type: types[i % types.length],
        row_id: `row-${(i * 13 + 5).toString(16)}`,
        data: JSON.stringify({ description: `Row ${i}`, completed: i % 2, priority: i % 4 })
      })) as T[];
    }
    if (/ps_buckets/i.test(sql)) {
      return [
        { name: 'user_tasks[]', ops: 142, size: 48213, last_op: '1042' },
        { name: 'global[]', ops: 18, size: 3120, last_op: '88' }
      ] as T[];
    }
    if (/count\(\*\)[\s\S]*ps_crud/i.test(sql)) {
      return [{ n: 1543 }] as T[];
    }
    if (/ps_crud/i.test(sql)) {
      const ops = ['PUT', 'PATCH', 'DELETE'];
      const tables = ['todos', 'lists', 'users', 'comments'];
      // Oldest first (lowest id = next to upload), matching a real ps_crud ORDER BY id.
      return Array.from({ length: 1543 }, (_, i) => {
        const op = ops[i % ops.length];
        const type = tables[i % tables.length];
        const rowId = `row-${(i * 7 + 3).toString(16)}`;
        const data =
          op === 'DELETE'
            ? { op, type, id: rowId }
            : { op, type, id: rowId, data: { description: `Item ${i}`, completed: i % 2, priority: i % 4 } };
        return { id: 4200 + i, op, tbl: type, data: JSON.stringify(data) };
      }) as T[];
    }
    return [
      { id: 'a1', description: 'Buy milk', completed: 0, user_id: 'mock-user-123' },
      { id: 'b2', description: 'Ship diagnostics POC', completed: 1, user_id: 'mock-user-123' }
    ] as T[];
  }

  async getClientId(): Promise<string> {
    return 'mock-client-7f3a';
  }

  async requestCheckpoint() {
    // Simulate a short catch-up wait so the "Sync now" button shows its syncing state.
    return {
      hasSynced: true,
      waitForSync: () => new Promise<void>((resolve) => setTimeout(resolve, 1500))
    };
  }

  readonly connector = {
    fetchCredentials: async () => ({
      endpoint: 'http://localhost:6060',
      token: makeToken({ sub: 'mock-user-123' })
    })
  };

  readonly connectionOptions = { connectionMethod: 'websocket', params: { store_id: '42' } };

  async disconnect(): Promise<void> {
    this.dyn.connected = false;
    this.emitStatus();
  }

  async disconnectAndClear(): Promise<void> {
    this.dyn.connected = false;
    this.dyn.hasSynced = false;
    this.emitStatus();
  }

  async connect(): Promise<void> {
    this.dyn.connected = true;
    this.emitStatus();
    this.simulate();
  }

  syncStream(name: string, params: Record<string, any> | null = null) {
    return {
      name,
      parameters: params,
      subscribe: async (options?: { ttl?: number; priority?: number }) => {
        const entry: StreamEntry = {
          subscription: {
            name,
            parameters: params,
            active: true,
            isDefault: false,
            hasExplicitSubscription: true,
            expiresAt: options?.ttl ? new Date(Date.now() + options.ttl * 1000) : null,
            hasSynced: false,
            lastSyncedAt: null
          },
          priority: options?.priority ?? 3,
          progress: null
        };
        this.streams.push(entry);
        this.emitStatus();
        return {
          name,
          parameters: params,
          waitForFirstSync: async () => {},
          unsubscribe: () => {
            this.streams = this.streams.filter((s) => s !== entry);
            this.emitStatus();
          }
        };
      },
      unsubscribeAll: async () => {
        this.streams = this.streams.filter((s) => s.subscription.name !== name);
        this.emitStatus();
      }
    };
  }

  private simInterval: ReturnType<typeof setInterval> | null = null;
  private logInterval: ReturnType<typeof setInterval> | null = null;

  /** Playground-only: simulate a short download, then a completed sync. */
  simulate(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
    }

    // Seed a few log records + a periodic one, so the Logs tab is lively.
    const seed: { level: number; message: string; error?: unknown }[] = [
      { level: 30, message: 'PowerSync client connected' },
      { level: 20, message: 'Applied checkpoint 1042 (2 buckets)' },
      { level: 30, message: 'Sync stream user_tasks subscribed' },
      { level: 40, message: 'Upload queue is large (1543 pending operations)' },
      { level: 50, message: 'Failed to upload batch', error: new Error('network timeout after 30s') }
    ];
    seed.forEach((r) => this.logger.log(r));
    let n = 0;
    const messages = ['Downloaded 32 operations', 'Heartbeat ok', 'Compacted oplog', 'Token refreshed'];
    this.logInterval = setInterval(() => {
      this.logger.log({ level: 20, message: `${messages[n % messages.length]} (#${++n})` });
    }, 5000);

    // Emulate the core diagnostics stream so per-bucket totals appear in the Buckets tab.
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('powersync-diagnostics-events');
      channel.postMessage({
        BucketStateChange: {
          changes: [
            { name: 'user_tasks[]', progress: { target_count: 142 } },
            { name: 'global[]', progress: { target_count: 18 } }
          ],
          incremental: false
        }
      });
      channel.close();
    }
    this.dyn.downloading = true;
    this.dyn.hasSynced = false;
    let fraction = 0;
    this.simInterval = setInterval(() => {
      fraction += 0.2;
      this.dyn.downloadProgress = {
        downloadedOperations: Math.round(fraction * 142),
        totalOperations: 142,
        downloadedFraction: Math.min(fraction, 1)
      };
      this.emitStatus();
      this.emitChange();
      if (fraction >= 1) {
        if (this.simInterval) clearInterval(this.simInterval);
        this.simInterval = null;
        this.dyn.downloading = false;
        this.dyn.hasSynced = true;
        this.dyn.downloadProgress = null;
        this.emitStatus();
      }
    }, 800);
  }
}

export function createMockDatabase(): MockDatabase {
  return new MockDatabase();
}
