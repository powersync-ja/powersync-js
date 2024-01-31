import {
  AbstractPowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  PowerSyncBackendConnector,
  SqliteBucketStorage,
  BucketStorageAdapter
} from '@journeyapps/powersync-sdk-common';
import { ReactNativeRemote } from '../sync/stream/ReactNativeRemote';
import { ReactNativeStreamingSyncImplementation } from '../sync/stream/ReactNativeStreamingSyncImplementation';

export class PowerSyncDatabase extends AbstractPowerSyncDatabase {
  async _initialize(): Promise<void> {}

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new SqliteBucketStorage(this.database, AbstractPowerSyncDatabase.transactionMutex);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector
  ): AbstractStreamingSyncImplementation {
    const remote = new ReactNativeRemote(connector);

    return new ReactNativeStreamingSyncImplementation({
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      retryDelayMs: this.options.retryDelay,
      crudUploadThrottleMs: this.options.crudUploadThrottleMs,
      identifier: this.options.database.name
    });
  }
}
