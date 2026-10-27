import { useEffect, useState } from 'react';
import { createRozeniteRpc, useRozeniteDevToolsClient } from '@rozenite/plugin-bridge';
import type { CommonPowerSyncDatabase } from '@powersync/common';
import type { SdkIntegration, Unsubscribe } from '@powersync/diagnostics-core';
import { createIntegration } from '../agent.js';
import { usePowerSyncAgentTools } from './agent-tools.js';
import { ensureBroadcastChannel } from './broadcast-channel.js';
import { EVENT_MESSAGE, PLUGIN_ID, type AppMethods, type DevToolsEventMap } from './protocol.js';

const SDK = '@powersync/react-native';

// Before any database emits: the sync client and the agent exchange core diagnostics events over it.
ensureBroadcastChannel();

/**
 * Serves `database` to the PowerSync panel in React Native DevTools (through Rozenite), and to coding
 * agents as Rozenite agent tools. Call it in a component that stays mounted, such as the app root.
 */
export function usePowerSyncDevTools(database: CommonPowerSyncDatabase): void {
  const client = useRozeniteDevToolsClient<DevToolsEventMap>({ pluginId: PLUGIN_ID });
  const [integration, setIntegration] = useState<SdkIntegration | null>(null);

  useEffect(() => {
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
