import {
  AbstractPowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  PowerSyncBackendConnector,
  SqliteBucketStorage,
  BucketStorageAdapter,
  PowerSyncDatabaseOptions
} from '@journeyapps/powersync-sdk-common';

import { WebRemote } from './sync/WebRemote';
import { SharedWebStreamingSyncImplementation } from './sync/SharedWebStreamingSyncImplementation';
import { SSRStreamingSyncImplementation } from './sync/SSRWebStreamingSyncImplementation';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './sync/WebStreamingSyncImplementation';

export interface WebPowerSyncFlags {
  /**
   * Enables multi tab support
   */
  enableMultiTabs?: boolean;
  /**
   * Open in SSR placeholder mode. DB operations and Sync operations will be a No-op
   */
  ssrMode?: boolean;
}

export interface WebPowerSyncDatabaseOptions extends PowerSyncDatabaseOptions {
  flags?: WebPowerSyncFlags;
}

export class PowerSyncDatabase extends AbstractPowerSyncDatabase {
  constructor(protected options: WebPowerSyncDatabaseOptions) {
    super(options);

    // Make sure to close the database when the window closes
    this.closeWithoutDisconnect = this.closeWithoutDisconnect.bind(this);
    window.addEventListener('unload', this.closeWithoutDisconnect);
  }

  async _initialize(): Promise<void> {}

  close(disconnect = true): Promise<void> {
    window.removeEventListener('unload', this.closeWithoutDisconnect);
    return super.close(disconnect);
  }

  /**
   * Closes the database connections, but doesn't disconnect
   * the shared sync manager.
   */
  protected closeWithoutDisconnect() {
    return this.close(false);
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new SqliteBucketStorage(this.database, AbstractPowerSyncDatabase.transactionMutex);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector
  ): AbstractStreamingSyncImplementation {
    const remote = new WebRemote(connector);

    const syncOptions: WebStreamingSyncImplementationOptions = {
      ...this.options,
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier: this.options.database.name
    };

    const { flags } = this.options;
    switch (true) {
      case flags?.ssrMode:
        return new SSRStreamingSyncImplementation(syncOptions);
      case flags?.enableMultiTabs:
        return new SharedWebStreamingSyncImplementation(syncOptions);
      default:
        return new WebStreamingSyncImplementation(syncOptions);
    }
  }
}
