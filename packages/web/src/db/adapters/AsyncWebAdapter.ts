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
  protected readonly inner: Promise<DatabaseClient>;

  protected resolvedClient?: DatabaseClient;
  private readonly pendingListeners = new Set<PendingListener>();

  constructor(
    inner: Promise<DatabaseClient>,
    readonly name: string
  ) {
    this.inner = inner.then((client) => {
      for (const pending of this.pendingListeners) {
        pending.closeAfterRegisteredOnResolvedPool = client.registerListener(pending.listener);
      }
      this.pendingListeners.clear();

      this.resolvedClient = client;
      return client;
    });
  }

  async init() {
    await this.inner;
  }

  async close() {
    const inner = await this.inner;
    return await inner.close();
  }

  async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const inner = await this.inner;
    return await inner.readLock(fn, options);
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    const inner = await this.inner;
    return await inner.writeLock(fn, options);
  }

  async refreshSchema(): Promise<void> {
    await (await this.inner).refreshSchema();
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

export class AsyncDbAdapter extends DBAdapterDefaultMixin(AsyncConnectionPool) implements WebDBAdapter {
  async shareConnection(): Promise<SharedConnectionWorker> {
    const inner = await this.inner;
    return inner.shareConnection();
  }

  getConfiguration(): WebDBAdapterConfiguration {
    if (this.resolvedClient) {
      return this.resolvedClient.getConfiguration();
    }

    throw new Error('AsyncDbAdapter.getConfiguration() can only be called after initializing it.');
  }
}
