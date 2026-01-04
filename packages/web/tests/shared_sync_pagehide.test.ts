import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BucketStorageAdapter } from '@powersync/common';
import { SharedWebStreamingSyncImplementation, WebRemote } from '@powersync/web';
import type { WebDBAdapter } from '../src/db/adapters/WebDBAdapter';
import { TestConnector } from './utils/MockStreamOpenFactory';

vi.mock('comlink', async () => {
  const actual = await vi.importActual<typeof import('comlink')>('comlink');
  return {
    ...actual,
    wrap: () => ({
      setLogLevel: vi.fn(),
      setParams: vi.fn(() => Promise.resolve()),
      addLockBasedCloseSignal: vi.fn(),
      triggerCrudUpload: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      updateSubscriptions: vi.fn(),
      getWriteCheckpoint: vi.fn(),
      hasCompletedSync: vi.fn(),
      _testUpdateAllStatuses: vi.fn(),
      [actual.releaseProxy]: vi.fn()
    }),
    expose: vi.fn()
  };
});

describe('Shared sync pagehide cleanup', { sequential: true }, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('releases tab-close-signal lock on pagehide', async () => {
    let lockRequestedResolve!: (name: string) => void;
    const lockRequested = new Promise<string>((resolve) => {
      lockRequestedResolve = resolve;
    });

    const activeLocks = new Set<string>();
    let lockCallbackStarted = false;
    let lockCallbackFinished = false;
    const mockLocks = {
      request: ((...args: any[]) => {
        const [name, optionsOrCallback, callback] = args;
        const lockCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        activeLocks.add(name);
        lockRequestedResolve(name);
        return Promise.resolve()
          .then(() => {
            lockCallbackStarted = true;
            return lockCallback?.({ name, mode: 'exclusive' });
          })
          .finally(() => {
            lockCallbackFinished = true;
            activeLocks.delete(name);
          });
      }) as LockManager['request'],
      query: vi.fn()
    } as LockManager;

    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(mockLocks);

    const adapter = {} as unknown as BucketStorageAdapter;
    const dbAdapter = {
      getConfiguration: () => ({}),
      shareConnection: async () => ({ identifier: 'crm.sqlite', port: {} as MessagePort })
    } as unknown as WebDBAdapter;
    const remote = new WebRemote(new TestConnector());

    new SharedWebStreamingSyncImplementation({
      adapter,
      remote,
      uploadCrud: async () => {},
      identifier: 'crm.sqlite',
      crudUploadThrottleMs: 1000,
      retryDelayMs: 1000,
      db: dbAdapter,
      subscriptions: [],
      sync: {
        worker: () => ({ port: {} as MessagePort } as SharedWorker)
      }
    });

    const lockName = await lockRequested;
    expect(activeLocks.has(lockName)).toBe(true);

    const pagehide =
      typeof PageTransitionEvent === 'function'
        ? new PageTransitionEvent('pagehide', { persisted: false })
        : Object.assign(new Event('pagehide'), { persisted: false });
    window.dispatchEvent(pagehide);

    await vi.waitFor(() => expect(lockCallbackStarted).toBe(true));
    await vi.waitFor(() => expect(lockCallbackFinished).toBe(true));

    expect(activeLocks.size).toBe(0);
  });
});
