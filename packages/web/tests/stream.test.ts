import { BucketChecksum, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import Logger from 'js-logger';
import { afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { ConnectedDatabaseUtils, generateConnectedDatabase } from './utils/generateConnectedDatabase';

const UPLOAD_TIMEOUT_MS = 3000;

describe(
  'Streaming',
  {
    sequential: true
  },
  () => {
    /**
     * Declares a test to be executed with different generated db functions
     */
    const itWithGenerators = (
      name: string,
      test: (createConnectedDatabase: () => ReturnType<typeof generateConnectedDatabase>) => Promise<void>
    ) => {
      const funcWithWebWorker = () =>
        generateConnectedDatabase({
          powerSyncOptions: {
            dbFilename: `test-stream-connection-worker.db`
          }
        });
      const funcWithoutWebWorker = () =>
        generateConnectedDatabase({
          powerSyncOptions: {
            dbFilename: `test-stream-connection-no-worker.db`,
            flags: {
              useWebWorker: false
            }
          }
        });

      it.sequential(`${name} - with web worker`, () => test(funcWithWebWorker));
      it.sequential(`${name} - without web worker`, () => test(funcWithoutWebWorker));
      it.sequential(`${name} - with OPFS`, () =>
        test(() =>
          generateConnectedDatabase({
            powerSyncOptions: {
              database: new WASQLiteOpenFactory({
                dbFilename: `test-stream-connection-opfs.db`,
                vfs: WASQLiteVFS.OPFSCoopSyncVFS
              })
            }
          })
        )
      );
    };

    beforeAll(() => Logger.useDefaults());

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
          timeout: UPLOAD_TIMEOUT_MS,
          interval: 500
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
          throw new Error(`No uploads yet`);
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
      const { powersync, connect, uploadSpy } = await createConnectedDatabase();
      expect(powersync.connected).toBe(true);

      await powersync.disconnect();

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
          buckets.push({ bucket: `prio${prio}`, priority: prio, checksum: 10 + prio });
        }
        remote.enqueueLine({
          checkpoint: {
            last_op_id: '4',
            buckets
          }
        });

        let operationId = 1;
        const addRow = (prio: number) => {
          remote.enqueueLine({
            data: {
              bucket: `prio${prio}`,
              data: [
                {
                  checksum: prio + 10,
                  data: JSON.stringify({ name: 'row' }),
                  op: 'PUT',
                  op_id: (operationId++).toString(),
                  object_id: `prio${prio}`,
                  object_type: 'users'
                }
              ]
            }
          });
        };

        const syncCompleted = vi.fn();
        powersync.waitForFirstSync().then(syncCompleted);

        // Emit partial sync complete for each priority but the last.
        for (var prio = 0; prio < 3; prio++) {
          const partialSyncCompleted = vi.fn();
          powersync.waitForFirstSync({ priority: prio }).then(partialSyncCompleted);
          expect(powersync.currentStatus.statusForPriority(prio).hasSynced).toBe(false);
          expect(partialSyncCompleted).not.toHaveBeenCalled();
          expect(syncCompleted).not.toHaveBeenCalled();

          addRow(prio);
          remote.enqueueLine({
            partial_checkpoint_complete: {
              last_op_id: operationId.toString(),
              priority: prio
            }
          });

          await powersync.syncStreamImplementation!.waitUntilStatusMatches((status) => {
            return status.statusForPriority(prio).hasSynced === true;
          });
          await new Promise((r) => setTimeout(r));
          expect(partialSyncCompleted).toHaveBeenCalledOnce();

          expect(await powersync.getAll('select * from users')).toHaveLength(prio + 1);
        }

        // Then, complete the sync.
        addRow(3);
        remote.enqueueLine({ checkpoint_complete: { last_op_id: operationId.toString() } });
        await vi.waitFor(() => expect(syncCompleted).toHaveBeenCalledOnce(), 500);
        expect(await powersync.getAll('select * from users')).toHaveLength(4);
      });

      itWithGenerators('Should remember sync state', async (createConnectedDatabase) => {
        const { powersync, remote, openAnother } = await createConnectedDatabase();
        expect(powersync.currentStatus.dataFlowStatus.downloading).toBe(false);

        const buckets: BucketChecksum[] = [];
        for (let prio = 0; prio <= 3; prio++) {
          buckets.push({ bucket: `prio${prio}`, priority: prio, checksum: 0 });
        }
        remote.enqueueLine({
          checkpoint: {
            last_op_id: '0',
            buckets
          }
        });
        remote.enqueueLine({
          partial_checkpoint_complete: {
            last_op_id: '0',
            priority: 0
          }
        });

        await powersync.waitForFirstSync({ priority: 0 });

        // Open another database instance.
        const another = openAnother();
        onTestFinished(async () => {
          await another.close();
        });
        await another.init();

        expect(another.currentStatus.priorityStatuses).toHaveLength(1);
        expect(another.currentStatus.statusForPriority(0).hasSynced).toBeTruthy();
        await another.waitForFirstSync({ priority: 0 });
      });
    });
  }
);
