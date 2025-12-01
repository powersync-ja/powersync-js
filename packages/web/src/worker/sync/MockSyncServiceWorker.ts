import type { MockSyncServiceMessage, MockSyncServiceResponse } from './MockSyncServiceTypes';
import { ActiveResponse, PendingRequest, PendingRequestInternal } from './MockSyncServiceTypes';

/**
 * Mock sync service implementation for shared worker environments.
 * This allows tests to mock sync responses when using enableMultipleTabs: true.
 * Requests are kept pending until a client explicitly creates a response.
 */
export class MockSyncService {
  private pendingRequests: Map<string, PendingRequestInternal> = new Map();
  private activeResponses: Map<string, ActiveResponse> = new Map();
  private nextId = 0;

  /**
   * Register a new pending request (called by WebRemote when a sync stream is requested).
   * Returns a promise that resolves when a client creates a response for this request.
   */
  registerPendingRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    signal?: AbortSignal
  ): Promise<Response> {
    const id = `pending-${++this.nextId}`;

    let resolveResponse: (response: Response) => void;
    let rejectResponse: (error: Error) => void;

    const responsePromise = new Promise<Response>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });

    const pendingRequest: PendingRequestInternal = {
      id,
      url,
      method,
      headers,
      body,
      responsePromise: {
        resolve: resolveResponse!,
        reject: rejectResponse!
      }
    };

    this.pendingRequests.set(id, pendingRequest);

    signal?.addEventListener('abort', () => {
      this.pendingRequests.delete(id);
      rejectResponse(new Error('Request aborted'));

      // if already in active responses, remove it
      if (this.activeResponses.has(id)) {
        const response = this.activeResponses.get(id);
        if (response) {
          response.stream.close();
        }
        this.activeResponses.delete(id);
      }
    });

    // Return the promise - it will resolve when createResponse is called
    return responsePromise;
  }

  /**
   * Get all pending requests
   */
  getPendingRequestsSync(): PendingRequest[] {
    return Array.from(this.pendingRequests.values()).map((pr) => ({
      id: pr.id,
      url: pr.url,
      method: pr.method,
      headers: pr.headers,
      body: pr.body
    }));
  }

  /**
   * Create a response for a pending request.
   * This resolves the response promise and allows pushing body lines.
   */
  createResponse(pendingRequestId: string, status: number, headers: Record<string, string>): void {
    const pendingRequest = this.pendingRequests.get(pendingRequestId);
    if (!pendingRequest) {
      throw new Error(`Pending request ${pendingRequestId} not found`);
    }

    // Create a readable stream that the mock service can control
    // Response.body is always ReadableStream<Uint8Array>, so we use Uint8Array
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        // Store the active response once the controller is available
        // The start callback is called synchronously, so this is safe
        const activeResponse: ActiveResponse = {
          id: pendingRequestId,
          status,
          headers,
          stream: controller
        };
        this.activeResponses.set(pendingRequestId, activeResponse);
      },
      cancel: () => {
        // Remove response when stream is cancelled
        this.activeResponses.delete(pendingRequestId);
        this.pendingRequests.delete(pendingRequestId);
      }
    });

    // Create the Response object
    const response = new Response(stream, {
      status,
      headers
    });

    // Resolve the pending request's promise
    pendingRequest.responsePromise.resolve(response);

    // Remove from pending (it's now active)
    this.pendingRequests.delete(pendingRequestId);
  }

  /**
   * Push body data to an active response.
   * Accepts either text (string) or binary data (ArrayBuffer or Uint8Array).
   * All data is encoded to Uint8Array before enqueueing (required by ReadableStream<Uint8Array>).
   */
  pushBodyData(pendingRequestId: string, data: string | ArrayBuffer | Uint8Array): void {
    const activeResponse = this.activeResponses.get(pendingRequestId);
    if (!activeResponse) {
      throw new Error(`Active response ${pendingRequestId} not found`);
    }

    try {
      let encoded: Uint8Array;

      if (typeof data === 'string') {
        // Encode string to Uint8Array (required by ReadableStream<Uint8Array>)
        const encoder = new TextEncoder();
        encoded = encoder.encode(data);
      } else if (data instanceof ArrayBuffer) {
        // Convert ArrayBuffer to Uint8Array
        encoded = new Uint8Array(data);
      } else {
        // Already Uint8Array, use directly
        encoded = data;
      }

      activeResponse.stream.enqueue(encoded);
    } catch (e) {
      // Stream might be closed, remove it
      this.activeResponses.delete(pendingRequestId);
      throw new Error(`Failed to push data to response ${pendingRequestId}: ${e}`);
    }
  }

  /**
   * Complete an active response (close the stream)
   */
  completeResponse(pendingRequestId: string): void {
    const activeResponse = this.activeResponses.get(pendingRequestId);
    if (!activeResponse) {
      throw new Error(`Active response ${pendingRequestId} not found`);
    }

    try {
      activeResponse.stream.close();
    } catch (e) {
      // Stream might already be closed
    } finally {
      this.activeResponses.delete(pendingRequestId);
    }
  }
}

