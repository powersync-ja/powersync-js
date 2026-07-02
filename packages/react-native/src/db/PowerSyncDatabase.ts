import {
  BasePowerSyncDatabaseOptions,
  CommonPowerSyncDatabase,
  DatabaseSource,
  DBAdapter,
  PowerSyncBackendConnector,
  PowerSyncDatabaseConstructor,
  SyncStreamConnectionMethod
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
import { defaultFetchImplementation } from '../sync/stream/fetch';

export type ReactNativeDatabaseOptions = BasePowerSyncDatabaseOptions &
  DatabaseSource<OPSQLiteOpenFactoryOptions> &
  ReactNativeSpecificOptions;

export interface ReactNativeSpecificOptions {
  remote?: ReactNativeRemoteOptions;
}

class ReactNativePowerSyncDatabase extends BasePowerSyncDatabase<ReactNativeDatabaseOptions> {
  constructor(options: ReactNativeDatabaseOptions) {
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

  protected get defaultConnectionMethod(): SyncStreamConnectionMethod {
    const fetch = this.options.remote?.fetchImplementation ?? defaultFetchImplementation(this.logger);
    return fetch.supportsStreams ? SyncStreamConnectionMethod.HTTP : SyncStreamConnectionMethod.WEB_SOCKET;
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
export const PowerSyncDatabase: PowerSyncDatabaseConstructor<ReactNativeDatabaseOptions> = ReactNativePowerSyncDatabase;

export interface PowerSyncDatabase extends CommonPowerSyncDatabase {}
