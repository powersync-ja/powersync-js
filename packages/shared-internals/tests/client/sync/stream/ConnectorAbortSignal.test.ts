import { SyncStreamConnectionMethod } from '@powersync/common';
import { describe, expect, test, vi } from 'vitest';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions
} from '../../../../src/client/sync/stream/AbstractStreamingSyncImplementation.js';
import { resolveSyncOptions } from '../../../../src/client/sync/options.js';

const syncOptions = resolveSyncOptions({ checkpointMode: 'requests' }, SyncStreamConnectionMethod.HTTP);

class TestSync extends AbstractStreamingSyncImplementation {
  obtainLock<T>({ callback }: LockOptions<T>): Promise<T> {
    return callback();
  }

  uploadAllCrud(signal: AbortSignal) {
    return this['_uploadAllCrud'](signal, syncOptions);
  }

  // Not `requestCheckpoint`: that is a public method on the base class, and shadowing it changes its signature.
  runCheckpointRequest(signal: AbortSignal) {
    return this['requestCheckpointFromService'](signal, { client_id: 'client-1', checkpoint_request_id: '1' });
  }
}

function createSync(options: Partial<AbstractStreamingSyncImplementationOptions>) {
  return new TestSync({
    subscriptions: [],
    logger: { log: vi.fn() },
    ...options
  } as unknown as AbstractStreamingSyncImplementationOptions);
}

/**
 * These calls cross a context boundary on the web (the shared worker calls into a tab), where they can otherwise stall
 * indefinitely. The worker relies on receiving this signal to bound them, so if it stopped being forwarded the guard
 * there would silently become a no-op.
 */
describe('connector calls receive the sync abort signal', () => {
  test('postCheckpointRequest', async () => {
    const postCheckpointRequest = vi.fn(async () => 'checkpoint-1');
    const sync = createSync({ postCheckpointRequest });
    const controller = new AbortController();

    await expect(sync.runCheckpointRequest(controller.signal)).resolves.toBe('checkpoint-1');
    expect(postCheckpointRequest).toHaveBeenCalledWith('client-1', '1', controller.signal);
  });

  test('uploadCrud', async () => {
    const controller = new AbortController();
    // Ends the upload loop after a single pass.
    const uploadCrud = vi.fn(async () => controller.abort());
    const sync = createSync({
      uploadCrud,
      adapter: { nextCrudItem: vi.fn(async () => ({ clientId: 1 })) } as any
    });

    await sync.uploadAllCrud(controller.signal);

    expect(uploadCrud).toHaveBeenCalledWith(controller.signal);
  });
});
