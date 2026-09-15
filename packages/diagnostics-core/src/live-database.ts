/**
 * The slice of a live PowerSync JavaScript database the in-page agent reads.
 *
 * Declared structurally so the tool never imports an SDK package: any `PowerSyncDatabase` satisfies
 * this interface by shape. Only what the agent actually calls is listed. If the SDK renames one of
 * these members, the agent fails to type-check against it here — deliberately, at the seam.
 */

export interface LiveProgress {
  totalOperations: number;
  downloadedOperations: number;
  downloadedFraction: number;
}

export interface LivePriorityStatus {
  priority: number;
  lastSyncedAt?: Date | null;
  hasSynced?: boolean | null;
}

export interface LiveStreamSubscription {
  name: string;
  parameters: Record<string, unknown> | null;
  active: boolean;
  isDefault: boolean;
  hasExplicitSubscription: boolean;
  expiresAt: Date | null;
  hasSynced: boolean;
  lastSyncedAt: Date | null;
}

export interface LiveStreamStatus {
  progress: LiveProgress | null;
  subscription: LiveStreamSubscription;
  priority: number | null;
}

/** The SDK's sync status object, as the agent reads it. */
export interface LiveSyncStatus {
  connected: boolean;
  connecting: boolean;
  downloading: boolean;
  uploading: boolean;
  hasSynced?: boolean | null;
  lastSyncedAt?: Date | null;
  downloadProgress?: LiveProgress | null;
  priorityStatusEntries?: LivePriorityStatus[];
  syncStreams?: LiveStreamStatus[];
  downloadError?: { message?: string } | null;
  uploadError?: { message?: string } | null;
  getMessage(): string;
}

/** A handle to a debug stream subscription created by the agent. */
export interface LiveStreamHandle {
  unsubscribe(): void;
}

/** A checkpoint request, returned by `requestCheckpoint()` on SDKs that support it. */
export interface LiveCheckpoint {
  waitForSync(options?: { signal?: AbortSignal }): Promise<void>;
}

/** The connector and options of the current connection, exposed by the runtime glue. */
export interface LiveConnector {
  fetchCredentials(): Promise<{ endpoint: string; token: string } | null>;
}

export interface LiveConnectionOptions {
  connectionMethod?: string;
  params?: Record<string, unknown>;
}

/**
 * Read access to the live connection. The connector and options are not on the database's public
 * interface, so the code that installs the agent (which can see the concrete database) hands them in.
 */
export interface LiveConnectionAccess {
  getConnector(): LiveConnector | null;
  getConnectionOptions(): LiveConnectionOptions | null;
}

export interface LiveDatabase {
  readonly currentStatus: LiveSyncStatus;
  readonly schema: { toJSON(): unknown };
  readonly logger?: { log?: (record: { level: number; message: string; error?: unknown }) => void };

  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  getUploadQueueStats(includeSize?: boolean): Promise<{ count: number; size?: number | null }>;
  getClientId(): Promise<string>;

  registerListener(listener: { statusChanged?: (status: LiveSyncStatus) => void }): () => void;
  onChangeWithCallback(
    handler: { onChange: () => void },
    options?: { tables?: string[]; throttleMs?: number }
  ): () => void;

  connect(connector: LiveConnector, options?: LiveConnectionOptions): Promise<void>;
  disconnect(): Promise<void>;
  disconnectAndClear(): Promise<void>;
  requestCheckpoint?(): Promise<LiveCheckpoint>;
  syncStream(
    name: string,
    params?: Record<string, unknown>
  ): { subscribe(options?: { ttl?: number; priority?: 0 | 1 | 2 | 3 }): Promise<LiveStreamHandle> };
}
