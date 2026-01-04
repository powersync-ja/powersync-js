import * as Comlink from 'comlink';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DBAdapter } from '@powersync/common';
import type { AsyncDatabaseConnection } from '../src/db/adapters/AsyncDatabaseConnection';
import {
  DEFAULT_WEB_SQL_FLAGS,
  TemporaryStorageOption,
  type ResolvedWebSQLOpenOptions
} from '../src/db/adapters/web-sql-flags';
import { SharedSyncImplementation, type WrappedSyncPort } from '../src/worker/sync/SharedSyncImplementation';
import type { AbstractSharedSyncClientProvider } from '../src/worker/sync/AbstractSharedSyncClientProvider';

vi.mock('comlink', async () => {
  const actual = await vi.importActual<typeof import('comlink')>('comlink');
  return {
    ...actual,
    wrap: vi.fn()
  };
});

describe('Shared sync db-lock cleanup', { sequential: true }, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('releases db-lock when the dedicated worker dies mid-operation', async () => {
    let lockRequestedResolve!: (name: string) => void;
    const lockRequested = new Promise<string>((resolve) => {
      lockRequestedResolve = resolve;
    });

    const activeLocks = new Set<string>();
    const mockLocks = {
      request: ((...args: any[]) => {
        const [name, optionsOrCallback, callback] = args;
        const lockCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        const signal =
          typeof optionsOrCallback === 'object' && optionsOrCallback ? optionsOrCallback.signal : undefined;
        activeLocks.add(name);
        lockRequestedResolve(name);
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            activeLocks.delete(name);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          if (signal) {
            signal.addEventListener('abort', onAbort);
          }
          Promise.resolve()
            .then(() => lockCallback?.({ name, mode: 'exclusive' }))
            .then(resolve)
            .catch(reject)
            .finally(() => {
              if (signal) {
                signal.removeEventListener('abort', onAbort);
              }
              activeLocks.delete(name);
            });
        });
      }) as LockManager['request'],
      query: vi.fn()
    } as LockManager;

    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(mockLocks);

    let executeCalledResolve!: () => void;
    const executeCalled = new Promise<void>((resolve) => {
      executeCalledResolve = resolve;
    });

    const hangingExecute = vi.fn(() => {
      executeCalledResolve();
      return new Promise<never>(() => {});
    });
    const hangingClose = vi.fn(() => new Promise<never>(() => {}));

    const baseConfig: ResolvedWebSQLOpenOptions = {
      dbFilename: 'crm.sqlite',
      flags: DEFAULT_WEB_SQL_FLAGS,
      temporaryStorage: TemporaryStorageOption.MEMORY,
      cacheSizeKb: 1
    };

    const baseConnection: AsyncDatabaseConnection = {
      init: async () => {},
      close: hangingClose,
      markHold: async () => 'hold',
      releaseHold: async () => {},
      isAutoCommit: async () => true,
      execute: hangingExecute,
      executeRaw: async () => [],
      executeBatch: async () => ({ rows: { _array: [], length: 0 }, rowsAffected: 0, insertId: 0 }),
      registerOnTableChange: async () => () => {},
      getConfig: async () => baseConfig
    };

    const openFn = vi.fn(async () => baseConnection) as unknown as Comlink.Remote<
      (...args: unknown[]) => Promise<AsyncDatabaseConnection>
    >;
    (openFn as any)[Comlink.releaseProxy] = vi.fn();
    const wrapMock = Comlink.wrap as unknown as ReturnType<typeof vi.fn>;
    wrapMock.mockReturnValue(openFn);

    const implementation = new SharedSyncImplementation();
    const { port1 } = new MessageChannel();

    const clientProvider = {
      fetchCredentials: vi.fn(async () => null),
      invalidateCredentials: vi.fn(),
      uploadCrud: vi.fn(async () => {}),
      statusChanged: vi.fn(),
      getDBWorkerPort: vi.fn(async () => port1),
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      time: vi.fn(),
      timeEnd: vi.fn(),
      [Comlink.releaseProxy]: vi.fn()
    } as unknown as Comlink.Remote<AbstractSharedSyncClientProvider>;

    const port: WrappedSyncPort = {
      port: port1,
      clientProvider,
      currentSubscriptions: [],
      closeListeners: []
    };

    (implementation as unknown as { ports: WrappedSyncPort[] }).ports.push(port);
    (implementation as unknown as { syncParams: unknown }).syncParams = {
      streamOptions: {},
      dbParams: baseConfig
    };

    await (implementation as unknown as { openInternalDB: () => Promise<void> }).openInternalDB();

    const adapter = port.db as DBAdapter;
    const executePromise = adapter.execute('select 1');
    const executeOutcome = executePromise.then(
      () => ({ status: 'resolved' as const }),
      (error) => ({ status: 'rejected' as const, error })
    );

    const lockName = await lockRequested;
    await executeCalled;
    expect(lockName).toBe('db-lock-crm.sqlite');
    expect(activeLocks.has(lockName)).toBe(true);

    const closeListener = port.closeListeners[0];
    expect(closeListener).toBeDefined();
    void Promise.resolve(closeListener?.()).catch(() => {});

    const outcome = await Promise.race([
      executeOutcome,
      new Promise<{ status: 'timeout' }>((resolve) => setTimeout(() => resolve({ status: 'timeout' }), 150))
    ]);

    expect(outcome.status).not.toBe('timeout');
    await vi.waitFor(() => expect(activeLocks.size).toBe(0), { timeout: 50 });
  });
});
