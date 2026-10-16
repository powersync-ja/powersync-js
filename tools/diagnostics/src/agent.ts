/**
 * The agent for a JavaScript host: the `SdkIntegration` built over a live database. This is the
 * package's `./agent` entry, for a host that opens the database and embeds the DevTools page itself;
 * the dock and node entries build their agents here too.
 */
import type { CommonPowerSyncDatabase, PowerSyncBackendConnector, SyncOptions } from '@powersync/common';
import type { CoreDiagnosticsEvent, SdkIntegration, Unsubscribe } from '@powersync/diagnostics-core';
import { JsAgent, type CoreEventSource, type JsAgentOptions } from './js-agent.js';

// The iframe hand-off an embedding host needs, so it imports nothing from the protocol package.
export { attachIframe } from '@powersync/diagnostics-core';

/** The sync client broadcasts core diagnostics events on this channel (see `emitDiagnostics`). */
const CORE_EVENTS_CHANNEL = 'powersync-diagnostics-events';

/**
 * The connection accessors every SDK's database class has. They are not on the public
 * `CommonPowerSyncDatabase` interface, so the agent reads them through this internal view.
 */
interface DiagnosableDatabase extends CommonPowerSyncDatabase {
  readonly connector: PowerSyncBackendConnector | null | undefined;
  readonly connectionOptions: SyncOptions | null | undefined;
}

/** Consumes the core diagnostics events the sync client broadcasts (from a worker or in-process). */
class BroadcastCoreEvents implements CoreEventSource {
  private channel = new BroadcastChannel(CORE_EVENTS_CHANNEL);

  onEvent(handler: (event: CoreDiagnosticsEvent) => void): Unsubscribe {
    const listener = (event: MessageEvent) => handler(event.data as CoreDiagnosticsEvent);
    this.channel.addEventListener('message', listener);
    return () => this.channel.removeEventListener('message', listener);
  }

  dispose(): void {
    this.channel.close();
  }
}

/** What a host may hand the integration besides the database. */
export type IntegrationOptions = Pick<JsAgentOptions, 'reset'>;

/**
 * Builds the JavaScript integration over a live database. The agent reads the connection from the
 * database itself. A host that can delete the database files passes `reset`, and `clearData` then
 * replaces the database instead of deleting its rows (see {@link JsAgentOptions.reset}).
 */
export function createIntegration(
  database: CommonPowerSyncDatabase,
  sdk: string,
  { reset }: IntegrationOptions = {}
): SdkIntegration {
  return new JsAgent(database, {
    sdk,
    coreEvents: typeof BroadcastChannel === 'function' ? new BroadcastCoreEvents() : undefined,
    connection: {
      getConnector: (db) => (db as DiagnosableDatabase).connector ?? null,
      getConnectionOptions: (db) => (db as DiagnosableDatabase).connectionOptions ?? null
    },
    reset
  });
}
