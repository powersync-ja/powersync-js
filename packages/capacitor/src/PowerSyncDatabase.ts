import { Capacitor } from '@capacitor/core';
import {
  DBAdapter,
  MEMORY_TRIGGER_CLAIM_MANAGER,
  PowerSyncBackendConnector,
  RequiredAdditionalConnectionOptions,
  StreamingSyncImplementation,
  TriggerManagerConfig,
  PowerSyncDatabase as WebPowerSyncDatabase,
  WebPowerSyncDatabaseOptionsWithSettings,
  WebRemote
} from '@powersync/web';
import { CapacitorSQLiteAdapter } from './adapter/CapacitorSQLiteAdapter.js';
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
      const remote = new WebRemote(connector, this.logger);

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
