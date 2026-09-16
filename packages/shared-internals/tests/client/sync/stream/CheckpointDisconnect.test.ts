import { describe, expect, test, vi } from 'vitest';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions
} from '../../../../src/client/sync/stream/AbstractStreamingSyncImplementation.js';
import { resolveSyncOptions } from '../../../../src/client/sync/options.js';
import { SyncStreamConnectionMethod } from '@powersync/common';

class TestSync extends AbstractStreamingSyncImplementation {
  obtainLock<T>({ callback }: LockOptions<T>): Promise<T> {
    return callback();
  }

  async startCheckpointRetry() {
    const controller = new AbortController();
    this.abortController = controller;
    await this['checkpoints'].markCheckpointsReady(Promise.resolve());
    this.streamingSyncPromise = Promise.all([
      Promise.resolve(),
      Promise.resolve(),
      this['repostUnacknowledgedCheckpointRequests'](
        controller.signal,
        resolveSyncOptions({ checkpointMode: 'requests' }, SyncStreamConnectionMethod.HTTP)
      )
    ]);
  }

  endDownloadIteration() {
    this['checkpoints'].downloadIterationEnded();
  }
}

describe('checkpoint retry cancellation', () => {
  test('disconnect settles when the download iteration ends during the checkpoint retry delay', async () => {
    const firstRead = Promise.withResolvers<void>();
    const readCheckpointRequestId = vi.fn(async () => {
      firstRead.resolve();
      return '1';
    });
    const sync = new TestSync({
      subscriptions: [],
      logger: { log: vi.fn() },
      adapter: { readCheckpointRequestId }
    } as unknown as AbstractStreamingSyncImplementationOptions);

    await sync.startCheckpointRetry();
    await firstRead.promise;
    // The download loop resets checkpoint readiness as it exits. Disconnect wakes the
    // retry delay, which used to wait again on the already-aborted signal forever.
    sync.endDownloadIteration();
    await sync.disconnect();

    expect(sync.isConnected).toBe(false);
  }, 500);
});
