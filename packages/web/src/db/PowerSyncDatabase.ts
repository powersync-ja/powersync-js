import {
  AbstractPowerSyncDatabase,
  SqliteBucketStorage,
  StreamingSyncImplementation,
  TriggerManagerConfig,
  Mutex,
  type BucketStorageAdapter,
  type PowerSyncBackendConnector,
  type PowerSyncCloseOptions,
  LogLevels,
  CreateSyncImplementationOptions,
  BasePowerSyncDatabaseOptions,
  DatabaseSource,
  openDatabase,
  DBAdapter
} from '@powersync/common';
import { getNavigatorLocks } from '../shared/navigator.js';
import { NAVIGATOR_TRIGGER_CLAIM_MANAGER } from './NavigatorTriggerClaimManager.js';
import { WebDBAdapter } from './adapters/WebDBAdapter.js';
import { WASQLiteOpenFactory } from './adapters/wa-sqlite/WASQLiteOpenFactory.js';
import {
  ResolvedWebSQLFlags,
  ResolvedWebSQLOpenOptions,
  WebSQLOpenFactoryOptions,
  isServerSide,
  resolveWebSQLFlags
} from './adapters/web-sql-flags.js';
import { SSRStreamingSyncImplementation } from './sync/SSRWebStreamingSyncImplementation.js';
import { SharedWebStreamingSyncImplementation } from './sync/SharedWebStreamingSyncImplementation.js';
import { WebRemote } from './sync/WebRemote.js';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './sync/WebStreamingSyncImplementation.js';
import { AsyncDbAdapter } from './adapters/AsyncWebAdapter.js';

export type WebPowerSyncDatabaseOptions = BasePowerSyncDatabaseOptions &
  DatabaseSource<WebSQLOpenFactoryOptions> &
  WebSpecificOptions;

export interface WebSpecificOptions {
  sync?: WebSyncOptions;

  /**
   * Broadcast logs from shared workers, such as the shared sync worker,
   * to individual tabs. This defaults to true.
   */
  broadcastLogs?: boolean;
}

export interface WebSyncOptions {
  /**
   * Allows you to override the default sync worker.
   *
   * You can either provide a path to the worker script
   * or a factory method that returns a worker.
   */
  worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => SharedWorker);

  /**
   * The log level for logs from the sync worker.
   *
   * Defaults to {@link LogLevels.info}.
   */
  logLevel?: number;
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
export class PowerSyncDatabase extends AbstractPowerSyncDatabase<WebPowerSyncDatabaseOptions> {
  static SHARED_MUTEX = new Mutex();

  protected resolvedFlags: ResolvedWebSQLFlags;
  protected enableBroadcastLogs: boolean;

  constructor(options: WebPowerSyncDatabaseOptions, database?: () => DBAdapter) {
    const resolvedFlags = resolveWebSQLFlags('database' in options ? options.database.flags : undefined);

    super(options, database ?? (() => openDatabase(options, (options) => this.openDBAdapter(resolvedFlags, options))));
    this.resolvedFlags = resolvedFlags;
    this.enableBroadcastLogs = options.broadcastLogs ?? true;
  }

  async _initialize(): Promise<void> {
    if (this.database instanceof AsyncDbAdapter) {
      /**
       * While init is done automatically,
       * LockedAsyncDatabaseAdapter only exposes config after init.
       * We can explicitly wait for init here in order to access config.
       */
      await this.database.init();
    }

    // In some cases, like the SQLJs adapter, we don't pass a WebDBAdapter, so we need to check.
    if (typeof (this.database as WebDBAdapter).getConfiguration == 'function') {
      const config = (this.database as WebDBAdapter).getConfiguration();
      if (config.requiresPersistentTriggers) {
        this.triggersImpl.updateDefaults({
          useStorageByDefault: true
        });
      }
    }
  }

  protected generateTriggerManagerConfig(): TriggerManagerConfig {
    return {
      // We need to share hold information between tabs for web
      claimManager: NAVIGATOR_TRIGGER_CLAIM_MANAGER
    };
  }

  protected openDBAdapter(resolvedFlags: ResolvedWebSQLFlags, options: WebSQLOpenFactoryOptions): DBAdapter {
    const defaultFactory = new WASQLiteOpenFactory({
      ...options,
      flags: resolvedFlags,
      encryptionKey: options.encryptionKey,
      logger: this.logger,
      logLevel: resolvedFlags.databaseWorkerLogLevel
    });
    return defaultFactory.openDB();
  }

  /**
   * Closes the database connection.
   * By default the sync stream client is only disconnected if
   * multiple tabs are not enabled.
   */
  close(options?: PowerSyncCloseOptions): Promise<void> {
    return super.close({
      // Don't disconnect by default if multiple tabs are enabled
      disconnect: options?.disconnect ?? !this.resolvedFlags.enableMultiTabs
    });
  }

  protected async loadVersion(): Promise<void> {
    if (isServerSide()) {
      return;
    }
    return super.loadVersion();
  }

  protected async resolveOfflineSyncStatus() {
    if (isServerSide()) {
      return;
    }
    return super.resolveOfflineSyncStatus();
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new SqliteBucketStorage(this.database, this.logger);
  }

  protected async runExclusive<T>(cb: () => Promise<T>) {
    if (this.resolvedFlags.ssrMode) {
      return PowerSyncDatabase.SHARED_MUTEX.runExclusive(cb);
    }
    return getNavigatorLocks().request(`lock-${this.database.name}`, cb);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions
  ): StreamingSyncImplementation {
    const remote = new WebRemote(connector, this.logger);
    const syncOptions: WebStreamingSyncImplementationOptions = {
      ...(this.options as {}),
      ...options,
      flags: this.resolvedFlags,
      adapter: this.bucketStorageAdapter,
      remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier: this.database.name,
      logger: this.logger
    };

    switch (true) {
      case this.resolvedFlags.ssrMode:
        return new SSRStreamingSyncImplementation(syncOptions);
      case this.resolvedFlags.enableMultiTabs:
        if (!this.enableBroadcastLogs) {
          const warning = `
            Multiple tabs are enabled, but broadcasting of logs is disabled.
            Logs for shared sync worker will only be available in the shared worker context
          `;
          const logger = this.options.logger;
          logger ? logger.log({ level: LogLevels.warn, message: warning }) : console.warn(warning);
        }
        return new SharedWebStreamingSyncImplementation({
          ...syncOptions,
          db: this.database as WebDBAdapter, // This should always be the case
          logLevel: this.options.sync?.logLevel ?? LogLevels.info,
          enableBroadcastLogs: this.enableBroadcastLogs
        });
      default:
        return new WebStreamingSyncImplementation(syncOptions);
    }
  }
}
