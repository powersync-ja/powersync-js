import { useEffect, useRef } from 'react';
import { useRozenitePluginAgentTool, type AgentTool } from '@rozenite/agent-bridge';
import type {
  ActionRequest,
  QueryParams,
  SdkIntegration,
  SyncState,
  UploadQueueState
} from '@powersync/diagnostics-core';
import { ACTION_NAMES, ARGUMENT_DESCRIPTIONS, TOOL_DESCRIPTIONS } from '../tools.js';
import { PLUGIN_ID } from './protocol.js';

// The same tools the MCP endpoint offers on the web, for Rozenite's agent CLI and SDK.

const queryTool: AgentTool = {
  name: 'query',
  description: TOOL_DESCRIPTIONS.query,
  inputSchema: {
    type: 'object',
    properties: {
      sql: { type: 'string', description: ARGUMENT_DESCRIPTIONS.sql },
      params: { type: 'array', description: ARGUMENT_DESCRIPTIONS.params }
    },
    required: ['sql']
  }
};

const schemaTool: AgentTool = {
  name: 'schema',
  description: TOOL_DESCRIPTIONS.schema,
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const infoTool: AgentTool = {
  name: 'info',
  description: TOOL_DESCRIPTIONS.info,
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const statusTool: AgentTool = {
  name: 'status',
  description: TOOL_DESCRIPTIONS.status,
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const uploadQueueTool: AgentTool = {
  name: 'upload-queue',
  description: TOOL_DESCRIPTIONS['upload-queue'],
  inputSchema: { type: 'object', properties: {} },
  readOnly: true
};

const actionTool: AgentTool = {
  name: 'action',
  description: TOOL_DESCRIPTIONS.action,
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ACTION_NAMES
      },
      args: {
        type: 'object',
        description: ARGUMENT_DESCRIPTIONS.actionArgs
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
