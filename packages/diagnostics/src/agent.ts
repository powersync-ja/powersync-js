/**
 * Runtime-neutral pieces shared by every JavaScript host: building the agent over a live database,
 * and serving agents to a devframe node side over an RPC client (a dock script in a web page, a
 * remote app such as React Native, or a node process).
 */
import { connectDevframe, type DevframeRpcClient } from 'devframe/client';
import type { ActionRequest, CoreDiagnosticsEvent, DiagnosticsEvent, QueryParams, SdkIntegration, Unsubscribe } from '@powersync/diagnostics-core';
import { JsAgent, type CoreEventSource, type LiveConnectionOptions, type LiveConnector, type LiveDatabase } from '@powersync/diagnostics-core/js';
import './rpc-types.js';

/** The sync client broadcasts core diagnostics events on this channel (see `emitDiagnostics`). */
const CORE_EVENTS_CHANNEL = 'powersync-diagnostics-events';

/**
 * A live PowerSync JavaScript database the agent can serve: the structural database plus the
 * connection accessors every SDK's database class exposes.
 */
export interface DiagnosableDatabase extends LiveDatabase {
  readonly connector: LiveConnector | null | undefined;
  readonly connectionOptions: LiveConnectionOptions | null | undefined;
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
  register('powersync:page-status', (id: string) => integrationFor(id).currentSyncStatus());
  register('powersync:page-upload-queue', (id: string) => integrationFor(id).getUploadQueueStats());
  register('powersync:page-action', (id: string, request: ActionRequest) => integrationFor(id).action(request));

  return {
    async serve(sourceId, integration, sdk) {
      await rpc.call('powersync:page-register', sourceId, sdk);
      const stop = await integration.observeEvents((event: DiagnosticsEvent) => {
        void rpc.callEvent('powersync:page-event', sourceId, event);
      });
      served.set(sourceId, { integration, stop });
      console.info(`[powersync-diagnostics] agent: serving ${sourceId} to the dev server`);
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
      for (const sourceId of [...served.keys()]) {
        await this.release(sourceId);
      }
    }
  };
}

export interface ConnectAgentOptions {
  /** Where the PowerSync DevTools server is, e.g. `http://localhost:9999/`. */
  baseURL: string;
  /** A pre-shared token the server trusts (`clientAuthTokens`), so no one-time code is needed. */
  authToken?: string;
  /** A label for the SDK, e.g. `@powersync/react-native`. */
  sdk?: string;
  /** The source id shown in the UI. */
  id?: string;
}

/**
 * Serves a database to a running PowerSync DevTools server from anywhere with `fetch` and
 * `WebSocket`: a plain web page, a React Native app, a node process. Development only.
 * Returns a function that stops serving.
 */
export async function connectAgent(db: DiagnosableDatabase, options: ConnectAgentOptions): Promise<() => Promise<void>> {
  const sdk = options.sdk ?? 'javascript';
  const rpc = await connectDevframe({ baseURL: options.baseURL, authToken: options.authToken, simpleAuth: false, otpParam: false });
  const trusted = await rpc.ensureTrusted();
  if (!trusted) {
    throw new Error('[powersync-diagnostics] the DevTools server did not trust this client; pass an authToken it accepts.');
  }
  const server = createAgentServer(rpc);
  await server.serve(options.id ?? `${sdk}-1`, createIntegration(db, sdk), sdk);
  return async () => {
    await server.close();
    rpc.close?.();
  };
}
