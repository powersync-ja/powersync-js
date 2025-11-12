import { describe, expect, it, vi } from 'vitest';
import { MemoryBucketStorageImpl } from '../src/client/storage/MemoryBucketStorageImpl.js';
import { SyncOperation, SyncOperationsHandler } from '../src/client/storage/SyncOperationsHandler.js';
import { Connector, PowerSyncCredentials } from '../src/client/sync/Connector.js';
import { CrudManager } from '../src/client/sync/CrudManager.js';
import { SyncClientImpl } from '../src/client/sync/SyncClientImpl.js';
import { DEFAULT_SYSTEM_DEPENDENCIES } from '../src/client/system/SystemDependencies.js';

class TestConnector extends Connector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const tokenResponse = await fetch(`http://localhost:6060/api/auth/token`, {
      method: `GET`,
      headers: {
        'content-type': `application/json`
      }
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch token: ${tokenResponse.statusText} ${await tokenResponse.text()}`);
    }

    const tokenBody = await tokenResponse.json();
    return {
      endpoint: `http://localhost:8080`,
      token: tokenBody.token
    };
  }
}

describe(`PowerSync Lite`, { timeout: Infinity }, () => {
  describe(`Connection`, () => {
    // This is just for local testing of the sync client
    it.skip(`should connect to a PowerSync server`, async () => {
      const syncOperationsHandler: SyncOperationsHandler = {
        handleCheckpoint: async (event) => {
          // Funnel these operations to external storage
          console.log(`Processing ${event.pendingOperations.length} operations`);
          console.log(event.checkpoint, event.pendingOperations);
        }
      };

      const systemDependencies = DEFAULT_SYSTEM_DEPENDENCIES();
      const syncClient = new SyncClientImpl({
        connectionRetryDelayMs: 1000,
        debugMode: true,
        uploadThrottleMs: 1000,
        storage: new MemoryBucketStorageImpl({
          operationsHandlers: [syncOperationsHandler],
          systemDependencies: systemDependencies
        }),
        systemDependencies
      });

      await syncClient.connect(new TestConnector());

      await new Promise((resolve) => setTimeout(resolve, 1000000));

      // Long running test for demonstrating the sync client
    });

    it.skip(`should handle uploads`, async () => {
      let lastPut: SyncOperation | null = null;

      const syncOperationsHandler: SyncOperationsHandler = {
        handleCheckpoint: async (event) => {
          // Funnel these operations to external storage
          console.log(`Processing ${event.pendingOperations.length} operations`);
          lastPut = [...event.pendingOperations].reverse().find((op) => op.op === 'PUT') ?? null;
        }
      };

      const checkpointSpy = vi.spyOn(syncOperationsHandler, 'handleCheckpoint');

      const crudManager = {
        // We start by reporting there are no CRUD items
        hasCrud: vi.fn(async () => false),
        performUpload: vi.fn(async () => {
          // Perform some upload
          if (!lastPut) {
            console.log('no last put');
            return;
          }

          const credentials = await new TestConnector().fetchCredentials();
          if (!credentials) {
            console.log('no credentials');
            return;
          }

          const payload = {
            batch: [
              {
                id: lastPut.id,
                table: lastPut.type,
                op: 'PUT',
                data: {
                  // FIXME double parse
                  ...JSON.parse(JSON.parse(lastPut.data!)),
                  name: 'updated'
                }
              }
            ]
          };

          const response = await fetch(`http://localhost:6060/api/data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`Received ${response.status} from /api/data: ${await response.text()}`);
          }

          // hack
          crudManager.hasCrud.mockImplementation(async () => false);

          // FIXME circular dependency here
          // Wait for the last upload to create a write checkpoint and for it
          // to have been processed.
          // If there is still pending crud, this will not create a new checkpoint.
          const createCheckpointResponse = await syncClient.checkpoint();
          await createCheckpointResponse.waitForValidation();
          console.log('checkpoint validated', createCheckpointResponse.targetCheckpoint);
        })
      } satisfies CrudManager;

      const systemDependencies = DEFAULT_SYSTEM_DEPENDENCIES();
      const syncClient = new SyncClientImpl({
        connectionRetryDelayMs: 1000,
        crudManager,
        debugMode: true,
        uploadThrottleMs: 0,
        storage: new MemoryBucketStorageImpl({
          operationsHandlers: [syncOperationsHandler],
          systemDependencies: systemDependencies
        }),
        systemDependencies
      });

      await syncClient.connect(new TestConnector());

      // Wait for the checkpoint to be processed
      await vi.waitFor(() => expect(checkpointSpy.mock.calls.length).toBeGreaterThan(0));

      // Mark that we have crud now
      crudManager.hasCrud.mockImplementation(async () => true);

      // Trigger a CRUD upload
      syncClient.triggerCrudUpload();

      // Wait for the CRUD upload to be processed
      await vi.waitFor(() => expect(crudManager.performUpload.mock.calls.length).toBeGreaterThan(0));

      console.log('processed');

      await new Promise((resolve) => setTimeout(resolve, 1000000));
    });
  });
});
