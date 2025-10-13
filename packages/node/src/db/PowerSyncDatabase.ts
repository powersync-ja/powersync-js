import {
  AbstractPowerSyncDatabase,
  AbstractRemoteOptions,
  AbstractStreamingSyncImplementation,
  AdditionalConnectionOptions,
  BucketStorageAdapter,
  DBAdapter,
  PowerSyncBackendConnector,
  PowerSyncConnectionOptions,
  PowerSyncDatabaseOptions,
  PowerSyncDatabaseOptionsWithSettings,
  RequiredAdditionalConnectionOptions,
  SqliteBucketStorage,
  SQLOpenFactory
} from '@powersync/common';

import { NodeCustomConnectionOptions, NodeRemote } from '../sync/stream/NodeRemote.js';
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

export type NodeAdditionalConnectionOptions = AdditionalConnectionOptions & NodeCustomConnectionOptions;

export type NodePowerSyncConnectionOptions = PowerSyncConnectionOptions & NodeAdditionalConnectionOptions;

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
    return new SqliteBucketStorage(this.database, this.logger);
  }

  connect(
    connector: PowerSyncBackendConnector,
    options?: PowerSyncConnectionOptions & NodeCustomConnectionOptions
  ): Promise<void> {
    return super.connect(connector, options);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions & NodeAdditionalConnectionOptions
  ): AbstractStreamingSyncImplementation {
    const logger = this.logger;
    const remote = new NodeRemote(connector, logger, {
      dispatcher: options.dispatcher,
      ...(this.options as NodePowerSyncDatabaseOptions).remoteOptions
    });

    return new NodeStreamingSyncImplementation({
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      ...options,
      identifier: this.database.name,
      logger
    });
  }
}
