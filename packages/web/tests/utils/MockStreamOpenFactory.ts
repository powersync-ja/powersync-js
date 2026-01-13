import {
  AbstractPowerSyncDatabase,
  AbstractRemote,
  AbstractStreamingSyncImplementation,
  BSONImplementation,
  DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  PowerSyncDatabaseOptions,
  RemoteConnector,
  SimpleAsyncIterator,
  StreamingSyncLine,
  SyncStreamOptions
} from '@powersync/common';
import {
  PowerSyncDatabase,
  WASQLitePowerSyncDatabaseOpenFactory,
  WebPowerSyncDatabaseOptions,
  WebPowerSyncOpenFactoryOptions,
  WebStreamingSyncImplementation
} from '@powersync/web';
import { BSON } from 'bson';
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
    protected onStreamRequested: () => void
  ) {
    super(connector);
    this.streamController = null;
    this.generateCheckpoint = vi.fn(() => {
      return {
        data: {
          write_checkpoint: '1000'
        }
      };
    });
  }

  async getBSON(): Promise<BSONImplementation> {
    return import('bson');
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
    options.abortSignal?.addEventListener('abort', () => mockReader.cancel());

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
    connector: PowerSyncBackendConnector
  ): AbstractStreamingSyncImplementation {
    return new WebStreamingSyncImplementation({
      logger: this.options.logger,
      adapter: this.bucketStorageAdapter,
      remote: this.remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier: this.database.name,
      retryDelayMs: this.options.crudUploadThrottleMs ?? 0, // The zero here makes tests faster
      crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
      subscriptions: []
    });
  }
}

export class MockStreamOpenFactory extends WASQLitePowerSyncDatabaseOpenFactory {
  constructor(
    options: WebPowerSyncOpenFactoryOptions,
    protected remote: AbstractRemote
  ) {
    super(options);
  }
  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    return new MockedStreamPowerSync(
      {
        ...options
      },
      this.remote
    );
  }
}
