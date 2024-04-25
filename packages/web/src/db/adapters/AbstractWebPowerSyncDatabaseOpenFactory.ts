import {
  AbstractPowerSyncDatabase,
  AbstractPowerSyncDatabaseOpenFactory,
  PowerSyncDatabaseOptions,
  PowerSyncOpenFactoryOptions
} from '@powersync/common';
import { PowerSyncDatabase, WebPowerSyncDatabaseOptions, WebPowerSyncFlags } from '../../db/PowerSyncDatabase';
import { SSRDBAdapter } from './SSRDBAdapter';

export interface WebPowerSyncOpenFlags extends WebPowerSyncFlags {
  disableSSRWarning?: boolean;
}

export interface WebPowerSyncOpenFactoryOptions extends PowerSyncOpenFactoryOptions {
  flags?: WebPowerSyncOpenFlags;
}

export const DEFAULT_POWERSYNC_FLAGS: WebPowerSyncOpenFlags = {
  /**
   * Multiple tabs are by default not supported on Android, iOS and Safari.
   * Other platforms will have multiple tabs enabled by default.
   */
  enableMultiTabs:
    typeof globalThis.navigator !== 'undefined' && // For SSR purposes
    typeof SharedWorker !== 'undefined' &&
    !navigator.userAgent.match(/(Android|iPhone|iPod|iPad)/i) &&
    !(window as any).safari,
  broadcastLogs: true
};

/**
 * Intermediate PowerSync Database Open factory for Web which uses a mock
 * SSR DB Adapter if running on server side.
 * Most SQLite DB implementations only run on client side, this will safely return
 * empty query results in SSR which will allow for generating server partial views.
 */
export abstract class AbstractWebPowerSyncDatabaseOpenFactory extends AbstractPowerSyncDatabaseOpenFactory {
  protected isServerSide() {
    return typeof window == 'undefined';
  }

  constructor(protected options: WebPowerSyncOpenFactoryOptions) {
    super(options);
  }

  generateOptions(): WebPowerSyncDatabaseOptions {
    const isServerSide = this.isServerSide();
    if (isServerSide && !this.options.flags?.disableSSRWarning) {
      console.warn(
        `
  Running PowerSync in SSR mode.
  Only empty query results will be returned.
  Disable this warning by setting 'disableSSRWarning: true' in options.`
      );
    }

    // Resolve flags for PowerSync DB client
    const resolvedFlags = this.resolveDBFlags();

    if (!resolvedFlags.enableMultiTabs) {
      console.warn(
        'Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.'
      );
    }

    return {
      ...this.options,
      database: isServerSide ? new SSRDBAdapter() : this.openDB(),
      schema: this.schema,
      flags: resolvedFlags
    };
  }

  protected resolveDBFlags(): WebPowerSyncFlags {
    const flags = {
      ...DEFAULT_POWERSYNC_FLAGS,
      ssrMode: this.isServerSide(),
      ...(this.options.flags ?? {})
    };
    if (typeof this.options.flags?.enableMultiTabs != 'undefined') {
      flags.enableMultiTabs = this.options.flags.enableMultiTabs;
    }
    return flags;
  }

  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    return new PowerSyncDatabase(options);
  }
}
