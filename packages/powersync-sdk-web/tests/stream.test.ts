import { beforeAll, describe, expect, it } from 'vitest';
import {
  AbstractPowerSyncDatabase,
  AbstractRemote,
  AbstractStreamingSyncImplementation,
  Column,
  ColumnType,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  PowerSyncDatabaseOptions,
  RemoteConnector,
  Schema,
  Table
} from '@journeyapps/powersync-sdk-common';
import {
  PowerSyncDatabase,
  WASQLitePowerSyncDatabaseOpenFactory,
  WebPowerSyncDatabaseOptions,
  WebStreamingSyncImplementation
} from '@journeyapps/powersync-sdk-web';
import Logger from 'js-logger';
import { WebPowerSyncOpenFactoryOptions } from 'src/db/adapters/AbstractWebPowerSyncDatabaseOpenFactory';
import { v4 as uuid } from 'uuid';

class TestConnector implements PowerSyncBackendConnector {
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

class MockRemote extends AbstractRemote {
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

class MockedStreamPowerSync extends PowerSyncDatabase {
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

class MockOpenFactory extends WASQLitePowerSyncDatabaseOpenFactory {
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

describe('Stream test', () => {
  beforeAll(() => Logger.useDefaults());

  it('PowerSync reconnect', async () => {
    /**
     * Very basic implementation of a listener pattern.
     * Required since we cannot extend multiple classes.
     */
    const callbacks: Map<string, () => void> = new Map();
    const remote = new MockRemote(new TestConnector(), () => callbacks.forEach((c) => c()));

    const powersync = new MockOpenFactory(
      {
        dbFilename: 'test-stream-connection.db',
        flags: {
          enableMultiTabs: false
        },
        schema: new Schema([
          new Table({
            name: 'users',
            columns: [new Column({ name: 'name', type: ColumnType.TEXT })]
          })
        ])
      },
      remote
    ).getInstance();

    const waitForStream = () =>
      new Promise<void>((resolve) => {
        const id = uuid();
        callbacks.set(id, () => {
          resolve();
          callbacks.delete(id);
        });
      });

    const streamOpened = waitForStream();

    powersync.connect(new TestConnector());

    await streamOpened;

    remote.streamController?.enqueue(new TextEncoder().encode('{"token_expires_in":3426}\n'));

    // Wait for connected to be true
    await new Promise<void>((resolve) => {
      if (powersync.connected) {
        resolve();
      }
      const l = powersync.registerListener({
        statusChanged: (status) => {
          if (status.connected) {
            resolve();
            l?.();
          }
        }
      });
    });

    expect(powersync.connected).true;

    // Close the stream
    const newStream = waitForStream();
    remote.streamController?.close();

    // A new stream should be requested
    await newStream;

    await powersync.disconnectAndClear();
    await powersync.close();
  });
});
