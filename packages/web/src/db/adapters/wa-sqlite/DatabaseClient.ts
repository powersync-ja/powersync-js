import {
  QueryResult,
  LockContext,
  DBLockOptions,
  DBAdapterListener,
  ConnectionPool,
  SqlExecutor,
  DBGetUtilsDefaultMixin,
  BatchedUpdateNotification,
  BaseObserver,
  ConnectionClosedError
} from '@powersync/common';
import { SharedConnectionWorker, WebDBAdapterConfiguration } from '../WebDBAdapter.js';
import { ClientConnectionView } from './DatabaseServer.js';
import { RawQueryResult } from './RawSqliteConnection.js';
import * as Comlink from 'comlink';
import { WorkerDBOpenerOptions } from './WASQLiteOpenFactory.js';

export type OpenWorkerConnection = (config: WorkerDBOpenerOptions) => Promise<ClientConnectionView>;

export interface ClientOptions {
  connection: ClientConnectionView;
  /**
   * The remote from which the {@link connection} has been obtained.
   *
   * We use this to be able to expose this port to other clients wanting to connect to the database (e.g. the shared
   * sync worker).
   *
   * For sources not based on workers, returns null.
   */
  source: Comlink.Remote<OpenWorkerConnection> | null;
  /**
   * Whether the remote we're connecting to can close unexpectedly (e.g. because we're a shared worker connecting to a
   * dedicated worker handle we've received from a tab).
   */
  remoteCanCloseUnexpectedly: boolean;
  onClose?: () => void;
}

/**
 * A single-connection {@link ConnectionPool} implementation based on a worker connection.
 */
export class DatabaseClient extends BaseObserver<DBAdapterListener> implements ConnectionPool {
  #connection: ConnectionState;
  #shareConnectionAbortController = new AbortController();

  constructor(
    private readonly options: ClientOptions,
    private readonly config: WebDBAdapterConfiguration
  ) {
    super();
    this.#connection = {
      connection: options.connection,
      notifyRemoteClosed: options.remoteCanCloseUnexpectedly ? new AbortController() : undefined,
      traceQueries: config.debugMode === true
    };

