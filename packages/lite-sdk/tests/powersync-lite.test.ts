import { describe, it } from 'vitest';
import { MemoryBucketStorageImpl } from '../src/client/storage/MemoryBucketStorageImpl.js';
import { SyncOperationsHandler } from '../src/client/storage/SyncOperationsHandler.js';
import { type Connector } from '../src/client/sync/SyncClient.js';
import { SyncClientImpl } from '../src/client/sync/SyncClientImpl.js';
import { DEFAULT_SYSTEM_DEPENDENCIES } from '../src/client/system/SystemDependencies.js';

describe(`PowerSync Lite`, { timeout: Infinity }, () => {
  describe(`Connection`, () => {
    it(`should connect to a PowerSync server`, async () => {
      const connector = {
        fetchCredentials: async () => {
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
      } satisfies Connector;

      const syncOperationsHandler: SyncOperationsHandler = {
        processOperations: async (operations) => {
          // Funnel these operations to external storage
          console.log(`Processing ${operations.length} operations`);
          console.log(operations);
        }
      };

      const systemDependencies = DEFAULT_SYSTEM_DEPENDENCIES();
      const syncClient = new SyncClientImpl({
        connectionRetryDelayMs: 1000,
        debugMode: false,
        // TODO uploads
        uploadRetryDelayMs: 1000,
        storage: new MemoryBucketStorageImpl({
          operationsHandlers: [syncOperationsHandler],
          systemDependencies: systemDependencies
        }),
        systemDependencies
      });

      await syncClient.connect(connector);

      // Long running test for demonstrating the sync client
    });
  });
});
