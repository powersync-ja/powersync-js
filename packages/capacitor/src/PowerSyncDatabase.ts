import { Capacitor } from '@capacitor/core';
import {
  CommonPowerSyncDatabase,
  DBAdapter,
  LogLevels,
  PowerSyncBackendConnector,
  PowerSyncDatabaseConstructor,
  SyncOptions,
  SyncStreamConnectionMethod,
  WebPowerSyncDatabase,
  WebPowerSyncDatabaseOptions
} from '@powersync/web';
import { CapacitorSQLiteAdapter } from './adapter/CapacitorSQLiteAdapter.js';
import { CapacitorRemote } from './sync/CapacitorRemote.js';
import { CapacitorStreamingSyncImplementation } from './sync/CapacitorSyncImplementation.js';
import {
  CreateSyncImplementationOptions,
  MEMORY_TRIGGER_CLAIM_MANAGER,
  StreamingSyncImplementation,
  TriggerManagerConfig,
  openDatabase
} from '@powersync/shared-internals';

class CapacitorPowerSyncDatabase extends WebPowerSyncDatabase {
  /**
   * Connects to stream of events from the PowerSync instance.
   * {@link PowerSyncConnectionOptions#connectionMethod} defaults to WebSocket connection on Web platforms
   * or HTTP connections if using {@link CapacitorSQLiteAdapter} - this is due to poor performance with
   * the Capacitor Community SQLite library and binary payloads.
   */
  connect(connector: PowerSyncBackendConnector, options?: SyncOptions): Promise<void> {
    const isUsingCapacitorDriver = this.database instanceof CapacitorSQLiteAdapter;
    const defaultConnectionMethod = isUsingCapacitorDriver ? SyncStreamConnectionMethod.HTTP : undefined;
    if (options?.connectionMethod == SyncStreamConnectionMethod.WEB_SOCKET && isUsingCapacitorDriver) {
      this.logger.log({
        level: LogLevels.warn,
        message: `Connecting via 'SyncStreamConnectionMethod.WEB_SOCKET' when using the 'CapacitorSQLiteAdapter' will result in poor sync performance. Use 'SyncStreamConnectionMethod.HTTP' (the default for native) instead.`
      });
    }

    return super.connect(connector, {
      ...(options ?? {}),
      connectionMethod: options?.connectionMethod ?? defaultConnectionMethod
    });
  }

  protected get isNativeCapacitorPlatform(): boolean {
    const platform = Capacitor.getPlatform();
    return platform == 'ios' || platform == 'android';
  }

  protected openDBAdapter(): DBAdapter {
    return openDatabase(this.options, (options) => {
      const platform = Capacitor.getPlatform();
      if (platform == 'ios' || platform == 'android') {
        if (options.dbLocation) {
          this.logger.log({
            level: LogLevels.warn,
            message: `
          dbLocation is ignored on iOS and Android platforms. 
          The database directory can be configured in the Capacitor project.
          See https://github.com/capacitor-community/sqlite?tab=readme-ov-file#installation`
          });
        }
        this.logger.log({
          level: LogLevels.debug,
          message: `Using CapacitorSQLiteAdapter for platform: ${platform}`
        });
        return new CapacitorSQLiteAdapter(options);
      } else {
        this.logger.log({ level: LogLevels.debug, message: `Using default web adapter for web platform` });
        return super.openDBAdapter();
      }
    });
  }

  protected generateTriggerManagerConfig(): TriggerManagerConfig {
    const config = super.generateTriggerManagerConfig();
    if (this.isNativeCapacitorPlatform) {
      /**
       * We usually only ever have a single tab for capacitor.
       * Avoiding navigator locks allows insecure contexts (during development).
       */
      config.claimManager = MEMORY_TRIGGER_CLAIM_MANAGER;
    }
    return config;
  }

  protected runExclusive<T>(cb: () => Promise<T>): Promise<T> {
    if (this.isNativeCapacitorPlatform) {
      // Use mutex for mobile platforms.
      // This is mainly for testing purposes since navigator.locks require secure contexts.
      return this.runExclusiveMutex.runExclusive(cb);
    } else {
      // Use navigator.locks for web platform
      return super.runExclusive(cb);
    }
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions
  ): StreamingSyncImplementation {
    if (this.isNativeCapacitorPlatform) {
      // We don't want to support multi-tab on mobile platforms.
      // We technically can, but it's not a common use case and requires additional work/testing.
      this.logger.log({ level: LogLevels.debug, message: `Using Capacitor sync implementation` });
      if (this.resolvedOpenOptions.enableMultiTabs) {
        this.logger.log({
          level: LogLevels.warn,
          message: `enableMultiTabs is not supported on Capacitor mobile platforms. Ignoring the flag.`
        });
      }

      const remote = new CapacitorRemote(connector, this.logger);

      return new CapacitorStreamingSyncImplementation({
        ...(this.options as {}),
        adapter: this.bucketStorageAdapter,
        remote,
        uploadCrud: async () => {
          await this.waitForReady();
          await connector.uploadData(this);
        },
        identifier: this.database.name,
        logger: this.logger,
        subscriptions: options.subscriptions,
        serializedSchema: options.serializedSchema
      });
    } else {
      this.logger.log({ level: LogLevels.debug, message: `Using default web sync implementation for web platform` });
      return super.generateSyncStreamImplementation(connector, options);
    }
  }
}

/**
 * PowerSyncDatabase class for managing database connections and sync implementations.
 * This extends the WebPowerSyncDatabase to provide platform-specific implementations
 * for Capacitor environments (iOS and Android).
 *
 * @experimental
 * @alpha
 */
export const PowerSyncDatabase: PowerSyncDatabaseConstructor<WebPowerSyncDatabaseOptions> = CapacitorPowerSyncDatabase;

export interface PowerSyncDatabase extends CommonPowerSyncDatabase {}
