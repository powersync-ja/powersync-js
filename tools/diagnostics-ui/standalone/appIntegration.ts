/**
 * `SdkIntegration` for a page served by the app itself: a native SDK (Swift, Kotlin) runs a small
 * HTTP server in the app and serves this page next to its endpoints.
 *
 * - `GET  __powersync/host.json`: `{ protocol, sdk }`. Its presence is how this page detects the host.
 * - `POST __powersync/rpc`: `{ method, params }` → `{ result }` or `{ error: { message } }`.
 * - `GET  __powersync/events`: server-sent events, one `DiagnosticsEvent` per message. The app sends
 *   the current snapshots when the stream opens.
 *
 * The app prints the page URL with a token in the fragment (`#token=…`). The fragment never reaches
 * the server or logs; the page sends the token as a bearer header, and as a query parameter on the
 * event stream, which cannot carry headers.
 */
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

const HOST_PATH = './__powersync/host.json';
const RPC_PATH = './__powersync/rpc';
const EVENTS_PATH = './__powersync/events';
const TOKEN_KEY = 'powersync-devtools-token';

interface HostInfo {
  protocol: number;
  sdk: string | null;
}

/** The token from the URL fragment, kept for reloads of the same tab. */
function readToken(): string | null {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('token');
  try {
    if (fromHash) sessionStorage.setItem(TOKEN_KEY, fromHash);
    return fromHash ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return fromHash;
  }
}

export class AppIntegration implements SdkIntegration {
  private sources = new Set<EventSource>();

  constructor(
    readonly host: HostInfo,
    private token: string | null
  ) {}

  private async call<T>(method: string, params?: unknown): Promise<T> {
    const response = await fetch(RPC_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: JSON.stringify({ method, params: params ?? null })
    });
    const body = (await response.json()) as { result?: T; error?: { message: string } };
    if (body.error) throw new Error(body.error.message);
    return body.result as T;
  }

  runQuery(params: QueryParams): Promise<QueryResult> {
    return this.call('runQuery', params);
  }

  getSchema(): Promise<SchemaPayload> {
    return this.call('getSchema');
  }

  getInfo(): Promise<ProtocolInfo> {
    return this.call('getInfo');
  }

  action(request: ActionRequest): Promise<void> {
    return this.call('action', request);
  }

  async observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe> {
    const query = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
    // EventSource reconnects by itself; the app replays the snapshots on each new stream.
    const source = new EventSource(`${EVENTS_PATH}${query}`);
    source.onmessage = (message) => handler(JSON.parse(message.data) as DiagnosticsEvent);
    this.sources.add(source);
    return () => {
      source.close();
      this.sources.delete(source);
    };
  }

  async close(): Promise<void> {
    for (const source of this.sources) source.close();
    this.sources.clear();
  }
}

/** Connects when an app serves this page; resolves null otherwise. */
export async function tryAppServer(): Promise<AppIntegration | null> {
  try {
    const response = await fetch(HOST_PATH);
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
    return new AppIntegration((await response.json()) as HostInfo, readToken());
  } catch {
    return null;
  }
}
