import {
  BasePowerSyncDatabaseOptions,
  CommonPowerSyncDatabase,
  DatabaseSource,
  DBAdapter,
  openDatabase,
  PowerSyncBackendConnector,
  PowerSyncDatabaseConstructor
} from '@powersync/common';

import {
  AbstractPowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  BucketStorageAdapter,
  CreateSyncImplementationOptions,
  SqliteBucketStorage
} from '@powersync/shared-internals';

import { NodeRemote, NodeRemoteOptions } from '../sync/stream/NodeRemote.js';
import { NodeStreamingSyncImplementation } from '../sync/stream/NodeStreamingSyncImplementation.js';

import { WorkerPoolDatabaseAdapter } from './WorkerConnectionPool.js';
import { NodeSQLOpenOptions } from './options.js';

export type NodePowerSyncDatabaseOptions = BasePowerSyncDatabaseOptions &
  DatabaseSource<NodeSQLOpenOptions> & {
    /**
     * Options to override how the SDK will connect to the sync service.
     */
    remoteOptions?: Partial<NodeRemoteOptions>;
  };

class NodePowerSyncDatabase extends AbstractPowerSyncDatabase<NodePowerSyncDatabaseOptions> {
  constructor(options: NodePowerSyncDatabaseOptions) {
    super(options);
  }

  async _initialize(): Promise<void> {
    if ('initialize' in this.database) {
      await (this.database as WorkerPoolDatabaseAdapter).initialize();
    }
  }

  protected openDBAdapter(): DBAdapter {
    return openDatabase(this.options, (open) => new WorkerPoolDatabaseAdapter(open));
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new SqliteBucketStorage(this.database, this.logger);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions
  ): AbstractStreamingSyncImplementation {
    const logger = this.logger;
    const remote = new NodeRemote(connector, logger, this.options.remoteOptions);

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
// Typed constructor to avoid leaking AbstractPowerSyncDatabase into the public interface
export const PowerSyncDatabase: PowerSyncDatabaseConstructor<NodePowerSyncDatabaseOptions> = NodePowerSyncDatabase;

export interface PowerSyncDatabase extends CommonPowerSyncDatabase {}
