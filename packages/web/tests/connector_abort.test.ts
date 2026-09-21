import { describe, expect, vi } from 'vitest';
import { sharedMockSyncServiceTest } from './utils/mockSyncServiceTest.js';

describe('Disconnect with an unresponsive connector', () => {
  sharedMockSyncServiceTest(
    'completes while a checkpoint request is pending in the shared worker',
    { timeout: 10_000 },
    async ({ context: { database, connector, connect, defaultSyncOptions } }) => {
      defaultSyncOptions.checkpointMode = 'requests';
      defaultSyncOptions.crudUploadThrottleMs = 0;
      const postCheckpointRequest = vi.fn(async (_clientId: string, requestId: string) => requestId);
      await connect({ ...connector, postCheckpointRequest });
      await vi.waitFor(() => expect(postCheckpointRequest).toHaveBeenCalled(), { timeout: 5000 });

      // Let the initial checkpoint seed finish, then leave the checkpoint requested
      // after uploading a local write pending in the tab indefinitely.
      postCheckpointRequest.mockImplementation(() => new Promise<string>(() => {}));
      connector.uploadData.mockImplementation(async (db) => {
        const transaction = await db.getNextCrudTransaction();
        await transaction?.complete();
      });
      postCheckpointRequest.mockClear();
      await database.execute('INSERT INTO lists (id, name) VALUES (?, ?)', ['id', 'local write']);
      await vi.waitFor(() => expect(postCheckpointRequest).toHaveBeenCalled(), { timeout: 5000 });

      await expect(database.disconnect()).resolves.toBeUndefined();
      expect(database.currentStatus.connected).toBe(false);
    }
  );

  sharedMockSyncServiceTest(
    'completes while an upload is pending in the shared worker',
    { timeout: 10_000 },
    async ({ context: { database, connector, connect, defaultSyncOptions } }) => {
      defaultSyncOptions.crudUploadThrottleMs = 0;
      connector.uploadData.mockImplementation(() => new Promise<void>(() => {}));
      await connect();
      await database.execute('INSERT INTO lists (id, name) VALUES (?, ?)', ['id', 'local write']);
      await vi.waitFor(() => expect(connector.uploadData).toHaveBeenCalled(), { timeout: 5000 });

      await expect(database.disconnect()).resolves.toBeUndefined();
      expect(database.currentStatus.connected).toBe(false);
    }
  );
});
