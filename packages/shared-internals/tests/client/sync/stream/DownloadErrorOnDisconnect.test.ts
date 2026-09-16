import { SyncStreamConnectionMethod } from '@powersync/common';
import { describe, expect, test, vi } from 'vitest';
import { AbortOperation } from '../../../../src/utils/AbortOperation.js';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions
} from '../../../../src/client/sync/stream/AbstractStreamingSyncImplementation.js';
import { resolveSyncOptions } from '../../../../src/client/sync/options.js';

const syncOptions = resolveSyncOptions({ retryDelayMs: 1 }, SyncStreamConnectionMethod.HTTP);

class TestSync extends AbstractStreamingSyncImplementation {
  constructor(private readonly iterate: () => Promise<never>) {
    super({
      subscriptions: [],
      logger: { log: vi.fn() },
      adapter: { registerListener: () => () => {} }
    } as unknown as AbstractStreamingSyncImplementationOptions);
  }

  obtainLock<T>({ callback }: LockOptions<T>): Promise<T> {
    return callback();
  }

  protected override streamingSyncIteration(): Promise<any> {
    return this.iterate();
  }

  runStreamingSync(signal: AbortSignal) {
    return this['streamingSync'](signal, syncOptions);
  }
}

describe('downloadError on disconnect', () => {
  test('a requested disconnect is not recorded as a download error', async () => {
    const aborted = Promise.withResolvers<void>();
    const started = Promise.withResolvers<void>();

    const sync = new TestSync(async () => {
      started.resolve();
      await aborted.promise;
      // What `disconnect()` raises once it aborts the sync signal.
      throw new AbortOperation('Disconnect has been requested');
    });

    const controller = new AbortController();
    const running = sync.runStreamingSync(controller.signal);

    await started.promise;
    controller.abort();
    aborted.resolve();
    await running;

    expect(sync.syncStatus.downloadError).toBeUndefined();
  });

  test('a genuine sync failure is still recorded', async () => {
    const sync = new TestSync(async () => {
      throw new Error('boom');
    });

    const controller = new AbortController();
    const reported = Promise.withResolvers<void>();
    sync.registerListener({
      statusChanged: (status) => {
        if (status.downloadError) {
          reported.resolve();
        }
      }
    });

    const running = sync.runStreamingSync(controller.signal);
    await reported.promise;

    expect(sync.syncStatus.downloadError?.message).toBe('boom');

    controller.abort();
    await running;
  });
});
