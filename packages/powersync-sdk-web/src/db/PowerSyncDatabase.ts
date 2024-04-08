import {
  AbstractPowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  PowerSyncBackendConnector,
  SqliteBucketStorage,
  BucketStorageAdapter,
  PowerSyncDatabaseOptions,
  PowerSyncCloseOptions,
  DEFAULT_POWERSYNC_CLOSE_OPTIONS
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
  /**
   * Externally unload open PowerSync database instances when the window closes.
   * Setting this to `true` requires calling `close` on all open PowerSyncDatabase
   * instances before the window unloads
   */
  externallyUnload?: boolean;
}

export interface WebPowerSyncDatabaseOptions extends PowerSyncDatabaseOptions {
  flags?: WebPowerSyncFlags;
}

export class PowerSyncDatabase extends AbstractPowerSyncDatabase {
  protected unloadListener?: () => Promise<void>;

  constructor(protected options: WebPowerSyncDatabaseOptions) {
    super(options);

    const { flags } = this.options;

    if (flags?.enableMultiTabs && !flags.externallyUnload) {
      this.unloadListener = () => this.close({ disconnect: false });
      window.addEventListener('unload', this.unloadListener);
    }
  }

  async _initialize(): Promise<void> {}

  /**
   * Closes the database connection.
   * By default the sync stream client is only disconnected if
   * multiple tabs are not enabled.
   */
  close(options: PowerSyncCloseOptions = DEFAULT_POWERSYNC_CLOSE_OPTIONS): Promise<void> {
    if (this.unloadListener) {
      window.removeEventListener('unload', this.unloadListener);
    }

    return super.close({
      // Don't disconnect by default if multiple tabs are enabled
      disconnect: options.disconnect ?? !this.options.flags?.enableMultiTabs
    });
  }

  connect(connector: PowerSyncBackendConnector): Promise<void> {
    /**
     * Using React strict mode might cause calls to connect to fire multiple times
     * Connect is wrapped inside a lock in order to prevent race conditions internally between multiple
     * connection attempts.
     */
    return navigator.locks.request(`connection-lock-${this.options.database.name}`, () => super.connect(connector));
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
      ...(this.options.streamOptions ?? {}),
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
