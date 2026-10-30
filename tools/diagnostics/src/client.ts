/**
 * The dock client script for `@powersync/web` apps. The devframe hub imports this module into the
 * app page with an already trusted RPC client. It watches the app's open databases and serves each
 * to the node side, which the diagnostics UI and MCP tools call.
 */
import type { DockClientScriptContext } from '@devframes/hub/client';
import { observeRegisteredDatabases } from '@powersync/web/devtools';
import { createIntegration, databaseSdk } from './agent.js';
import { createAgentServer } from './agent-server.js';

export default function setup(context: DockClientScriptContext): void {
  const server = createAgentServer(context.rpc);
  let counter = 0;
  let currentId: string | null = null;

  // A closing tab cannot wait for the release to complete: withdraw first, the heartbeat is the backstop.
  window.addEventListener('pagehide', () => {
    if (currentId) void context.rpc.call('powersync:page-unregister', currentId);
  });

  observeRegisteredDatabases((databases) => {
    const database = databases[0] ?? null;
    if (!database) {
      // The database closed: withdraw it.
      if (currentId) {
        void server.release(currentId);
        currentId = null;
      }
      return;
    }
    if (currentId) return;
    const sdk = databaseSdk(database, '@powersync/web');
    currentId = `${sdk.replace(/^@powersync\//, '')}-${++counter}`;
    void server.serve(currentId, createIntegration(database, sdk), sdk);
  });
}
