import { atom } from 'nanostores';
import {
  ActionRequest,
  BucketState,
  Channel,
  EventMessage,
  LogRecord,
  PortInfo,
  QueryResult,
  RequestMessage,
  RequestMethod,
  SerializedSchema,
  StreamState,
  SyncState,
  Transport,
  Unsubscribe,
  UploadQueueState,
  WireMessage
} from '@powersync/common/diagnostics/contract';

const CHANNELS: Channel[] = ['status', 'streams', 'buckets', 'logs', 'uploadQueue'];
const MAX_LOGS = 2000;

/**
 * The client side of the Diagnostics Port, used by the UI.
 *
 * Wraps a {@link Transport}, exposes request/response methods and write actions, and mirrors the
 * agent's push channels into nanostores atoms. Consumers subscribe to these atoms (e.g. via
 * `@nanostores/vue`'s `useStore`); they update from the transport and should be treated as read-only.
 */
export class DiagnosticsClient {
  /** True once a handshake with an agent has completed. */
  readonly connected = atom(false);
  readonly status = atom<SyncState | null>(null);
  readonly streams = atom<StreamState[]>([]);
  readonly buckets = atom<BucketState[]>([]);
  readonly uploadQueue = atom<UploadQueueState | null>(null);
  readonly logs = atom<LogRecord[]>([]);

  private pending = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private sequence = 0;
  // Namespaces request ids so multiple clients on one shared channel don't collide on responses.
  private readonly clientId = Math.random().toString(36).slice(2, 10);
  private disposers: Unsubscribe[] = [];

  constructor(private transport: Transport) {}

  start(): void {
    this.disposers.push(this.transport.onMessage((message) => this.handleMessage(message)));
    this.resync();
  }

  /**
   * Re-announces and re-subscribes so the agent replays current state. Called on start, and safe to
   * call again after a transport reconnect (e.g. an extension's background worker was restarted).
   */
  resync(): void {
    this.transport.send({ type: 'announce', role: 'client' });
    for (const channel of CHANNELS) {
      this.transport.send({ type: 'sub', channel });
    }
  }

  stop(): void {
    for (const channel of CHANNELS) {
      this.transport.send({ type: 'unsub', channel });
    }
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers = [];
  }

  query(sql: string, params?: unknown[]): Promise<QueryResult> {
    return this.request<QueryResult>('query', { sql, params });
  }

  getSchema(): Promise<SerializedSchema> {
    return this.request<SerializedSchema>('getSchema');
  }

  getInfo(): Promise<PortInfo> {
    return this.request<PortInfo>('getInfo');
  }

  action(request: ActionRequest): Promise<{ ok: true }> {
    return this.request<{ ok: true }>('action', request);
  }

  reconnect(): Promise<{ ok: true }> {
    return this.action({ action: 'reconnect' });
  }

  disconnect(): Promise<{ ok: true }> {
    return this.action({ action: 'disconnect' });
  }

  clearData(): Promise<{ ok: true }> {
    return this.action({ action: 'clearData' });
  }

  /**
   * Requests a checkpoint and resolves once the client is caught up with the service (uploads
   * flushed + latest downloads applied). Rejects if the SDK/connection doesn't support it.
   */
  requestCheckpoint(): Promise<{ ok: true }> {
    return this.action({ action: 'requestCheckpoint' });
  }

  /** Clears the locally accumulated log buffer. */
  clearLogs(): void {
    this.logs.set([]);
  }

  private request<T>(method: RequestMethod, params?: unknown): Promise<T> {
    const id = `${this.clientId}:${++this.sequence}`;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.transport.send({ type: 'req', id, method, params } as RequestMessage);
    });
  }

  private handleMessage(message: WireMessage): void {
    switch (message.type) {
      case 'announce':
        if (message.role === 'agent') {
          this.connected.set(true);
          // Re-subscribe so an agent that started after us replays current state.
          for (const channel of CHANNELS) {
            this.transport.send({ type: 'sub', channel });
          }
        }
        break;
      case 'event':
        this.applyEvent(message);
        break;
      case 'res': {
        const pending = this.pending.get(message.id);
        if (!pending) {
          return;
        }
        this.pending.delete(message.id);
        if (message.ok) {
          pending.resolve(message.result);
        } else {
          pending.reject(new Error(message.error ?? 'Request failed'));
        }
        break;
      }
      default:
        break;
    }
  }

  private applyEvent(message: EventMessage): void {
    switch (message.channel) {
      case 'status':
        this.status.set(message.payload);
        break;
      case 'streams':
        this.streams.set(message.payload);
        break;
      case 'buckets':
        this.buckets.set(message.payload);
        break;
      case 'uploadQueue':
        this.uploadQueue.set(message.payload);
        break;
      case 'logs':
        this.logs.set([...this.logs.get(), ...message.payload].slice(-MAX_LOGS));
        break;
    }
  }
}
