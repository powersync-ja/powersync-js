import { describe, it } from 'vitest';
import { BucketStorageImpl } from '../src/client/BucketStorageImpl.js';
import { SyncClientImpl, type Connector } from '../src/client/SyncClient.js';
import { DEFAULT_SYSTEM_DEPENDENCIES } from '../src/client/SystemDependencies.js';

describe(`PowerSync Lite`, () => {
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

      const syncClient = new SyncClientImpl({
        connectionRetryDelayMs: 1000,
        uploadRetryDelayMs: 1000,
        storage: new BucketStorageImpl(),
        systemDependencies: DEFAULT_SYSTEM_DEPENDENCIES()
      });

      await syncClient.connect(connector);

      await new Promise((resolve) => setTimeout(resolve, 10000));
    });
  });
});
