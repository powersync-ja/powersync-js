import { Capacitor } from '@capacitor/core';
import {
  DBAdapter,
  DEFAULT_STREAM_CONNECTION_OPTIONS,
  MEMORY_TRIGGER_CLAIM_MANAGER,
  PowerSyncBackendConnector,
  PowerSyncConnectionOptions,
  RequiredAdditionalConnectionOptions,
  StreamingSyncImplementation,
  SyncStreamConnectionMethod,
  TriggerManagerConfig,
  PowerSyncDatabase as WebPowerSyncDatabase,
  WebPowerSyncDatabaseOptionsWithSettings
} from '@powersync/web';
import { CapacitorSQLiteAdapter } from './adapter/CapacitorSQLiteAdapter.js';
import { CapacitorRemote } from './sync/CapacitorRemote.js';
import { CapacitorStreamingSyncImplementation } from './sync/CapacitorSyncImplementation.js';

/**
 * PowerSyncDatabase class for managing database connections and sync implementations.
 * This extends the WebPowerSyncDatabase to provide platform-specific implementations
 * for Capacitor environments (iOS and Android).
 *
 * @experimental
 * @alpha
 */
export class PowerSyncDatabase extends WebPowerSyncDatabase {
  /**
   * Connects to stream of events from the PowerSync instance.
   * {@link PowerSyncConnectionOptions#connectionMethod} defaults to WebSocket connection on Web platforms
   * or HTTP connections if using {@link CapacitorSQLiteAdapter} - this is due to poor performance with
   * the Capacitor Community SQlite library and binary payloads.
   */
  connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions): Promise<void> {
    const isUsingCapacitorDriver = this.database instanceof CapacitorSQLiteAdapter;
    const defaultConnectionMethod = isUsingCapacitorDriver
      ? SyncStreamConnectionMethod.HTTP
      : DEFAULT_STREAM_CONNECTION_OPTIONS.connectionMethod;
    if (options?.connectionMethod == SyncStreamConnectionMethod.WEB_SOCKET && isUsingCapacitorDriver) {
      this.logger.warn(
        `Connecting via 'SyncStreamConnectionMethod.WEB_SOCKET' when using the 'CapacitorSQLiteAdapter' will result in poor sync performance. Use 'SyncStreamConnectionMethod.HTTP' (the default for native) instead.`
      );
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

  protected openDBAdapter(options: WebPowerSyncDatabaseOptionsWithSettings): DBAdapter {
    const platform = Capacitor.getPlatform();
    if (platform == 'ios' || platform == 'android') {
      if (options.database.dbLocation) {
        options.logger?.warn(`
          dbLocation is ignored on iOS and Android platforms. 
          The database directory can be configured in the Capacitor project.
          See https://github.com/capacitor-community/sqlite?tab=readme-ov-file#installation`);
      }
      options.logger?.debug(`Using CapacitorSQLiteAdapter for platform: ${platform}`);
      return new CapacitorSQLiteAdapter({
        ...options.database
      });
    } else {
      options.logger?.debug(`Using default web adapter for web platform`);
      return super.openDBAdapter(options);
    }
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
    options: RequiredAdditionalConnectionOptions
  ): StreamingSyncImplementation {
    if (this.isNativeCapacitorPlatform) {
      // We don't want to support multi-tab on mobile platforms.
      // We technically can, but it's not a common use case and requires additional work/testing.
      this.logger.debug(`Using Capacitor sync implementation`);
      if (this.options.flags?.enableMultiTabs) {
        this.logger.warn(`enableMultiTabs is not supported on Capacitor mobile platforms. Ignoring the flag.`);
      }

      const remote = new CapacitorRemote(connector, this.logger);

      return new CapacitorStreamingSyncImplementation({
        ...(this.options as {}),
        retryDelayMs: options.retryDelayMs,
        crudUploadThrottleMs: options.crudUploadThrottleMs,
        adapter: this.bucketStorageAdapter,
        remote,
        uploadCrud: async () => {
          await this.waitForReady();
          await connector.uploadData(this);
        },
        identifier: this.database.name,
        logger: this.logger,
        subscriptions: options.subscriptions
      });
    } else {
      this.logger.debug(`Using default web sync implementation for web platform`);
      return super.generateSyncStreamImplementation(connector, options);
    }
  }
}
