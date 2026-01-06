import { StreamingSyncLine } from '@powersync/common';
import type {
  AutomaticResponseConfig,
  MockSyncServiceMessage,
  MockSyncServiceResponse,
  PendingRequest
} from './MockSyncServiceTypes';

/**
 * Interface for mocking sync service responses in shared worker environments.
 * Similar to MockSyncService in the node SDK package.
 */
export interface MockSyncService {
  /**
   * Get all pending requests (requests waiting for a response to be created)
   */
  getPendingRequests(): Promise<PendingRequest[]>;

  /**
   * Create a response for a pending request with the specified status and headers.
   * This resolves the pending request and allows pushing body data.
   */
  createResponse(pendingRequestId: string, status: number, headers: Record<string, string>): Promise<void>;

  /**
   * Push body data to an active response.
   * Accepts either text (string) or binary data (ArrayBuffer or Uint8Array).
   * Strings are encoded to Uint8Array before sending.
   * The response must have been created first using createResponse.
   */
  pushBodyData(pendingRequestId: string, data: string | ArrayBuffer | Uint8Array): Promise<void>;

  /**
   * Push a streaming sync line as NDJSON to an active response.
   * This is a convenience method that encodes the line as JSON with a newline.
   * The response must have been created first using createResponse.
   */
  pushBodyLine(pendingRequestId: string, line: StreamingSyncLine): Promise<void>;

  /**
   * Complete an active response (close the stream).
   * The response must have been created first using createResponse.
   */
  completeResponse(pendingRequestId: string): Promise<void>;

  /**
   * Set the automatic response configuration.
   * When set, this will be used to automatically reply to all pending requests.
   */
  setAutomaticResponse(config: AutomaticResponseConfig | null): Promise<void>;

  /**
   * Automatically reply to all pending requests using the automatic response configuration.
   * Returns the number of requests that were replied to.
   */
  replyToAllPendingRequests(): Promise<number>;
}

/**
 * Connect to the shared worker and get access to the mock sync service.
 * This function creates a separate SharedWorker connection to the same shared sync worker
 * just to access the mock service, without interfering with the normal sync implementation.
 *
 * @param identifier - The database identifier (used to construct the worker name)
 * @param workerUrl - Optional custom worker URL. If not provided, uses the default shared sync worker.
 * @returns The mock sync service interface, or null if not available
 */
export async function getMockSyncServiceFromWorker(
  identifier: string,
  workerUrl?: string | URL
): Promise<MockSyncService | null> {
  // Create a separate SharedWorker connection to the same shared sync worker
  // This connection is only used to access the mock service
  // Note the URL and identifier should match in order for the correct worker to be used
  const worker = workerUrl
    ? new SharedWorker(typeof workerUrl === 'string' ? workerUrl : workerUrl.href, {
        name: `shared-sync-${identifier}`
      })
    : new SharedWorker(new URL('../../lib/src/worker/sync/SharedSyncImplementation.worker.js', import.meta.url), {
        /* @vite-ignore */
        name: `shared-sync-${identifier}`,
        type: 'module'
      });

  const port = worker.port;
  port.start();

  // Generic helper to send a message and wait for a response
  const sendMessage = <T extends MockSyncServiceResponse>(
    message: MockSyncServiceMessage,
    expectedType: T['type'],
    timeout = 5000,
    transfer?: Transferable[]
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const requestId = 'requestId' in message ? message.requestId : undefined;

      const handler = (event: MessageEvent<MockSyncServiceResponse>) => {
        const response = event.data;

        if (response.type === expectedType && response.requestId === requestId) {
          port.removeEventListener('message', handler);
          if ('success' in response && !response.success) {
            reject(new Error('Operation failed'));
          } else {
            resolve(response as T);
          }
        } else if (response.type === 'error' && response.requestId === requestId) {
          port.removeEventListener('message', handler);
          reject(new Error(response.error));
        }
      };

      port.addEventListener('message', handler);
      if (transfer && transfer.length > 0) {
        port.postMessage(message, transfer);
      } else {
        port.postMessage(message);
      }

      // Timeout
      setTimeout(() => {
        port.removeEventListener('message', handler);
        reject(new Error(`Timeout waiting for ${expectedType} response`));
      }, timeout);
    });
  };

  // Define pushBodyData first so it can be used by pushBodyLine
  const pushBodyData = async (pendingRequestId: string, data: string | ArrayBuffer | Uint8Array): Promise<void> => {
    const requestId = crypto.randomUUID();

    // Handle transferable objects for ArrayBuffer
    const transfer: Transferable[] = [];
    if (data instanceof ArrayBuffer) {
      transfer.push(data);
    } else if (data instanceof Uint8Array && data.buffer instanceof ArrayBuffer) {
      transfer.push(data.buffer);
    }
    // Strings are passed as-is, no transfer needed

    await sendMessage(
      {
        type: 'pushBodyData',
        requestId,
        pendingRequestId,
        data
      } satisfies MockSyncServiceMessage,
      'pushBodyData',
      5000,
      transfer.length > 0 ? transfer : undefined
    );
  };

  return {
    async getPendingRequests(): Promise<PendingRequest[]> {
      const requestId = crypto.randomUUID();
      const response = await sendMessage<{ type: 'getPendingRequests'; requestId: string; requests: PendingRequest[] }>(
        { type: 'getPendingRequests', requestId } satisfies MockSyncServiceMessage,
        'getPendingRequests'
      );
      return response.requests;
    },

    async createResponse(pendingRequestId: string, status: number, headers: Record<string, string>): Promise<void> {
      const requestId = crypto.randomUUID();
      await sendMessage(
        {
          type: 'createResponse',
          requestId,
          pendingRequestId,
          status,
          headers
        } satisfies MockSyncServiceMessage,
        'createResponse'
      );
    },

    pushBodyData,

    async pushBodyLine(pendingRequestId: string, line: any): Promise<void> {
      // Encode as NDJSON: JSON.stringify + newline
      const lineStr = `${JSON.stringify(line)}\n`;
      await pushBodyData(pendingRequestId, lineStr);
    },

    async completeResponse(pendingRequestId: string): Promise<void> {
      const requestId = crypto.randomUUID();
      await sendMessage(
        {
          type: 'completeResponse',
          requestId,
          pendingRequestId
        } satisfies MockSyncServiceMessage,
        'completeResponse'
      );
    },

    async setAutomaticResponse(config: AutomaticResponseConfig | null): Promise<void> {
      const requestId = crypto.randomUUID();
      await sendMessage(
        {
          type: 'setAutomaticResponse',
          requestId,
          config
        } satisfies MockSyncServiceMessage,
        'setAutomaticResponse'
      );
    },

    async replyToAllPendingRequests(): Promise<number> {
      const requestId = crypto.randomUUID();
      const response = await sendMessage<{
        type: 'replyToAllPendingRequests';
        requestId: string;
        success: boolean;
        count: number;
      }>(
        {
          type: 'replyToAllPendingRequests',
          requestId
        } satisfies MockSyncServiceMessage,
        'replyToAllPendingRequests'
      );
      return response.count;
    }
  };
}
