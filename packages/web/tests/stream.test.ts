import { BucketChecksum, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { ConnectedDatabaseUtils, generateConnectedDatabase } from './utils/generateConnectedDatabase';

const UPLOAD_TIMEOUT_MS = 3000;

describe('Streaming', { sequential: true }, () => {
  describe(
    'Streaming - With Web Workers',
    {
      sequential: true
    },
    describeStreamingTests(() => generateConnectedDatabase())
  );

  describe(
    'Streaming - Without Web Workers',
    {
      sequential: true
    },
    describeStreamingTests(() =>
      generateConnectedDatabase({
        powerSyncOptions: {
          flags: {
            useWebWorker: false
          }
        }
      })
    )
  );

  describe(
    'Streaming - With OPFS',
    {
      sequential: true
    },
    describeStreamingTests(() =>
      generateConnectedDatabase({
        powerSyncOptions: {
          database: new WASQLiteOpenFactory({
            dbFilename: 'streaming-opfs.sqlite',
            vfs: WASQLiteVFS.OPFSCoopSyncVFS
          })
        }
      })
    )
  );

  it('Should handle checkpoints during the upload process', async () => {
    const { powersync, remote, uploadSpy } = await generateConnectedDatabase();
    expect(powersync.connected).toBe(true);

    let resolveUploadPromise: () => void;
    let resolveUploadStartedPromise: () => void;
    const completeUploadPromise = new Promise<void>((resolve) => {
      resolveUploadPromise = resolve;
    });
    const uploadStartedPromise = new Promise<void>((resolve) => {
      resolveUploadStartedPromise = resolve;
    });

    async function expectUserRows(amount: number) {
      const row = await powersync.get<{ r: number }>('SELECT COUNT(*) AS r FROM users');
      expect(row.r).toBe(amount);
    }

    uploadSpy.mockImplementation(async (db) => {
      const batch = await db.getCrudBatch();
      if (!batch) return;

      resolveUploadStartedPromise();
      await completeUploadPromise;
      await batch?.complete();
    });

    // trigger an upload
    await powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['from local']);
    await expectUserRows(1);
    await uploadStartedPromise;

    // A connector could have uploaded data (triggering a checkpoint) before finishing
    remote.enqueueLine({
      checkpoint: {
        write_checkpoint: '1',
        last_op_id: '2',
        buckets: [{ bucket: 'a', priority: 3, checksum: 0 }]
      }
    });
    remote.generateCheckpoint.mockImplementation(() => {
      return {
        data: {
          write_checkpoint: '1'
        }
      };
    });

    remote.enqueueLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '1',
            op: 'PUT',
            object_id: '1',
            object_type: 'users',
            data: '{"id": "test1", "name": "from local"}'
          },
          {
            checksum: 0,
            op_id: '2',
            op: 'PUT',
            object_id: '2',
            object_type: 'users',
            data: '{"id": "test1", "name": "additional entry"}'
          }
        ]
      }
    });
    remote.enqueueLine({
      checkpoint_complete: {
        last_op_id: '2'
      }
    });

    // Give the sync client some time to process these
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    // Despite receiving a valid checkpoint with two rows, it should not be visible because we have local data.
    await expectUserRows(1);

    // Mark the upload as completed. This should trigger a write_checkpoint.json request
    resolveUploadPromise!();
    await vi.waitFor(() => {
      expect(remote.generateCheckpoint.mock.calls.length).equals(1);
    });

    // Completing the upload should also make the checkpoint visible without it being sent again.
    await vi.waitFor(async () => {
      await expectUserRows(2);
    });
  });
});

function describeStreamingTests(createConnectedDatabase: () => Promise<ConnectedDatabaseUtils>) {
  return () => {
    it('PowerSync reconnect on closed stream', async () => {
      const { powersync, waitForStream, remote } = await createConnectedDatabase();

      expect(powersync.connected).toBe(true);

      // Close the stream
      const newStream = waitForStream();
      remote.streamController?.close();

      // A new stream should be requested
      await newStream;
    });

    it('PowerSync reconnect multiple connect calls', async () => {
      // This initially performs a connect call
      const { powersync, waitForStream } = await createConnectedDatabase();
      expect(powersync.connected).toBe(true);

      // Call connect again, a new stream should be requested
      const newStream = waitForStream();
      powersync.connect(new TestConnector());

      // A new stream should be requested
      await newStream;
    });

    it('Should trigger upload connector when connected', async () => {
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

    it('Should retry failed uploads when connected', async () => {
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

    it('Should upload after reconnecting', async () => {
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

    it('Should update sync state incrementally', async () => {
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

    it('Should remember sync state', async () => {
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

      expect(another.currentStatus.priorityStatusEntries).toHaveLength(1);
      expect(another.currentStatus.statusForPriority(0).hasSynced).toBeTruthy();
      await another.waitForFirstSync({ priority: 0 });
    });
  };
}
