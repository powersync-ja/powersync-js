import type * as SQLite from '@journeyapps/wa-sqlite';
import { RawWaSqliteDatabaseOptions } from './RawSqliteConnection.js';

/**
 * List of currently tested virtual filesystems
 */
export enum WASQLiteVFS {
  IDBBatchAtomicVFS = 'IDBBatchAtomicVFS',
  OPFSCoopSyncVFS = 'OPFSCoopSyncVFS',
  AccessHandlePoolVFS = 'AccessHandlePoolVFS',
  OPFSWriteAheadVFS = 'OPFSWriteAheadVFS',
  /**
   * A virtual file system storing data in-memory only, without persistence.
   *
   * This file system can be used in three configurations:
   *
   * 1. In shared workers (the default when available): All tabs share the same in-memory database, which is cleared
   *    once the last tab is closed.
   * 2. In dedicated workers (used when `enableMultiTabs` is disabled). Each tab has its own in-memory database cleared
   *    when the tab is closed. Queries are offloaded to a dedicated worker.
   * 3. In the context of the tab itself (used when both `enableMultiTabs` and `useWebWorker` are disabled). The per-tab
   *    database is hosted in the tab itself, and queries run synchronously. This is _a lot_ faster than any other
   *    single-threadedVFS, but can block JavaScript for computationally-intensive queries.
   *
   * This VFS primarily intended for development, but it also useful for online-first deployments not syncing large
   * amounts of data, as it is quicker to start up.
   */
  InMemoryVfs = 'InMemoryVFS'
}

export function vfsRequiresDedicatedWorkers(vfs: WASQLiteVFS) {
  return vfs != WASQLiteVFS.IDBBatchAtomicVFS && vfs != WASQLiteVFS.InMemoryVfs;
}

/**
 * @internal
 */
export type WASQLiteModuleFactoryOptions = { dbFileName: string; encryptionKey?: string };

/**
 * @internal
 */
export type SQLiteModule = Parameters<typeof SQLite.Factory>[0];

async function asyncModuleFactory(encryptionKey: string | undefined): Promise<SQLiteModule> {
  if (encryptionKey) {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs');
    return factory();
  } else {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
    return factory();
  }
}

async function syncModuleFactory(encryptionKey: string | undefined): Promise<SQLiteModule> {
  if (encryptionKey) {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs');
    return factory();
  } else {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite.mjs');
    return factory();
  }
}

/**
 * @internal
 */
export async function loadModuleAndVfs({
  vfs,
  filename,
  encryptionKey
}: RawWaSqliteDatabaseOptions): Promise<{ module: SQLiteModule; vfs: SQLiteVFS }> {
  let moduleFactory = syncModuleFactory;
  let resolveVfs: (module: any) => Promise<SQLiteVFS>;

  switch (vfs) {
    case WASQLiteVFS.IDBBatchAtomicVFS: {
      moduleFactory = asyncModuleFactory;
      const { IDBBatchAtomicVFS } = await import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
      resolveVfs = (module) => {
        // @ts-expect-error The types for this static method are missing upstream
        return IDBBatchAtomicVFS.create(filename, module, { lockPolicy: 'exclusive' });
      };
      break;
    }
    case WASQLiteVFS.AccessHandlePoolVFS: {
      // @ts-expect-error The types for this import are missing upstream
      const { AccessHandlePoolVFS } = await import('@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js');
      resolveVfs = (module) => AccessHandlePoolVFS.create(filename, module);
      break;
    }
    case WASQLiteVFS.OPFSCoopSyncVFS: {
      // @ts-expect-error The types for this import are missing upstream
      const { OPFSCoopSyncVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js');
      resolveVfs = (module) => OPFSCoopSyncVFS.create(filename, module);
      break;
    }
    case WASQLiteVFS.OPFSWriteAheadVFS: {
      // @ts-expect-error The types for this import are missing upstream
      const { OPFSWriteAheadVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSWriteAheadVFS.js');
      resolveVfs = (module) => OPFSWriteAheadVFS.create(filename, module, {});
      break;
    }
    case WASQLiteVFS.InMemoryVfs: {
      const { MemoryVFS } = await import('@journeyapps/wa-sqlite/src/examples/MemoryVFS.js');
      // @ts-expect-error The types for this static method are missing upstream
      resolveVfs = (module) => MemoryVFS.create(filename, module);
      break;
    }
  }

  const module = await moduleFactory(encryptionKey);
  return { module, vfs: await resolveVfs(module) };
}
