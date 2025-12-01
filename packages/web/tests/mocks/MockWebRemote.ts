import {
  AbstractRemote,
  AbstractRemoteOptions,
  BSONImplementation,
  DataStream,
  DEFAULT_REMOTE_LOGGER,
  FetchImplementation,
  FetchImplementationProvider,
  ILogger,
  RemoteConnector,
  SocketSyncStreamOptions
} from '@powersync/common';
import { serialize, type BSON } from 'bson';
import { getMockSyncService, setupMockServiceMessageHandler } from '../utils/MockSyncService';

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

/**
 * Mock fetch provider that returns 401 for non-stream requests
 */
class MockFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    // Return a mock fetch that always returns 401
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = new Response(null, {
        status: 401,
        statusText: 'Unauthorized'
      });
      return response;
    };
  }
}

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
      const mockService = getMockSyncService();

      if (mockService) {
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
      }

      // Fallback if mock service is not available
      return new Response(null, {
        status: 401,
        statusText: 'Unauthorized'
      });
    };
  }
}

// Track if we've already set up the onconnect handler
let onconnectHandlerSetup = false;

/**
 * Create the mock sync service globally upfront when in shared worker context.
 * This ensures the service is available before any requests come in.
 */
function initializeMockSyncService() {
  if (!isSharedWorkerContext()) {
    return;
  }

  // Create the mock service upfront (getMockSyncService creates it if it doesn't exist)
  getMockSyncService();
}

/**
 * Set up the onconnect listener lazily when the first WebRemote is created.
 * This ensures deterministic initialization order regardless of import order.
 * The mock service is created upfront, but message handlers are only set up on connect.
 */
function setupOnconnectHandlerIfNeeded() {
  if (onconnectHandlerSetup || !isSharedWorkerContext()) {
    return;
  }

  // Create the mock sync service globally upfront
  initializeMockSyncService();

  const _self: SharedWorkerGlobalScope = self as any;

  // Store the original onconnect if it exists (may be set by SharedSyncImplementation.worker.ts)
  const originalOnConnect = _self.onconnect;

  _self.onconnect = async function (event: MessageEvent) {
    const port = event.ports[0];

    // Get the mock service (already created upfront) and set up message handler lazily
    const mockService = getMockSyncService();
    if (mockService) {
      // Set up message handler for the mock service on this port
      // Tests can create a separate SharedWorker connection to access this
      setupMockServiceMessageHandler(port);
    }

    // Call the original handler if it exists (this will set up WorkerClient)
    // Note: The mock service message handler and WorkerClient can coexist
    // since they use different message types
    if (originalOnConnect) {
      await originalOnConnect.call(this, event);
    }
  };

  onconnectHandlerSetup = true;
}

export class WebRemote extends AbstractRemote {
  private _bson: BSONImplementation | undefined;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    // Lazy initialize the onconnect handler when the first WebRemote is created
    // This ensures deterministic initialization order regardless of import order
    setupOnconnectHandlerIfNeeded();

    // Use mock service fetch provider if we're in a shared worker context
    const fetchProvider = isSharedWorkerContext() ? new MockSyncServiceFetchProvider() : new MockFetchProvider();

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
  async socketStreamRaw<T>(
    options: SocketSyncStreamOptions,
    map: (buffer: Uint8Array) => T,
    bson?: typeof BSON
  ): Promise<DataStream<T>> {
    // postStreamRaw decodes to strings, so convert back to Uint8Array for the map function
    return await this.postStreamRaw(options, (line: string) => map(serialize(JSON.parse(line))));
  }
}
