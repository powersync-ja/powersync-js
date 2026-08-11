import { DBAdapter, DBAdapterListener, DBLockOptions, LockContext } from '@powersync/common';
import { Mutex, Semaphore } from '@powersync/shared-internals';
import { SharedConnectionWorker, WebDBAdapterConfiguration } from './WebDBAdapter.js';
import { DatabaseClient } from './wa-sqlite/DatabaseClient.js';
import { acquireFromPool } from './acquireFromPool.js';

type PendingListener = { listener: Partial<DBAdapterListener>; closeAfterRegisteredOnResolvedPool?: () => void };

/**
 * A connection pool implementation delegating to another pool opened asynchronnously.
 */
export class AsyncDbAdapter extends DBAdapter {
  protected readonly state: Promise<PoolState>;
  protected resolvedWriter?: DatabaseClient;

  private readonly pendingListeners = new Set<PendingListener>();

  constructor(
    inner: Promise<PoolConnection>,
    readonly name: string
  ) {
    super();
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
      return acquireFromPool(
        writerMutex,
        writer,
        readerSemaphore,
        (connection) => {
          return allowReadOnly ? connection.readLock(fn) : connection.writeLock(fn);
        },
        options,
        allowReadOnly
      );
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
