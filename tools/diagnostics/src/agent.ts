/**
 * The agent for a JavaScript host: the `SdkIntegration` built over a live database. This is the
 * package's `./agent` entry, for a host that opens the database and embeds the DevTools page itself;
 * the dock and node entries build their agents here too.
 */
import type { CommonPowerSyncDatabase } from '@powersync/common';
import type { CoreDiagnosticsEvent, SdkIntegration, Unsubscribe } from '@powersync/diagnostics-core';
import { JsAgent, type CoreEventSource } from './js-agent.js';
import { BasePowerSyncDatabase } from '@powersync/shared-internals';

// The iframe hand-off and the protocol types an embedding host needs, so the host never imports the protocol package.
export { attachIframe } from '@powersync/diagnostics-core';
export type {
  ActionRequest,
  AttachIframeOptions,
  DiagnosticsEvent,
  SdkIntegration,
  SyncState
} from '@powersync/diagnostics-core';

/** The sync client broadcasts core diagnostics events on this channel (see `emitDiagnostics`). */
const CORE_EVENTS_CHANNEL = 'powersync-diagnostics-events';

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

/** Builds the JavaScript integration over a live database. The agent reads the connection from the database itself. */
export function createIntegration(database: CommonPowerSyncDatabase, sdk: string): SdkIntegration {
  const db = database as BasePowerSyncDatabase;
  return new JsAgent(db, {
    sdk,
    coreEvents: typeof BroadcastChannel === 'function' ? new BroadcastCoreEvents() : undefined,
    connection: {
      getConnector: () => db.connector ?? null,
      getConnectionOptions: () => db.connectionOptions ?? null
    }
  });
}
