/**
 * `SdkIntegration` over a devframe connection. Used when this page is served by a devframe host
 * (a Vite DevTools dock, a standalone window): each method is one RPC call to the `powersync:*`
 * functions the node side registers; events arrive as `powersync:event` pushes.
 *
 * Only this bootstrap knows about devframe. The UI components take an `SdkIntegration` and nothing else.
 */
import { connectDevframe, type DevframeRpcClient } from 'devframe/client';
import type {
  ActionRequest,
  DiagnosticsEvent,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  SdkIntegration,
  SyncState,
  Unsubscribe,
  UploadQueueState
} from '@powersync/diagnostics-core';

type AnyCall = (method: string, ...args: unknown[]) => Promise<unknown>;

export class DevframeIntegration implements SdkIntegration {
  private handlers = new Set<(event: DiagnosticsEvent) => void>();
  private registered = false;

  constructor(
    private rpc: DevframeRpcClient,
    private sourceId: string | null = null
  ) {}

  private call<T>(name: string, ...args: unknown[]): Promise<T> {
    return (this.rpc.call as AnyCall)(`powersync:${name}`, ...args) as Promise<T>;
  }

  runQuery(params: QueryParams): Promise<QueryResult> {
    return this.call('query', params, this.sourceId);
  }
  getSchema(): Promise<SchemaPayload> {
    return this.call('schema', this.sourceId);
  }
  getInfo(): Promise<ProtocolInfo> {
    return this.call('info', this.sourceId);
  }
  currentSyncStatus(): Promise<SyncState> {
    return this.call('status', this.sourceId);
  }
  getUploadQueueStats(): Promise<UploadQueueState> {
    return this.call('upload-queue', this.sourceId);
  }
  action(request: ActionRequest): Promise<void> {
    return this.call('action', request, this.sourceId);
  }

  async observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe> {
    if (!this.registered) {
      this.registered = true;
      this.rpc.client.register(
        {
          name: 'powersync:event',
          type: 'event',
          jsonSerializable: true,
          handler: (_sourceId: string, event: DiagnosticsEvent) => {
            for (const listener of this.handlers) listener(event);
          }
        },
        true
      );
    }
    this.handlers.add(handler);
    await this.call('observe', this.sourceId);
    return () => {
      this.handlers.delete(handler);
      if (this.handlers.size === 0) void this.call('unobserve');
    };
  }

  async close(): Promise<void> {
    this.handlers.clear();
    await this.call('unobserve').catch(() => {});
  }
}

/**
 * Connects to a devframe host if this page is served by one. Resolves `null` when no host answers
 * within `timeoutMs`, so the caller can fall back to another transport.
 */
export async function connectDevframeIntegration(timeoutMs = 4000): Promise<SdkIntegration | null> {
  try {
    const rpc = await Promise.race([
      connectDevframe(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    if (!rpc) return null;
    const trusted = await rpc.ensureTrusted(timeoutMs);
    if (!trusted) {
      console.info('[powersync-diagnostics] ui: devframe host found but not trusted');
      return null;
    }
    console.info('[powersync-diagnostics] ui: connected to a devframe host over', rpc.transport);
    return new DevframeIntegration(rpc);
  } catch (error) {
    console.info('[powersync-diagnostics] ui: no devframe host', error instanceof Error ? error.message : error);
    return null;
  }
}
