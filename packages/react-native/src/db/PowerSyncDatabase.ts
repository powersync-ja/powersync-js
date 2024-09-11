import {
  AbstractPowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  BucketStorageAdapter,
  DBAdapter,
  PowerSyncBackendConnector,
  PowerSyncDatabaseOptionsWithSettings,
  SqliteBucketStorage
} from '@powersync/common';
import { ReactNativeRemote } from '../sync/stream/ReactNativeRemote';
import { ReactNativeStreamingSyncImplementation } from '../sync/stream/ReactNativeStreamingSyncImplementation';
import { OPSqliteOpenFactory } from './adapters/op-sqlite/OPSqliteDBOpenFactory';

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
  async _initialize(): Promise<void> {}

  /**
   * Opens a DBAdapter using React Native Quick SQLite as the
   * default SQLite open factory.
   */
  protected openDBAdapter(options: PowerSyncDatabaseOptionsWithSettings): DBAdapter {
    //TODO switch between RNQS and OPSQLite based on options
    const defaultFactory = new OPSqliteOpenFactory(options.database);
    return defaultFactory.openDB();
  }

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
      identifier: this.database.name
    });
  }
}
