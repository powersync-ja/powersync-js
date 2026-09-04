import {
  enableDiagnostics,
  WebPowerSyncDatabase,
  type PowerSyncBackendConnector,
  type WebPowerSyncDatabaseOptions,
  type SyncOptions,
  type CommonPowerSyncDatabase,
  type PowerSyncDatabaseConstructor
} from '@powersync/web';
// @ts-ignore
import { useRuntimeConfig } from '#app';

function isTopWindow(): boolean {
  try {
    return typeof window !== 'undefined' && window.self === window.top;
  } catch {
    // A cross-origin parent throws on access; treat as embedded.
    return false;
  }
}

export class NuxtDatabaseImplementation extends WebPowerSyncDatabase {
  private readonly useDiagnostics: boolean;

  get dbOptions(): WebPowerSyncDatabaseOptions {
    return this.options;
  }

  constructor(options: WebPowerSyncDatabaseOptions) {
    const useDiagnostics = useRuntimeConfig().public.powerSyncModuleOptions.useDiagnostics ?? false;

    if (useDiagnostics && 'database' in options) {
      // The DevTools inspector iframe runs as a second tab in the same browser context.
      options.database.enableMultiTabs = true;
      // Surface shared-worker sync logs (incl. diagnostics events) to the page.
      options.broadcastLogs = true;
    }

    super(options);
    this.useDiagnostics = useDiagnostics;

    // Attach the diagnostics agent to the real client in the top window. The inspector iframe
    // talks to it over a BroadcastChannel and does not attach an agent of its own.
    if (useDiagnostics && isTopWindow()) {
      this.waitForReady().then(() => enableDiagnostics(this, { sdk: '@powersync/web' }));
    }
  }

  override async connect(connector: PowerSyncBackendConnector, options?: SyncOptions) {
    // Enable the core diagnostics event stream when running in diagnostics mode.
    await super.connect(connector, this.useDiagnostics ? { ...options, diagnostics: true } : options);
  }
}

/**
 * A PowerSync database that attaches the diagnostics agent when `useDiagnostics: true` is set in the
 * module configuration, exposing the live client to the DevTools inspector over a BroadcastChannel.
 * With diagnostics disabled it behaves like a standard `PowerSyncDatabase`.
 *
 * @example
 * ```typescript
 * const db = new NuxtPowerSyncDatabase({
 *   database: { dbFilename: 'your-db-filename.sqlite' },
 *   schema: yourSchema
 * });
 * ```
 */
export const NuxtPowerSyncDatabase: PowerSyncDatabaseConstructor<WebPowerSyncDatabaseOptions> =
  NuxtDatabaseImplementation;

export interface NuxtPowerSyncDatabase extends CommonPowerSyncDatabase {}
