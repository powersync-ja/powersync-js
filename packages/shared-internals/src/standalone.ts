import {
  CheckpointRequest,
  DownloadEvent,
  RestartSyncError,
  ServiceRequest,
  SyncRequest,
  UnexpectedResponseError
} from './standalone/api.js';
import { DownloadClientState, LocalWriteState, RowKey } from './standalone/buckets.js';
import { StreamingSyncLine } from './standalone/sync_protocol.js';
import { extractJsonLines } from './utils/stream_transform.js';
import { POWERSYNC_JS_VERSION } from './version.js';

export type * from './standalone/api.js';
export type { StreamDescription, StreamSubscriptionError } from './standalone/sync_protocol.js';
export type { RequestedStreamSubscription, StreamSubscriptionRequest } from './standalone/requests.js';
export { LocalWriteState } from './standalone/buckets.js';
export { RestartSyncError, UnexpectedResponseError } from './standalone/api.js';

/**
 * A small and simple PowerSync client built without SQLite.
 *
 * This client has no offline support, doesn't coordinate anything across tabs, doesn't automatically reconnect and
 * doesn't seed checkpoint requests. It also uses recent JavaScript features, so it doesn't work with React Native.
 *
 * It is intended as a low-level internal building block to build non-SQLite PowerSync client plugging in to an existing
 * state management framework like TanStack DB.
 */
export class PowerSyncClient {
  #state: DownloadClientState | null = null;
  #localWrites: LocalWriteState;
  #fetch: typeof fetch;
  readonly #notifyUploadComplete = new Set<() => void>();

  constructor({ localWrites, fetch = globalThis.fetch.bind(globalThis) }: ClientOptions) {
    this.#localWrites = localWrites;
    this.#fetch = fetch;
  }

  #resolveUri(request: ServiceRequest, path: string): URL {
    const url = URL.parse(path, request.endpoint);
    if (url == null) throw new Error(`Invalid service endpoint: ${request.endpoint}`);
    return url;
  }

  #defaultHeaders(request: ServiceRequest): Record<string, string> {
    return {
      'X-User-Agent': userAgent, // We can't set User-Agent on the web, the service respects this header
      'Content-Type': applicationJson,
      Authorization: `Token ${request.token}`
    } satisfies HeadersInit;
  }

  async #checkResponse(response: Response): Promise<void> {
    if (response.status == 200) {
      return;
    }

    const text = await response.text();
    throw new UnexpectedResponseError(response.status, text);
  }

  /**
   * Retries applying the last fully-received checkpoint on the active {@link streamingSync} iteration, emitting the
   * resulting events from it.
   *
   * This should be called after updating {@link LocalWriteState}: Since checkpoint requests and the sync stream are
   * independent requests, a checkpoint including the requested write checkpoint may have been received (and either
   * applied or rejected) before {@link requestCheckpoint} completes.
   */
  retryCheckpoint() {
    for (const listener of this.#notifyUploadComplete) listener();
  }

  markUpdated(table: string, id: string) {
    this.#state?.addToUpdatedRows(new RowKey(table, id));
  }

  /**
   * Posts a checkpoint request to the PowerSync service, returning the created checkpoint id.
   */
  async requestCheckpoint(request: CheckpointRequest): Promise<bigint> {
    const response = await this.#fetch(this.#resolveUri(request, '/sync/checkpoint-request'), {
      method: 'POST',
      signal: request.signal,
      body: JSON.stringify({
        client_id: request.clientId,
        checkpoint_request_id: String(request.checkpoint)
      }),
      headers: this.#defaultHeaders(request)
    });

    await this.#checkResponse(response);
    const json = await response.json();
    return BigInt(json.data.checkpoint_request_id);
  }

  /**
   * Connects to a PowerSync Service to download data, emitting client-side state changes.
   */
  async *streamingSync(request: SyncRequest): AsyncGenerator<DownloadEvent> {
    const abort = new AbortController();
    const signal = request.signal != null ? AbortSignal.any([request.signal, abort.signal]) : abort.signal;

    const state = (this.#state ??= new DownloadClientState(this.#localWrites));

    const response = await this.#fetch(this.#resolveUri(request, '/sync/stream'), {
      method: 'POST',
      signal,
      body: JSON.stringify(
        this.#state.prepareConnectRequest(
          request.clientId,
          request.parameters ?? {},
          request.streams ?? { include_defaults: true, subscriptions: [] },
          request.metadata
        )
      ),
      headers: {
        ...this.#defaultHeaders(request),
        Accept: 'application/x-ndjson'
      }
    });
    await this.#checkResponse(response);
    yield { type: 'headersReceived' };

    const lines = extractJsonLines(response.body![Symbol.asyncIterator](), new TextDecoder());

    // Whether we've received a signal to retry applying the last checkpoint, sent after uploads are completed.
    let checkpointRetryRequested = false;
    // Resolved when a checkpoint retry is requested, rejected when the service doesn't send a line in time.
    let interrupt: PromiseWithResolvers<null> | undefined;
    const requestRetry = () => {
      checkpointRetryRequested = true;
      interrupt?.resolve(null);
    };
    this.#notifyUploadComplete.add(requestRetry);

    let nextLine: Promise<IteratorResult<string>> | undefined;
    let idleTimeout: ReturnType<typeof setTimeout> | undefined;

    try {
      while (true) {
        if (checkpointRetryRequested) {
          checkpointRetryRequested = false;
          yield* state.retryCheckpoint();
        }

        nextLine ??= lines.next();
        const { promise, reject } = (interrupt = Promise.withResolvers<null>());
        idleTimeout = setTimeout(() => reject(new Error('No sync line received within timeout')), SERVICE_TIMEOUT);

        const event = await Promise.race([nextLine, promise]);
        clearTimeout(idleTimeout);
        interrupt = undefined;
        if (event == null) continue; // Resolves to null when a checkpoint retry is requested

        nextLine = undefined;
        if (event.done) break;

        const line: StreamingSyncLine = JSON.parse(event.value);
        if ('token_expires_in' in line) {
          yield { type: 'keepalive', keepalive: line };
        } else {
          let events: DownloadEvent[];

          try {
            events = state.push(line);
          } catch (e) {
            if (e instanceof RestartSyncError && e.clearLocal) {
              // Start from scratch while still allowing markUpdated() calls before the next sync iteration.
              this.#state = new DownloadClientState(this.#localWrites);
            }

            throw e;
          }

          yield* events;
        }
      }
    } finally {
      clearTimeout(idleTimeout);
      this.#notifyUploadComplete.delete(requestRetry);
      abort.abort();

      while (!(await lines.next()).done) {
        // Wait for the response to complete after aborting.
      }
    }
  }
}

export interface ClientOptions {
  /**
   * State tracking local writes to prevent applying new checkpoints if needed.
   */
  localWrites: LocalWriteState;
  /**
   * A fetch implementation, mainly used for tests.
   */
  fetch?: typeof fetch;
}

const userAgent = `PowerSync standalone JS v${POWERSYNC_JS_VERSION}`;
const applicationJson = 'application/json';

/**
 * The service sends a keepalive line roughly every 20 seconds, we manually disconnect if we don't receive something in
 * time.
 */
const SERVICE_TIMEOUT = 60_000;
