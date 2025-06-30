import { describe, vi, expect, beforeEach } from 'vitest';

import { MockSyncService, mockSyncServiceTest, TestConnector, waitForSyncStatus } from './utils';
import {
  AbstractPowerSyncDatabase,
  BucketChecksum,
  OplogEntryJSON,
  PowerSyncConnectionOptions,
  ProgressWithOperations,
  SyncClientImplementation,
  SyncStreamConnectionMethod
} from '@powersync/common';
import Logger from 'js-logger';

Logger.useDefaults({ defaultLevel: Logger.WARN });

describe('Sync', () => {
  describe('js client', () => {
    defineSyncTests(SyncClientImplementation.JAVASCRIPT);
  });

  describe('rust client', () => {
    defineSyncTests(SyncClientImplementation.RUST);
  });

  mockSyncServiceTest('can migrate between sync implementations', async ({ syncService }) => {
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

    let database = await syncService.createDatabase();
    database.connect(new TestConnector(), {
      clientImplementation: SyncClientImplementation.JAVASCRIPT,
      connectionMethod: SyncStreamConnectionMethod.HTTP
    });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    syncService.pushLine(checkpoint);
    addData('1');

    await vi.waitFor(async () => {
      expect(await database.getAll('SELECT * FROM ps_oplog')).toHaveLength(1);
    });
    await database.disconnect();
    // The JavaScript client encodes subkeys to JSON when it shouldn't...
    expect(await database.getAll('SELECT * FROM ps_oplog')).toEqual([
      expect.objectContaining({ key: 'lists/1/"subkey_1"' })
    ]);

    // Connecting again with the new client should fix the format
    database.connect(new TestConnector(), {
      clientImplementation: SyncClientImplementation.RUST,
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

    // Finally, connecting with JS again should keep the fixed subkey format.
    database.connect(new TestConnector(), {
      clientImplementation: SyncClientImplementation.RUST,
      connectionMethod: SyncStreamConnectionMethod.HTTP
    });
    await vi.waitFor(() => expect(syncService.connectedListeners).toHaveLength(1));
    syncService.pushLine(checkpoint);
    addData('3');
    await vi.waitFor(async () => {
      expect(await database.getAll('SELECT * FROM ps_oplog')).toHaveLength(3);
    });
    await database.disconnect();
    expect(await database.getAll('SELECT * FROM ps_oplog')).toEqual([
      // Existing entry should be fixed too!
      expect.objectContaining({ key: 'lists/1/subkey_1' }),
      expect.objectContaining({ key: 'lists/2/subkey_2' }),
      expect.objectContaining({ key: 'lists/3/subkey_3' })
    ]);
  });
});

function defineSyncTests(impl: SyncClientImplementation) {
  const options: PowerSyncConnectionOptions = {
    clientImplementation: impl,
    connectionMethod: SyncStreamConnectionMethod.HTTP
  };

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
      database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
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
      database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
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
}

function bucket(name: string, count: number, options: { priority: number } = { priority: 3 }): BucketChecksum {
  return {
    bucket: name,
    count,
    checksum: 0,
    priority: options.priority
  };
}

async function waitForProgress(
  database: AbstractPowerSyncDatabase,
  total: [number, number],
  forPriorities: [number, [number, number]][] = []
) {
  await waitForSyncStatus(database, (status) => {
    if (status.dataFlowStatus.downloadError != null) {
      throw `Unexpected sync error: ${status.dataFlowStatus.downloadError}`;
    }

    const progress = status.downloadProgress;
    if (!progress) {
      return false;
    }

    //console.log('checking', progress);

    const check = (expected: [number, number], actual: ProgressWithOperations): boolean => {
      return actual.downloadedOperations == expected[0] && actual.totalOperations == expected[1];
    };

    if (!check(total, progress)) {
      return false;
    }

    for (const [priority, expected] of forPriorities) {
      if (!check(expected, progress.untilPriority(priority))) {
        //console.log('failed for', priority, expected, progress);
        return false;
      }
    }

    return true;
  });
}
