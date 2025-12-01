/**
 * Example test demonstrating how to use the mock sync service for shared worker environments.
 *
 * This example shows how to:
 * 1. Use the sharedMockSyncServiceTest utility to set up the test environment
 * 2. Use the mock service to get pending requests and create responses
 * 3. Send data via sync stream and query it in the database
 *
 * Note: This is an example file - rename to .test.ts to use it in actual tests.
 */

import { StreamingSyncCheckpoint } from '@powersync/common';
import { describe, expect, vi } from 'vitest';
import { sharedMockSyncServiceTest } from './utils/mockSyncServiceTest';

describe('Mock Sync Service Example', { timeout: 100000 }, () => {
  sharedMockSyncServiceTest(
    'should allow mocking sync responses in shared worker',
    { timeout: 100000 },
    async ({ context: { database, connect, mockService } }) => {
      // Call connect to start the sync worker and get the sync service
      const { syncRequestId } = await connect();

      // Push a checkpoint with buckets (following node test pattern)
      const checkpoint: StreamingSyncCheckpoint = {
        checkpoint: {
          last_op_id: '1',
          buckets: [
            {
              bucket: 'a',
              count: 1,
              checksum: 0,
              priority: 3
            }
          ],
          write_checkpoint: undefined
        }
      };

      await mockService.pushBodyLine(syncRequestId, checkpoint);

      // The connect call should resolve by now
      await mockService.pushBodyLine(syncRequestId, {
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

      // Push checkpoint_complete to finish the sync
      await mockService.pushBodyLine(syncRequestId, {
        checkpoint_complete: {
          last_op_id: '1'
        }
      });

      // Complete the response
      await mockService.completeResponse(syncRequestId);

      // Wait for sync to complete and verify the data was saved
      await vi.waitFor(async () => {
        const rows = await database.getAll('SELECT * FROM lists WHERE id = ?', ['1']);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          id: '1',
          name: 'from server'
        });
      });

      // Verify the data by querying the database
      const allRows = await database.getAll('SELECT * FROM lists');
      expect(allRows).toHaveLength(1);
      expect(allRows[0]).toMatchObject({
        id: '1',
        name: 'from server'
      });
    }
  );
});
