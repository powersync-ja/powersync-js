import type { CommonPowerSyncDatabase, SyncStatus, SyncStreamSubscription } from '@powersync/common';
import {
  ActionRequest,
  BucketState,
  Channel,
  EventMessage,
  PortInfo,
  QueryResult,
  RequestMessage,
  UploadQueueState,
  WireMessage
} from './protocol.js';
import { toStreamStates, toSyncState } from './state.js';
import { Transport } from './transport.js';

/**
 * Accessors present on the concrete database base class but not on the public
 * `CommonPowerSyncDatabase` interface. Promoting these to the interface is a small SDK follow-up.
 */
interface ConnectionAccess {
  connector?: { fetchCredentials(): Promise<{ endpoint?: string; token?: string } | null> } | null;
  connectionOptions?: { connectionMethod?: string; params?: Record<string, unknown> } | null;
}

type LiveDatabase = CommonPowerSyncDatabase & ConnectionAccess;

export interface DiagnosticsAgentOptions {
  /** A label for the SDK hosting this agent, supplied by whoever installs it (e.g. `@powersync/web`). */
  sdk?: string;
  /** Debounce for re-reading bucket stats after internal-table changes. */
  bucketThrottleMs?: number;
}

/**
 * Runs next to a live PowerSync client and serves the Diagnostics Port over a {@link Transport}.
 *
 * Every status change is forwarded as serialized state (the push bridge), and requests are
 * answered by querying the live client. No live SDK object ever crosses the transport.
 */
/** Arguments for the subscribeStream/unsubscribeStream actions. */
interface StreamActionArgs {
  name: string;
  params?: Record<string, any>;
  ttl?: number;
  priority?: 0 | 1 | 2 | 3;
}

export class DiagnosticsAgent {
  private disposers: Array<() => void> = [];
  private started = false;
  /** Debug subscriptions created via the Port, keyed by name + serialized params, so they can be released. */
  private streamHandles = new Map<string, SyncStreamSubscription>();

  constructor(
    private db: CommonPowerSyncDatabase,
    private transport: Transport,
    private options: DiagnosticsAgentOptions = {}
  ) {}

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    try {
      this.disposers.push(
        this.transport.onMessage((message) => {
          this.handleMessage(message).catch(() => {
            // Handler failures for individual messages must not tear down the agent.
          });
        })
      );

      // Push bridge: forward every status change as serialized state.
      this.disposers.push(
        this.db.registerListener({
          statusChanged: (status: SyncStatus) => {
            this.pushStatus(status);
            void this.pushUploadQueue();
            void this.pushBuckets();
          }
        })
      );

      // Re-read bucket stats when internal tables change.
      this.disposers.push(
        this.db.onChangeWithCallback(
          { onChange: () => void this.pushBuckets() },
          { tables: ['ps_buckets', 'ps_oplog', 'ps_crud'], throttleMs: this.options.bucketThrottleMs ?? 300 }
        )
      );

      this.transport.send({ type: 'announce', role: 'agent' });
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop(): void {
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers = [];
    this.started = false;
  }

  private async handleMessage(message: WireMessage): Promise<void> {
    switch (message.type) {
      case 'announce':
        if (message.role === 'client') {
          // A client (re)connected: re-announce and replay current state.
          this.transport.send({ type: 'announce', role: 'agent' });
          this.pushStatus(this.db.currentStatus);
          await this.pushUploadQueue();
          await this.pushBuckets();
        }
        break;
      case 'req':
        await this.handleRequest(message);
        break;
      case 'sub':
        this.replayChannel(message.channel);
        break;
      default:
        break;
    }
  }

  private replayChannel(channel: Channel): void {
    switch (channel) {
      case 'status':
      case 'streams':
        this.pushStatus(this.db.currentStatus);
        break;
      case 'buckets':
        void this.pushBuckets();
        break;
      case 'uploadQueue':
        void this.pushUploadQueue();
        break;
      default:
        break;
    }
  }

  private emit(message: EventMessage): void {
    this.transport.send(message);
  }

  private pushStatus(status: SyncStatus): void {
    this.emit({ type: 'event', channel: 'status', payload: toSyncState(status) });
    this.emit({ type: 'event', channel: 'streams', payload: toStreamStates(status) });
  }

  private async pushUploadQueue(): Promise<void> {
    try {
      const stats = await this.db.getUploadQueueStats(true);
      this.emit({ type: 'event', channel: 'uploadQueue', payload: { count: stats.count, size: stats.size ?? null } });
    } catch {
      // Non-fatal: queue stats are best-effort.
    }
  }

  private async pushBuckets(): Promise<void> {
    try {
      this.emit({ type: 'event', channel: 'buckets', payload: await this.readBuckets() });
    } catch {
      // Non-fatal: the diagnostic tables may not exist yet.
    }
  }

  private async readBuckets(): Promise<BucketState[]> {
    const downloading = this.db.currentStatus?.downloading ?? false;
    const withSize =
      'SELECT name, count_at_last + count_since_last AS ops, downloaded_size AS size, last_op FROM ps_buckets ORDER BY name';
    const withoutSize =
      'SELECT name, count_at_last + count_since_last AS ops, last_op FROM ps_buckets ORDER BY name';

    let rows: Record<string, any>[];
    try {
      rows = await this.db.getAll(withSize);
    } catch {
      // `downloaded_size` is absent on older cores.
      rows = await this.db.getAll(withoutSize);
    }

    return rows.map((row) => ({
      name: String(row.name),
      downloadedOperations: Number(row.ops) || 0,
      totalOperations: null,
      downloadedSize: row.size == null ? null : Number(row.size),
      lastOp: row.last_op == null ? null : String(row.last_op),
      downloading
    }));
  }

  private async handleRequest(message: RequestMessage): Promise<void> {
    try {
      const result = await this.runRequest(message);
      this.transport.send({ type: 'res', id: message.id, ok: true, result });
    } catch (error) {
      this.transport.send({ type: 'res', id: message.id, ok: false, error: errorMessage(error) });
    }
  }

  private async runRequest(message: RequestMessage): Promise<unknown> {
    switch (message.method) {
      case 'query':
        return this.runQuery(message.params.sql, message.params.params);
      case 'getSchema':
        return this.db.schema.toJSON();
      case 'getInfo':
        return this.getInfo();
      case 'getUploadQueueStats': {
        const stats = await this.db.getUploadQueueStats(true);
        return { count: stats.count, size: stats.size ?? null } satisfies UploadQueueState;
      }
      case 'action':
        return this.runAction(message.params);
    }
  }

  private async runQuery(sql: string, params?: unknown[]): Promise<QueryResult> {
    const rows = (await this.db.getAll(sql, params as any[])) as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, rowCount: rows.length };
  }

