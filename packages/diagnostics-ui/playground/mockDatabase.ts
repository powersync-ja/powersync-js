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
    }
  ];

  readonly schema = {
    toJSON: () => ({
      tables: [
        {
          name: 'tasks',
          view_name: 'tasks',
          columns: [
            { name: 'id', type: 'text' },
            { name: 'description', type: 'text' },
            { name: 'completed', type: 'integer' },
            { name: 'user_id', type: 'text' }
          ],
          indexes: []
        }
      ],
      raw_tables: []
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
      priorityStatusEntries: [
        { priority: 3, hasSynced: true, lastSyncedAt: new Date() },
        { priority: 1, hasSynced: this.dyn.hasSynced, lastSyncedAt: this.dyn.hasSynced ? new Date() : undefined }
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
    return { count: 3, size: 1536 };
  }

  async getAll<T = any>(sql: string): Promise<T[]> {
    if (/powersync_rs_version/i.test(sql)) {
      return [{ v: '0.4.2 (mock core)' }] as T[];
    }
    if (/ps_buckets/i.test(sql)) {
      return [
        { name: 'user_tasks[]', ops: 142, size: 48213, last_op: '1042' },
        { name: 'global[]', ops: 18, size: 3120, last_op: '88' }
      ] as T[];
    }
    return [
      { id: 'a1', description: 'Buy milk', completed: 0, user_id: 'mock-user-123' },
      { id: 'b2', description: 'Ship diagnostics POC', completed: 1, user_id: 'mock-user-123' }
    ] as T[];
  }

  async getClientId(): Promise<string> {
    return 'mock-client-7f3a';
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
      subscribe: async () => {
        const entry: StreamEntry = {
          subscription: {
            name,
            parameters: params,
            active: true,
            isDefault: false,
            hasExplicitSubscription: true,
            expiresAt: null,
            hasSynced: false,
            lastSyncedAt: null
          },
          priority: 2,
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

  /** Playground-only: simulate a short download, then a completed sync. */
  simulate(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
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
