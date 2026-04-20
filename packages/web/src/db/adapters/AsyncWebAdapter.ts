import {
  ConnectionPool,
  DBAdapterDefaultMixin,
  DBAdapterListener,
  DBLockOptions,
  LockContext,
  Mutex,
  Semaphore,
  UnlockFn
} from '@powersync/common';
import { SharedConnectionWorker, WebDBAdapter, WebDBAdapterConfiguration } from './WebDBAdapter.js';
import { DatabaseClient } from './wa-sqlite/DatabaseClient.js';

type PendingListener = { listener: Partial<DBAdapterListener>; closeAfterRegisteredOnResolvedPool?: () => void };

/**
 * A connection pool implementation delegating to another pool opened asynchronnously.
 */
class AsyncConnectionPool implements ConnectionPool {
  protected readonly state: Promise<PoolState>;
  protected resolvedWriter?: DatabaseClient;

  private readonly pendingListeners = new Set<PendingListener>();

  constructor(
    inner: Promise<PoolConnection>,
    readonly name: string
  ) {
    this.state = inner.then((client) => {
      for (const pending of this.pendingListeners) {
        pending.closeAfterRegisteredOnResolvedPool = client.writer.registerListener(pending.listener);
      }
      this.pendingListeners.clear();

      this.resolvedWriter = client.writer;
      if (client.additionalReaders.length) {
        return readWritePoolState(client.writer, client.additionalReaders);
      }

      return singleConnectionPoolState(client.writer);
    });
  }

  async init() {
    await this.state;
  }

  async close() {
    const state = await this.state;
    await state.close();
  }

  async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const state = await this.state;
    return state.withConnection(true, fn, options);
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const state = await this.state;
    return state.withConnection(false, fn, options);
  }

  async refreshSchema(): Promise<void> {
    const state = await this.state;
    await state.refreshSchema();
  }

  registerListener(listener: Partial<DBAdapterListener>): () => void {
    if (this.resolvedWriter) {
      return this.resolvedWriter.registerListener(listener);
    } else {
      const pending: PendingListener = { listener };
      this.pendingListeners.add(pending);
      return () => {
        if (pending.closeAfterRegisteredOnResolvedPool) {
          return pending.closeAfterRegisteredOnResolvedPool();
        } else {
          // Has not been registered yet, we can just remove the pending listener.
          this.pendingListeners.delete(pending);
        }
      };
    }
  }
}

export interface PoolConnection {
  writer: DatabaseClient;
  additionalReaders: DatabaseClient[];
}

interface PoolState {
  writer: DatabaseClient;
  withConnection<T>(allowReadOnly: boolean, fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T>;
  close(): Promise<void>;
  refreshSchema(): Promise<void>;
}

function singleConnectionPoolState(connection: DatabaseClient): PoolState {
  return {
    writer: connection,
    withConnection: (allowReadOnly, fn, options) => {
      if (allowReadOnly) {
        return connection.readLock(fn, options);
      } else {
        return connection.writeLock(fn, options);
      }
    },
    close: () => connection.close(),
    refreshSchema: () => connection.refreshSchema()
  };
}

function readWritePoolState(writer: DatabaseClient, readers: DatabaseClient[]): PoolState {
  // DatabaseClients have locks internally, so these aren't necessary for correctness. However, our mutex and semaphore
  // implementations are very cheap to cancel, which we use to dispatch reads to the first available connection (by
  // simply requesting all of them and sticking with the first connection we get).
  const writerMutex = new Mutex();
  const readerSemaphore = new Semaphore(readers);

  return {
    writer,
    async withConnection(allowReadOnly, fn, options) {
      const abortController = new AbortController();
      const abortSignal = abortController.signal;

      let timeout: any = null;
      let release: UnlockFn | undefined;
      if (options?.timeoutMs) {
        timeout = setTimeout(() => abortController.abort, options.timeoutMs);
      }

      try {
        if (allowReadOnly) {
          let connection: DatabaseClient;

          // Even if we have a pool of read connections, it's typically very small and we assume that most queries are
          // reads. So, we want to request any connection from the read pool and the dedicated write connection (which
          // can also serve reads). We race for the first connection we can obtain this way, and then abort the other
          // request.
          [connection, release] = await new Promise<[DatabaseClient, UnlockFn]>((resolve, reject) => {
            let didComplete = false;
            function complete() {
              didComplete = true;
              abortController.abort();
            }

            function completeSuccess(connection: DatabaseClient, returnFn: UnlockFn) {
              if (didComplete) {
                // We're not going to use this connection, so return it immediately.
                returnFn();
              } else {
                complete();
                resolve([connection, returnFn]);
              }
            }

            function completeError(error: unknown) {
              // We either have a working connection already, or we've rejected the promise. Either way, we don't need
              // to do either thing again.
              if (didComplete) return;

              complete();
              reject(error);
            }

            writerMutex.acquire(abortSignal).then((unlock) => completeSuccess(writer, unlock), completeError);
            readerSemaphore
              .requestOne(abortSignal)
              .then(({ item, release }) => completeSuccess(item, release), completeError);
          });

          return await connection.readLock(fn);
        } else {
          return await writerMutex.runExclusive(() => writer.writeLock(fn), abortSignal);
        }
      } finally {
        if (timeout != null) {
          clearTimeout(timeout);
        }
        release?.();
      }
    },
    async close() {
      await writer.close();
      await Promise.all(readers.map((r) => r.close()));
    },
    async refreshSchema() {
      await writer.refreshSchema();
      await Promise.all(readers.map((r) => r.refreshSchema()));
    }
  };
}

export class AsyncDbAdapter extends DBAdapterDefaultMixin(AsyncConnectionPool) implements WebDBAdapter {
  async shareConnection(): Promise<SharedConnectionWorker> {
    const state = await this.state;
    return state.writer.shareConnection();
  }

  getConfiguration(): WebDBAdapterConfiguration {
    if (this.resolvedWriter) {
      return this.resolvedWriter.getConfiguration();
    }

    throw new Error('AsyncDbAdapter.getConfiguration() can only be called after initializing it.');
  }
}
