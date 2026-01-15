import type { BSON } from 'bson';
import { type fetch } from 'cross-fetch';
import Logger, { ILogger } from 'js-logger';
import { Requestable, RSocket, RSocketConnector } from 'rsocket-core';
import PACKAGE from '../../../../package.json' with { type: 'json' };
import { AbortOperation } from '../../../utils/AbortOperation.js';
import { PowerSyncCredentials } from '../../connection/PowerSyncCredentials.js';
import { WebsocketClientTransport } from './WebsocketClientTransport.js';
import { StreamingSyncRequest } from './streaming-sync-types.js';
import {
  doneResult,
  extractBsonObjects,
  extractJsonLines,
  SimpleAsyncIterator
} from '../../../utils/stream_transform.js';
import { EventIterator } from 'event-iterator';
import type { Queue } from 'event-iterator/lib/event-iterator.js';

export type BSONImplementation = typeof BSON;

export type RemoteConnector = {
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
  invalidateCredentials?: () => void;
};

const POWERSYNC_TRAILING_SLASH_MATCH = /\/+$/;
const POWERSYNC_JS_VERSION = PACKAGE.version;

const SYNC_QUEUE_REQUEST_HIGH_WATER = 10;
const SYNC_QUEUE_REQUEST_LOW_WATER = 5;

// Keep alive message is sent every period
const KEEP_ALIVE_MS = 20_000;

// One message of any type must be received in this period.
const SOCKET_TIMEOUT_MS = 30_000;

// One keepalive message must be received in this period.
// If there is a backlog of messages (for example on slow connections), keepalive messages could be delayed
// significantly. Therefore this is longer than the socket timeout.
const KEEP_ALIVE_LIFETIME_MS = 90_000;

export const DEFAULT_REMOTE_LOGGER = Logger.get('PowerSyncRemote');

export type SyncStreamOptions = {
  path: string;
  data: StreamingSyncRequest;
  headers?: Record<string, string>;
  abortSignal: AbortSignal;
  fetchOptions?: Request;
};

export enum FetchStrategy {
  /**
   * Queues multiple sync events before processing, reducing round-trips.
   * This comes at the cost of more processing overhead, which may cause ACK timeouts on older/weaker devices for big enough datasets.
   */
  Buffered = 'buffered',

  /**
   * Processes each sync event immediately before requesting the next.
   * This reduces processing overhead and improves real-time responsiveness.
   */
  Sequential = 'sequential'
}

export type SocketSyncStreamOptions = SyncStreamOptions & {
  fetchStrategy: FetchStrategy;
};

export type FetchImplementation = typeof fetch;

/**
 * Class wrapper for providing a fetch implementation.
 * The class wrapper is used to distinguish the fetchImplementation
 * option in [AbstractRemoteOptions] from the general fetch method
 * which is typeof "function"
 */
export class FetchImplementationProvider {
  getFetch(): FetchImplementation {
    throw new Error('Unspecified fetch implementation');
  }
}

export type AbstractRemoteOptions = {
  /**
   * Transforms the PowerSync base URL which might contain
   * `http(s)://` to the corresponding WebSocket variant
   * e.g. `ws(s)://`
   */
  socketUrlTransformer: (url: string) => string;

  /**
   * Optionally provide the fetch implementation to use.
   * Note that this usually needs to be bound to the global scope.
   * Binding should be done before passing here.
   */
  fetchImplementation: FetchImplementation | FetchImplementationProvider;

  /**
   * Optional options to pass directly to all `fetch` calls.
   *
   * This can include fields such as `dispatcher` (e.g. for proxy support),
   * `cache`, or any other fetch-compatible options.
   */
  fetchOptions?: {};
};

export const DEFAULT_REMOTE_OPTIONS: AbstractRemoteOptions = {
  socketUrlTransformer: (url) =>
    url.replace(/^https?:\/\//, function (match) {
      return match === 'https://' ? 'wss://' : 'ws://';
    }),
  fetchImplementation: new FetchImplementationProvider(),
  fetchOptions: {}
};

