import { describe, it } from 'vitest';
import { MemoryBucketStorageImpl } from '../src/client/storage/MemoryBucketStorageImpl.js';
import { SyncOperationsHandler } from '../src/client/storage/SyncOperationsHandler.js';
import { Connector, PowerSyncCredentials } from '../src/client/sync/Connector.js';
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
    it(`should connect to a PowerSync server`, async () => {
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
        debugMode: false,
        uploadThrottleMs: 1000,
        storage: new MemoryBucketStorageImpl({
          operationsHandlers: [syncOperationsHandler],
          systemDependencies: systemDependencies
        }),
        systemDependencies
      });

      await syncClient.connect(new TestConnector());

      // Long running test for demonstrating the sync client
    });
  });
});
