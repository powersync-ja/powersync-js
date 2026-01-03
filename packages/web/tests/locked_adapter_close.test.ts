import { describe, expect, it } from 'vitest';
import { LockedAsyncDatabaseAdapter } from '../src/db/adapters/LockedAsyncDatabaseAdapter';
import { AsyncDatabaseConnection } from '../src/db/adapters/AsyncDatabaseConnection';
import { DEFAULT_CACHE_SIZE_KB, TemporaryStorageOption } from '../src/db/adapters/web-sql-flags';
import { ResolvedWASQLiteOpenFactoryOptions } from '../src/db/adapters/wa-sqlite/WASQLiteOpenFactory';
import { WASQLiteVFS } from '../src/db/adapters/wa-sqlite/WASQLiteConnection';

describe('LockedAsyncDatabaseAdapter.close', () => {
  it('calls the table change disposer without binding this', async () => {
    let thisValue: unknown;
    let called = false;

    const disposer = function (this: unknown) {
      thisValue = this;
      called = true;
    };

    const config: ResolvedWASQLiteOpenFactoryOptions = {
      dbFilename: 'test.db',
      flags: {
        broadcastLogs: true,
        disableSSRWarning: false,
        enableMultiTabs: false,
        useWebWorker: false,
        ssrMode: false
      },
      temporaryStorage: TemporaryStorageOption.MEMORY,
      cacheSizeKb: DEFAULT_CACHE_SIZE_KB,
      vfs: WASQLiteVFS.OPFSCoopSyncVFS
    };

    const db: AsyncDatabaseConnection = {
      init: async () => {},
      close: async () => {},
      markHold: async () => 'hold',
      releaseHold: async () => {},
      isAutoCommit: async () => true,
      execute: async () => ({ rows: { _array: [], length: 0 } } as any),
      executeRaw: async () => [],
      executeBatch: async () => ({ rows: { _array: [], length: 0 } } as any),
      registerOnTableChange: async () => disposer,
      getConfig: async () => config
    };

    const adapter = new LockedAsyncDatabaseAdapter({
      name: 'test-close',
      openConnection: async () => db
    });

    await adapter.init();
    await adapter.close();

    expect(called).toBe(true);
    expect(thisValue).toBeUndefined();
  });
});
