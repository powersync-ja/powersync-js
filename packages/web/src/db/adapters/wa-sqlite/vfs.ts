import type * as SQLite from '@journeyapps/wa-sqlite';
import { RawWaSqliteDatabaseOptions } from './RawSqliteConnection.js';
import type { WebSpecificOpenOptions } from '../options.js';

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
 * Whether the VFS can keep its files in a Storage Bucket, see {@link WebSpecificOpenOptions.storageBucket}.
 */
export function vfsSupportsStorageBuckets(vfs: WASQLiteVFS) {
  return (
    vfs == WASQLiteVFS.OPFSCoopSyncVFS || vfs == WASQLiteVFS.OPFSWriteAheadVFS || vfs == WASQLiteVFS.AccessHandlePoolVFS
  );
}

/**
 * The part of the Storage Buckets API this module uses. The API is not in the TypeScript DOM library yet.
 */
export interface StorageBucketManagerLike {
  open(name: string): Promise<{ getDirectory(): Promise<FileSystemDirectoryHandle> }>;
}

/**
 * Options for an OPFS-based VFS that keep its files in the named Storage Bucket, see
 * {@link WebSpecificOpenOptions.storageBucket}. Without a bucket name, no options: the VFS uses the root of the
 * origin private file system.
 *
 * @internal
 */
export function vfsOptionsForStorageBucket(
  storageBucket: string | undefined,
  storageBuckets: StorageBucketManagerLike | null | undefined = (navigator as any).storageBuckets
): { getRoot?: () => Promise<FileSystemDirectoryHandle>; lockPrefix?: string } {
  if (storageBucket == null) {
    return {};
  }
  if (storageBuckets == null) {
    throw new Error(
      `The 'storageBucket' option needs the Storage Buckets API (navigator.storageBuckets), which this browser does not have. Check for it before setting the option.`
    );
  }
  return {
    // Called by the VFS each time it needs its root directory. Opening the bucket again creates it when the
    // browser deleted it with the rest of the site's data.
    getRoot: () => storageBuckets.open(storageBucket).then((bucket) => bucket.getDirectory()),
    // Keeps the locks and channels of a file apart from those of a file of the same name in another bucket.
    // Bucket names cannot contain ':', so the names of two buckets never overlap.
    lockPrefix: `${storageBucket}:`
  };
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
  encryptionKey,
  storageBucket
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
      resolveVfs = (module) => AccessHandlePoolVFS.create(filename, module, vfsOptionsForStorageBucket(storageBucket));
      break;
    }
    case WASQLiteVFS.OPFSCoopSyncVFS: {
      // @ts-expect-error The types for this import are missing upstream
      const { OPFSCoopSyncVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js');
      resolveVfs = (module) => OPFSCoopSyncVFS.create(filename, module, vfsOptionsForStorageBucket(storageBucket));
      break;
    }
    case WASQLiteVFS.OPFSWriteAheadVFS: {
      // @ts-expect-error The types for this import are missing upstream
      const { OPFSWriteAheadVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSWriteAheadVFS.js');
      resolveVfs = (module) => OPFSWriteAheadVFS.create(filename, module, vfsOptionsForStorageBucket(storageBucket));
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
