import { useEffect, useState } from 'react';
import { createRozeniteRpc, useRozeniteDevToolsClient } from '@rozenite/plugin-bridge';
import type { CommonPowerSyncDatabase } from '@powersync/common';
import type { SdkIntegration, Unsubscribe } from '@powersync/diagnostics-core';
import { createIntegration } from '../agent.js';
import { usePowerSyncAgentTools } from './agent-tools.js';
import { EVENT_MESSAGE, PLUGIN_ID, type AppMethods, type DevToolsEventMap } from './protocol.js';

const SDK = '@powersync/react-native';

/**
 * Serves `database` to the PowerSync panel in React Native DevTools (through Rozenite), and to coding
 * agents as Rozenite agent tools. Call it in a component that stays mounted, such as the app root.
 * Pass `null` while the database is not created yet; DevTools attach once it is.
 */
export function usePowerSyncDevTools(database: CommonPowerSyncDatabase | null): void {
  const client = useRozeniteDevToolsClient<DevToolsEventMap>({ pluginId: PLUGIN_ID });
  const [integration, setIntegration] = useState<SdkIntegration | null>(null);

  useEffect(() => {
    if (!database) return;
    const created = createIntegration(database, SDK);
    setIntegration(created);
    return () => {
      setIntegration(null);
      void created.close();
    };
  }, [database]);

  useEffect(() => {
    if (!client || !integration) return;
    const rpc = createRozeniteRpc<AppMethods>(client);
    let stopEvents: Unsubscribe | null = null;
    let closed = false;

    const handlers = [
      rpc.handle('runQuery', (params) => integration.runQuery(params)),
      rpc.handle('getSchema', () => integration.getSchema()),
      rpc.handle('getInfo', () => integration.getInfo()),
      rpc.handle('action', (request) => integration.action(request)),
      // A panel (re)opening asks for the stream; restarting it replays the current snapshots.
      rpc.handle('subscribe', async () => {
        stopEvents?.();
        const unsubscribe = await integration.observeEvents((event) => client.send(EVENT_MESSAGE, event));
        if (closed) unsubscribe();
        else stopEvents = unsubscribe;
      })
    ];

    return () => {
      closed = true;
      for (const handler of handlers) handler.remove();
      stopEvents?.();
      rpc.close();
    };
  }, [client, integration]);

  usePowerSyncAgentTools(integration);
}
