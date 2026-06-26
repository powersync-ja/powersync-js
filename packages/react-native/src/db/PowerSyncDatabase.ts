import {
  BasePowerSyncDatabaseOptions,
  CommonPowerSyncDatabase,
  DatabaseSource,
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
import { ReactNativeRemote, ReactNativeRemoteOptions } from '../sync/stream/ReactNativeRemote';
import { ReactNativeStreamingSyncImplementation } from '../sync/stream/ReactNativeStreamingSyncImplementation';
import { ReactNativeBucketStorageAdapter } from './../sync/bucket/ReactNativeBucketStorageAdapter';
import { OPSqliteOpenFactory, OPSQLiteOpenFactoryOptions } from './adapters/op-sqlite/OPSqliteDBOpenFactory';

export type ReactNativeDatabaseOptions = BasePowerSyncDatabaseOptions &
  DatabaseSource<OPSQLiteOpenFactoryOptions> &
  ReactNativeSpecificOptions;

export interface ReactNativeSpecificOptions {
  remote?: ReactNativeRemoteOptions;
}

class ReactNativePowerSyncDatabase extends BasePowerSyncDatabase<ReactNativeDatabaseOptions> {
  constructor(options: PowerSyncDatabaseOptions) {
    super(options);
  }

  async _initialize(): Promise<void> {}

  protected override openDBAdapter(): DBAdapter {
    return openDatabase(this.options, (database) => {
      const defaultFactory = new OPSqliteOpenFactory(database);
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
    const remote = new ReactNativeRemote(connector, this.logger, this.options.remote);

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
