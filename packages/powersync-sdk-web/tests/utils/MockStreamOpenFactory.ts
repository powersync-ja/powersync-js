import {
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  AbstractPowerSyncDatabase,
  AbstractRemote,
  RemoteConnector,
  AbstractStreamingSyncImplementation,
  PowerSyncDatabaseOptions
} from '@journeyapps/powersync-sdk-common';
import {
  PowerSyncDatabase,
  WebPowerSyncDatabaseOptions,
  WebStreamingSyncImplementation,
  WASQLitePowerSyncDatabaseOpenFactory,
  WebPowerSyncOpenFactoryOptions
} from '@journeyapps/powersync-sdk-web';

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
  async postStreaming(): Promise<any> {
    return new Response(this.generateStream()).body;
  }

  private generateStream() {
    return new ReadableStream({
      start: (controller) => {
        this.streamController = controller;
        this.onStreamRequested();
      }
    });
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
      identifier: this.options.database.name
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
