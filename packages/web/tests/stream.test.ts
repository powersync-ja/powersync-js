import { BucketChecksum } from '@powersync/common';
import Logger from 'js-logger';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { generateConnectedDatabase } from './utils/generateConnectedDatabase';

const UPLOAD_TIMEOUT_MS = 3000;

describe('Streaming', () => {
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
          flags: {
            useWebWorker: false
          }
        }
      });

    it(`${name} - with web worker`, () => test(funcWithWebWorker));
    it(`${name} - without web worker`, () => test(funcWithoutWebWorker));
  };

  beforeAll(() => Logger.useDefaults({defaultLevel: Logger.TRACE}));

  itWithGenerators('PowerSync reconnect on closed stream', async (createConnectedDatabase) => {
    const { powersync, waitForStream, remote } = await createConnectedDatabase();
    expect(powersync.connected).toBe(true);

    // Close the stream
    const newStream = waitForStream();
    remote.streamController?.close();

    // A new stream should be requested
    await newStream;
  });

  itWithGenerators('PowerSync reconnect multiple connect calls', async (createConnectedDatabase) => {
    // This initially performs a connect call
    const { powersync, waitForStream } = await createConnectedDatabase();
    expect(powersync.connected).toBe(true);

    // Call connect again, a new stream should be requested
    const newStream = waitForStream();
    powersync.connect(new TestConnector());

    // A new stream should be requested
    await newStream;
  });

  itWithGenerators('Should trigger upload connector when connected', async (createConnectedDatabase) => {
    const { powersync, uploadSpy } = await createConnectedDatabase();
    expect(powersync.connected).toBe(true);

    // do something which should trigger an upload
    await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);
    // It should try and upload
    await vi.waitFor(
      () => {
        // to-have-been-called seems to not work after failing the first check
        expect(uploadSpy.mock.calls.length).equals(1);
      },
      {
        timeout: UPLOAD_TIMEOUT_MS
      }
    );
  });

  itWithGenerators('Should retry failed uploads when connected', async (createConnectedDatabase) => {
    const { powersync, uploadSpy } = await createConnectedDatabase();
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
        timeout: UPLOAD_TIMEOUT_MS
      }
    );
  });

  itWithGenerators('Should upload after reconnecting', async (createConnectedDatabase) => {
    const { connect, powersync, uploadSpy } = await createConnectedDatabase();
    expect(powersync.connected).toBe(true);

    await powersync.disconnect();

    // do something (offline) which should trigger an upload
    await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);

    await connect();

    // It should try and upload
    await vi.waitFor(
      () => {
        // to-have-been-called seems to not work after failing a check
        expect(uploadSpy.mock.calls.length).equals(1);
      },
      {
        timeout: UPLOAD_TIMEOUT_MS
      }
    );
  });

  itWithGenerators('Should update status when uploading', async (createConnectedDatabase) => {
    const { powersync, uploadSpy } = await createConnectedDatabase();
    expect(powersync.connected).toBe(true);

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

    await uploadStartedPromise;
    expect(powersync.currentStatus.dataFlowStatus.uploading).true;

    // Status should update after uploads are completed
    await vi.waitFor(
      () => {
        // to-have-been-called seems to not work after failing a check
        expect(powersync.currentStatus.dataFlowStatus.uploading).false;
      },
      {
        timeout: UPLOAD_TIMEOUT_MS
      }
    );
  });

  describe('Partial', () => {
    itWithGenerators('Should update sync state incrementally', async (createConnectedDatabase) => {
      const { powersync, remote } = await createConnectedDatabase();
      expect(powersync.currentStatus.dataFlowStatus.downloading).toBe(false);

      const buckets: BucketChecksum[] = [];
      for (let prio = 0; prio <= 3; prio++) {
        buckets.push({bucket: `prio${prio}`, priority: prio, checksum: 0});
      }
      remote.enqueueLine({
        checkpoint: {
          last_op_id: '0',
          buckets,
        },
      });

      // Emit partial sync complete for each priority but the last.
      for (var prio = 0; prio < 3; prio++) {
        expect(powersync.currentStatus.statusForPriority(prio).hasSynced).toBe(false);

        remote.enqueueLine({
          partial_checkpoint_complete: {
            last_op_id: '0',
            priority: prio,
          }
        });

        await powersync.syncStreamImplementation!.waitUntilStatusMatches((status) => {
          return status.statusForPriority(prio).hasSynced === true;
        });
      }

      // Then, complete the sync.
      remote.enqueueLine({checkpoint_complete: {last_op_id: '0'}});
      await powersync.waitForFirstSync();
    });
  });
});
