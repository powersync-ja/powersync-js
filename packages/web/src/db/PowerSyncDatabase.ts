import {
  type PowerSyncBackendConnector,
  type PowerSyncCloseOptions,
  LogLevels,
  BasePowerSyncDatabaseOptions,
  DatabaseSource,
  openDatabase,
  DBAdapter,
  PowerSyncDatabaseConstructor,
  CommonPowerSyncDatabase
} from '@powersync/common';
import {
  AbstractPowerSyncDatabase,
  BucketStorageAdapter,
  CreateSyncImplementationOptions,
  Mutex,
  SqliteBucketStorage,
  StreamingSyncImplementation,
  TriggerManagerConfig
} from '@powersync/shared-internals';
import { getNavigatorLocks } from '../shared/navigator.js';
import { NAVIGATOR_TRIGGER_CLAIM_MANAGER } from './NavigatorTriggerClaimManager.js';
import { WebDBAdapter } from './adapters/WebDBAdapter.js';
import { WASQLiteOpenFactory } from './adapters/wa-sqlite/WASQLiteOpenFactory.js';
import { WebSpecificOpenOptions, WebSQLOpenOptions } from './adapters/options.js';
import { SSRStreamingSyncImplementation } from './sync/SSRWebStreamingSyncImplementation.js';
import { SharedWebStreamingSyncImplementation } from './sync/SharedWebStreamingSyncImplementation.js';
import { WebRemote } from './sync/WebRemote.js';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './sync/WebStreamingSyncImplementation.js';
import { AsyncDbAdapter } from './adapters/AsyncWebAdapter.js';
import { resolveAndValidateOptions } from './adapters/resolveAndValidateOptions.js';

export type WebPowerSyncDatabaseOptions = BasePowerSyncDatabaseOptions &
  DatabaseSource<WebSQLOpenOptions> &
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
  worker?: string | URL | (() => SharedWorker);

  /**
   * The log level for logs from the sync worker.
   *
   * Defaults to {@link LogLevels.info}.
   */
  logLevel?: number;
}

/**
 * @internal Use {@link PowerSyncDatabase} instead, this class is only used by other SDKs also needing web support.
 */
export class WebPowerSyncDatabase extends AbstractPowerSyncDatabase<WebPowerSyncDatabaseOptions> {
  static SHARED_MUTEX = new Mutex();

  protected resolvedOpenOptions: WebSpecificOpenOptions;
  protected enableBroadcastLogs: boolean;

  constructor(options: WebPowerSyncDatabaseOptions) {
    const resolvedOpenOptions = resolveAndValidateOptions('database' in options ? options.database : {});

    super(options);
    this.resolvedOpenOptions = resolvedOpenOptions;
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

  protected override openDBAdapter(): DBAdapter {
    return openDatabase(this.options, (options) => {
      const defaultFactory = new WASQLiteOpenFactory({
        logger: this.logger,
        open: options
      });
      return defaultFactory.openDB();
    });
  }

  /**
   * Closes the database connection.
   * By default the sync stream client is only disconnected if
   * multiple tabs are not enabled.
   */
  close(options?: PowerSyncCloseOptions): Promise<void> {
    return super.close({
      // Don't disconnect by default if multiple tabs are enabled
      disconnect: options?.disconnect ?? !this.resolvedOpenOptions.enableMultiTabs
    });
  }

  protected async loadVersion(): Promise<void> {
    if (this.resolvedOpenOptions.ssrMode) {
      return;
    }
    return super.loadVersion();
  }

  protected async resolveOfflineSyncStatus() {
    if (this.resolvedOpenOptions.ssrMode) {
      return;
    }
    return super.resolveOfflineSyncStatus();
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new SqliteBucketStorage(this.database, this.logger);
  }

  protected async runExclusive<T>(cb: () => Promise<T>) {
    if (this.resolvedOpenOptions.ssrMode) {
      return WebPowerSyncDatabase.SHARED_MUTEX.runExclusive(cb);
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
      case this.resolvedOpenOptions.ssrMode:
        return new SSRStreamingSyncImplementation();
      case this.resolvedOpenOptions.enableMultiTabs:
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
export const PowerSyncDatabase: PowerSyncDatabaseConstructor<WebPowerSyncDatabaseOptions> = WebPowerSyncDatabase;
export interface PowerSyncDatabase extends CommonPowerSyncDatabase {}
