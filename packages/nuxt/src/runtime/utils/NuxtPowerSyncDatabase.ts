import {
  WebPowerSyncDatabase,
  type PowerSyncBackendConnector,
  type WebPowerSyncDatabaseOptions,
  type SyncOptions,
  type CommonPowerSyncDatabase,
  type PowerSyncDatabaseConstructor
} from '@powersync/web';
// @ts-ignore
import { useRuntimeConfig } from '#app';

export class NuxtDatabaseImplementation extends WebPowerSyncDatabase {
  private readonly useDiagnostics: boolean;

  get dbOptions(): WebPowerSyncDatabaseOptions {
    return this.options;
  }

  constructor(options: WebPowerSyncDatabaseOptions) {
    const useDiagnostics = useRuntimeConfig().public.powerSyncModuleOptions.useDiagnostics ?? false;

    if (useDiagnostics && 'database' in options) {
      // Surface shared-worker sync logs (incl. core diagnostics events) to the page.
      options.broadcastLogs = true;
    }

    super(options);
    this.useDiagnostics = useDiagnostics;
  }

  override async connect(connector: PowerSyncBackendConnector, options?: SyncOptions) {
    // Enable the core diagnostics event stream when running in diagnostics mode.
    await super.connect(connector, this.useDiagnostics ? { ...options, diagnostics: true } : options);
  }
}

/**
 * A PowerSync database that enables the core diagnostics event stream when `useDiagnostics: true` is
 * set in the module configuration. Inspection itself is provided by the diagnostics Vite plugin. With
 * diagnostics disabled it behaves like a standard `PowerSyncDatabase`.
 *
 * @deprecated Configure the diagnostics Vite plugin and pass `{ diagnostics: true }` to `connect()`
 * directly; this subclass will be removed.
 */
export const NuxtPowerSyncDatabase: PowerSyncDatabaseConstructor<WebPowerSyncDatabaseOptions> =
  NuxtDatabaseImplementation;

export interface NuxtPowerSyncDatabase extends CommonPowerSyncDatabase {}
