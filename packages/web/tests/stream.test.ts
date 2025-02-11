import Logger from 'js-logger';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { ConnectedDatabaseUtils, generateConnectedDatabase } from './utils/generateConnectedDatabase';

const UPLOAD_TIMEOUT_MS = 3000;

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

      it.sequential(`${name} - with web worker`, () => test(funcWithWebWorker));
      it.sequential(`${name} - without web worker`, () => test(funcWithoutWebWorker));
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
      console.log('connecting');
      connectionUtilities = await createConnectedDatabase();
      console.log('connected');
      const { powersync, uploadSpy } = connectionUtilities;

      expect(powersync.connected).toBe(true);

      let uploadCounter = 0;
      // This test will throw an exception a few times before uploading
      const throwCounter = 2;
      uploadSpy.mockImplementation(async (db) => {
        if (uploadCounter++ < throwCounter) {
          throw new Error('No uploads yet');
        }
        console.log('allowing the upload');
        // Now actually do the upload
        const tx = await db.getNextCrudTransaction();
        await tx?.complete();
      });

      console.log('creating an item');
      // do something which should trigger an upload
      await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);

      console.log('done creating an item');

      // It should try and upload
      await vi.waitFor(
        () => {
          // to-have-been-called seems to not work after failing a check
          console.log('the number of calls is ', uploadSpy.mock.calls.length);
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
