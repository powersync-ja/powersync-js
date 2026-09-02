import {
  WebPowerSyncDatabase,
  type DisconnectAndClearOptions,
  type PowerSyncBackendConnector,
  type WebPowerSyncDatabaseOptions,
  type SyncOptions,
  type CommonPowerSyncDatabase,
  type PowerSyncDatabaseConstructor
} from '@powersync/web';
import { BroadcastChannelTransport, DiagnosticsAgent } from '@powersync/diagnostics-core';
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
  private _connector: PowerSyncBackendConnector | null = null;
  private diagnosticsAgent?: DiagnosticsAgent;

  get dbOptions(): WebPowerSyncDatabaseOptions {
    return this.options;
  }

  override get connector() {
    return this._connector ?? super.connector;
  }

  constructor(options: WebPowerSyncDatabaseOptions) {
    const useDiagnostics = useRuntimeConfig().public.powerSyncModuleOptions.useDiagnostics ?? false;

    if (useDiagnostics && 'database' in options) {
      // The DevTools inspector iframe runs as a second tab in the same browser context.
      options.database.enableMultiTabs = true;
    }

    super(options);

    // Attach the diagnostics agent to the real client in the top window. The inspector iframe
    // talks to it over a BroadcastChannel and does not attach an agent of its own.
    if (useDiagnostics && isTopWindow()) {
      this.waitForReady().then(() => {
        this.diagnosticsAgent = new DiagnosticsAgent(this, new BroadcastChannelTransport(), {
          sdk: '@powersync/web'
        });
        this.diagnosticsAgent.start();
      });
    }
  }

  override async connect(connector: PowerSyncBackendConnector, options?: SyncOptions) {
    this._connector = connector;
    await super.connect(connector, options);
  }

  override async disconnect() {
    // Retain the connector so diagnostics can reconnect after a manual disconnect.
    await super.disconnect();
  }

  override async disconnectAndClear(options?: DisconnectAndClearOptions) {
    await super.disconnectAndClear(options);
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
