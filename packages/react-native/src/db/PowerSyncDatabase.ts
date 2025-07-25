import {
  AbstractPowerSyncDatabase,
  AbstractStreamingSyncImplementation,
  BucketStorageAdapter,
  DBAdapter,
  PowerSyncBackendConnector,
  PowerSyncDatabaseOptionsWithSettings,
  type RequiredAdditionalConnectionOptions
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
export class PowerSyncDatabase extends AbstractPowerSyncDatabase {
  async _initialize(): Promise<void> {}

  /**
   * Opens a DBAdapter using React Native Quick SQLite as the
   * default SQLite open factory.
   */
  protected openDBAdapter(options: PowerSyncDatabaseOptionsWithSettings): DBAdapter {
    const defaultFactory = new ReactNativeQuickSqliteOpenFactory(options.database);
    return defaultFactory.openDB();
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new ReactNativeBucketStorageAdapter(this.database, this.logger);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions
  ): AbstractStreamingSyncImplementation {
    const remote = new ReactNativeRemote(connector, this.logger);

    return new ReactNativeStreamingSyncImplementation({
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      retryDelayMs: options.retryDelayMs,
      crudUploadThrottleMs: options.crudUploadThrottleMs,
      identifier: this.database.name,
      logger: this.logger
    });
  }
}
