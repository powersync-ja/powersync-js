/**
 * The in-page half of the plugin. Injected into the app during `vite dev` only.
 *
 * Finds the app's live databases through `@powersync/web/devtools`, wraps the first one in the
 * JavaScript agent, and serves it to the diagnostics dock iframe over a dedicated `MessagePort`.
 * The dock iframe asks for the port with a `postMessage`; this module answers. Nothing here reaches
 * a production build: the plugin injects the module only when the dev server runs.
 */
import {
  PORT_MESSAGE,
  REQUEST_PORT_MESSAGE,
  exposeIntegration,
  type CoreDiagnosticsEvent,
  type SdkIntegration,
  type Unsubscribe
} from '@powersync/diagnostics-core';
import { JsAgent, type CoreEventSource } from '@powersync/diagnostics-core/js';
import { observeRegisteredDatabases } from '@powersync/web/devtools';
import type { WebPowerSyncDatabase } from '@powersync/web';

/** The sync client broadcasts core diagnostics events on this channel (see `emitDiagnostics`). */
const CORE_EVENTS_CHANNEL = 'powersync-diagnostics-events';

/** Consumes the core diagnostics events the sync client broadcasts from its worker. */
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

/** Builds the JavaScript integration over a live web database. */
export function createIntegration(db: WebPowerSyncDatabase): SdkIntegration {
  // No cast: the concrete database must satisfy the agent's structural database type, checked here.
  return new JsAgent(db, {
    sdk: '@powersync/web',
    coreEvents: new BroadcastCoreEvents(),
    // The concrete database exposes its connection; the agent reads it through this accessor.
    connection: {
      getConnector: () => db.connector,
      getConnectionOptions: () => db.connectionOptions
    }
  });
}

/**
 * Serves the app's first live database to any dock iframe that asks. Call once per page.
 * Returns a function that stops serving.
 */
export function serveDiagnostics(): () => void {
  let current: WebPowerSyncDatabase | null = null;
  let integration: SdkIntegration | null = null;
  const stops = new Set<() => void>();

  const stopObserving = observeRegisteredDatabases((databases) => {
    const next = databases[0] ?? null;
    if (next === current) {
      return;
    }
    // The database changed (opened, or the previous one closed): drop the old integration.
    for (const stop of stops) stop();
    stops.clear();
    void integration?.close();
    current = next;
    integration = next ? createIntegration(next) : null;
  });

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== REQUEST_PORT_MESSAGE) {
      return;
    }
    if (!integration) {
      console.info('[powersync-diagnostics] client: a UI asked for a port but no database is registered yet');
      return;
    }
    console.info('[powersync-diagnostics] client: serving an integration port to', event.origin);
    // One dedicated channel per asking iframe, so several docks can attach at once.
    const channel = new MessageChannel();
    stops.add(exposeIntegration(integration, channel.port1));
    (event.source as Window | null)?.postMessage({ type: PORT_MESSAGE }, { targetOrigin: event.origin, transfer: [channel.port2] });
  };
  window.addEventListener('message', onMessage);

  return () => {
    window.removeEventListener('message', onMessage);
    stopObserving();
    for (const stop of stops) stop();
    void integration?.close();
  };
}

// Injected as a side-effect module: start serving as soon as the page loads it.
serveDiagnostics();
// Development-only module, so a visible trace helps confirm the agent is present in the page.
console.info('[powersync-diagnostics] client ready; serving live databases to the diagnostics UI');
