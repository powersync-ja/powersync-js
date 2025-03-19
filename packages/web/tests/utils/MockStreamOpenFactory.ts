import {
  AbstractPowerSyncDatabase,
  AbstractRemote,
  AbstractStreamingSyncImplementation,
  BSONImplementation,
  DataStream,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  PowerSyncDatabaseOptions,
  RemoteConnector,
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
  streamController: ReadableStreamDefaultController<StreamingSyncLine> | null;

  constructor(
    connector: RemoteConnector,
    protected onStreamRequested: () => void
  ) {
    super(connector);
    this.streamController = null;
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
      return {
        data: {
          write_checkpoint: '1000'
        }
      };
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

  socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    // For this test mock these are essentially the same
    return this.postStream(options);
  }

  async postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    const mockResponse = await this.postStreaming(options.path, options.data, options.headers, options.abortSignal);
    const mockReader = mockResponse.getReader();
    const stream = new DataStream<StreamingSyncLine>({
      logger: this.logger
    });

    const l = stream.registerListener({
      lowWater: async () => {
        try {
          const { done, value } = await mockReader.read();
          // Exit if we're done
          if (done) {
            stream.close();
            l?.();
            return;
          }
          stream.enqueueData(value);
        } catch (ex) {
          stream.close();
          throw ex;
        }
      },
      closed: () => {
        mockReader.releaseLock();
        l?.();
      }
    });

    return stream;
  }

  enqueueLine(line: StreamingSyncLine) {
    this.streamController?.enqueue(line);
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
      retryDelayMs: this.options.crudUploadThrottleMs ?? 0 // The zero here makes tests faster
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
