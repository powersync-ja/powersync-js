import {
  AbstractPowerSyncDatabase,
  AbstractRemoteOptions,
  AbstractStreamingSyncImplementation,
  BucketStorageAdapter,
  DBAdapter,
  DEFAULT_REMOTE_LOGGER,
  PowerSyncBackendConnector,
  PowerSyncDatabaseOptions,
  PowerSyncDatabaseOptionsWithSettings,
  SqliteBucketStorage,
  SQLOpenFactory
} from '@powersync/common';

import { NodeRemote } from '../sync/stream/NodeRemote.js';
import { NodeStreamingSyncImplementation } from '../sync/stream/NodeStreamingSyncImplementation.js';

import { BetterSQLite3DBAdapter } from './BetterSQLite3DBAdapter.js';
import { NodeSQLOpenOptions } from './options.js';

export type NodePowerSyncDatabaseOptions = PowerSyncDatabaseOptions & {
  database: DBAdapter | SQLOpenFactory | NodeSQLOpenOptions;
  /**
   * Options to override how the SDK will connect to the sync service.
   *
   * This option is intended to be used for internal tests.
   */
  remoteOptions?: Partial<AbstractRemoteOptions>;
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
  constructor(options: NodePowerSyncDatabaseOptions) {
    super(options);
  }

  async _initialize(): Promise<void> {
    await (this.database as BetterSQLite3DBAdapter).initialize();
  }

  /**
   * Opens a DBAdapter using better-sqlite3 as the default SQLite open factory.
   */
  protected openDBAdapter(options: PowerSyncDatabaseOptionsWithSettings): DBAdapter {
    return new BetterSQLite3DBAdapter(options.database);
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new SqliteBucketStorage(this.database, AbstractPowerSyncDatabase.transactionMutex);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector
  ): AbstractStreamingSyncImplementation {
    const remote = new NodeRemote(
      connector,
      DEFAULT_REMOTE_LOGGER,
      (this.options as NodePowerSyncDatabaseOptions).remoteOptions
    );

    return new NodeStreamingSyncImplementation({
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      retryDelayMs: this.options.retryDelayMs,
      crudUploadThrottleMs: this.options.crudUploadThrottleMs,
      identifier: this.database.name
    });
  }
}
