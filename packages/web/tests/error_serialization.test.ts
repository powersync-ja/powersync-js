import { LogRecord, SyncStreamConnectionMethod } from '@powersync/common';
import { describe, expect, vi } from 'vitest';
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

      expect(database.currentStatus?.downloadError).toBeDefined();
      expect(database.currentStatus?.downloadError?.name).toBe('Error');
      expect(database.currentStatus?.downloadError?.message).toBe('HTTP : "Unauthorized"\n');
      expect(database.currentStatus?.downloadError?.stack).toBeDefined();
    }
  );

  sharedMockSyncServiceTest(
    'should preserve a connector error code across the shared worker relay',
    { timeout: 10_000 },
    async ({ context: { openDatabase } }) => {
      const records: LogRecord[] = [];
      const database = openDatabase({ logger: { log: (record: LogRecord) => records.push(record) } });

      const connectorError = Object.assign(new Error('powersync_control: internal SQLite call returned CORRUPT'), {
        code: 'SQLITE_CORRUPT',
        cause: new Error('disk I/O error')
      });

      await database
        .connect(
          {
            fetchCredentials: async () => {
              throw connectorError;
            },
            uploadData: async () => {}
          },
          { connectionMethod: SyncStreamConnectionMethod.HTTP, retryDelayMs: 60_000 }
        )
        .catch(() => undefined);

      await vi.waitFor(() => {
        expect(database.currentStatus?.downloadError).toBeDefined();
      });

      const downloadError = database.currentStatus!.downloadError as Error & { code?: string | number; cause?: unknown };
      expect(downloadError.code).toBe('SQLITE_CORRUPT');
      expect(String((downloadError.cause as Error)?.message ?? downloadError.cause)).toContain('disk I/O error');

      await vi.waitFor(() => {
        expect(
          records.some(
            (record) => record.message === 'Sync error' && (record.error as { code?: string })?.code === 'SQLITE_CORRUPT'
          )
        ).toBe(true);
      });
    }
  );

  sharedMockSyncServiceTest(
    'should mark a connector rejection without a reason as missing across the worker relay',
    { timeout: 10_000 },
    async ({ context: { openDatabase } }) => {
      const records: LogRecord[] = [];
      const database = openDatabase({ logger: { log: (record: LogRecord) => records.push(record) } });

      await database
        .connect(
          {
            fetchCredentials: async () => {
              throw undefined;
            },
            uploadData: async () => {}
          },
          { connectionMethod: SyncStreamConnectionMethod.HTTP, retryDelayMs: 60_000 }
        )
        .catch(() => undefined);

      await vi.waitFor(() => {
        expect(database.currentStatus?.downloadError?.name).toBe('PowerSyncMissingRejectionReason');
      });

      await vi.waitFor(() => {
        expect(
          records.some((record) => record.message === 'Sync error' && (record.error as { state?: string })?.state === 'missing')
        ).toBe(true);
      });
    }
  );
});
