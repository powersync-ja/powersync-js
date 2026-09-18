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
  DiagnosticsSource,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  SdkIntegration,
  SourceAwareIntegration,
  SyncState,
  Unsubscribe,
  UploadQueueState
} from '@powersync/diagnostics-core';

type AnyCall = (method: string, ...args: unknown[]) => Promise<unknown>;

/**
 * The node side serves every attached database and pushes each one's events tagged with its id.
 * This client shows one at a time: the selected database, or the first attached one.
 */
export class DevframeIntegration implements SourceAwareIntegration {
  private handlers = new Set<(event: DiagnosticsEvent) => void>();
  private sourceHandlers = new Set<(sources: DiagnosticsSource[]) => void>();
  private sources: DiagnosticsSource[] = [];
  private registered = false;

  constructor(
    private rpc: DevframeRpcClient,
    private sourceId: string | null = null
  ) {}

  private call<T>(name: string, ...args: unknown[]): Promise<T> {
    return (this.rpc.call as AnyCall)(`powersync:${name}`, ...args) as Promise<T>;
  }

  /** The database whose events are shown. */
  private get activeId(): string | null {
    return this.sourceId ?? this.sources[0]?.id ?? null;
  }

  /** Registers the functions the node side pushes to, once. */
  private ensureRegistered(): void {
    if (this.registered) return;
    this.registered = true;
    this.rpc.client.register(
      {
        name: 'powersync:event',
        type: 'event',
        jsonSerializable: true,
        handler: (sourceId: string, event: DiagnosticsEvent) => {
          if (sourceId !== this.activeId) return;
          for (const listener of this.handlers) listener(event);
        }
      },
      true
    );
    this.rpc.client.register(
      {
        name: 'powersync:sources-changed',
        type: 'event',
        jsonSerializable: true,
        handler: (sources: DiagnosticsSource[]) => {
          this.sources = sources;
          for (const listener of this.sourceHandlers) listener(sources);
        }
      },
      true
    );
  }

  async observeSources(handler: (sources: DiagnosticsSource[]) => void): Promise<Unsubscribe> {
    this.ensureRegistered();
    this.sourceHandlers.add(handler);
    this.sources = await this.call<DiagnosticsSource[]>('sources');
    handler(this.sources);
    return () => {
      this.sourceHandlers.delete(handler);
    };
  }

  async selectSource(sourceId: string | null): Promise<void> {
    this.sourceId = sourceId;
    // Re-observing replays the selected database's snapshots.
    if (this.handlers.size > 0) await this.call('observe', sourceId);
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
    this.ensureRegistered();
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

/** How long the person gets to type the one-time code before the UI gives up on this host. */
const TRUST_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Connects to a devframe host if this page is served by one. Resolves `null` when no host answers
 * within `timeoutMs`, so the caller can fall back to another transport. Trust is a separate, much
 * longer wait: on a standalone window the host asks for a one-time code here, and a person types it.
 */
export async function connectDevframeIntegration(timeoutMs = 4000): Promise<SdkIntegration | null> {
  try {
    const rpc = await Promise.race([
      connectDevframe(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    if (!rpc) return null;
    const trusted = await rpc.ensureTrusted(TRUST_TIMEOUT_MS);
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
