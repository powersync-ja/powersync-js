import type { BSON } from 'bson';
import { Buffer } from 'buffer';
import { type fetch } from 'cross-fetch';
import Logger, { ILogger } from 'js-logger';
import { RSocket, RSocketConnector, Requestable } from 'rsocket-core';
import PACKAGE from '../../../../package.json' with { type: 'json' };
import { AbortOperation } from '../../../utils/AbortOperation.js';
import { DataStream } from '../../../utils/DataStream.js';
import { PowerSyncCredentials } from '../../connection/PowerSyncCredentials.js';
import {
  StreamingSyncLine,
  StreamingSyncLineOrCrudUploadComplete,
  StreamingSyncRequest
} from './streaming-sync-types.js';
import { WebsocketClientTransport } from './WebsocketClientTransport.js';

export type BSONImplementation = typeof BSON;

export type RemoteConnector = {
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
  invalidateCredentials?: () => void;
};

const POWERSYNC_TRAILING_SLASH_MATCH = /\/+$/;
const POWERSYNC_JS_VERSION = PACKAGE.version;

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
  abortSignal?: AbortSignal;
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

  protected createSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  /**
   * Returns a data stream of sync line data.
   *
   * @param map Maps received payload frames to the typed event value.
   * @param bson A BSON encoder and decoder. When set, the data stream will be requested with a BSON payload
   * (required for compatibility with older sync services).
   */
  async socketStreamRaw<T>(
    options: SocketSyncStreamOptions,
    map: (buffer: Uint8Array) => T,
    bson?: typeof BSON
  ): Promise<DataStream<T>> {
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

    // Add the user agent in the setup payload - we can't set custom
    // headers with websockets on web. The browser userAgent is however added
    // automatically as a header.
    const userAgent = this.getUserAgent();

    let keepAliveTimeout: any;
    const resetTimeout = () => {
      clearTimeout(keepAliveTimeout);
      keepAliveTimeout = setTimeout(() => {
        this.logger.error(`No data received on WebSocket in ${SOCKET_TIMEOUT_MS}ms, closing connection.`);
        stream.close();
      }, SOCKET_TIMEOUT_MS);
    };
    resetTimeout();

    const url = this.options.socketUrlTransformer(request.url);
    const connector = new RSocketConnector({
      transport: new WebsocketClientTransport({
        url,
        wsCreator: (url) => {
          const socket = this.createSocket(url);
          socket.addEventListener('message', (event) => {
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

    let rsocket: RSocket;
    try {
      rsocket = await connector.connect();
    } catch (ex) {
      this.logger.error(`Failed to connect WebSocket`, ex);
      clearTimeout(keepAliveTimeout);
      throw ex;
    }

    resetTimeout();

    const stream = new DataStream<T, Uint8Array>({
      logger: this.logger,
      pressure: {
        lowWaterMark: SYNC_QUEUE_REQUEST_LOW_WATER
      },
      mapLine: map
    });

    let socketIsClosed = false;
    const closeSocket = () => {
      clearTimeout(keepAliveTimeout);
      if (socketIsClosed) {
        return;
      }
      socketIsClosed = true;
      rsocket.close();
    };
    // Helps to prevent double close scenarios
    rsocket.onClose(() => (socketIsClosed = true));
    // We initially request this amount and expect these to arrive eventually
    let pendingEventsCount = syncQueueRequestSize;

    const disposeClosedListener = stream.registerListener({
      closed: () => {
        closeSocket();
        disposeClosedListener();
      }
    });

    const socket = await new Promise<Requestable>((resolve, reject) => {
      let connectionEstablished = false;

      const res = rsocket.requestStream(
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
            stream.close();
            // Handles cases where the connection failed e.g. auth error or connection error
            if (!connectionEstablished) {
              reject(e);
            }
          },
          onNext: (payload) => {
            // The connection is active
            if (!connectionEstablished) {
              connectionEstablished = true;
              resolve(res);
            }
            const { data } = payload;
            // Less events are now pending
            pendingEventsCount--;
            if (!data) {
              return;
            }

            stream.enqueueData(data);
          },
          onComplete: () => {
            stream.close();
          },
          onExtension: () => {}
        }
      );
    });

    const l = stream.registerListener({
      lowWater: async () => {
        // Request to fill up the queue
        const required = syncQueueRequestSize - pendingEventsCount;
        if (required > 0) {
          socket.request(syncQueueRequestSize - pendingEventsCount);
          pendingEventsCount = syncQueueRequestSize;
        }
      },
      closed: () => {
        l();
      }
    });

    /**
     * Handle abort operations here.
     * Unfortunately cannot insert them into the connection.
     */
    if (options.abortSignal?.aborted) {
      stream.close();
    } else {
      options.abortSignal?.addEventListener('abort', () => {
        stream.close();
      });
    }

    return stream;
  }

  /**
   * Connects to the sync/stream http endpoint, mapping and emitting each received string line.
   */
  async postStreamRaw<T>(options: SyncStreamOptions, mapLine: (line: string) => T): Promise<DataStream<T>> {
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
    const controller = new AbortController();
    let requestResolved = false;
    abortSignal?.addEventListener('abort', () => {
      if (!requestResolved) {
        // Only abort via the abort controller if the request has not resolved yet
        controller.abort(
          abortSignal.reason ??
            new AbortOperation('Cancelling network request before it resolves. Abort signal has been received.')
        );
      }
    });

    const res = await this.fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal: controller.signal,
      cache: 'no-store',
      ...(this.options.fetchOptions ?? {}),
      ...options.fetchOptions
    }).catch((ex) => {
      if (ex.name == 'AbortError') {
        throw new AbortOperation(`Pending fetch request to ${request.url} has been aborted.`);
      }
      throw ex;
    });

    if (!res) {
      throw new Error('Fetch request was aborted');
    }

    requestResolved = true;

    if (!res.ok || !res.body) {
      const text = await res.text();
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    // Create a new stream splitting the response at line endings while also handling cancellations
    // by closing the reader.
    const reader = res.body.getReader();
    // This will close the network request and read stream
    const closeReader = async () => {
      try {
        await reader.cancel();
      } catch (ex) {
        // an error will throw if the reader hasn't been used yet
      }
      reader.releaseLock();
    };

    abortSignal?.addEventListener('abort', () => {
      closeReader();
    });

    const decoder = new TextDecoder();
    let buffer = '';

    const stream = new DataStream<T, string>({
      logger: this.logger,
      mapLine: mapLine
    });

    const l = stream.registerListener({
      lowWater: async () => {
        try {
          let didCompleteLine = false;
          while (!didCompleteLine) {
            const { done, value } = await reader.read();
            if (done) {
              const remaining = buffer.trim();
              if (remaining.length != 0) {
                stream.enqueueData(remaining);
              }

              stream.close();
              await closeReader();
              return;
            }

            const data = decoder.decode(value, { stream: true });
            buffer += data;

            const lines = buffer.split('\n');
            for (var i = 0; i < lines.length - 1; i++) {
              var l = lines[i].trim();
              if (l.length > 0) {
                stream.enqueueData(l);
                didCompleteLine = true;
              }
            }

            buffer = lines[lines.length - 1];
          }
        } catch (ex) {
          stream.close();
          throw ex;
        }
      },
      closed: () => {
        closeReader();
        l?.();
      }
    });

    return stream;
  }
}