  private async getInfo(): Promise<PortInfo> {
    const db = this.db as LiveDatabase;

    let endpoint: string | null = null;
    let userId: string | null = null;
    try {
      const credentials = await db.connector?.fetchCredentials();
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

    return {
      endpoint,
      userId,
      clientId,
      connectionMethod: db.connectionOptions?.connectionMethod ?? null,
      params: db.connectionOptions?.params ?? null,
      connected: this.db.currentStatus?.connected ?? false,
      sqliteCoreVersion,
      sdk: this.options.sdk ?? null
    };
  }

  private async runAction(request: ActionRequest): Promise<{ ok: true }> {
    const db = this.db as LiveDatabase;
    switch (request.action) {
      case 'disconnect':
        await this.db.disconnect();
        break;
      case 'clearData': {
        // Capture before clearing, then reconnect so the client re-syncs from scratch.
        const connector = db.connector;
        const options = db.connectionOptions;
        await this.db.disconnectAndClear();
        if (connector) {
          await this.db.connect(connector as any, options as any);
        }
        break;
      }
      case 'reconnect': {
        const connector = db.connector;
        const options = db.connectionOptions;
        await this.db.disconnect();
        if (connector) {
          await this.db.connect(connector as any, options as any);
        }
        break;
      }
      case 'subscribeStream': {
        const { name, params, ttl, priority } = request.args as StreamActionArgs;
        // TTL defaults to 0 so a forgotten debug subscription is evicted as soon as it is released.
        const subscription = await this.db.syncStream(name, params).subscribe({ ttl: ttl ?? 0, priority });
        this.streamHandles.set(streamKey(name, params), subscription);
        break;
      }
      case 'unsubscribeStream': {
        const { name, params } = request.args as StreamActionArgs;
        const key = streamKey(name, params);
        const handle = this.streamHandles.get(key);
        if (handle) {
          handle.unsubscribe();
          this.streamHandles.delete(key);
        }
        break;
      }
    }
    return { ok: true };
  }
}

function streamKey(name: string, params?: Record<string, unknown>): string {
  return `${name}|${JSON.stringify(params ?? null)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