export abstract class AbstractRemote {
  protected credentials: PowerSyncCredentials | null = null;
  protected options: AbstractRemoteOptions;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    this.options = {
      ...DEFAULT_REMOTE_OPTIONS,
      ...(options ?? {})
    };
  }

  /**
   * @returns a fetch implementation (function)
   * which can be called to perform fetch requests
   */
  get fetch(): FetchImplementation {
    const { fetchImplementation } = this.options;
    return fetchImplementation instanceof FetchImplementationProvider
      ? fetchImplementation.getFetch()
      : fetchImplementation;
  }

  /**
   * Get credentials currently cached, or fetch new credentials if none are
   * available.
   *
   * These credentials may have expired already.
   */
  async getCredentials(): Promise<PowerSyncCredentials | null> {
    if (this.credentials) {
      return this.credentials;
    }

    return this.prefetchCredentials();
  }

  /**
   * Fetch a new set of credentials and cache it.
   *
   * Until this call succeeds, `getCredentials` will still return the
   * old credentials.
   *
   * This may be called before the current credentials have expired.
   */
  async prefetchCredentials() {
    this.credentials = await this.fetchCredentials();

    return this.credentials;
  }

  /**
   * Get credentials for PowerSync.
   *
   * This should always fetch a fresh set of credentials - don't use cached
   * values.
   */
  async fetchCredentials() {
    const credentials = await this.connector.fetchCredentials();
    if (credentials?.endpoint.match(POWERSYNC_TRAILING_SLASH_MATCH)) {
      throw new Error(
        `A trailing forward slash "/" was found in the fetchCredentials endpoint: "${credentials.endpoint}". Remove the trailing forward slash "/" to fix this error.`
      );
    }

    return credentials;
  }

  /***
   * Immediately invalidate credentials.
   *
   * This may be called when the current credentials have expired.
   */
  invalidateCredentials() {
    this.credentials = null;
    this.connector.invalidateCredentials?.();
  }

  getUserAgent() {
    return `powersync-js/${POWERSYNC_JS_VERSION}`;
  }

  protected async buildRequest(path: string) {
    const credentials = await this.getCredentials();
    if (credentials != null && (credentials.endpoint == null || credentials.endpoint == '')) {
      throw new Error('PowerSync endpoint not configured');
    } else if (credentials?.token == null || credentials?.token == '') {
      const error: any = new Error(`Not signed in`);
      error.status = 401;
      throw error;
    }

    const userAgent = this.getUserAgent();

    return {
      url: credentials.endpoint + path,
      headers: {
        'content-type': 'application/json',
        Authorization: `Token ${credentials.token}`,
        'x-user-agent': userAgent
      }
    };
  }

  async post(path: string, data: any, headers: Record<string, string> = {}): Promise<any> {
    const request = await this.buildRequest(path);
    const res = await this.fetch(request.url, {
      method: 'POST',
      headers: {
        ...headers,
        ...request.headers
      },
      body: JSON.stringify(data)
    });

    if (res.status === 401) {
      this.invalidateCredentials();
    }

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when posting to ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async get(path: string, headers?: Record<string, string>): Promise<any> {
    const request = await this.buildRequest(path);
    const res = await this.fetch(request.url, {
      method: 'GET',
      headers: {
        ...headers,
        ...request.headers
      }
    });

    if (res.status === 401) {
      this.invalidateCredentials();
    }

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when getting from ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  /**
   * Provides a BSON implementation. The import nature of this varies depending on the platform
   */
  abstract getBSON(): Promise<BSONImplementation>;

  /**
   * @returns A text decoder decoding UTF-8. This is a method to allow patching it for Hermes which doesn't support the
   * builtin, without forcing us to bundle a polyfill with `@powersync/common`.
   */
  createTextDecoder(): TextDecoder {
    return new TextDecoder();
  }

  protected createSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  /**
   * Returns a data stream of sync line data, fetched via RSocket-over-WebSocket.
   *
   * The only mechanism to abort the returned stream is to use the abort signal in {@link SocketSyncStreamOptions}.
   *
   * @param bson A BSON encoder and decoder. When set, the data stream will be requested with a BSON payload
   * (required for compatibility with older sync services).
   */
  async socketStreamRaw(
    options: SocketSyncStreamOptions,
    bson?: typeof BSON
  ): Promise<SimpleAsyncIterator<Uint8Array>> {
    const { path, fetchStrategy = FetchStrategy.Buffered } = options;
    const mimeType = bson == null ? 'application/json' : 'application/bson';

    function toBuffer(js: any): Buffer {
      let contents: any;
      if (bson != null) {
        contents = bson.serialize(js);
      } else {
        contents = JSON.stringify(js);
      }

      return Buffer.from(contents);
    }

    const syncQueueRequestSize = fetchStrategy == FetchStrategy.Buffered ? 10 : 1;
    const request = await this.buildRequest(path);
    const url = this.options.socketUrlTransformer(request.url);

    // Add the user agent in the setup payload - we can't set custom
    // headers with websockets on web. The browser userAgent is however added
    // automatically as a header.
    const userAgent = this.getUserAgent();

    // While we're connecting (a process that can't be aborted in RSocket), the WebSocket instance to close if we wanted
    // to abort the connection.
    let pendingSocket: WebSocket | null = null;
    let keepAliveTimeout: any;
    let rsocket: RSocket | null = null;
    let queue: Queue<Uint8Array> | null = null;

    const abortRequest = () => {
      clearTimeout(keepAliveTimeout);

      if (pendingSocket) {
        pendingSocket.close();
      }

      if (rsocket) {
        rsocket.close();
      }

      if (queue) {
        queue.stop();
      }
    };

    // Handle upstream abort
    if (options.abortSignal.aborted) {
      throw new AbortOperation('Connection request aborted');
    } else {
      options.abortSignal.addEventListener('abort', abortRequest);
    }

    const resetTimeout = () => {
      clearTimeout(keepAliveTimeout);
      keepAliveTimeout = setTimeout(() => {
        this.logger.error(`No data received on WebSocket in ${SOCKET_TIMEOUT_MS}ms, closing connection.`);
        abortRequest();
      }, SOCKET_TIMEOUT_MS);
    };
    resetTimeout();

    const connector = new RSocketConnector({
      transport: new WebsocketClientTransport({
        url,
        wsCreator: (url) => {
          const socket = (pendingSocket = this.createSocket(url));

          socket.addEventListener('message', () => {
            resetTimeout();
          });
          return socket;
        }
      }),
      setup: {
        keepAlive: KEEP_ALIVE_MS,
        lifetime: KEEP_ALIVE_LIFETIME_MS,
        dataMimeType: mimeType,
        metadataMimeType: mimeType,
        payload: {
          data: null,
          metadata: toBuffer({
            token: request.headers.Authorization,
            user_agent: userAgent
          })
        }
      }
    });

    try {
      rsocket = await connector.connect();
      // The connection is established, we no longer need to monitor the initial timeout
      pendingSocket = null;
    } catch (ex) {
      this.logger.error(`Failed to connect WebSocket`, ex);
      abortRequest();

      throw ex;
    }

    resetTimeout();

    // Helps to prevent double close scenarios
    rsocket.onClose(() => (rsocket = null));

    return await new Promise((resolve, reject) => {
      let connectionEstablished = false;
      let pendingEventsCount = syncQueueRequestSize;
      let paused = false;
      let res: Requestable | null = null;

      function requestMore() {
        const delta = syncQueueRequestSize - pendingEventsCount;
        if (!paused && delta > 0) {
          res?.request(delta);
          pendingEventsCount = syncQueueRequestSize;
        }
      }

      const events = new EventIterator<Uint8Array>(
        (q) => {
          queue = q;

          q.on('highWater', () => (paused = true));
          q.on('lowWater', () => {
            paused = false;
            requestMore();
          });
        },
        { highWaterMark: SYNC_QUEUE_REQUEST_HIGH_WATER, lowWaterMark: SYNC_QUEUE_REQUEST_LOW_WATER }
      )[Symbol.asyncIterator]();

      res = rsocket!.requestStream(
        {
          data: toBuffer(options.data),
          metadata: toBuffer({
            path
          })
        },
        syncQueueRequestSize, // The initial N amount
        {
          onError: (e) => {
            if (e.message.includes('PSYNC_')) {
              if (e.message.includes('PSYNC_S21')) {
                this.invalidateCredentials();
              }
            } else {
              // Possible that connection is with an older service, always invalidate to be safe
              if (e.message !== 'Closed. ') {
                this.invalidateCredentials();
              }
            }

            // Don't log closed as an error
            if (e.message !== 'Closed. ') {
              this.logger.error(e);
            }
            // RSocket will close the RSocket stream automatically
            // Close the downstream stream as well - this will close the RSocket connection and WebSocket
            abortRequest();
            // Handles cases where the connection failed e.g. auth error or connection error
            if (!connectionEstablished) {
              reject(e);
            }
          },
          onNext: (payload) => {
            // The connection is active
            if (!connectionEstablished) {
              connectionEstablished = true;
              resolve(events);
            }
            const { data } = payload;
            requestMore(); // Immediately request another event (unless the downstream consumer is paused).
            // Less events are now pending
            pendingEventsCount--;
            if (!data) {
              return;
            }

            queue!.push(data);
          },
          onComplete: () => {
            abortRequest(); // this will also emit a done event
          },
          onExtension: () => {}
        }
      );
    });
  }

  /**
   * Posts a `/sync/stream` request, asserts that it completes successfully and returns the streaming response as an
   * async iterator of byte blobs.
   *
   * To cancel the async iterator, use the abort signal from {@link SyncStreamOptions} passed to this method.
   */
  protected async fetchStreamRaw(
    options: SyncStreamOptions
  ): Promise<{ isBson: boolean; stream: SimpleAsyncIterator<Uint8Array> }> {
    const { data, path, headers, abortSignal } = options;
    const request = await this.buildRequest(path);

    /**
     * This abort controller will abort pending fetch requests.
     * If the request has resolved, it will be used to close the readable stream.
     * Which will cancel the network request.
     *
     * This nested controller is required since:
     *  Aborting the active fetch request while it is being consumed seems to throw
     *  an unhandled exception on the window level.
     */
    if (abortSignal?.aborted) {
      throw new AbortOperation('Abort request received before making fetchStreamRaw request');
    }

    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    abortSignal?.addEventListener('abort', () => {
      if (reader == null) {
        // Only abort via the abort controller if the request has not resolved yet
        controller.abort(
          abortSignal.reason ??
            new AbortOperation('Cancelling network request before it resolves. Abort signal has been received.')
        );
      } else {
        reader.cancel().catch(() => {
          // Cancelling the reader might rethrow an exception we would have handled by throwing in next(). So we can
          // ignore it here.
        });
      }
    });

    let res: Response;
    let responseIsBson = false;
    try {
      const ndJson = 'application/x-ndjson';
      const bson = 'application/vnd.powersync.bson-stream';

      res = await this.fetch(request.url, {
        method: 'POST',
        headers: { ...headers, ...request.headers, accept: `${bson};q=0.9,${ndJson};q=0.8` },
        body: JSON.stringify(data),
        signal: controller.signal,
        cache: 'no-store',
        ...(this.options.fetchOptions ?? {}),
        ...options.fetchOptions
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
        const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
        error.status = res.status;
        throw error;
      }

      const contentType = res.headers.get('content-type');
      responseIsBson = contentType == bson;
    } catch (ex) {
      if (ex.name == 'AbortError') {
        throw new AbortOperation(`Pending fetch request to ${request.url} has been aborted.`);
      }
      throw ex;
    }

    reader = res.body.getReader();

    const stream: SimpleAsyncIterator<Uint8Array> = {
      next: async () => {
        try {
          controller.signal.throwIfAborted();
          return await reader.read();
        } catch (ex) {
          if (controller.signal.aborted) {
            return doneResult;
          }

          throw ex;
        }
      }
    };

    return { isBson: responseIsBson, stream };
  }

  /**
   * Posts a `/sync/stream` request.
   *
   * Depending on the `Content-Type` of the response, this returns strings for sync lines or encoded BSON documents as
   * {@link Uint8Array}s.
   */
  async fetchStream(options: SyncStreamOptions): Promise<SimpleAsyncIterator<Uint8Array | string>> {
    const { isBson, stream } = await this.fetchStreamRaw(options);
    if (isBson) {
      return extractBsonObjects(stream);
    } else {
      return extractJsonLines(stream, this.createTextDecoder());
    }
  }
}
