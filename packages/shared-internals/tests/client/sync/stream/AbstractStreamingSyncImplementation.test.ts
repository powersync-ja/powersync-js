import { describe, expect, test, vi } from 'vitest';
import { AbstractStreamingSyncImplementation } from '../../../../src/client/sync/stream/AbstractStreamingSyncImplementation.js';

class TestSyncImplementation extends AbstractStreamingSyncImplementation {
  async obtainLock<T>(lockOptions: { callback: () => Promise<T> }): Promise<T> {
    return lockOptions.callback();
  }
}

function createImplementation() {
  return new TestSyncImplementation({
    adapter: { registerListener: () => () => {} },
    logger: { log: vi.fn() },
    subscriptions: []
  } as any);
}

describe('AbstractStreamingSyncImplementation', () => {
  test.each([undefined, null])(
    'keeps retrying when an iteration rejects with %s after a connection change',
    async (rejection) => {
      const sync = createImplementation();
      const disconnect = new AbortController();
      const iteration = vi
        .spyOn(sync as any, 'streamingSyncIteration')
        .mockRejectedValueOnce(rejection)
        .mockImplementationOnce(async () => {
          disconnect.abort();
          return null;
        });

      sync.markConnectionMayHaveChanged();
      await expect((sync as any).streamingSync(disconnect.signal, { retryDelayMs: 0 })).resolves.toBeUndefined();

      expect(iteration).toHaveBeenCalledTimes(2);
      expect(sync.syncStatus.dataFlowStatus.downloadError).toBe(rejection);
    }
  );
});
