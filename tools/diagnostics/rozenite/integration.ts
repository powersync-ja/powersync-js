import { createRozeniteRpc, getRozeniteDevToolsClient, type RozeniteRpc } from '@rozenite/plugin-bridge';
import type {
  ActionRequest,
  DiagnosticsEvent,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  SdkIntegration,
  Unsubscribe
} from '@powersync/diagnostics-core';
import { EVENT_MESSAGE, PLUGIN_ID, type AppMethods, type DevToolsEventMap } from '../src/react-native/protocol.js';

type DevToolsClient = Awaited<ReturnType<typeof getRozeniteDevToolsClient<DevToolsEventMap>>>;

// How often the panel asks again for the event stream while the app is not serving yet.
const SUBSCRIBE_RETRY_MS = 2000;

/** The `SdkIntegration` the panel drives: every call goes to the app over the Rozenite plugin channel. */
export class RozeniteIntegration implements SdkIntegration {
  private closed = false;

  private constructor(
    private readonly client: DevToolsClient,
    private readonly rpc: RozeniteRpc<AppMethods>
  ) {}

  static async connect(): Promise<RozeniteIntegration> {
    const client = await getRozeniteDevToolsClient<DevToolsEventMap>(PLUGIN_ID);
    return new RozeniteIntegration(client, createRozeniteRpc<AppMethods>(client));
  }

  runQuery(params: QueryParams): Promise<QueryResult> {
    return this.rpc.method('runQuery').invoke(params);
  }

  getSchema(): Promise<SchemaPayload> {
    return this.rpc.method('getSchema').invoke();
  }

  getInfo(): Promise<ProtocolInfo> {
    return this.rpc.method('getInfo').invoke();
  }

  action(request: ActionRequest): Promise<void> {
    return this.rpc.method('action').invoke(request);
  }

  async observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe> {
    const subscription = this.client.onMessage(EVENT_MESSAGE, handler);
    let stopped = false;

    // The app may mount after the panel opens: keep asking until it serves the stream.
    const subscribe = async () => {
      while (!stopped && !this.closed) {
        try {
          await this.rpc.method('subscribe').invoke();
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, SUBSCRIBE_RETRY_MS));
        }
      }
    };
    void subscribe();

    return () => {
      stopped = true;
      subscription.remove();
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.rpc.close();
    this.client.close();
  }
}
