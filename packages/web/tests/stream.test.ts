import { Schema, Table, column } from '@powersync/common';
import { WebPowerSyncOpenFactoryOptions } from '@powersync/web';
import Logger from 'js-logger';
import { v4 as uuid } from 'uuid';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MockRemote, MockStreamOpenFactory, TestConnector } from './utils/MockStreamOpenFactory';

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export type ConnectedDatabaseUtils = UnwrapPromise<ReturnType<typeof generateConnectedDatabase>>;
export type GenerateConnectedDatabaseOptions = {
  powerSyncOptions: Partial<WebPowerSyncOpenFactoryOptions>;
};

const UPLOAD_TIMEOUT_MS = 3000;

export const DEFAULT_CONNECTED_POWERSYNC_OPTIONS = {
  powerSyncOptions: {
    dbFilename: 'test-stream-connection.db',
    flags: {
      enableMultiTabs: false,
      useWebWorker: true
    },
    // Makes tests faster
    crudUploadThrottleMs: 0,
    schema: new Schema({
      users: new Table({ name: column.text })
    })
  }
};

export async function generateConnectedDatabase(
  options: GenerateConnectedDatabaseOptions = DEFAULT_CONNECTED_POWERSYNC_OPTIONS
) {
  const { powerSyncOptions } = options;
  const { powerSyncOptions: defaultPowerSyncOptions } = DEFAULT_CONNECTED_POWERSYNC_OPTIONS;
  /**
   * Very basic implementation of a listener pattern.
   * Required since we cannot extend multiple classes.
   */
  const callbacks: Map<string, () => void> = new Map();
  const connector = new TestConnector();
  const uploadSpy = vi.spyOn(connector, 'uploadData');
  const remote = new MockRemote(connector, () => callbacks.forEach((c) => c()));

  const factory = new MockStreamOpenFactory(
    {
      ...defaultPowerSyncOptions,
      ...powerSyncOptions,
      flags: {
        ...(defaultPowerSyncOptions.flags ?? {}),
        ...(powerSyncOptions.flags ?? {})
      }
    },
    remote
  );
  const powersync = factory.getInstance();

  const waitForStream = () =>
    new Promise<void>((resolve) => {
      const id = uuid();
      callbacks.set(id, () => {
        resolve();
        callbacks.delete(id);
      });
    });

  const connect = async () => {
    const streamOpened = waitForStream();

    const connectedPromise = powersync.connect(connector);

    await streamOpened;

    remote.streamController?.enqueue(new TextEncoder().encode('{"token_expires_in":3426}\n'));

    // Wait for connected to be true
    await connectedPromise;
  };

  await connect();

  return {
    connector,
    connect,
    factory,
    powersync,
    remote,
    uploadSpy,
    waitForStream,
    dispose: async () => {
      remote.streamController?.close();
      await powersync.disconnectAndClear();
      await powersync.close();
    }
  };
}

