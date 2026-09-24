/**
 * Pieces shared by every JavaScript host: building the agent over a live database, and serving
 * agents to a devframe node side over an RPC client (a dock script in a web page, or a node process).
 */
import type { DevframeRpcClient } from 'devframe/client';
import type { CommonPowerSyncDatabase, PowerSyncBackendConnector, SyncOptions } from '@powersync/common';
import type {
  ActionRequest,
  CoreDiagnosticsEvent,
  DiagnosticsEvent,
  QueryParams,
  SdkIntegration,
  Unsubscribe
} from '@powersync/diagnostics-core';
import { HEARTBEAT_MS } from './constants.js';
import { JsAgent, type CoreEventSource } from './js-agent.js';
import './rpc-types.js';

/** The sync client broadcasts core diagnostics events on this channel (see `emitDiagnostics`). */
const CORE_EVENTS_CHANNEL = 'powersync-diagnostics-events';

/**
 * A live PowerSync JavaScript database the agent can serve: the SDK's database plus the connection
 * accessors every SDK's database class exposes.
 */
export interface DiagnosableDatabase extends CommonPowerSyncDatabase {
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

/** Builds the JavaScript integration over a live database. */
export function createIntegration(db: DiagnosableDatabase, sdk: string): SdkIntegration {
  return new JsAgent(db, {
    sdk,
    coreEvents: typeof BroadcastChannel === 'function' ? new BroadcastCoreEvents() : undefined,
    connection: {
      getConnector: () => db.connector ?? null,
      getConnectionOptions: () => db.connectionOptions ?? null
    }
  });
}

/** Serves integrations to the node side over one RPC client. */
export interface AgentServer {
  /** Announces `integration` as `sourceId` and starts forwarding its events. */
  serve(sourceId: string, integration: SdkIntegration, sdk: string): Promise<void>;
  /** Withdraws a served integration. */
  release(sourceId: string): Promise<void>;
  /** Releases everything served through this client. */
  close(): Promise<void>;
}

/**
 * Registers the page-side functions the node side calls (`powersync:page-*`) on `rpc`, and returns
 * a server that announces integrations to it. Call once per RPC client.
 */
export function createAgentServer(rpc: DevframeRpcClient): AgentServer {
  const served = new Map<string, { integration: SdkIntegration; stop: Unsubscribe }>();
  // The node side only knows this client is alive while it hears from it.
  const heartbeat = setInterval(() => {
    for (const sourceId of served.keys()) void rpc.callEvent('powersync:page-heartbeat', sourceId);
  }, HEARTBEAT_MS);
  (heartbeat as { unref?: () => void }).unref?.();

  const integrationFor = (sourceId: string): SdkIntegration => {
    const entry = served.get(sourceId);
    if (!entry) throw new Error(`No database "${sourceId}" is served here.`);
    return entry.integration;
  };
  const register = (name: string, handler: (...args: any[]) => unknown) =>
    rpc.client.register({ name, type: 'action', jsonSerializable: true, handler }, true);
  register('powersync:page-query', (id: string, params: QueryParams) => integrationFor(id).runQuery(params));
  register('powersync:page-schema', (id: string) => integrationFor(id).getSchema());
  register('powersync:page-info', (id: string) => integrationFor(id).getInfo());
  register('powersync:page-action', (id: string, request: ActionRequest) => integrationFor(id).action(request));

  return {
    async serve(sourceId, integration, sdk) {
      await rpc.call('powersync:page-register', sourceId, sdk);
      const stop = await integration.observeEvents((event: DiagnosticsEvent) => {
        void rpc.callEvent('powersync:page-event', sourceId, event);
      });
      served.set(sourceId, { integration, stop });
    },
    async release(sourceId) {
      const entry = served.get(sourceId);
      if (!entry) return;
      served.delete(sourceId);
      entry.stop();
      await entry.integration.close();
      await rpc.call('powersync:page-unregister', sourceId).catch(() => {});
    },
    async close() {
      clearInterval(heartbeat);
      for (const sourceId of [...served.keys()]) {
        await this.release(sourceId);
      }
    }
  };
}
