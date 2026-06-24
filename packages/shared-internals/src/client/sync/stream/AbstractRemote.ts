import { type fetch } from 'cross-fetch';
import { FetchStrategy, PowerSyncCredentials, LogLevels, PowerSyncLogger } from '@powersync/common';

import { AbortOperation } from '../../../utils/AbortOperation.js';
import {
  doneResult,
  extractBsonObjects,
  extractJsonLines,
  SimpleAsyncIterator
} from '../../../utils/stream_transform.js';
import { WebSocketSupport, WebSocketSyncStreamPlatform } from './WebSocketSupport.js';
import { EventQueue } from '../../../utils/async.js';
import { POWERSYNC_JS_VERSION } from '../../../version.js';

/**
 * @internal
 */
export type RemoteConnector = {
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
  invalidateCredentials?: () => void;
};

const POWERSYNC_TRAILING_SLASH_MATCH = /\/+$/;

const webSocketPlatform: WebSocketSyncStreamPlatform = {
  LogLevels,
  EventQueue,
  AbortOperation
};

/**
 * @internal
 */
export type SyncStreamOptions = {
  path: string;
  data: unknown;
  abortSignal: AbortSignal;
};

/**
 * @internal
 */
export type FetchImplementation = typeof fetch;

export function lazyFetchImplementation(getFetch: () => FetchImplementation): FetchImplementation {
  let resolved: FetchImplementation;

  return (request) => {
    const fetch = (resolved ??= getFetch());
    return fetch(request);
  };
}

export interface FetchOptions {
  resource: string;
  request: RequestInit;
  expectStreamingResponse: boolean;
}

/**
 * @internal
 */
export interface SocketSyncStreamOptions {
  path: string;
  fetchStrategy: FetchStrategy;
  abortSignal: AbortSignal;
  data: unknown;
}

export interface PreparedRequest {
  url: string;
  headers: Record<string, string>;
  userAgent: string;
  path: string;
}

/**
 * @internal
 */
export abstract class AbstractRemote {
  protected credentials: PowerSyncCredentials | null = null;

  constructor(
    protected connector: RemoteConnector,
    readonly logger: PowerSyncLogger
  ) {}

  /**
   * Sends a request using a suitable `fetch` implementation for the current platform.
   */
  protected abstract fetch(options: FetchOptions): Promise<Response>;

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

  protected async buildRequest(path: string): Promise<PreparedRequest> {
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
      },
      userAgent,
      path
    };
  }

  async get(path: string, headers?: Record<string, string>): Promise<any> {
    const request = await this.buildRequest(path);
    const res = await this.fetch({
      resource: request.url,
      request: {
        method: 'GET',
        headers: {
          ...headers,
          ...request.headers
        }
      },
      expectStreamingResponse: false
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
   * @returns A text decoder decoding UTF-8. This is a method to allow patching it for Hermes which doesn't support the
   * builtin, without forcing us to bundle a polyfill with `@powersync/common`.
   */
  createTextDecoder(): TextDecoder {
    return new TextDecoder();
  }

  createSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  /**
   * Loads `@powersync/shared-internals/websockets`.
   *
   * We prefer to load that as a lazy module with a dynamic `import()` expressions on most platforms. An exception is
   * React Native, where WebSocket support is preferred and we want to load this directly.
   */
  protected abstract loadWebSocketSupport(platform: WebSocketSyncStreamPlatform): Promise<WebSocketSupport>;

  /**
   * Returns a data stream of sync line data, fetched via RSocket-over-WebSocket.
   *
   * The only mechanism to abort the returned stream is to use the abort signal in {@link SocketSyncStreamOptions}.
   */
  async socketStreamRaw(options: SocketSyncStreamOptions): Promise<SimpleAsyncIterator<Uint8Array>> {
    const support = await this.loadWebSocketSupport(webSocketPlatform);

    const request = await this.buildRequest(options.path);
    request.url = request.url.replace(/^https?:\/\//, function (match) {
      return match === 'https://' ? 'wss://' : 'ws://';
    });
    const { fetchStrategy = FetchStrategy.Buffered, abortSignal, data } = options;

    return await support.webSocketSyncStream({
      remote: this,
      buffered: fetchStrategy == FetchStrategy.Buffered,
      abortSignal,
      requestPayload: data,
      request
    });
  }

  /**
   * @returns Whether the HTTP implementation on this platform can receive streamed binary responses. This is true on
   * all platforms except React Native (who would have guessed...), where we must not request BSON responses.
   *
   * @see https://github.com/react-native-community/fetch?tab=readme-ov-file#motivation
   */
  protected get supportsStreamingBinaryResponses(): boolean {
    return true;
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
    const { data, path, abortSignal } = options;
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
    if (abortSignal.aborted) {
      throw new AbortOperation('Abort request received before making fetchStreamRaw request');
    }

    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    abortSignal.addEventListener('abort', () => {
      const reason =
        abortSignal.reason ??
        new AbortOperation('Cancelling network request before it resolves. Abort signal has been received.');

      if (reader == null) {
        // Only abort via the abort controller if the request has not resolved yet
        controller.abort(reason);
      } else {
        reader.cancel(reason).catch(() => {
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

      res = await this.fetch({
        resource: request.url,
        request: {
          method: 'POST',
          headers: {
            ...request.headers,
            accept: this.supportsStreamingBinaryResponses ? `${bson};q=0.9,${ndJson};q=0.8` : ndJson
          },
          body: JSON.stringify(data),
          signal: controller.signal,
          cache: 'no-store'
        },
        expectStreamingResponse: true
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
        error.status = res.status;

        this.logger.log({
          level: LogLevels.error,
          message: `Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`,
          error
        });
        throw error;
      }

      const contentType = res.headers.get('content-type');
      responseIsBson = contentType == bson;
    } catch (ex: any) {
      if (ex.name == 'AbortError') {
        throw new AbortOperation(`Pending fetch request to ${request.url} has been aborted.`);
      }
      throw ex;
    }

    reader = res.body.getReader();

    const stream: SimpleAsyncIterator<Uint8Array> = {
      next: async () => {
        if (controller.signal.aborted) {
          return doneResult;
        }

        try {
          return await reader.read();
        } catch (ex) {
          if (controller.signal.aborted) {
            // .read() completes with an error if we cancel the reader, which we do to disconnect. So this is just
            // things working as intended, we can return a done event and consider the exception handled.
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
   * `Uint8Array`s.
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
