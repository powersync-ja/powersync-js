import { SyncStreamConnectionMethod } from '@powersync/common';
import { describe, expect } from 'vitest';
import { sharedMockSyncServiceTest } from './utils/mockSyncServiceTest.js';

/**
 * Test to verify that Error instances are properly serialized when passed through MessagePorts.
 * When errors occur in the shared worker and are reported via statusChanged, they should
 * be properly serialized and deserialized to appear in the sync status.
 */
describe('Error Serialization through MessagePorts', { sequential: true }, () => {
  sharedMockSyncServiceTest(
    'should serialize and deserialize Error in sync status when connection fails',
    { timeout: 10_000 },
    async ({ context: { database, mockService } }) => {
      await mockService.setAutomaticResponse({
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        bodyLines: ['Unauthorized']
      });

      // Start connection attempt
      await database.connect(
        {
          fetchCredentials: async () => {
            return {
              endpoint: 'http://localhost:3000',
              token: 'test-token'
            };
          },
          uploadData: async () => {}
        },
        {
          connectionMethod: SyncStreamConnectionMethod.HTTP
        }
      );

      expect(database.currentStatus.dataFlowStatus?.downloadError).toBeDefined();
      expect(database.currentStatus.dataFlowStatus?.downloadError?.name).toBe('Error');
      expect(database.currentStatus.dataFlowStatus?.downloadError?.message).toBe('HTTP : "Unauthorized"\n');
      expect(database.currentStatus.dataFlowStatus?.downloadError?.stack).toBeDefined();
    }
  );
});
