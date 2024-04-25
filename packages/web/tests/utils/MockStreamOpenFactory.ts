import {
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  AbstractPowerSyncDatabase,
  AbstractRemote,
  RemoteConnector,
  AbstractStreamingSyncImplementation,
  PowerSyncDatabaseOptions,
  SyncStreamOptions,
  DataStream,
  StreamingSyncLine
} from '@powersync/common';
import {
  PowerSyncDatabase,
  WebPowerSyncDatabaseOptions,
  WebStreamingSyncImplementation,
  WASQLitePowerSyncDatabaseOpenFactory,
  WebPowerSyncOpenFactoryOptions
} from '@powersync/web';

export class TestConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    return {
      endpoint: '',
      token: ''
    };
  }
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    return;
  }
}

export class MockRemote extends AbstractRemote {
  streamController: ReadableStreamDefaultController | null;

  constructor(
    connector: RemoteConnector,
    protected onStreamRequested: () => void
  ) {
    super(connector);
    this.streamController = null;
  }

  post(path: string, data: any, headers?: Record<string, string> | undefined): Promise<any> {
    throw new Error('Method not implemented.');
  }
  get(path: string, headers?: Record<string, string> | undefined): Promise<any> {
    throw new Error('Method not implemented.');
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
    throw new Error('Method not implemented.');
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
      adapter: this.bucketStorageAdapter,
      remote: this.remote,
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier: this.options.database.name,
      retryDelayMs: 0
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
