import { beforeEach, describe, expect, vi } from 'vitest';

import {
  CommonPowerSyncDatabase,
  LogRecord,
  PowerSyncLogger,
  ProgressWithOperations,
  Schema,
  SyncOptions,
  SyncStatus,
  SyncStreamConnectionMethod
} from '@powersync/common';
import {
  bucket,
  checkpoint,
  MockSyncService,
  createMockSyncServiceTest,
  mockSyncServiceTest,
  stream,
  TestConnector,
  waitForSyncStatus
} from './utils.js';
import { BucketChecksum, OplogEntryJSON } from '@powersync/shared-internals/internal/sync_protocol';
import { BasePowerSyncDatabase, BucketStorageAdapter } from '@powersync/shared-internals';
import { asyncNotifier } from '../../shared-internals/src/utils/async.js';

const defaultConnectOptions: SyncOptions = {
  // This might help with test stability/timeouts if a retry is needed.
  retryDelayMs: 100
};

describe('Sync', () => {
  describe('json', () => defineSyncTests(false));
  describe('bson', () => defineSyncTests(true));

  describe('checkpoint requests', () => {
    mockSyncServiceTest('warns for custom connectors without requests being enabled', async ({ syncService }) => {
      const records: LogRecord[] = [];

      const database = await syncService.createDatabase({ logger: { log: records.push.bind(records) } });
      const connector = new (class extends TestConnector {
        async postCheckpointRequest(_clientId: string, requestId: string) {
          return requestId;
        }
      })();

      await database.connect(connector);
      expect(records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining(
              'implements postCheckpointRequest, but connect() was called without checkpoint requests'
            )
          })
        ])
      );
    });

    mockSyncServiceTest('requests checkpoints for updates', async ({ syncService }) => {
      const database = await syncService.createDatabase();
      await database.connect(new TestConnector(), { checkpointMode: 'requests' });

      await vi.waitFor(() => expect(syncService.checkpointRequests).toHaveLength(1));

      await database.execute('INSERT INTO lists (id, name) VALUES (?, ?)', ['id', 'local write']);
      const watched = database.watch('SELECT name FROM lists')[Symbol.asyncIterator]();
      expect((await watched.next()).value.array).toStrictEqual([{ name: 'local write' }]);

      // The local write should eventually be uploaded.
      await vi.waitFor(() => expect(syncService.checkpointRequests).toHaveLength(2), { timeout: 2000 });

      syncService.pushLine({
        checkpoint: {
          last_op_id: '1',
          buckets: [bucket('a', 1)],
          write_checkpoint: String(syncService.lastWriteCheckpoint)
        }
      });
      syncService.pushLine({
        data: {
          bucket: 'a',
          data: [
            {
              checksum: 0,
              op_id: '1',
              object_id: 'id',
              object_type: 'lists',
              op: 'REMOVE'
            }
          ]
        }
      });
      syncService.pushLine({ checkpoint_complete: { last_op_id: '1' } });
      expect((await watched.next()).value.array).toStrictEqual([]);
    });

    mockSyncServiceTest('reports download error when requesting checkpoints fails', async ({ syncService }) => {
      const database = await syncService.createDatabase();
      syncService.installRequestInterceptor(async (request) => {
        if (request.url.includes('/sync/checkpoint-request')) {
          return new Response('not found', { status: 404 });
        }
        return undefined;
      });

      database.connect(new TestConnector(), { checkpointMode: 'requests' });
      await database.waitForStatus((s) => s.downloadError != null);
      expect(database.currentStatus.connected).toBeFalsy();
    });

    mockSyncServiceTest('reposts current checkpoint until applied', async ({ syncService }) => {
      const checkpointRequests = asyncNotifier();
      const neverAbort = new AbortController().signal;
      syncService.installRequestInterceptor(async (request) => {
        if (request.url.includes('/sync/checkpoint-request')) {
          checkpointRequests.notify();
        }
      });
      const database = await syncService.createDatabase();

      vi.useFakeTimers();
      await database.connect(new TestConnector(), { checkpointMode: 'requests' });
      // Wait for the initial post (seed)
      await checkpointRequests.waitForNotification(neverAbort);

      for (let i = 0; i < 10; i++) {
        let didPostCheckpointRequestAgain = false;
        checkpointRequests.waitForNotification(neverAbort).finally(() => (didPostCheckpointRequestAgain = true));

        while (!didPostCheckpointRequestAgain) {
          await vi.advanceTimersToNextTimerAsync();
        }
      }

      // Finally, include the checkpoint.
      syncService.pushLine({ checkpoint: { last_op_id: '0', buckets: [], write_checkpoint: '1' } });
      syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });
      await database.waitForFirstSync();

      const totalRequests = syncService.checkpointRequests.length;
      // Which means we shouldn't keep requesting it.
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(syncService.checkpointRequests.length).toStrictEqual(totalRequests);

      vi.useRealTimers();
    });

    mockSyncServiceTest('download is retried on checkpoint request', async ({ syncService }) => {
      const db = await syncService.createDatabase();

      await db.connect(new TestConnector(), { checkpointMode: 'requests', retryDelayMs: 10_000 });

      // Destroy the initial connection by sending a bogus line
      const start = performance.now();
      syncService.pushLine({ checkpoint: { buckets: [], last_op_id: 'invalid line' } });
      await db.waitForStatus((s) => s.downloadError != null);

      // Trigger an upload here. Because the upload needs a seeded sync iteration, we should reconnect immediately
      // instead of after the configured 10s delay.
      await db.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['restart plz']);

      await db.waitForStatus((s) => s.connected);
      const end = performance.now();
      expect(end - start).toBeLessThan(5_000);
    });

    mockSyncServiceTest('can use checkpoint method from connector', async ({ syncService }) => {
      const didRequestCheckpoint = Promise.withResolvers<void>();
      const connector = new (class extends TestConnector {
        async postCheckpointRequest(_clientId: string, requestId: string) {
          expect(requestId).toStrictEqual('1');
          didRequestCheckpoint.resolve();

          return requestId;
        }
      })();

      const db = await syncService.createDatabase();
      await db.connect(connector, { checkpointMode: 'requests' });
      await didRequestCheckpoint.promise;
    });

    mockSyncServiceTest('reconciles checkpoint state on token expiry', async ({ syncService }) => {
      const db = await syncService.createDatabase();
      syncService.lastWriteCheckpoint = 100;
      await db.connect(new TestConnector(), { checkpointMode: 'requests' });
      await vi.waitFor(() => expect(syncService.checkpointRequests).toHaveLength(1));

      // Simulate what would happen if we suddenly switched users after the old token expired. The client expects a
      // checkpoint of 100, for another user the service wouldn't have that counter yet. The client must request a
      // checkpoint with the existing id, allowing the service to recognize that this device + user combo needs higher
      // checkpoint ids.
      syncService.lastWriteCheckpoint = 0;
      syncService.pushLine({ token_expires_in: 5 });
      await vi.waitFor(() => expect(syncService.checkpointRequests).toHaveLength(2));
      expect(syncService.lastWriteCheckpoint).toStrictEqual(100);
    });

    mockSyncServiceTest('reads sync lines before checkpoint requests are ready', async ({ syncService }) => {
      const hasInitialRequest = Promise.withResolvers<void>();
      const completeInitialRequest = Promise.withResolvers<void>();
      syncService.installRequestInterceptor(async (request) => {
        if (request.url.includes('/sync/checkpoint-request')) {
          hasInitialRequest.resolve();
          await completeInitialRequest.promise;
        }
      });

      const db = await syncService.createDatabase();
      await db.connect(new TestConnector(), { checkpointMode: 'requests' });
      await hasInitialRequest.promise;

      syncService.pushLine({ checkpoint: { last_op_id: '0', buckets: [], write_checkpoint: '1' } });
      await db.waitForStatus((s) => s.downloading);
      completeInitialRequest.resolve();
    });

    describe('requestCheckpoint', () => {
      mockSyncServiceTest('fails when disconnected', async ({ syncService }) => {
        const db = await syncService.createDatabase();
        expect(db.requestCheckpoint()).rejects.toThrow(/sync client is disconnected/);
      });

      mockSyncServiceTest('fails when connected with legacy mode', async ({ syncService }) => {
        const db = await syncService.createDatabase();
        await db.connect(new TestConnector());
        expect(db.requestCheckpoint()).rejects.toThrow(/with legacy checkpoint mode, cannot request/);
      });

      mockSyncServiceTest('waits until data is applied', async ({ syncService }) => {
        const db = await syncService.createDatabase();
        await db.connect(new TestConnector(), { checkpointMode: 'requests' });

        const checkpoint = await db.requestCheckpoint();
        syncService.pushLine({ checkpoint: { last_op_id: '0', buckets: [], write_checkpoint: '2' } });
        expect(checkpoint.hasSynced).toBeFalsy();
        syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });

        await checkpoint.waitForSync();
        expect(checkpoint.hasSynced).toBeTruthy();
      });

      mockSyncServiceTest('throws on disconnect but can request again', async ({ syncService }) => {
        const db = await syncService.createDatabase();
        await db.connect(new TestConnector(), { checkpointMode: 'requests' });
        const checkpoint = await db.requestCheckpoint();

        const failureExpectation = expect(checkpoint.waitForSync()).rejects.toThrow(/sync client is disconnected/);
        await db.disconnect();
        await failureExpectation;

        await db.connect(new TestConnector(), { checkpointMode: 'requests' });
        syncService.pushLine({ checkpoint: { last_op_id: '0', buckets: [], write_checkpoint: '2' } });
        syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });
        await checkpoint.waitForSync();
      });

      mockSyncServiceTest('fails when reconnecting with legacy mode', async ({ syncService }) => {
        const db = await syncService.createDatabase();
        await db.connect(new TestConnector(), { checkpointMode: 'requests' });
        const checkpoint = await db.requestCheckpoint();

        await db.disconnect();
        await db.connect(new TestConnector(), { checkpointMode: 'legacy' });
        expect(checkpoint.waitForSync()).rejects.toThrow(/Connected with legacy checkpoint mode/);
      });

      mockSyncServiceTest('fails on sync errors', async ({ syncService }) => {
        const db = await syncService.createDatabase();
        await db.connect(new TestConnector(), { checkpointMode: 'requests' });
        const checkpoint = await db.requestCheckpoint();

        const failureExpectation = expect(checkpoint.waitForSync()).rejects.toThrow(
          /Sync error while waiting for checkpoint request/
        );
        syncService.pushLine({ checkpoint: { buckets: [], last_op_id: 'invalid line' } });
        await failureExpectation;
      });

      mockSyncServiceTest('can abort waiting for requests', async ({ syncService }) => {
        const db = await syncService.createDatabase();
        await db.connect(new TestConnector(), { checkpointMode: 'requests' });
        const checkpoint = await db.requestCheckpoint();

        const controller = new AbortController();
        const failureExpectation = expect(checkpoint.waitForSync({ signal: controller.signal })).rejects.toThrow(
          /custom abort reason/
        );

        controller.abort('custom abort reason');
        await failureExpectation;
      });
    });
  });

  mockSyncServiceTest('can migrate between sync implementations', async ({ syncService }) => {
    let database = await syncService.createDatabase();
    // Create a bucket with a broken oplog key format.
    const { id: bucketId } = await database.writeLock(async (adapter) => {
      return await adapter.get<{ id: number }>('INSERT INTO ps_buckets(name) VALUES (?) RETURNING id', ['a']);
    });
    await database.execute(
      'INSERT INTO ps_oplog(bucket, op_id, key, row_type, row_id, data, hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        bucketId,
        '1',
        // The JavaScript client used to subkeys to JSON when it shouldn't...
        'lists/1/"subkey_1"',
        'lists',
        '1',
        '{}',
        0
      ]
    );

    function addData(id: string) {
      syncService.pushLine({
        data: {
          bucket: 'a',
          data: [
            {
              checksum: 0,
              op_id: id,
              op: 'PUT',
              object_id: id,
              object_type: 'lists',
              subkey: `subkey_${id}`,
              data: '{}'
            }
          ]
        }
      });
    }
    const checkpoint = {
      checkpoint: {
        last_op_id: '3',
        buckets: [bucket('a', 3)]
      }
    };

    // Connecting with the new client should fix the format.
    database.connect(new TestConnector(), {
      ...defaultConnectOptions,
      connectionMethod: SyncStreamConnectionMethod.HTTP
    });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    syncService.pushLine(checkpoint);
    addData('2');
    await vi.waitFor(async () => {
      expect(await database.getAll('SELECT * FROM ps_oplog')).toHaveLength(2);
    });
    await database.disconnect();
    expect(await database.getAll('SELECT * FROM ps_oplog')).toEqual([
      // Existing entry should be fixed too!
      expect.objectContaining({ key: 'lists/1/subkey_1' }),
      expect.objectContaining({ key: 'lists/2/subkey_2' })
    ]);
  });

  mockSyncServiceTest('refetches credentials when HTTP stream returns 401', async ({ syncService }) => {
    // The /sync/stream 401 should invalidate the cached credentials so the retry fetches a fresh token.
    let fetchCredentialsCount = 0;
    const connector = new TestConnector();
    connector.fetchCredentials = async () => {
      fetchCredentialsCount++;
      return {
        endpoint: 'https://powersync.example.org',
        token: `token-${fetchCredentialsCount}`
      };
    };

    syncService.installRequestInterceptor(async (request) => {
      if (request.url.endsWith('/sync/stream') && request.headers.get('Authorization') === 'Token token-1') {
        return new Response(
          JSON.stringify({ error: { code: 'PSYNC_S2103', description: 'Authentication required' } }),
          {
            status: 401,
            headers: { 'content-type': 'application/json' }
          }
        );
      }
      return undefined;
    });

    const database = await syncService.createDatabase();
    database.connect(connector, {
      connectionMethod: SyncStreamConnectionMethod.HTTP,
      retryDelayMs: 100
    });

    // The first attempt uses token-1 and gets a 401. The SDK must invalidate the cached
    // credentials and retry with a freshly fetched token-2, which connects successfully.
    await vi.waitFor(() => expect(fetchCredentialsCount).toBeGreaterThanOrEqual(2), { timeout: 2000 });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1), { timeout: 2000 });
  });

  mockSyncServiceTest('reconnects immediately after changed connection', async ({ syncService }) => {
    let database = await syncService.createDatabase();
    database.connect(new TestConnector(), {
      ...defaultConnectOptions,
      connectionMethod: SyncStreamConnectionMethod.HTTP,
      // This large retry delay is to provoke test timeouts if the don't immediately reconnect.
      retryDelayMs: 60_000
    });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    // Replicate what we'd see on the web when switching connections in the shared sync worker: The sync client would
    // suddenly see a database without an active sync iteration.
    await database.writeTransaction((tx) => tx.execute('SELECT powersync_control(?, null)', ['stop']));
    (database as BasePowerSyncDatabase).syncStreamImplementation!.markConnectionMayHaveChanged();
    await database.waitForStatus((s) => !s.connected);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
  });

  mockSyncServiceTest('throttles the upload retry when the queue read keeps missing', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    const connector = new TestConnector();

    // The retry exits once `nextCrudItem` observes the row. Keep it missing indefinitely to check that the retry is
    // rate-limited rather than busy-looping on the write checkpoint endpoint.
    const adapter = (database as any).bucketStorageAdapter as BucketStorageAdapter;
    const nextCrudItem = adapter.nextCrudItem.bind(adapter);
    let alwaysMiss = false;
    let missedReads = 0;
    adapter.nextCrudItem = async () => {
      if (alwaysMiss) {
        missedReads++;
        return undefined;
      }
      return nextCrudItem();
    };

    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['completed outside the loop']);
    const transaction = await database.getNextCrudTransaction();
    await transaction!.complete();

    const throttleMs = 100;
    database.connect(connector, {
      ...defaultConnectOptions,
      connectionMethod: SyncStreamConnectionMethod.HTTP,
      crudUploadThrottleMs: throttleMs
    });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    await vi.waitFor(async () =>
      expect((await database.get<{ c: number }>('SELECT count(*) AS c FROM ps_crud')).c).toBe(0)
    );

    const observeMs = 1000;
    alwaysMiss = true;
    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['raced write']);
    await new Promise((resolve) => setTimeout(resolve, observeMs));

    // Without throttling this loops as fast as the event loop allows (thousands of iterations per second).
    expect(missedReads).toBeLessThan((observeMs / throttleMs) * 4);
  });

  mockSyncServiceTest('retries a raced write without waiting for the upload throttle', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    const connector = new TestConnector();
    const pendingCrud = async () => (await database.get<{ c: number }>('SELECT count(*) AS c FROM ps_crud')).c;

    const adapter = (database as any).bucketStorageAdapter as BucketStorageAdapter;
    const nextCrudItem = adapter.nextCrudItem.bind(adapter);
    let missNextRead = false;
    adapter.nextCrudItem = async () => {
      if (missNextRead) {
        missNextRead = false;
        return undefined;
      }
      return nextCrudItem();
    };

    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['completed outside the loop']);
    const transaction = await database.getNextCrudTransaction();
    await transaction!.complete();

    // A throttle much longer than the upload itself, so waiting one interval would show up in the timing below.
    const throttleMs = 1500;
    database.connect(connector, {
      ...defaultConnectOptions,
      connectionMethod: SyncStreamConnectionMethod.HTTP,
      crudUploadThrottleMs: throttleMs
    });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    // Let the first iteration finish its throttle and park, so the measurement below covers only the retry.
    await new Promise((resolve) => setTimeout(resolve, throttleMs + 300));

    missNextRead = true;
    const startedAt = performance.now();
    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['raced write']);
    await vi.waitFor(async () => expect(await pendingCrud()).toBe(0), { timeout: 5000 });

    // The first retry runs immediately, so the queue drains well inside one throttle interval.
    expect(performance.now() - startedAt).toBeLessThan(throttleMs / 2);
  });
});