describe(
  'Streaming',
  {
    sequential: true,
    timeout: 30_000
  },
  () => {
    /**
     * Declares a test to be executed with different generated db functions
     */
    const itWithGenerators = async (
      name: string,
      test: (createConnectedDatabase: () => ReturnType<typeof generateConnectedDatabase>) => Promise<void>
    ) => {
      const funcWithWebWorker = generateConnectedDatabase;
      const funcWithoutWebWorker = () =>
        generateConnectedDatabase({
          powerSyncOptions: {
            dbFilename: 'test-stream-connection-no-worker.db',
            flags: {
              useWebWorker: false
            }
          }
        });

      it(`${name} - with web worker`, () => test(funcWithWebWorker));
      it(`${name} - without web worker`, () => test(funcWithoutWebWorker));
    };

    beforeAll(() => Logger.useDefaults());

    let connectionUtilities: ConnectedDatabaseUtils | null = null;

    afterEach(async () => {
      await connectionUtilities?.dispose();
      connectionUtilities = null;
    });

    itWithGenerators('PowerSync reconnect on closed stream', async (createConnectedDatabase) => {
      connectionUtilities = await createConnectedDatabase();
      const { powersync, waitForStream, remote } = connectionUtilities;

      expect(powersync.connected).toBe(true);

      // Close the stream
      const newStream = waitForStream();
      remote.streamController?.close();

      // A new stream should be requested
      await newStream;
    });

    itWithGenerators('PowerSync reconnect multiple connect calls', async (createConnectedDatabase) => {
      // This initially performs a connect call
      connectionUtilities = await createConnectedDatabase();
      const { powersync, waitForStream, remote } = connectionUtilities;
      expect(powersync.connected).toBe(true);

      // Call connect again, a new stream should be requested
      const newStream = waitForStream();
      powersync.connect(new TestConnector());

      // A new stream should be requested
      await newStream;
    });

    itWithGenerators('Should trigger upload connector when connected', async (createConnectedDatabase) => {
      console.log('connecting');
      connectionUtilities = await createConnectedDatabase();
      const { powersync, uploadSpy } = connectionUtilities;
      console.log('connected');
      expect(powersync.connected).toBe(true);

      // do something which should trigger an upload
      await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);
      console.log('executed a statement');
      // It should try and upload
      await vi.waitFor(
        () => {
          // to-have-been-called seems to not work after failing the first check
          console.log('number of calls, ', uploadSpy.mock.calls.length);
          expect(uploadSpy.mock.calls.length).equals(1);
        },
        {
          timeout: UPLOAD_TIMEOUT_MS,
          interval: 500
        }
      );
    });

    itWithGenerators('Should retry failed uploads when connected', async (createConnectedDatabase) => {
      connectionUtilities = await createConnectedDatabase();
      const { powersync, uploadSpy } = connectionUtilities;

      expect(powersync.connected).toBe(true);

      let uploadCounter = 0;
      // This test will throw an exception a few times before uploading
      const throwCounter = 2;
      uploadSpy.mockImplementation(async (db) => {
        if (uploadCounter++ < throwCounter) {
          throw new Error('No uploads yet');
        }
        // Now actually do the upload
        const tx = await db.getNextCrudTransaction();
        await tx?.complete();
      });

      // do something which should trigger an upload
      await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);

      // It should try and upload
      await vi.waitFor(
        () => {
          // to-have-been-called seems to not work after failing a check
          expect(uploadSpy.mock.calls.length).equals(throwCounter + 1);
        },
        {
          timeout: UPLOAD_TIMEOUT_MS,
          interval: 500
        }
      );
    });

    itWithGenerators('Should upload after reconnecting', async (createConnectedDatabase) => {
      console.log('connecting');
      connectionUtilities = await createConnectedDatabase();
      const { powersync, connect, uploadSpy } = connectionUtilities;
      console.log('connected');
      expect(powersync.connected).toBe(true);

      console.log('disconnecting');
      await powersync.disconnect();
      console.log('disconnected');

      // do something (offline) which should trigger an upload
      await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);

      console.log('connecting again');
      await connect();
      console.log('done connecting');

      // It should try and upload
      await vi.waitFor(
        () => {
          // to-have-been-called seems to not work after failing a check
          console.log('upload has been called times: ', uploadSpy.mock.calls.length);
          expect(uploadSpy.mock.calls.length).equals(1);
        },
        {
          timeout: UPLOAD_TIMEOUT_MS,
          interval: 500
        }
      );
    });

    itWithGenerators('Should update status when uploading', async (createConnectedDatabase) => {
      connectionUtilities = await createConnectedDatabase();
      const { powersync, uploadSpy } = connectionUtilities;

      expect(powersync.connected).toBe(true);

      console.log('database connected');

      let uploadStartedPromise = new Promise<void>((resolve) => {
        uploadSpy.mockImplementation(async (db) => {
          resolve();
          // Now actually do the upload
          const tx = await db.getNextCrudTransaction();
          await tx?.complete();
        });
      });

      // do something which should trigger an upload
      await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);

      console.log('created item');
      await uploadStartedPromise;
      console.log('upload started');

      expect(powersync.currentStatus.dataFlowStatus.uploading).true;

      // Status should update after uploads are completed
      await vi.waitFor(
        () => {
          // to-have-been-called seems to not work after failing a check
          console.log('upload status is', powersync.currentStatus.dataFlowStatus.uploading);
          expect(powersync.currentStatus.dataFlowStatus.uploading).false;
        },
        {
          timeout: UPLOAD_TIMEOUT_MS,
          interval: 500
        }
      );
    });
  }
);
