import { useEffect, useRef } from 'react';
import { useRozenitePluginAgentTool, type AgentTool } from '@rozenite/agent-bridge';
import type {
  ActionRequest,
  QueryParams,
  SdkIntegration,
  SyncState,
  UploadQueueState
} from '@powersync/diagnostics-core';
import { PLUGIN_ID } from './protocol.js';

// The same tools the MCP endpoint offers on the web, for Rozenite's agent CLI and SDK.

const queryTool: AgentTool = {
  name: 'query',
  description:
    'Run SQL against the PowerSync SQLite database of the app. App tables are views; the sync client state is in the ps_* tables (ps_buckets, ps_oplog, ps_crud, ps_stream_subscriptions). Returns columns and rows.',
  inputSchema: {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'The SQL statement.' },
      params: { type: 'array', description: 'Values for `?` placeholders.' }
    },
    required: ['sql']
  }
};

const schemaTool: AgentTool = {
  name: 'schema',
  description: 'The client schema as the PowerSync SQLite core receives it: tables, columns, indexes.',
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const infoTool: AgentTool = {
  name: 'info',
  description: 'Connection info of the PowerSync client: endpoint, user id, client id, connection method, core version.',
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const statusTool: AgentTool = {
  name: 'status',
  description:
    'The latest sync status the PowerSync client reported: connected, downloading, progress, last sync, errors. Null until it has reported.',
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const uploadQueueTool: AgentTool = {
  name: 'upload-queue',
  description: 'Pending local changes waiting to upload, as last reported: count and size. Null until reported.',
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const actionTool: AgentTool = {
  name: 'action',
  description:
    'Run a control action on the PowerSync client: reconnect, disconnect, clearData (wipes local data and re-syncs), requestCheckpoint, subscribeStream, unsubscribeStream.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['reconnect', 'disconnect', 'clearData', 'requestCheckpoint', 'subscribeStream', 'unsubscribeStream']
      },
      args: {
        type: 'object',
        description: 'For subscribeStream and unsubscribeStream: { name, params?, ttl?, priority? }.'
      }
    },
    required: ['action']
  },
  destructive: true
};

function requireIntegration(integration: SdkIntegration | null): SdkIntegration {
  if (!integration) throw new Error('The PowerSync database is not attached yet.');
  return integration;
}

/** Registers the PowerSync agent tools for one database. */
export function usePowerSyncAgentTools(integration: SdkIntegration | null): void {
  const latest = useRef<{ status: SyncState | null; uploadQueue: UploadQueueState | null }>({
    status: null,
    uploadQueue: null
  });

  // The status tools answer from the latest pushed snapshots, as the MCP tools do.
  useEffect(() => {
    if (!integration) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    void integration
      .observeEvents((event) => {
        if (event.type === 'status') latest.current.status = event.payload;
        if (event.type === 'uploadQueue') latest.current.uploadQueue = event.payload;
      })
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [integration]);

  const enabled = integration != null;
  useRozenitePluginAgentTool({
    pluginId: PLUGIN_ID,
    tool: queryTool,
    enabled,
    handler: (params: QueryParams) => requireIntegration(integration).runQuery(params)
  });
  useRozenitePluginAgentTool({
    pluginId: PLUGIN_ID,
    tool: schemaTool,
    enabled,
    handler: () => requireIntegration(integration).getSchema()
  });
  useRozenitePluginAgentTool({
    pluginId: PLUGIN_ID,
    tool: infoTool,
    enabled,
    handler: () => requireIntegration(integration).getInfo()
  });
  useRozenitePluginAgentTool({
    pluginId: PLUGIN_ID,
    tool: statusTool,
    enabled,
    handler: () => latest.current.status
  });
  useRozenitePluginAgentTool({
    pluginId: PLUGIN_ID,
    tool: uploadQueueTool,
    enabled,
    handler: () => latest.current.uploadQueue
  });
  useRozenitePluginAgentTool({
    pluginId: PLUGIN_ID,
    tool: actionTool,
    enabled,
    handler: async (request: ActionRequest) => {
      await requireIntegration(integration).action(request);
      return { ok: true };
    }
  });
}
