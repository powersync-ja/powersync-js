import {
  AbstractRemote,
  AbstractRemoteOptions,
  BSONImplementation,
  DEFAULT_REMOTE_LOGGER,
  FetchImplementation,
  FetchImplementationProvider,
  ILogger,
  RemoteConnector,
  SimpleAsyncIterator,
  SocketSyncStreamOptions
} from '@powersync/common';
import { type BSON } from 'bson';
import { MockSyncService, setupMockServiceMessageHandler } from '../utils/MockSyncServiceWorker.js';

/**
 * Mock fetch provider that intercepts all requests and routes them to the mock sync service.
 * Used for testing in shared worker environments with enableMultipleTabs: true.
 *
 * When running in a shared worker context, this will:
 * 1. Intercept all requests and register them as pending requests
 * 2. Wait for a client to create a response before returning
 * 3. Set up message handler for the mock service when onconnect is called
 */
class MockSyncServiceFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);

      const mockService = MockSyncService.GLOBAL_INSTANCE;

      // Read the request body (if any)
      let body: any = null;
      try {
        if (request.body) {
          const clonedRequest = request.clone();
          body = await clonedRequest.json().catch(() => {
            // If JSON parsing fails, try text
            return clonedRequest.text().catch(() => null);
          });
        }
      } catch (e) {
        // Body might not be readable, that's okay
      }

      // Extract headers from the request
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Register as a pending request and wait for client to create response
      return await mockService.registerPendingRequest(request.url, request.method, headers, body, request.signal);
    };
  }
}

/**
 * Check if we're running in a shared worker context
 */
function isSharedWorkerContext(): boolean {
  const isSharedWorker =
    typeof SharedWorkerGlobalScope !== 'undefined' &&
    typeof self !== 'undefined' &&
    (self as any).constructor?.name === 'SharedWorkerGlobalScope';
  return isSharedWorker;
}

if (isSharedWorkerContext()) {
  const _self: SharedWorkerGlobalScope = self as any;
  console.log('MockWebRemote: setting up connect listener');

  /**
   * This listener should be called in tandem with the shared sync worker's listener.
   */
  _self.addEventListener('connect', async function (event: MessageEvent) {
    console.log('MockWebRemote: connect listener called');
    const port = event.ports[0];

    // Set up message handler for the mock service on this port
    // Tests can create a separate SharedWorker connection to access this
    setupMockServiceMessageHandler(port);
  });
}

export class WebRemote extends AbstractRemote {
  private _bson: BSONImplementation | undefined;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    // Use mock service fetch provider if we're in a shared worker context
    const fetchProvider = new MockSyncServiceFetchProvider();

    super(connector, logger, {
      ...(options ?? {}),
      fetchImplementation: options?.fetchImplementation ?? fetchProvider
    });
  }

  getUserAgent(): string {
    return 'powersync-web-mock';
  }

  async getBSON(): Promise<BSONImplementation> {
    if (this._bson) {
      return this._bson;
    }
    const { BSON } = await import('bson');
    this._bson = BSON;
    return this._bson;
  }

  /**
   * Override socketStreamRaw to use HTTP method (postStreamRaw) instead.
   * This allows us to use the same mocks for both socket and HTTP streaming.
   */
  async socketStreamRaw(
    options: SocketSyncStreamOptions,
    bson?: typeof BSON
  ): Promise<SimpleAsyncIterator<Uint8Array>> {
    const lines = await this.fetchStream(options);
    bson ??= await this.getBSON();

    // This method is supposed to return a stream of BSON documents, so we may have to map JSON to BSON.
    async function* transform() {
      while (true) {
        const { done, value } = await lines.next();
        if (done) {
          break;
        }

        if (typeof value === 'string') {
          yield bson!.serialize(JSON.parse(value));
        } else {
          yield value;
        }
      }
    }

    return transform();
  }
}
