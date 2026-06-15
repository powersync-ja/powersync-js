import {
  CommonPowerSyncDatabase,
  DBAdapter,
  PowerSyncBackendConnector,
  PowerSyncDatabaseConstructor,
  PowerSyncDatabaseOptions
} from '@powersync/common';
import {
  BasePowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  BucketStorageAdapter,
  CreateSyncImplementationOptions,
  openDatabase
} from '@powersync/shared-internals';
import { ReactNativeRemote } from '../sync/stream/ReactNativeRemote';
import { ReactNativeStreamingSyncImplementation } from '../sync/stream/ReactNativeStreamingSyncImplementation';
import { ReactNativeBucketStorageAdapter } from './../sync/bucket/ReactNativeBucketStorageAdapter';
import { ReactNativeQuickSqliteOpenFactory } from './adapters/react-native-quick-sqlite/ReactNativeQuickSQLiteOpenFactory';

class ReactNativePowerSyncDatabase extends BasePowerSyncDatabase<PowerSyncDatabaseOptions> {
  constructor(options: PowerSyncDatabaseOptions) {
    super(options);
  }

  async _initialize(): Promise<void> {}

  protected override openDBAdapter(): DBAdapter {
    return openDatabase(this.options, (database) => {
      const defaultFactory = new ReactNativeQuickSqliteOpenFactory(database);
      return defaultFactory.openDB();
    });
  }

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
export const PowerSyncDatabase: PowerSyncDatabaseConstructor<PowerSyncDatabaseOptions> = ReactNativePowerSyncDatabase;

export interface PowerSyncDatabase extends CommonPowerSyncDatabase {}
