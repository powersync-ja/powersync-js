import { describe, vi, expect, beforeEach } from 'vitest';

import { connectedDatabaseTest, MockSyncService, TestConnector, waitForSyncStatus } from "./utils";
import { AbstractPowerSyncDatabase, BucketChecksum, OplogEntryJSON, SyncStreamConnectionMethod } from '@powersync/common';
import Logger from 'js-logger';

Logger.useDefaults();

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
                    data: '{}',
                });
            }
            
            service.pushLine({data: {
                bucket,
                data,
            }});
        }

        function pushCheckpointComplete(service: MockSyncService, priority?: number) {
            if (priority != null) {
                service.pushLine({
                    partial_checkpoint_complete: {
                        last_op_id: `${lastOpId}`,
                        priority,
                    },
                });
            } else {
                service.pushLine({
                    checkpoint_complete: {
                        last_op_id: `${lastOpId}`,
                    },
                });
            }
        }

        connectedDatabaseTest('without priorities', async ({database, syncService}) => {
            database.connect(new TestConnector(), { connectionMethod: SyncStreamConnectionMethod.HTTP });
            await vi.waitFor(() => expect(syncService.connectedListeners).toEqual(1));

            syncService.pushLine({checkpoint: {
                last_op_id: '10',
                buckets: [bucket('a', 10)]
            }});

            await waitForProgress(database, [0, 10]);

            pushDataLine(syncService, 'a', 10);
            await waitForProgress(database, [10, 10]);

            pushCheckpointComplete(syncService);
            await waitForSyncStatus(database, (s) => s.downloadProgress == null);

            // Emit new data, progress should be 0/2 instead of 10/12
            syncService.pushLine({checkpoint_diff: {
                last_op_id: '12',
                updated_buckets: [bucket('a', 12)],
                removed_buckets: [],
                write_checkpoint: '',
            }});
            await waitForProgress(database, [0, 2]);
            pushDataLine(syncService, 'a', 2);
            await waitForProgress(database, [2, 2]);
            pushCheckpointComplete(syncService);
            await waitForSyncStatus(database, (s) => s.downloadProgress == null);
        });
    });
});

function bucket(name: string, count: number, priority: number = 3): BucketChecksum {
  return {
    bucket: name,
    count,
    checksum: 0,
    priority,
  };
}

async function waitForProgress(database: AbstractPowerSyncDatabase, total: [number, number]) {
    await waitForSyncStatus(database, (status) => {
        const progress = status.downloadProgress;
        if (!progress) {
            return false;
        }

        const untilCompletion = progress.untilCompletion;
        return untilCompletion.completed == total[0] && untilCompletion.total == total[1];
    });
}
