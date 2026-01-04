import * as Comlink from 'comlink';
import { describe, expect, it, vi } from 'vitest';
import { LockedAsyncDatabaseAdapter } from '../src/db/adapters/LockedAsyncDatabaseAdapter';
import { WorkerWrappedAsyncDatabaseConnection } from '../src/db/adapters/WorkerWrappedAsyncDatabaseConnection';
import type { AsyncDatabaseConnection, OpenAsyncDatabaseConnection } from '../src/db/adapters/AsyncDatabaseConnection';
import {
  DEFAULT_WEB_SQL_FLAGS,
  TemporaryStorageOption,
  type ResolvedWebSQLOpenOptions
} from '../src/db/adapters/web-sql-flags';

const baseConfig: ResolvedWebSQLOpenOptions = {
  dbFilename: 'crm.sqlite',
  flags: DEFAULT_WEB_SQL_FLAGS,
  temporaryStorage: TemporaryStorageOption.MEMORY,
  cacheSizeKb: 1
};

const baseConnection: AsyncDatabaseConnection = {
  init: async () => {},
  close: async () => {},
  markHold: async () => 'hold',
  releaseHold: async () => {},
  isAutoCommit: async () => true,
  execute: async () => ({ rows: { _array: [], length: 0 }, rowsAffected: 0, insertId: 0 }),
  executeRaw: async () => [],
  executeBatch: async () => ({ rows: { _array: [], length: 0 }, rowsAffected: 0, insertId: 0 }),
  registerOnTableChange: async () => () => {},
  getConfig: async () => baseConfig
};

describe('forceClose db-lock abort', () => {
  it('aborts pending db-lock when forceClose happens after lock request', async () => {
    let lockRequestedResolve!: () => void;
    const lockRequested = new Promise<void>((resolve) => {
      lockRequestedResolve = resolve;
    });

    const mockLocks = {
      request: ((...args: any[]) => {
        const [name, optionsOrCallback, callback] = args;
        const lockCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        const signal =
          typeof optionsOrCallback === 'object' && optionsOrCallback ? optionsOrCallback.signal : undefined;
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException('Aborted', 'AbortError'));
          };
          if (signal) {
            signal.addEventListener('abort', onAbort);
          }
          Promise.resolve()
            .then(async () => {
              const callbackPromise = lockCallback?.({ name, mode: 'exclusive' });
              lockRequestedResolve();
              return callbackPromise;
            })
            .then(resolve)
            .catch(reject)
            .finally(() => {
              if (signal) {
                signal.removeEventListener('abort', onAbort);
              }
            });
        });
      }) as LockManager['request'],
      query: vi.fn()
    } as LockManager;

    const locksSpy = vi.spyOn(navigator, 'locks', 'get').mockReturnValue(mockLocks);

    const hangingExecute = vi.fn(() => new Promise<never>(() => {}));
    const connection: AsyncDatabaseConnection = { ...baseConnection, execute: hangingExecute };
    const remote = {
      [Comlink.releaseProxy]: () => {}
    } as Comlink.Remote<OpenAsyncDatabaseConnection<ResolvedWebSQLOpenOptions>>;
    let wrapped: WorkerWrappedAsyncDatabaseConnection | null = null;

    const adapter = new LockedAsyncDatabaseAdapter({
      name: 'crm.sqlite',
      openConnection: async () => {
        wrapped = new WorkerWrappedAsyncDatabaseConnection({
          baseConnection: connection,
          identifier: 'crm.sqlite',
          remoteCanCloseUnexpectedly: false,
          remote
        });
        return wrapped;
      }
    });

    const executePromise = adapter.execute('select 1');
    const executeOutcome = executePromise.then(
      () => ({ status: 'resolved' as const }),
      (error) => ({ status: 'rejected' as const, error })
    );

    await lockRequested;
    wrapped!.forceClose();

    const outcome = await Promise.race([
      executeOutcome,
      new Promise<{ status: 'timeout' }>((resolve) => setTimeout(() => resolve({ status: 'timeout' }), 150))
    ]);

    locksSpy.mockRestore();

    expect(outcome.status).not.toBe('timeout');
    expect(outcome.status).toBe('rejected');
    if (outcome.status === 'rejected') {
      expect(outcome.error?.name).toBe('AbortError');
    }
  });
});