    options.connection.setUpdateListener((tables) => {
      const notification: BatchedUpdateNotification = {
        tables,
        groupedUpdates: {},
        rawUpdates: []
      };
      this.iterateListeners((l) => {
        l.tablesUpdated && l.tablesUpdated(notification);
      });
    });
  }

  get name(): string {
    return this.config.dbFilename;
  }

  /**
   * Marks the remote as closed.
   *
   * This can sometimes happen outside of our control, e.g. when a shared worker requests a connection from a tab. When
   * it happens, all outstanding requests on this pool would never resolve. To avoid livelocks in this scenario, we
   * throw on all outstanding promises and forbid new calls.
   */
  markRemoteClosed() {
    // Can non-null assert here because this function is only supposed to be called when remoteCanCloseUnexpectedly was
    // set.
    this.#connection.notifyRemoteClosed!.abort();
  }

  async close(): Promise<void> {
    // This connection is no longer shared, so we can close locks held for shareConnection calls.
    this.#shareConnectionAbortController.abort();

    await useConnectionState(this.#connection, (c) => c.close(), true);
    this.options.onClose?.();
    this.options.source?.[Comlink.releaseProxy]();
  }

  readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    // At the moment, we only have a single connection. So read and write locks operate on the same context.
    return this.writeLock(fn, options);
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const token = await useConnectionState(this.#connection, (c) => c.requestAccess(options?.timeoutMs));
    try {
      return await fn(new ClientLockContext(this.#connection, token));
    } finally {
      await useConnectionState(this.#connection, (c) => c.completeAccess(token));
    }
  }

  async refreshSchema(): Promise<void> {
    // Currently a no-op on the web.
  }

  async shareConnection(): Promise<SharedConnectionWorker> {
    /**
     * Hold a navigator lock in order to avoid features such as Chrome's frozen tabs,
     * or Edge's sleeping tabs from pausing the thread for this connection.
     * This promise resolves once a lock is obtained.
     * This lock will be held as long as this connection is open.
     * The `shareConnection` method should not be called on multiple tabs concurrently.
     */
    const abort = this.#shareConnectionAbortController;
    const source = this.options.source;
    if (source == null) {
      throw new Error(`shareConnection() is only available for connections based by workers.`);
    }

    await new Promise<void>((resolve, reject) =>
      navigator.locks
        .request(
          `shared-connection-${this.name}-${Date.now()}-${Math.round(Math.random() * 10000)}`,
          {
            signal: abort.signal
          },
          async () => {
            resolve();

            // Free the lock when the connection is already closed.
            if (abort.signal.aborted) {
              return;
            }

            // Hold the lock while the shared connection is in use.
            await new Promise<void>((releaseLock) => {
              abort.signal.addEventListener('abort', () => {
                releaseLock();
              });
            });
          }
        )
        // We aren't concerned with abort errors here
        .catch((ex) => {
          if (ex.name == 'AbortError') {
            resolve();
          } else {
            reject(ex);
          }
        })
    );

    const newPort = await source[Comlink.createEndpoint]();
    return { port: newPort, identifier: this.name };
  }

  getConfiguration(): WebDBAdapterConfiguration {
    return this.config;
  }
}

/**
 * A {@link SqlExecutor} implemented by sending commands to a worker.
 *
 * While an instance is active, it has exclusive access to the underlying database connection (as represented by its
 * token).
 */
class ClientSqlExecutor implements SqlExecutor {
  readonly #connection: ConnectionState;
  readonly #token: string;

  constructor(connection: ConnectionState, token: string) {
    this.#connection = connection;
    this.#token = token;
  }

  /**
   * Requests an operation from the worker, potentially tracing it if that option has been enabled.
   */
  private async maybeTrace<T>(
    fn: (connection: ClientConnectionView) => Promise<T>,
    describeForTrace: () => string
  ): Promise<T> {
    if (this.#connection.traceQueries) {
      const start = performance.now();
      const description = describeForTrace();

      try {
        const r = await useConnectionState(this.#connection, fn);
        performance.measure(`[SQL] ${description}`, { start });
        return r;
      } catch (e: any) {
        performance.measure(`[SQL] [ERROR: ${e.message}] ${description}`, { start });
        throw e;
      }
    } else {
      return useConnectionState(this.#connection, fn);
    }
  }

  async execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    const rs = await this.#executeOnWorker(query, params);
    let rows: QueryResult['rows'] | undefined;
    if (rs.resultSet) {
      const resultSet = rs.resultSet;

      function rowToJavaScriptObject(row: any[]): Record<string, any> {
        const obj: Record<string, any> = {};
        resultSet.columns.forEach((key, idx) => (obj[key] = row[idx]));
        return obj;
      }

      const mapped = resultSet.rows.map(rowToJavaScriptObject);

      rows = {
        _array: mapped,
        length: mapped.length,
        item: (idx: number) => mapped[idx]
      };
    }

    return {
      rowsAffected: rs.changes,
      insertId: rs.lastInsertRowId,
      rows
    };
  }

  async executeRaw(query: string, params?: any[] | undefined): Promise<any[][]> {
    const rs = await this.#executeOnWorker(query, params);
    return rs.resultSet?.rows ?? [];
  }

  async #executeOnWorker(query: string, params: any[] | undefined): Promise<RawQueryResult> {
    return this.maybeTrace(
      (c) => c.execute(this.#token, query, params),
      () => query
    );
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const results = await this.maybeTrace(
      (c) => c.executeBatch(this.#token, query, params),
      () => `${query} (batch of ${params.length})`
    );
    const result: QueryResult = { insertId: undefined, rowsAffected: 0 };
    for (const source of results) {
      result.insertId = source.lastInsertRowId;
      result.rowsAffected += source.changes;
    }

    return result;
  }
}

class ClientLockContext extends DBGetUtilsDefaultMixin(ClientSqlExecutor) implements LockContext {}

interface ConnectionState {
  connection: ClientConnectionView;
  notifyRemoteClosed: AbortController | undefined;
  traceQueries: boolean;
}

async function useConnectionState<T>(
  state: ConnectionState,
  workerPromise: (connection: ClientConnectionView) => Promise<T>,
  fireActionOnAbort = false
): Promise<T> {
  const controller = state.notifyRemoteClosed;
  if (controller) {
    return new Promise((resolve, reject) => {
      if (controller.signal.aborted) {
        reject(new ConnectionClosedError('Called operation on closed remote'));
        if (!fireActionOnAbort) {
          // Don't run the operation if we're going to reject
          // We might want to fire-and-forget the operation in some cases (like a close operation)
          return;
        }
      }

      function handleAbort() {
        reject(new ConnectionClosedError('Remote peer closed with request in flight'));
      }

      function completePromise(action: () => void) {
        controller!.signal.removeEventListener('abort', handleAbort);
        action();
      }

      controller.signal.addEventListener('abort', handleAbort);

      workerPromise(state.connection)
        .then((data) => completePromise(() => resolve(data)))
        .catch((e) => completePromise(() => reject(e)));
    });
  } else {
    // Can't close, so just return the inner worker promise unguarded.
    return workerPromise(state.connection);
  }
}
