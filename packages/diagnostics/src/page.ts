/**
 * The page side for hosts without a devframe hub: the app loads this module during development, and
 * it serves the app's live database to any diagnostics UI iframe that asks over `postMessage`.
 * Nuxt DevTools v3 uses it together with `./vite-static`. Nothing here reaches a production build:
 * the host loads the module only in dev.
 */
import { PORT_MESSAGE, REQUEST_PORT_MESSAGE, exposeIntegration, type SdkIntegration } from '@powersync/diagnostics-core';
import { observeRegisteredDatabases } from '@powersync/web/devtools';
import { createIntegration } from './agent.js';

const SDK = '@powersync/web';

/**
 * Serves the app's first live database to any iframe that asks. Call once per page.
 * Returns a function that stops serving.
 */
export function serveDiagnostics(): () => void {
  let integration: SdkIntegration | null = null;
  const stops = new Set<() => void>();

  const stopObserving = observeRegisteredDatabases((databases) => {
    const next = databases[0] ?? null;
    // The database changed (opened, or the previous one closed): drop the old integration.
    for (const stop of stops) stop();
    stops.clear();
    void integration?.close();
    integration = next ? createIntegration(next, SDK) : null;
  });

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== REQUEST_PORT_MESSAGE) {
      return;
    }
    if (!integration) {
      console.info('[powersync-diagnostics] page: a UI asked for a port but no database is registered yet');
      return;
    }
    console.info('[powersync-diagnostics] page: serving an integration port to', event.origin);
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

// Loaded as a side-effect module: start serving as soon as the page loads it.
serveDiagnostics();
console.info('[powersync-diagnostics] page ready; serving live databases to the diagnostics UI');