/**
 * Global mock service instance (only available in shared worker context)
 */
let globalMockService: MockSyncService | null = null;

/**
 * Get or create the global mock service instance
 */
export function getMockSyncService(): MockSyncService | null {
  // Only available in shared worker context
  if (typeof SharedWorkerGlobalScope === 'undefined') {
    return null;
  }

  if (!globalMockService) {
    globalMockService = new MockSyncService();
  }

  return globalMockService;
}

/**
 * Set up message handler for the mock service on a MessagePort
 */
export function setupMockServiceMessageHandler(port: MessagePort) {
  const service = getMockSyncService();
  if (!service) {
    return;
  }

  port.addEventListener('message', (event: MessageEvent<MockSyncServiceMessage>) => {
    const message = event.data;

    if (!message || typeof message !== 'object' || !('type' in message)) {
      return;
    }

    try {
      switch (message.type) {
        case 'getPendingRequests': {
          try {
            const requests = service.getPendingRequestsSync();
            port.postMessage({
              type: 'getPendingRequests',
              requestId: message.requestId,
              requests
            } satisfies MockSyncServiceResponse);
          } catch (error) {
            port.postMessage({
              type: 'error',
              requestId: message.requestId,
              error: error instanceof Error ? error.message : String(error)
            } satisfies MockSyncServiceResponse);
          }
          break;
        }
        case 'createResponse': {
          try {
            service.createResponse(message.pendingRequestId, message.status, message.headers);
            port.postMessage({
              type: 'createResponse',
              requestId: message.requestId,
              success: true
            } satisfies MockSyncServiceResponse);
          } catch (error) {
            port.postMessage({
              type: 'error',
              requestId: message.requestId,
              error: error instanceof Error ? error.message : String(error)
            } satisfies MockSyncServiceResponse);
          }
          break;
        }
        case 'pushBodyData': {
          try {
            service.pushBodyData(message.pendingRequestId, message.data);
            port.postMessage({
              type: 'pushBodyData',
              requestId: message.requestId,
              success: true
            } satisfies MockSyncServiceResponse);
          } catch (error) {
            port.postMessage({
              type: 'error',
              requestId: message.requestId,
              error: error instanceof Error ? error.message : String(error)
            } satisfies MockSyncServiceResponse);
          }
          break;
        }
        case 'completeResponse': {
          try {
            service.completeResponse(message.pendingRequestId);
            port.postMessage({
              type: 'completeResponse',
              requestId: message.requestId,
              success: true
            } satisfies MockSyncServiceResponse);
          } catch (error) {
            port.postMessage({
              type: 'error',
              requestId: message.requestId,
              error: error instanceof Error ? error.message : String(error)
            } satisfies MockSyncServiceResponse);
          }
          break;
        }
        default: {
          const requestId =
            'requestId' in message && typeof message === 'object' && message !== null
              ? (message as { requestId?: string }).requestId
              : undefined;
          port.postMessage({
            type: 'error',
            requestId,
            error: `Unknown message type: ${(message as any).type}`
          } satisfies MockSyncServiceResponse);
          break;
        }
      }
    } catch (error) {
      // Fallback for any unexpected errors
      const requestId = 'requestId' in message ? message.requestId : undefined;
      port.postMessage({
        type: 'error',
        requestId,
        error: error instanceof Error ? error.message : String(error)
      } satisfies MockSyncServiceResponse);
    }
  });

  port.start();
}
