import {
  AbstractPowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  BucketStorageAdapter,
  CreateSyncImplementationOptions,
  DBAdapter,
  openDatabase,
  PowerSyncBackendConnector,
  PowerSyncDatabaseOptions
} from '@powersync/common';
import { ReactNativeRemote } from '../sync/stream/ReactNativeRemote';
import { ReactNativeStreamingSyncImplementation } from '../sync/stream/ReactNativeStreamingSyncImplementation';
import { ReactNativeBucketStorageAdapter } from './../sync/bucket/ReactNativeBucketStorageAdapter';
import { ReactNativeQuickSqliteOpenFactory } from './adapters/react-native-quick-sqlite/ReactNativeQuickSQLiteOpenFactory';

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
export class PowerSyncDatabase extends AbstractPowerSyncDatabase<PowerSyncDatabaseOptions> {
  constructor(options: PowerSyncDatabaseOptions) {
    super(options, () =>
      openDatabase(options, (database) => {
        const defaultFactory = new ReactNativeQuickSqliteOpenFactory(database);
        return defaultFactory.openDB();
      })
    );
  }

  async _initialize(): Promise<void> {}

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new ReactNativeBucketStorageAdapter(this.database, this.logger);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions
  ): AbstractStreamingSyncImplementation {
    const remote = new ReactNativeRemote(connector, this.logger);

    return new ReactNativeStreamingSyncImplementation({
      ...options,
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier: this.database.name,
      logger: this.logger
    });
  }
}
