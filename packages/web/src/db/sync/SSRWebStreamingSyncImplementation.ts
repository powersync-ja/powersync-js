import { BaseObserver, SyncStatus } from '@powersync/common';
import { Mutex, StreamingSyncImplementation, LockOptions, LockType } from '@powersync/shared-internals';

export class SSRStreamingSyncImplementation extends BaseObserver implements StreamingSyncImplementation {
  syncMutex: Mutex;
  crudMutex: Mutex;

  isConnected: boolean;
  lastSyncedAt?: Date | undefined;

  constructor() {
    super();
    this.syncMutex = new Mutex();
    this.crudMutex = new Mutex();
    this.isConnected = false;
  }

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const mutex = lockOptions.type == LockType.CRUD ? this.crudMutex : this.syncMutex;
    return mutex.runExclusive(lockOptions.callback, lockOptions.signal);
  }

  /**
   * This is a no-op in SSR mode
   */
  async connect(): Promise<void> {}

  async dispose() {}

  /**
   * This is a no-op in SSR mode
   */
  async disconnect(): Promise<void> {}

  /**
   * This SSR Mode implementation is immediately ready.
   */
  async waitForReady() {}

  /**
   * This will never resolve in SSR Mode.
   */
  waitUntilStatusMatches(_predicate: (status: SyncStatus) => boolean): Promise<void> {
    return new Promise<void>(() => {});
  }

  /**
   * This is a no-op in SSR mode.
   */
  triggerCrudUpload() {}

  /**
   * No-op in SSR mode.
   */
  updateSubscriptions(): void {}

  /**
   * No-op in SSR mode.
   */
  markConnectionMayHaveChanged(): void {}

  requestCheckpoint(): Promise<bigint> {
    throw new Error('Sub sync implementation does not support request checkpoints');
  }
}
