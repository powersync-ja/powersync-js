import {
  AbstractStreamingSyncImplementationOptions,
  BaseObserver,
  LockOptions,
  LockType,
  PowerSyncConnectionOptions,
  StreamingSyncImplementation,
  SyncStatus,
  SyncStatusOptions
} from '@powersync/common';
import { Mutex } from 'async-mutex';

export class SSRStreamingSyncImplementation extends BaseObserver implements StreamingSyncImplementation {
  syncMutex: Mutex;
  crudMutex: Mutex;

  isConnected: boolean;
  lastSyncedAt?: Date | undefined;
  syncStatus: SyncStatus;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super();
    this.syncMutex = new Mutex();
    this.crudMutex = new Mutex();
    this.syncStatus = new SyncStatus({});
    this.isConnected = false;
  }

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const mutex = lockOptions.type == LockType.CRUD ? this.crudMutex : this.syncMutex;
    return mutex.runExclusive(lockOptions.callback);
  }

  /**
   * This is a no-op in SSR mode
   */
  async connect(options?: PowerSyncConnectionOptions): Promise<void> {}

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
  async waitForStatus(status: SyncStatusOptions) {
    return this.waitUntilStatusMatches(() => false);
  }

  /**
   * This will never resolve in SSR Mode.
   */
  waitUntilStatusMatches(_predicate: (status: SyncStatus) => boolean): Promise<void> {
    return new Promise<void>(() => {});
  }

  /**
   * Returns a placeholder checkpoint. This should not be used.
   */
  async getWriteCheckpoint() {
    return '1';
  }

  /**
   * The SSR mode adapter will never complete syncing.
   */
  async hasCompletedSync() {
    return false;
  }

  /**
   * This is a no-op in SSR mode.
   */
  triggerCrudUpload() {}
}
