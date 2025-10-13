import {
  BucketChecksum,
  createBaseLogger,
  DataStream,
  PowerSyncConnectionOptions,
  Schema,
  SyncClientImplementation,
  SyncStreamConnectionMethod,
  WASQLiteOpenFactory,
  WASQLiteVFS,
  WebPowerSyncOpenFactoryOptions
} from '@powersync/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { ConnectedDatabaseUtils, generateConnectedDatabase } from './utils/generateConnectedDatabase';
import { v4 } from 'uuid';

const UPLOAD_TIMEOUT_MS = 3000;

const logger = createBaseLogger();
logger.useDefaults();

describe('Streaming', { sequential: true }, () => {
  describe(
    'Streaming - With Web Workers',
    {
      sequential: true
    },
    describeStreamingTests((options) =>
      generateConnectedDatabase({
        powerSyncOptions: {
          logger,
          ...options
        }
      })
    )
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
          },
          logger
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
          }),
          logger
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

  // There are more tests for raw tables in the node package and in the core extension itself. We just want to make
  // sure the schema options are properly forwarded.
  it('raw tables smoke test', async () => {
    const customSchema = new Schema({});
    customSchema.withRawTables({
      lists: {
        put: {
          sql: 'INSERT OR REPLACE INTO lists (id, name) VALUES (?, ?)',
          params: ['Id', { Column: 'name' }]
        },
        delete: {
          sql: 'DELETE FROM lists WHERE id = ?',
          params: ['Id']
        }
      }
    });

    function bucket(name: string, count: number): BucketChecksum {
      return {
        bucket: name,
        count,
        checksum: 0,
        priority: 3
      };
    }

    const { powersync, waitForStream, remote } = await generateConnectedDatabase({
      powerSyncOptions: { schema: customSchema, flags: { enableMultiTabs: true } }
    });
    await powersync.execute('CREATE TABLE lists (id TEXT NOT NULL PRIMARY KEY, name TEXT);');
    onTestFinished(async () => {
      await powersync.execute('DROP TABLE lists');
    });

    const query = powersync.watchWithAsyncGenerator('SELECT * FROM lists')[Symbol.asyncIterator]();
    expect((await query.next()).value.rows._array).toStrictEqual([]);

    powersync.connect(new TestConnector(), {
      connectionMethod: SyncStreamConnectionMethod.HTTP,
      clientImplementation: SyncClientImplementation.RUST
    });
    await waitForStream();

    remote.enqueueLine({
      checkpoint: {
        last_op_id: '1',
        buckets: [bucket('a', 1)]
      }
    });
    remote.enqueueLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '1',
            op: 'PUT',
            object_id: 'my_list',
            object_type: 'lists',
            data: '{"name": "custom list"}'
          }
        ]
      }
    });
    remote.enqueueLine({ checkpoint_complete: { last_op_id: '1' } });
    await powersync.waitForFirstSync();

    console.log('has first sync, should update list');
    expect((await query.next()).value.rows._array).toStrictEqual([{ id: 'my_list', name: 'custom list' }]);

    remote.enqueueLine({
      checkpoint: {
        last_op_id: '2',
        buckets: [bucket('a', 2)]
      }
    });
    await vi.waitFor(() => powersync.currentStatus.dataFlowStatus.downloading == true);
    remote.enqueueLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '2',
            op: 'REMOVE',
            object_id: 'my_list',
            object_type: 'lists'
          }
        ]
      }
    });
    remote.enqueueLine({ checkpoint_complete: { last_op_id: '2' } });
    await vi.waitFor(() => powersync.currentStatus.dataFlowStatus.downloading == false);

    console.log('has second sync, should update list');
    expect((await query.next()).value.rows._array).toStrictEqual([]);
  });
});

function describeStreamingTests(
  createConnectedDatabase: (options?: Partial<WebPowerSyncOpenFactoryOptions>) => Promise<ConnectedDatabaseUtils>
) {
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
      const { powersync, remote } = await createConnectedDatabase();
      const connectionOptions: PowerSyncConnectionOptions = { connectionMethod: SyncStreamConnectionMethod.HTTP };
      expect(powersync.connected).toBe(true);

      const spy = vi.spyOn(powersync as any, 'generateSyncStreamImplementation');

      // Keep track of all connection streams to check if they are correctly closed later
      const generatedStreams: DataStream<any>[] = [];

      // This method is used for all mocked connections
      const basePostStream = remote.postStreamRaw;
      const postSpy = vi.spyOn(remote, 'postStreamRaw').mockImplementation(async (...args) => {
        // Simulate a connection delay
        await new Promise((r) => setTimeout(r, 100));
        const stream = await basePostStream.call(remote, ...args);
        generatedStreams.push(stream);
        return stream;
      });

      // Connect many times. The calls here are not awaited and have no async calls in between.
      const connectionAttempts = 10;
      for (let i = 1; i <= connectionAttempts; i++) {
        powersync.connect(new TestConnector(), { params: { count: i }, ...connectionOptions });
      }

      await vi.waitFor(
        () => {
          const call = spy.mock.lastCall![1] as PowerSyncConnectionOptions;
          expect(call.params!['count']).eq(connectionAttempts);
        },
        { timeout: 2000, interval: 100 }
      );

      // In this case it should most likely be 1 attempt since all the calls
      // are in the same for loop
      expect(spy.mock.calls.length).lessThan(connectionAttempts);

      // Now with random awaited delays between unawaited calls
      for (let i = connectionAttempts; i >= 0; i--) {
        await new Promise((r) => setTimeout(r, Math.random() * 10));
        powersync.connect(new TestConnector(), { params: { count: i }, ...connectionOptions });
      }

      await vi.waitFor(
        () => {
          const call = spy.mock.lastCall![1] as PowerSyncConnectionOptions;
          expect(call.params!['count']).eq(0);
        },
        { timeout: 8000, interval: 100 }
      );

      expect(
        spy.mock.calls.length,
        `Expected generated streams to be less than or equal to ${2 * connectionAttempts}, but got ${spy.mock.calls.length}`
      ).lessThanOrEqual(2 * connectionAttempts);

      // The last request should make a network request with the client params
      await vi.waitFor(
        () => {
          expect(postSpy.mock.lastCall?.[0].data.parameters!['count']).equals(0);
          // The async postStream call's invocation is added to the count of calls
          // before the generated stream is added (there is a delay)
          // expect that the stream has been generated and tracked.
          expect(postSpy.mock.calls.length).equals(generatedStreams.length);
        },
        { timeout: 1000, interval: 100 }
      );

      const lastConnectionStream = generatedStreams.pop();
      expect(lastConnectionStream).toBeDefined();
      expect(lastConnectionStream?.closed).false;

      // All streams except the last one (which has been popped off already) should be closed
      expect(generatedStreams.every((i) => i.closed)).true;
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
  };
}
