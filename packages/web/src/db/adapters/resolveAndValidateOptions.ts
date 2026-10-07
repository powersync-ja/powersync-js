import { LogLevels } from '@powersync/common';
import { TemporaryStorageOption, WebSpecificOpenOptions } from './options.js';
import { vfsRequiresDedicatedWorkers, vfsSupportsStorageBuckets, WASQLiteVFS } from './wa-sqlite/vfs.js';

/**
 * The maximum length of a db filename we support.
 *
 * We configure the same on WA-SQLite (which otherwise defaults to a maximum length of 64). We don't want to support
 * very long path names as Safari maps OPFS files directly to OS files, and APFS has a 255-byte filename limit. Since
 * some VFS append additional characters for pooled file access handles, we want to stay well below that.
 */
export const maxPathNameLength = 128;

/**
 * @internal
 */
export function resolveAndValidateOptions<And = {}>(
  options: Partial<WebSpecificOpenOptions> & And
): WebSpecificOpenOptions & And {
  const defaults: WebSpecificOpenOptions = {
    disableSSRWarning: false,
    ssrMode: !('window' in globalThis),
    /**
     * Multiple tabs are by default not supported on Android, iOS and Safari.
     * Other platforms will have multiple tabs enabled by default.
     */
    enableMultiTabs:
      typeof globalThis.navigator !== 'undefined' && // For SSR purposes
      typeof SharedWorker !== 'undefined' &&
      !navigator.userAgent.match(/(Android|iPhone|iPod|iPad)/i) &&
      !(window as any).safari,
    useWebWorker: true,
    databaseWorkerLogLevel: LogLevels.info,
    temporaryStorage: TemporaryStorageOption.MEMORY,
    cacheSizeKb: 50 * 1024,
    encryptionKey: undefined,
    vfs: WASQLiteVFS.IDBBatchAtomicVFS,
    additionalReaders: 1
  };

  const resolved = Object.assign(defaults, options);
  if (vfsRequiresDedicatedWorkers(resolved.vfs) && !resolved.useWebWorker) {
    throw new Error(
      `Invalid configuration: The 'useWebWorker' flag must be true when using an OPFS-based VFS (${resolved.vfs}).`
    );
  }

  if (resolved.storageBucket != null) {
    if (!vfsSupportsStorageBuckets(resolved.vfs)) {
      throw new Error(
        `Invalid configuration: The 'storageBucket' option needs an OPFS-based VFS, which ${resolved.vfs} is not.`
      );
    }
    // The naming rules of https://wicg.github.io/storage-buckets/, with the length Chromium accepts.
    if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(resolved.storageBucket)) {
      throw new Error(
        `Invalid configuration: '${resolved.storageBucket}' is not a valid Storage Bucket name. A name has lowercase letters, digits, '-' and '_', starts with a letter or a digit, and has at most 63 characters.`
      );
    }
    if (typeof navigator !== 'undefined' && !('storageBuckets' in navigator)) {
      throw new Error(
        `Invalid configuration: The 'storageBucket' option needs the Storage Buckets API (navigator.storageBuckets), which this browser does not have. Set the option only when 'storageBuckets' in navigator.`
      );
    }
  }

  return resolved;
}