function defineSyncTests(bson: boolean) {
  const options: SyncOptions = {
    ...defaultConnectOptions,
    connectionMethod: SyncStreamConnectionMethod.HTTP
  };

  const mockSyncServiceTest = createMockSyncServiceTest(bson);

  mockSyncServiceTest('sets last sync time', async ({ syncService }) => {
    const db = await syncService.createDatabase();
    db.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine({
      checkpoint: {
        last_op_id: '0',
        buckets: []
      }
    });
    syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });
    const now = Date.now();

    await db.waitForFirstSync();
    const status = db.currentStatus;
    const lastSyncedAt = status.lastSyncedAt!.getTime();

    // The reported time of the last sync should be close to the current time (5s is very generous already, but we've
    // had an issue where dates weren't parsed correctly and we were off by decades).
    expect(Math.abs(lastSyncedAt - now)).toBeLessThan(5000);
  });

  mockSyncServiceTest('connect() waits for connection', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    let connectCompleted = false;
    database.connect(new TestConnector(), options).then(() => {
      connectCompleted = true;
    });
    expect(connectCompleted).toBeFalsy();

    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    // We want connected: true once we have a connection
    await vi.waitFor(() => connectCompleted);
    expect(database.currentStatus.downloading).toBeFalsy();

    syncService.pushLine({
      checkpoint: {
        last_op_id: '10',
        buckets: [bucket('a', 10)]
      }
    });

    await vi.waitFor(() => expect(database.currentStatus.downloading).toBeTruthy());
  });

  mockSyncServiceTest('does not set uploading status without local writes', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    database.registerListener({
      statusChanged(status) {
        expect(status.uploading).toBeFalsy();
      }
    });

    database.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine({
      checkpoint: {
        last_op_id: '10',
        buckets: [bucket('a', 10)]
      }
    });
    await vi.waitFor(() => expect(database.currentStatus.downloading).toBeTruthy());
  });

  describe('reports progress', () => {
    let lastOpId = 0;

    beforeEach(() => {
      lastOpId = 0;
    });

    function pushDataLine(service: MockSyncService, bucket: string, amount: number) {
      const data: OplogEntryJSON[] = [];
      for (let i = 0; i < amount; i++) {
        data.push({
          op_id: `${++lastOpId}`,
          op: 'PUT',
          object_type: bucket,
          object_id: `${lastOpId}`,
          checksum: 0,
          data: '{}'
        });
      }

      service.pushLine({
        data: {
          bucket,
          data
        }
      });
    }

    function pushCheckpointComplete(service: MockSyncService, priority?: number) {
      if (priority != null) {
        service.pushLine({
          partial_checkpoint_complete: {
            last_op_id: `${lastOpId}`,
            priority
          }
        });
      } else {
        service.pushLine({
          checkpoint_complete: {
            last_op_id: `${lastOpId}`
          }
        });
      }
    }

    mockSyncServiceTest('without priorities', async ({ syncService }) => {
      const database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      syncService.pushLine({
        checkpoint: {
          last_op_id: '10',
          buckets: [bucket('a', 10)]
        }
      });

      await waitForProgress(database, [0, 10]);

      pushDataLine(syncService, 'a', 10);
      await waitForProgress(database, [10, 10]);

      pushCheckpointComplete(syncService);
      await waitForSyncStatus(database, (s) => s.downloadProgress == null);

      // Emit new data, progress should be 0/2 instead of 10/12
      syncService.pushLine({
        checkpoint_diff: {
          last_op_id: '12',
          updated_buckets: [bucket('a', 12)],
          removed_buckets: []
        }
      });
      await waitForProgress(database, [0, 2]);
      pushDataLine(syncService, 'a', 2);
      await waitForProgress(database, [2, 2]);

      pushCheckpointComplete(syncService);
      await waitForSyncStatus(database, (s) => s.downloadProgress == null);
    });

    mockSyncServiceTest('interrupted sync', async ({ syncService }) => {
      let database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      syncService.pushLine({
        checkpoint: {
          last_op_id: '10',
          buckets: [bucket('a', 10)]
        }
      });

      await waitForProgress(database, [0, 10]);
      pushDataLine(syncService, 'a', 5);
      await waitForProgress(database, [5, 10]);

      // Close this database before sending the checkpoint...
      await database.close();
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(0));

      // And open a new one
      database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      // Send same checkpoint again
      syncService.pushLine({
        checkpoint: {
          last_op_id: '10',
          buckets: [bucket('a', 10)]
        }
      });

      // Progress should be restored instead of e.g. saying 0/5 now.
      await waitForProgress(database, [5, 10]);
      pushCheckpointComplete(syncService);
      await waitForSyncStatus(database, (s) => s.downloadProgress == null);
    });

    mockSyncServiceTest('interrupted sync with new checkpoint', async ({ syncService }) => {
      let database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      syncService.pushLine({
        checkpoint: {
          last_op_id: '10',
          buckets: [bucket('a', 10)]
        }
      });

      await waitForProgress(database, [0, 10]);
      pushDataLine(syncService, 'a', 5);
      await waitForProgress(database, [5, 10]);

      // Re-open database
      await database.close();
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(0));
      database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      // Send checkpoint with new data
      syncService.pushLine({
        checkpoint: {
          last_op_id: '12',
          buckets: [bucket('a', 12)]
        }
      });

      await waitForProgress(database, [5, 12]);
      pushCheckpointComplete(syncService);
      await waitForSyncStatus(database, (s) => s.downloadProgress == null);
    });

    mockSyncServiceTest('different priorities', async ({ syncService }) => {
      let database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      syncService.pushLine({
        checkpoint: {
          last_op_id: '10',
          buckets: [bucket('a', 5, { priority: 0 }), bucket('b', 5, { priority: 2 })]
        }
      });

      // Should be at 0/10 for total progress (which is the same as the progress for prio 2), and a 0/5 towards prio 0.
      await waitForProgress(
        database,
        [0, 10],
        [
          [0, [0, 5]],
          [2, [0, 10]]
        ]
      );

      pushDataLine(syncService, 'a', 5);
      await waitForProgress(
        database,
        [5, 10],
        [
          [0, [5, 5]],
          [2, [5, 10]]
        ]
      );

      pushCheckpointComplete(syncService, 0);
      await waitForProgress(
        database,
        [5, 10],
        [
          [0, [5, 5]],
          [2, [5, 10]]
        ]
      );

      pushDataLine(syncService, 'b', 2);
      await waitForProgress(
        database,
        [7, 10],
        [
          [0, [5, 5]],
          [2, [7, 10]]
        ]
      );

      // Before syncing b fully, send a new checkpoint
      syncService.pushLine({
        checkpoint: {
          last_op_id: '14',
          buckets: [bucket('a', 8, { priority: 0 }), bucket('b', 6, { priority: 2 })]
        }
      });
      await waitForProgress(
        database,
        [7, 14],
        [
          [0, [5, 8]],
          [2, [7, 14]]
        ]
      );

      pushDataLine(syncService, 'a', 3);
      await waitForProgress(
        database,
        [10, 14],
        [
          [0, [8, 8]],
          [2, [10, 14]]
        ]
      );

      pushCheckpointComplete(syncService, 0);
      await waitForProgress(
        database,
        [10, 14],
        [
          [0, [8, 8]],
          [2, [10, 14]]
        ]
      );

      pushDataLine(syncService, 'b', 4);
      await waitForProgress(
        database,
        [14, 14],
        [
          [0, [8, 8]],
          [2, [14, 14]]
        ]
      );

      pushCheckpointComplete(syncService);
      await waitForSyncStatus(database, (s) => s.downloadProgress == null);
    });

    mockSyncServiceTest('uses correct state when reconnecting', async ({ syncService }) => {
      let database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      syncService.pushLine({
        checkpoint: {
          last_op_id: '10',
          buckets: [bucket('a', 5, { priority: 0 }), bucket('b', 5, { priority: 3 })]
        }
      });

      // Sync priority 0 completely, start with rest
      pushDataLine(syncService, 'a', 5);
      pushDataLine(syncService, 'b', 1);
      pushCheckpointComplete(syncService, 0);
      await database.waitForFirstSync({ priority: 0 });

      await database.close();
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(0));
      database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      expect(syncService.connectedListeners[0].buckets).toStrictEqual([
        { name: 'a', after: '10' },
        { name: 'b', after: '6' }
      ]);
    });

    mockSyncServiceTest('interrupt and defrag', async ({ syncService }) => {
      let database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      syncService.pushLine({
        checkpoint: {
          last_op_id: '10',
          buckets: [bucket('a', 10)]
        }
      });

      await waitForProgress(database, [0, 10]);
      pushDataLine(syncService, 'a', 5);
      await waitForProgress(database, [5, 10]);

      // Re-open database
      await database.close();

      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(0));
      database = await syncService.createDatabase();
      database.connect(new TestConnector(), options);
      await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

      // A sync rule deploy could reset buckets, making the new bucket smaller than the existing one.
      syncService.pushLine({
        checkpoint: {
          last_op_id: '14',
          buckets: [bucket('a', 4)]
        }
      });

      // In this special case, don't report 5/4 as progress.
      await waitForProgress(database, [0, 4]);
      pushCheckpointComplete(syncService);
      await waitForSyncStatus(database, (s) => s.downloadProgress == null);
    });
  });

  mockSyncServiceTest('should upload after connecting', async ({ syncService }) => {
    let database = await syncService.createDatabase();

    await database.execute('INSERT INTO lists (id, name) values (uuid(), ?)', ['local write']);
    const query = database.watchWithAsyncGenerator('SELECT name FROM lists')[Symbol.asyncIterator]();
    let rows = (await query.next()).value.rows._array;
    expect(rows).toStrictEqual([{ name: 'local write' }]);

    database.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine({ checkpoint: { last_op_id: '1', write_checkpoint: '1', buckets: [bucket('a', 1)] } });
    syncService.pushLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '1',
            op: 'PUT',
            object_id: '1',
            object_type: 'lists',
            data: '{"name": "from server"}'
          }
        ]
      }
    });
    syncService.pushLine({ checkpoint_complete: { last_op_id: '1' } });

    rows = (await query.next()).value.rows._array;
    expect(rows).toStrictEqual([{ name: 'from server' }]);
  });

  mockSyncServiceTest('should upload on start of iteration', async ({ syncService }) => {
    let database = await syncService.createDatabase();
    await database.execute('INSERT INTO lists (id, name) values (uuid(), ?)', ['local write']);

    syncService.installRequestInterceptor(async (request) => {
      if (request.url.includes('/sync/stream')) {
        throw new Error('Pretend that the service is unavailable');
      }
    });

    const connector = new TestConnector();
    database.connect(connector, { ...options, retryDelayMs: 10_000, crudUploadThrottleMs: 100 });
    await database.waitForStatus((s) => s.downloadError != null);

    // We'll never connect due to the error, but we should still try to upload once.
    expect(connector.uploadDataInvocations).toStrictEqual(1);

    // And even though we're still not connected, we should attempt uploads on crud changes.
    await database.execute('INSERT INTO lists (id, name) values (uuid(), ?)', ['second local write']);
    await vi.waitFor(() => expect(connector.uploadDataInvocations).toStrictEqual(2));
  });

  mockSyncServiceTest('should restart uploads on write even if not connected', async ({ syncService }) => {
    let database = await syncService.createDatabase();
    let attemptedUploads = 0;
    await database.execute('INSERT INTO lists (id, name) values (uuid(), ?)', ['local write']);

    syncService.installRequestInterceptor(async (request) => {
      if (request.url.includes('/sync/stream')) {
        throw new Error('Pretend that the service is unavailable');
      }
    });

    database.connect(
      {
        fetchCredentials: async () => {
          return {
            endpoint: 'https://powersync.example.org',
            token: 'test'
          };
        },
        uploadData: async () => {
          attemptedUploads++;
          throw new Error('deliberate failure');
        }
      },
      { ...options, retryDelayMs: 100, crudUploadThrottleMs: 100 }
    );
    await database.waitForStatus((s) => s.downloadError != null);

    // Because we start a crud upload on connect, there should have been a call.
    expect(attemptedUploads).toStrictEqual(1);
    expect(database.currentStatus.uploadError).toMatchObject({ name: 'Error' });

    // Currently, we don't retry crud uploads if we're not connected. We might revisit that in the future, but either
    // way we definitely want to retry if there's a new CRUD entry.
    console.log('second write');
    await database.execute('INSERT INTO lists (id, name) values (uuid(), ?)', ['second local write']);
    await vi.waitFor(() => expect(attemptedUploads).toStrictEqual(2));
  });

  mockSyncServiceTest('handles uploads across checkpoints', async ({ syncService }) => {
    const logMessages: string[] = [];
    const logger: PowerSyncLogger = {
      log({ message }) {
        console.log(message);
        logMessages.push(message);
      }
    };

    // Regression test for https://github.com/powersync-ja/powersync-js/pull/665
    let database = await syncService.createDatabase({ logger });
    const connector = new TestConnector();
    let finishUpload: () => void;
    const finishUploadPromise = new Promise<void>((resolve, reject) => {
      finishUpload = resolve;
    });
    connector.uploadData = async (db) => {
      const batch = await db.getCrudBatch();
      if (batch != null) {
        await finishUploadPromise;
        await batch.complete();
      }
    };

    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?);', ['local']);
    database.connect(connector, options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine({ checkpoint: { last_op_id: '1', write_checkpoint: '1', buckets: [bucket('a', 1)] } });
    syncService.pushLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '1',
            op: 'PUT',
            object_id: '1',
            object_type: 'lists',
            data: '{"name": "s1"}'
          }
        ]
      }
    });
    // 1. Could not apply checkpoint due to local data. We will retry [...] after that upload is completed.
    syncService.pushLine({ checkpoint_complete: { last_op_id: '1' } });
    await vi.waitFor(() => {
      expect(logMessages).toEqual(expect.arrayContaining([expect.stringContaining('due to local data')]));
    });

    // 2. Send additional checkpoint while we're still busy uploading
    syncService.pushLine({ checkpoint: { last_op_id: '2', write_checkpoint: '2', buckets: [bucket('a', 2)] } });
    syncService.pushLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '2',
            op: 'PUT',
            object_id: '2',
            object_type: 'lists',
            data: '{"name": "s2"}'
          }
        ]
      }
    });
    syncService.pushLine({ checkpoint_complete: { last_op_id: '2' } });

    // 3. Crud upload complete
    finishUpload!();

    // 4. Ensure the database is applying the second checkpoint
    await vi.waitFor(async () => {
      const rows = await database.getAll('SELECT * FROM lists WHERE name = ?', ['s2']);
      expect(rows).toHaveLength(1);
    });
  });

  mockSyncServiceTest('retries when the queue read misses a write updateLocalTarget sees', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    const connector = new TestConnector();
    const pendingCrud = async () => (await database.get<{ c: number }>('SELECT count(*) AS c FROM ps_crud')).c;

    // Stubbing `nextCrudItem` puts the upload loop into the state seen in a customer's TRACE logs: an iteration that
    // uploaded nothing, while `updateLocalTarget` reported new CRUD from its own write transaction. Why the two reads
    // disagree in the field is not yet established, so this pins the loop's behaviour in that state rather than
    // demonstrating how the state arises. CRUD notifications are deliberately left working, because the ordinary
    // interleaving (a write landing during the write checkpoint request) is already recovered by the notification.
    const adapter = (database as any).bucketStorageAdapter as BucketStorageAdapter;
    const nextCrudItem = adapter.nextCrudItem.bind(adapter);
    let missNextRead = false;
    adapter.nextCrudItem = async () => {
      if (missNextRead) {
        missNextRead = false;
        return undefined;
      }
      return nextCrudItem();
    };

    // Complete a transaction outside of the upload loop, which leaves the local write target set with an empty queue.
    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['completed outside the loop']);
    const transaction = await database.getNextCrudTransaction();
    await transaction!.complete();

    // Let the initial upload iteration settle, so the loop is parked waiting for a notification.
    database.connect(connector, { ...options, crudUploadThrottleMs: 100 });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    await vi.waitFor(async () => expect(await pendingCrud()).toBe(0));

    missNextRead = true;
    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['raced write']);
    expect(await pendingCrud()).toBe(1);

    await vi.waitFor(async () => expect(await pendingCrud()).toBe(0), { timeout: 5000 });
    expect(connector.uploadDataInvocations).toBeGreaterThanOrEqual(1);
  });

  mockSyncServiceTest('should update sync state incrementally', async ({ syncService }) => {
    const powersync = await syncService.createDatabase();
    powersync.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    const buckets: BucketChecksum[] = [];
    for (let prio = 0; prio <= 3; prio++) {
      buckets.push({ bucket: `prio${prio}`, priority: prio, checksum: 10 + prio });
    }
    syncService.pushLine({
      checkpoint: {
        last_op_id: '4',
        buckets
      }
    });

    let operationId = 1;
    const addRow = (prio: number) => {
      syncService.pushLine({
        data: {
          bucket: `prio${prio}`,
          data: [
            {
              checksum: prio + 10,
              data: JSON.stringify({ name: 'row' }),
              op: 'PUT',
              op_id: (operationId++).toString(),
              object_id: `prio${prio}`,
              object_type: 'lists'
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
      syncService.pushLine({
        partial_checkpoint_complete: {
          last_op_id: operationId.toString(),
          priority: prio
        }
      });

      await powersync.waitForStatus((status) => {
        return status.statusForPriority(prio).hasSynced === true;
      });
      await new Promise((r) => setTimeout(r));
      expect(partialSyncCompleted).toHaveBeenCalledOnce();

      expect(await powersync.getAll('select * from lists')).toHaveLength(prio + 1);
    }

    // Then, complete the sync.
    addRow(3);
    syncService.pushLine({ checkpoint_complete: { last_op_id: operationId.toString() } });
    await vi.waitFor(() => expect(syncCompleted).toHaveBeenCalledOnce(), 500);
    expect(await powersync.getAll('select * from lists')).toHaveLength(4);
  });

  mockSyncServiceTest('Should remember sync state', async ({ syncService }) => {
    const powersync = await syncService.createDatabase();
    powersync.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    const buckets: BucketChecksum[] = [];
    for (let prio = 0; prio <= 3; prio++) {
      buckets.push({ bucket: `prio${prio}`, priority: prio, checksum: 0 });
    }
    syncService.pushLine({
      checkpoint: {
        last_op_id: '0',
        buckets
      }
    });
    syncService.pushLine({
      partial_checkpoint_complete: {
        last_op_id: '0',
        priority: 0
      }
    });

    await powersync.waitForFirstSync({ priority: 0 });

    // Open another database instance.
    const another = await syncService.createDatabase();
    await another.init();

    expect(another.currentStatus.priorityStatusEntries).toHaveLength(1);
    expect(another.currentStatus.statusForPriority(0).hasSynced).toBeTruthy();
    await another.waitForFirstSync({ priority: 0 });
  });

  mockSyncServiceTest('connecting does not clobber offline sync state', async ({ syncService }) => {
    // Complete a full sync including a stream subscription, then close the database.
    let database = await syncService.createDatabase();
    const subscription = await database.syncStream('a').subscribe();
    database.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: [bucket('a', 0, { priority: 3, subscriptions: [{ sub: 0 }] })],
        streams: [stream('a', false)]
      })
    );
    syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });
    await database.waitForFirstSync();
    subscription.unsubscribe();
    await database.close();
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(0));

    // Re-opening the database restores the previous sync state.
    database = await syncService.createDatabase();
    const streamDescription = { name: 'a', parameters: null };
    expect(database.currentStatus.hasSynced).toBe(true);
    expect(database.currentStatus.forStream(streamDescription)?.subscription.hasSynced).toBe(true);

    const statuses: SyncStatus[] = [];
    database.registerListener({
      statusChanged: (status) => statuses.push(status)
    });

    // Connect while holding the write lock: the core extension's first status update (which needs
    // powersync_control on the write connection) is then guaranteed to arrive after the CRUD
    // upload loop's initial read-only pass reports its upload state.
    let releaseWriteLock!: () => void;
    const writeLockHeld = new Promise<void>((lockHeld) => {
      database.writeLock(() => {
        lockHeld();
        return new Promise<void>((release) => (releaseWriteLock = release));
      });
    });
    await writeLockHeld;

    database.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(statuses).not.toHaveLength(0));
    releaseWriteLock();
    await database.waitForStatus((s) => s.connected);

    // The restored state must survive connecting - no emitted status may drop it.
    for (const status of statuses) {
      expect(status.hasSynced).toBe(true);
      expect(status.forStream(streamDescription)?.subscription.hasSynced).toBe(true);
    }
  });

  mockSyncServiceTest('aborted connect does not clobber offline sync state', async ({ syncService }) => {
    // Complete a full sync, then close the database.
    let database = await syncService.createDatabase();
    database.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine(checkpoint({ last_op_id: 0 }));
    syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });
    await database.waitForFirstSync();
    await database.close();
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(0));

    database = await syncService.createDatabase();
    expect(database.currentStatus.hasSynced).toBe(true);

    const statuses: SyncStatus[] = [];
    database.registerListener({
      statusChanged: (status) => statuses.push(status)
    });

    // Hold the write lock so that the connection attempt is aborted before the core extension could
    // report a status for it.
    let releaseWriteLock!: () => void;
    const writeLockHeld = new Promise<void>((lockHeld) => {
      database.writeLock(() => {
        lockHeld();
        return new Promise<void>((release) => (releaseWriteLock = release));
      });
    });
    await writeLockHeld;

    database.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(statuses).not.toHaveLength(0));
    const disconnected = database.disconnect();
    releaseWriteLock();
    await disconnected;

    // Marking the never-connected attempt as disconnected must not drop the restored state.
    for (const status of statuses) {
      expect(status.hasSynced).toBe(true);
    }
    expect(database.currentStatus.hasSynced).toBe(true);
  });

  mockSyncServiceTest('raw tables with inferred statements', async ({ syncService }) => {
    const customSchema = new Schema({});
    customSchema.withRawTables({
      lists: {
        schema: {}
      }
    });

    const powersync = await syncService.createDatabase({ schema: customSchema });
    await powersync.execute('CREATE TABLE lists (id TEXT NOT NULL PRIMARY KEY, name TEXT);');

    const query = powersync.watchWithAsyncGenerator('SELECT * FROM lists')[Symbol.asyncIterator]();
    expect((await query.next()).value.rows._array).toStrictEqual([]);

    powersync.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine({
      checkpoint: {
        last_op_id: '1',
        buckets: [bucket('a', 1)]
      }
    });
    syncService.pushLine({
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
    syncService.pushLine({ checkpoint_complete: { last_op_id: '1' } });
    await powersync.waitForFirstSync();

    expect((await query.next()).value.rows._array).toStrictEqual([{ id: 'my_list', name: 'custom list' }]);

    syncService.pushLine({
      checkpoint: {
        last_op_id: '2',
        buckets: [bucket('a', 2)]
      }
    });
    await vi.waitFor(() => powersync.currentStatus.downloading == true);
    syncService.pushLine({
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
    syncService.pushLine({ checkpoint_complete: { last_op_id: '2' } });
    await vi.waitFor(() => powersync.currentStatus.downloading == false);

    expect((await query.next()).value.rows._array).toStrictEqual([]);
  });

  mockSyncServiceTest('raw tables with explicit statements', async ({ syncService }) => {
    const customSchema = new Schema({});
    customSchema.withRawTables({
      lists: {
        put: {
          sql: 'INSERT OR REPLACE INTO lists (id, name, _rest) VALUES (?, ?, ?)',
          params: ['Id', { Column: 'name' }, 'Rest']
        },
        delete: {
          sql: 'DELETE FROM lists WHERE id = ?',
          params: ['Id']
        }
      }
    });

    const powersync = await syncService.createDatabase({ schema: customSchema });
    await powersync.execute('CREATE TABLE lists (id TEXT NOT NULL PRIMARY KEY, name TEXT, _rest TEXT);');

    const query = powersync.watchWithAsyncGenerator('SELECT * FROM lists')[Symbol.asyncIterator]();
    expect((await query.next()).value.rows._array).toStrictEqual([]);

    powersync.connect(new TestConnector(), options);
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));

    syncService.pushLine({
      checkpoint: {
        last_op_id: '1',
        buckets: [bucket('a', 1)]
      }
    });
    syncService.pushLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '1',
            op: 'PUT',
            object_id: 'my_list',
            object_type: 'lists',
            data: '{"name": "custom list", "additional": "foo"}'
          }
        ]
      }
    });
    syncService.pushLine({ checkpoint_complete: { last_op_id: '1' } });
    await powersync.waitForFirstSync();

    expect((await query.next()).value.rows._array).toStrictEqual([
      { id: 'my_list', name: 'custom list', _rest: '{"additional":"foo"}' }
    ]);

    syncService.pushLine({
      checkpoint: {
        last_op_id: '2',
        buckets: [bucket('a', 2)]
      }
    });
    await vi.waitFor(() => powersync.currentStatus.downloading == true);
    syncService.pushLine({
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
    syncService.pushLine({ checkpoint_complete: { last_op_id: '2' } });
    await vi.waitFor(() => powersync.currentStatus.downloading == false);

    expect((await query.next()).value.rows._array).toStrictEqual([]);
  });

  mockSyncServiceTest('can reconnect based on query changes', async ({ syncService }) => {
    // Test for https://discord.com/channels/1138230179878154300/1399340612435710034/1399340612435710034
    const logMessages: string[] = [];
    const logger: PowerSyncLogger = {
      log({ message }) {
        console.log(message);
        logMessages.push(message);
      }
    };

    const powersync = await syncService.createDatabase({ logger });
    powersync.watchWithCallback('SELECT * FROM lists', [], {
      onResult(results) {
        const param = results.rows?.length ?? 0;

        powersync.connect(new TestConnector(), { ...options, params: { a: param } });
      }
    });

    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    expect(syncService.connectedListeners[0]).toMatchObject({
      parameters: { a: 0 }
    });

    await powersync.execute('insert into lists (id, name) values (?, ?);', ['local_list', 'local']);

    await vi.waitFor(() =>
      expect(syncService.connectedListeners[0]).toMatchObject({
        parameters: { a: 1 }
      })
    );

    syncService.pushLine({
      checkpoint: {
        write_checkpoint: '1',
        last_op_id: '1',
        buckets: [bucket('a', 1)]
      }
    });
    syncService.pushLine({
      data: {
        bucket: 'a',
        data: [
          {
            checksum: 0,
            op_id: '1',
            op: 'PUT',
            object_id: 'local_list',
            object_type: 'lists',
            data: '{"name": "local"}'
          },
          {
            checksum: 0,
            op_id: '2',
            op: 'PUT',
            object_id: 'my_list',
            object_type: 'lists',
            data: '{"name": "r"}'
          }
        ]
      }
    });
    syncService.pushLine({ checkpoint_complete: { last_op_id: '1' } });

    await vi.waitFor(() =>
      expect(syncService.connectedListeners[0]).toMatchObject({
        parameters: { a: 2 }
      })
    );

    expect(logMessages).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Cannot enqueue data into closed stream')])
    );
  });

  mockSyncServiceTest('passes app metadata to the sync service', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    let connectCompleted = false;
    database
      .connect(new TestConnector(), {
        ...options,
        appMetadata: {
          name: 'test'
        }
      })
      .then(() => {
        connectCompleted = true;
      });
    expect(connectCompleted).toBeFalsy();

    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    // We want connected: true once we have a connection

    await vi.waitFor(() => connectCompleted);
    // The request should contain the app metadata
    expect(syncService.connectedListeners[0]).toMatchObject(
      expect.objectContaining({
        app_metadata: {
          name: 'test'
        }
      })
    );
  });
}

async function waitForProgress(
  database: CommonPowerSyncDatabase,
  total: [number, number],
  forPriorities: [number, [number, number]][] = []
) {
  await waitForSyncStatus(database, (status) => {
    if (status.downloadError != null) {
      throw `Unexpected sync error: ${status.downloadError}`;
    }

    const progress = status.downloadProgress;
    if (!progress) {
      return false;
    }

    const check = (expected: [number, number], actual: ProgressWithOperations): boolean => {
      return actual.downloadedOperations == expected[0] && actual.totalOperations == expected[1];
    };

    if (!check(total, progress)) {
      return false;
    }

    for (const [priority, expected] of forPriorities) {
      if (!check(expected, progress.untilPriority(priority))) {
        return false;
      }
    }

    return true;
  });
}
