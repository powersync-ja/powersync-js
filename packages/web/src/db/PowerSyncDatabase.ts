import {
  type AbstractStreamingSyncImplementation,
  type BucketStorageAdapter,
  type PowerSyncBackendConnector,
  type PowerSyncCloseOptions,
  type PowerSyncConnectionOptions,
  AbstractPowerSyncDatabase,
  DBAdapter,
  DEFAULT_POWERSYNC_CLOSE_OPTIONS,
  PowerSyncDatabaseOptions,
  PowerSyncDatabaseOptionsWithDBAdapter,
  PowerSyncDatabaseOptionsWithOpenFactory,
  PowerSyncDatabaseOptionsWithSettings,
  SqliteBucketStorage
} from '@powersync/common';
import { Mutex } from 'async-mutex';
import { WASQLiteOpenFactory } from './adapters/wa-sqlite/WASQLiteOpenFactory';
import { DEFAULT_WEB_SQL_FLAGS, resolveWebSQLFlags, WebSQLFlags } from './adapters/web-sql-flags';
import { SharedWebStreamingSyncImplementation } from './sync/SharedWebStreamingSyncImplementation';
import { SSRStreamingSyncImplementation } from './sync/SSRWebStreamingSyncImplementation';
import { WebRemote } from './sync/WebRemote';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './sync/WebStreamingSyncImplementation';

export interface WebPowerSyncFlags extends WebSQLFlags {
  /**
   * Externally unload open PowerSync database instances when the window closes.
   * Setting this to `true` requires calling `close` on all open PowerSyncDatabase
   * instances before the window unloads
   */
  externallyUnload?: boolean;
}

type WithWebFlags<Base> = Base & { flags?: WebPowerSyncFlags };

export type WebPowerSyncDatabaseOptionsWithAdapter = WithWebFlags<PowerSyncDatabaseOptionsWithDBAdapter>;
export type WebPowerSyncDatabaseOptionsWithOpenFactory = WithWebFlags<PowerSyncDatabaseOptionsWithOpenFactory>;
export type WebPowerSyncDatabaseOptionsWithSettings = WithWebFlags<PowerSyncDatabaseOptionsWithSettings>;

export type WebPowerSyncDatabaseOptions = WithWebFlags<PowerSyncDatabaseOptions>;

export const DEFAULT_POWERSYNC_FLAGS: Required<WebPowerSyncFlags> = {
  ...DEFAULT_WEB_SQL_FLAGS,
  externallyUnload: false
};

export const resolveWebPowerSyncFlags = (flags?: WebPowerSyncFlags): WebPowerSyncFlags => {
  return {
    ...DEFAULT_POWERSYNC_FLAGS,
    ...flags,
    ...resolveWebSQLFlags(flags)
  };
};

/**
 * A PowerSync database which provides SQLite functionality
 * which is automatically synced.
 *
 * @example
 * ```typescript
 * export const db = new PowerSyncDatabase({
 *  schema: AppSchema,
 *  database: {
 *    dbFilename: 'example.db'
 *  }
 * });
 * ```
 */
export class PowerSyncDatabase extends AbstractPowerSyncDatabase {
  static SHARED_MUTEX = new Mutex();

  protected unloadListener?: () => Promise<void>;
  protected resolvedFlags: WebPowerSyncFlags;

  constructor(options: WebPowerSyncDatabaseOptionsWithAdapter);
  constructor(options: WebPowerSyncDatabaseOptionsWithOpenFactory);
  constructor(options: WebPowerSyncDatabaseOptionsWithSettings);
  constructor(options: WebPowerSyncDatabaseOptions);
  constructor(protected options: WebPowerSyncDatabaseOptions) {
    super(options);

    this.resolvedFlags = resolveWebPowerSyncFlags(options.flags);

    if (this.resolvedFlags.enableMultiTabs && !this.resolvedFlags.externallyUnload) {
      this.unloadListener = () => this.close({ disconnect: false });
      window.addEventListener('unload', this.unloadListener);
    }
  }

  async _initialize(): Promise<void> {}

  protected openDBAdapter(options: WebPowerSyncDatabaseOptionsWithSettings): DBAdapter {
    const defaultFactory = new WASQLiteOpenFactory({
      ...options.database,
      flags: resolveWebPowerSyncFlags(options.flags)
    });
    return defaultFactory.openDB();
  }

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
      disconnect: options.disconnect ?? !this.resolvedFlags.enableMultiTabs
    });
  }

  connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions): Promise<void> {
    /**
     * Using React strict mode might cause calls to connect to fire multiple times
     * Connect is wrapped inside a lock in order to prevent race conditions internally between multiple
     * connection attempts.
     */
    return this.runExclusive(() => {
      this.options.logger?.debug('Attempting to connect to PowerSync instance');
      return super.connect(connector, options);
    });
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new SqliteBucketStorage(this.database, AbstractPowerSyncDatabase.transactionMutex);
  }

  protected runExclusive<T>(cb: () => Promise<T>) {
    if (this.resolvedFlags.ssrMode) {
      return PowerSyncDatabase.SHARED_MUTEX.runExclusive(cb);
    }
    return navigator.locks.request(`lock-${this.database.name}`, cb);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector
  ): AbstractStreamingSyncImplementation {
    const remote = new WebRemote(connector);

    const syncOptions: WebStreamingSyncImplementationOptions = {
      ...(this.options as {}),
      flags: this.resolvedFlags,
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier: this.database.name
    };

    switch (true) {
      case this.resolvedFlags.ssrMode:
        return new SSRStreamingSyncImplementation(syncOptions);
      case this.resolvedFlags.enableMultiTabs:
        if (!this.resolvedFlags.broadcastLogs) {
          const warning = `
            Multiple tabs are enabled, but broadcasting of logs is disabled.
            Logs for shared sync worker will only be available in the shared worker context
          `;
          const logger = this.options.logger;
          logger ? logger.warn(warning) : console.warn(warning);
        }
        return new SharedWebStreamingSyncImplementation(syncOptions);
      default:
        return new WebStreamingSyncImplementation(syncOptions);
    }
  }
}
