import { describe, expect, vi } from 'vitest';
import { PendingRequest } from './utils/MockSyncServiceTypes.js';
import { MockSyncService } from './utils/MockSyncServiceClient.js';
import { sharedMockSyncServiceTest } from './utils/mockSyncServiceTest.js';

/**
 * Waits for the next sync request issued by the shared worker.
 */
async function nextSyncRequest(mockService: MockSyncService): Promise<PendingRequest> {
  let request: PendingRequest;
  await vi.waitFor(
    async () => {
      const requests = await mockService.getPendingRequests();
      expect(requests.length).toBeGreaterThan(0);
      request = requests[0];
    },
    { timeout: 5000 }
  );
  return request!;
}

async function rejectWithUnauthorized(mockService: MockSyncService, request: PendingRequest) {
  await mockService.createResponse(request.id, 401, { 'Content-Type': 'application/json' });
  await mockService.completeResponse(request.id);
}

describe('credentials invalidation in shared worker', { timeout: 30_000 }, () => {
  sharedMockSyncServiceTest(
    'fetches new credentials from backend connector after 401',
    async ({ context: { database, mockService, defaultSyncOptions } }) => {
      let tokenCounter = 0;
      const fetchCredentials = vi.fn(async () => ({
        endpoint: 'http://localhost:3000',
        token: `token-${++tokenCounter}`
      }));

      database.connect({ fetchCredentials, uploadData: async () => {} }, defaultSyncOptions);

      const first = await nextSyncRequest(mockService);
      expect(first.headers['authorization']).toBe('Token token-1');
      await rejectWithUnauthorized(mockService, first);

      const second = await nextSyncRequest(mockService);
      expect(second.headers['authorization']).toBe('Token token-2');
      expect(fetchCredentials).toHaveBeenCalledTimes(2);
    }
  );

  sharedMockSyncServiceTest(
    'invalidates authenticator credentials after 401',
    async ({ context: { database, mockService, defaultSyncOptions } }) => {
      let currentToken = 'token-1';
      const authenticator = {
        resolveCredentials: vi.fn(async () => currentToken),
        invalidateCredentials: vi.fn(() => {
          currentToken = 'token-2';
        })
      };

      database.connect({
        ...defaultSyncOptions,
        powerSyncEndpoint: 'http://localhost:3000',
        authenticator,
        upload: async () => {}
      });

      const first = await nextSyncRequest(mockService);
      expect(first.headers['authorization']).toBe('Token token-1');
      expect(authenticator.invalidateCredentials).not.toHaveBeenCalled();
      await rejectWithUnauthorized(mockService, first);

      const second = await nextSyncRequest(mockService);
      expect(second.headers['authorization']).toBe('Token token-2');
      expect(authenticator.invalidateCredentials).toHaveBeenCalled();
    }
  );
});
