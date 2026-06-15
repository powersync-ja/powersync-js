import {
  AbstractPowerSyncDatabase,
  AbstractRemote,
  AbstractStreamingSyncImplementation,
  CreateSyncImplementationOptions,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  PowerSyncDatabaseOptions,
  PowerSyncLogger,
  RemoteConnector,
  SyncStreamOptions
} from '@powersync/common';
import { SimpleAsyncIterator } from '@powersync/shared-internals';
import { StreamingSyncLine } from '@powersync/common/internal/sync_protocol';
import { PowerSyncDatabase, WebPowerSyncDatabaseOptions, WebStreamingSyncImplementation } from '@powersync/web';
import { MockedFunction, vi } from 'vitest';

export class TestConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    return {
      endpoint: '',
      token: ''
    };
  }
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const tx = await database.getNextCrudTransaction();
    await tx?.complete();
  }
}

export class MockRemote extends AbstractRemote {
  streamController: ReadableStreamDefaultController<string> | null;
  errorOnStreamStart = false;
  generateCheckpoint: MockedFunction<() => any>;

  constructor(
    connector: RemoteConnector,
    logger: PowerSyncLogger,
    protected onStreamRequested: () => void
  ) {
    super(connector, logger);
    this.streamController = null;
    this.generateCheckpoint = vi.fn(() => {
      return {
        data: {
          write_checkpoint: '1000'
        }
      };
    });
  }

  post(path: string, data: any, headers?: Record<string, string> | undefined): Promise<any> {
    throw new Error('Method not implemented.');
  }
  async get(path: string, headers?: Record<string, string> | undefined): Promise<any> {
    // mock a response for write checkpoint API
    if (path.includes('checkpoint')) {
      return this.generateCheckpoint();
    }
    throw new Error('Not implemented');
  }

  async postStreaming(
    path: string,
    data: any,
    headers?: Record<string, string>,
    signal?: AbortSignal
  ): Promise<ReadableStream> {
    const stream = new ReadableStream({
      start: (controller) => {
        this.streamController = controller;
        this.onStreamRequested();
        if (this.errorOnStreamStart) {
          controller.error(new Error('Mock error on stream start'));
        }
        // The request could be aborted at any time.
        // This checks if the signal is already aborted and closes the stream if so.
        // If not, it adds an event listener to close the stream when the signal is aborted.
        if (signal?.aborted) {
          controller.close();
          return;
        }
        signal?.addEventListener('abort', () => {
          try {
            controller.close();
          } catch (ex) {
            // An error might be thrown if the reader has not been read from yet
          }
        });
      }
    });
    return new Response(stream).body!;
  }

  async socketStreamRaw<T>(): Promise<never> {
    throw 'Unsupported: Socket streams are not currently supported in tests';
  }

  async fetchStream(options: SyncStreamOptions): Promise<SimpleAsyncIterator<Uint8Array | string>> {
    const mockResponse = await this.postStreaming(options.path, options.data, options.headers, options.abortSignal);
    const mockReader = mockResponse.getReader();
    options.abortSignal?.addEventListener('abort', async () => {
      try {
        await mockReader.cancel();
      } catch (ex) {
        // This rethrows an error set on the controller. We've already handled that by rethrowing in next() and we don't
        // need tests to treat this as an unhandled error.
      }
    });

    return {
      async next() {
        return await mockReader.read();
      }
    };
  }

  enqueueLine(line: StreamingSyncLine) {
    this.streamController?.enqueue(JSON.stringify(line));
  }
}

export class MockedStreamPowerSync extends PowerSyncDatabase {
  constructor(
    options: WebPowerSyncDatabaseOptions,
    protected remote: AbstractRemote
  ) {
    super(options);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions
  ): AbstractStreamingSyncImplementation {
    return new WebStreamingSyncImplementation({
      logger: this.logger,
      adapter: this.bucketStorageAdapter,
      remote: this.remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier: this.database.name,
      subscriptions: [],
      serializedSchema: options.serializedSchema
    });
  }
}
