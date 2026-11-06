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
  InMemoryVfs = 'InMemoryVFS',

  /**
   * A simple OPFS-based virtual file system.
   *
   * This VFS uses a very simple internal design: Instead of opening files on demand (or with a prior pool), it uses the
   * fact that that a SQLite database only consists of two files: The main database and a journal for recovery. These
   * two file handles are pre-opened before the database is used, allowing all IO to be synchronous and to go directly
   * to those files.
   *
   * It is worth noting that this design has fundamental drawbacks: It doesn't support `ATTACH`ing additional databases,
   * and temporary data (e.g. for materialized CTEs) is always stored in memory. This is not relevant for most setups
   * though, and not supporting this is what enables the simple design.
   *
   * Synchronous file handles in OPFS are only available in dedicated workers, and two tabs can't open the same file
   * at the same time. To enable multi-tab support, this VFS comes in three possible configurations, the PowerSync SDK
   * selects the best one based on browser features:
   *
   * 1. __Shared workers__: While we need dedicated workers to access files synchronously, the web standard allows
   *   shared workers to spawn their own dedicated workers. This is not supported by all browsers, but highly efficient
   *   option when available as we don't need to rely on navigator locks.
   * 2. `readwrite-unsafe`: On Chromium browsers, this flag allows multiple tabs to access the same files (the PowerSync
   *    SDK additionally uses navigator locks to avoid corruption from concurrent writes).
   * 3. Close and open fallback: On other browsers, file handles are kept open until another tab signals that it needs
   *    access to them. At that point, queued local transactions are awaited before closing the file handles. At the
   *    next database query, the same signal is sent to the other tab before re-opening files locally.
   */
  SimpleOpfsVFS = 'SimpleOpfsVFS'
}

export function vfsRequiresDedicatedWorkers(vfs: WASQLiteVFS | 'auto') {
  if (vfs === 'auto') {
    // Falls back to an in-memory database when workers aren't available.
    return false;
  }

  return vfs != WASQLiteVFS.IDBBatchAtomicVFS && vfs != WASQLiteVFS.InMemoryVfs;
}

/**
 * Whether the VFS can keep its files in a Storage Bucket, see {@link WebSpecificOpenOptions.storageBucket}.
 */
export function vfsSupportsStorageBuckets(vfs: WASQLiteVFS | 'auto') {
  switch (vfs) {
    case WASQLiteVFS.OPFSCoopSyncVFS:
    case WASQLiteVFS.OPFSWriteAheadVFS:
    case WASQLiteVFS.AccessHandlePoolVFS:
    case WASQLiteVFS.SimpleOpfsVFS:
    case 'auto': // auto mode can resolve to opfs, in which case it supports storage buckets
      return true;
    default:
      return false;
  }
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
): { getRoot?: () => Promise<FileSystemDirectoryHandle>; prefix?: string } {
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
    prefix: `${storageBucket}:`
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
  storageBucket,
  simpleMode
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
    case WASQLiteVFS.SimpleOpfsVFS: {
      const { SimpleOpfsFileSystem } = await import('./SimpleOpfsFileSystem.js');

      const getRoot = vfsOptionsForStorageBucket(storageBucket).getRoot;
      const resolver = SimpleOpfsFileSystem.directoryResolver(filename, simpleMode === 'rw-unsafe', getRoot);

      // @ts-expect-error It conforms to SQLiteVFS, but an intermediate type is missing so tsc can't know
      resolveVfs = async (module) => {
        const vfs = new SimpleOpfsFileSystem(filename, module, resolver);
        await vfs.open();
        return vfs;
      };
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
