import type { StreamingSyncCheckpoint, StreamingSyncLine, StreamingSyncRequest } from '@powersync/service-core';
import { MemoryBucketStorageImpl } from '../src/client/storage/MemoryBucketStorageImpl.js';
import { SyncOperationsHandler } from '../src/client/storage/SyncOperationsHandler.js';
import type { StreamOptions, SyncClient, SyncClientOptions, SyncStatus } from '../src/client/sync/SyncClient.js';
import { SyncClientImpl } from '../src/client/sync/SyncClientImpl.js';
import { DEFAULT_SYSTEM_DEPENDENCIES } from '../src/client/system/SystemDependencies.js';

export interface MockStreamController {
  /**
   * Push a sync line to the stream
   */
  pushLine(line: StreamingSyncLine): void;
  /**
   * Close the stream
   */
  close(): void;
  /**
   * Get the request that was made to open the stream
   */
  getRequest(): StreamingSyncRequest | null;
}

/**
 * Mock stream factory that tracks stream controllers and allows manual control
 */
export class MockStreamFactory {
  private listeners: Array<{
    request: StreamingSyncRequest;
    controller: ReadableStreamDefaultController<StreamingSyncLine>;
    mockController: MockStreamController;
  }> = [];

  /**
   * The last created stream controller (most recent)
   */
  get lastController(): MockStreamController | null {
    return this.listeners.length > 0 ? this.listeners[this.listeners.length - 1].mockController : null;
  }

  /**
   * Get all active stream controllers
   */
  getControllers(): MockStreamController[] {
    return this.listeners.map((l) => l.mockController);
  }

  /**
   * Get the requests made to open streams
   */
  getRequests(): StreamingSyncRequest[] {
    return this.listeners.map((l) => l.request);
  }

  /**
   * Push a line to all active streams
   */
  pushLine(line: StreamingSyncLine): void {
    for (const listener of this.listeners) {
      listener.controller.enqueue(line);
    }
  }

  /**
   * Push a line to the last created stream only
   */
  pushLineToLast(line: StreamingSyncLine): void {
    const last = this.listeners[this.listeners.length - 1];
    if (last) {
      last.controller.enqueue(line);
    }
  }

  /**
   * Close all active streams
   */
  closeAll(): void {
    for (const listener of this.listeners) {
      listener.controller.close();
    }
    this.listeners.length = 0;
  }

  /**
   * Create a mock stream that will be tracked by this factory
   */
  createStream(options: StreamOptions): ReadableStream<StreamingSyncLine> {
    const streamRequest: StreamingSyncRequest = {
      raw_data: true,
      client_id: options.clientId,
      buckets: options.bucketPositions
    };

    let streamController: ReadableStreamDefaultController<StreamingSyncLine> | null = null;

    const mockController: MockStreamController = {
      pushLine(line: StreamingSyncLine) {
        if (streamController) {
          streamController.enqueue(line);
        }
      },
      close() {
        if (streamController) {
          streamController.close();
        }
      },
      getRequest() {
        return streamRequest;
      }
    };

    const stream = new options.systemDependencies.ReadableStream<StreamingSyncLine>({
      start: (controller) => {
        streamController = controller;
        this.listeners.push({
          request: streamRequest,
          controller,
          mockController
        });
      },
      cancel: () => {
        const index = this.listeners.findIndex((l) => l.controller === streamController);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      }
    });

    return stream;
  }
}

/**
 * Helper function to create a test sync client with a mock stream factory
 */
export function createTestSyncClient(
  partialOptions: Partial<SyncClientOptions>,
  mockFactory: MockStreamFactory,
  operationsHandler: SyncOperationsHandler
): SyncClientImpl {
  const systemDependencies = partialOptions.systemDependencies ?? DEFAULT_SYSTEM_DEPENDENCIES();

  const defaultOptions: SyncClientOptions = {
    connectionRetryDelayMs: 100,
    uploadThrottleMs: 100,
    debugMode: false,
    storage:
      partialOptions.storage ??
      new MemoryBucketStorageImpl({
        ...partialOptions,
        operationsHandlers: [operationsHandler],
        systemDependencies
      }),
    systemDependencies,
    // Create an arrow function that uses the mock factory
    streamOpener: async (options: StreamOptions) => mockFactory.createStream(options),
    ...partialOptions
  };

  return new SyncClientImpl(defaultOptions);
}

/**
 * Helper function to wait for a specific sync status condition
 */
export function waitForSyncStatus(
  client: SyncClient,
  matcher: (status: SyncStatus) => boolean,
  timeout = 5000
): Promise<SyncStatus> {
  return new Promise((resolve, reject) => {
    if (matcher(client.status)) {
      return resolve(client.status);
    }

    const timeoutId = setTimeout(() => {
      dispose();
      reject(new Error(`Timeout waiting for sync status`));
    }, timeout);

    const dispose = client.registerListener({
      statusChanged: (status) => {
        try {
          if (matcher(status)) {
            clearTimeout(timeoutId);
            dispose();
            resolve(status);
          }
        } catch (e) {
          clearTimeout(timeoutId);
          dispose();
          reject(e);
        }
      }
    });
  });
}

/**
 * Helper to create a checkpoint sync line
 */
export function checkpoint(options: {
  last_op_id: number | string;
  buckets?: any[];
  write_checkpoint?: string | null;
}): StreamingSyncCheckpoint {
  return {
    checkpoint: {
      last_op_id: `${options.last_op_id}`,
      buckets: options.buckets ?? [],
      write_checkpoint: options.write_checkpoint ?? undefined,
      streams: []
    }
  };
}
