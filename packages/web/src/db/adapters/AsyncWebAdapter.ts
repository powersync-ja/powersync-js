import {
  ConnectionPool,
  DBAdapterDefaultMixin,
  DBAdapterListener,
  DBLockOptions,
  LockContext
} from '@powersync/common';
import { SharedConnectionWorker, WebDBAdapter, WebDBAdapterConfiguration } from './WebDBAdapter.js';
import { DatabaseClient } from './wa-sqlite/DatabaseClient.js';

type PendingListener = { listener: Partial<DBAdapterListener>; closeAfterRegisteredOnResolvedPool?: () => void };

/**
 * A connection pool implementation delegating to another pool opened asynchronnously.
 */
class AsyncConnectionPool implements ConnectionPool {
  protected readonly inner: Promise<PoolConnection>;

  protected resolvedClient?: DatabaseClient;
  private activeOnWriter = 0;
  private activeOnReader = 0;

  private readonly pendingListeners = new Set<PendingListener>();

  constructor(
    inner: Promise<PoolConnection>,
    readonly name: string
  ) {
    this.inner = inner.then((client) => {
      for (const pending of this.pendingListeners) {
        pending.closeAfterRegisteredOnResolvedPool = client.writer.registerListener(pending.listener);
      }
      this.pendingListeners.clear();

      this.resolvedClient = client.writer;
      return client;
    });
  }

  async init() {
    await this.inner;
  }

  async close() {
    const inner = await this.inner;

    await inner.writer.close();
    await inner.additionalReader?.close();
  }

  async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const inner = await this.inner;

    // This is a crude load balancing scheme between the writer and an additional read connection (if available).
    // Ideally, we should support abortable requests (which would allow us to request a lock from both and just use
    // whatever completes first). For now, this at least gives us some concurrency. We can improve this in the future.
    if (inner.additionalReader && this.activeOnReader <= this.activeOnWriter) {
      try {
        this.activeOnReader++;
        return await inner.additionalReader.readLock(fn, options);
      } finally {
        this.activeOnReader--;
      }
    }

    try {
      this.activeOnWriter++;
      return await inner.writer.readLock(fn, options);
    } finally {
      this.activeOnWriter--;
    }
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const inner = await this.inner;
    try {
      this.activeOnWriter++;
      return await inner.writer.writeLock(fn, options);
    } finally {
      this.activeOnWriter--;
    }
  }

  async refreshSchema(): Promise<void> {
    const inner = await this.inner;
    await inner.writer.refreshSchema();
    await inner.additionalReader?.refreshSchema();
  }

  registerListener(listener: Partial<DBAdapterListener>): () => void {
    if (this.resolvedClient) {
      return this.resolvedClient.registerListener(listener);
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
  additionalReader?: DatabaseClient;
}

export class AsyncDbAdapter extends DBAdapterDefaultMixin(AsyncConnectionPool) implements WebDBAdapter {
  async shareConnection(): Promise<SharedConnectionWorker> {
    const inner = await this.inner;
    return inner.writer.shareConnection();
  }

  getConfiguration(): WebDBAdapterConfiguration {
    if (this.resolvedClient) {
      return this.resolvedClient.getConfiguration();
    }

    throw new Error('AsyncDbAdapter.getConfiguration() can only be called after initializing it.');
  }
}
