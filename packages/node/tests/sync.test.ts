import { describe, vi, expect, beforeEach } from 'vitest';

import { MockSyncService, mockSyncServiceTest, TestConnector, waitForSyncStatus } from './utils';
import {
  AbstractPowerSyncDatabase,
  BucketChecksum,
  OplogEntryJSON,
  ProgressWithOperations,
  SyncStreamConnectionMethod
} from '@powersync/common';
import Logger from 'js-logger';

Logger.useDefaults({ defaultLevel: Logger.WARN });

describe('Sync', () => {
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
      database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
      await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(1));

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
      database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
      await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(1));

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
      await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(0));

      // And open a new one
      database = await syncService.createDatabase();
      database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
      await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(1));

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
      database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
      await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(1));

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
      await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(0));
      database = await syncService.createDatabase();
      database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
      await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(1));

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
        database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
        await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(1));
  
        syncService.pushLine({
          checkpoint: {
            last_op_id: '10',
            buckets: [
                bucket('a', 5, {priority: 0}),
                bucket('b', 5, {priority: 2}),
            ]
          }
        });

        // Should be at 0/10 for total progress (which is the same as the progress for prio 2), and a 0/5 towards prio 0.
        await waitForProgress(database, [0, 10], [[0, [0, 5]], [2, [0, 10]]]);

        pushDataLine(syncService, 'a', 5);
        await waitForProgress(database, [5, 10], [[0, [5, 5]], [2, [5, 10]]]);

        pushCheckpointComplete(syncService, 0);
        await waitForProgress(database, [5, 10], [[0, [5, 5]], [2, [5, 10]]]);

        pushDataLine(syncService, 'b', 2);
        await waitForProgress(database, [7, 10], [[0, [5, 5]], [2, [7, 10]]]);

        // Before syncing b fully, send a new checkpoint
        syncService.pushLine({
            checkpoint: {
              last_op_id: '14',
              buckets: [
                  bucket('a', 8, {priority: 0}),
                  bucket('b', 6, {priority: 2}),
              ]
            }
        });
        await waitForProgress(database, [7, 14], [[0, [5, 8]], [2, [7, 14]]]);

        pushDataLine(syncService, 'a', 3);
        await waitForProgress(database, [10, 14], [[0, [8, 8]], [2, [10, 14]]]);

        pushCheckpointComplete(syncService, 0);
        await waitForProgress(database, [10, 14], [[0, [8, 8]], [2, [10, 14]]]);

        pushDataLine(syncService, 'b', 4);
        await waitForProgress(database, [14, 14], [[0, [8, 8]], [2, [14, 14]]]);

        pushCheckpointComplete(syncService);
        await waitForSyncStatus(database, (s) => s.downloadProgress == null);
    });
  });
});

function bucket(name: string, count: number, options: {priority: number} = {priority: 3}): BucketChecksum {
  return {
    bucket: name,
    count,
    checksum: 0,
    priority: options.priority,
  };
}

async function waitForProgress(
  database: AbstractPowerSyncDatabase,
  total: [number, number],
  forPriorities: [number, [number, number]][] = []
) {
  await waitForSyncStatus(database, (status) => {
    const progress = status.downloadProgress;
    if (!progress) {
      return false;
    }

    //console.log('checking', progress);

    const check = (expected: [number, number], actual: ProgressWithOperations): boolean => {
      return actual.completed == expected[0] && actual.total == expected[1];
    };

    if (!check(total, progress.untilCompletion)) {
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
