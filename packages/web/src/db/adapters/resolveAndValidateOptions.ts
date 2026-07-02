import { LogLevels } from '@powersync/common';
import { TemporaryStorageOption, WebSpecificOpenOptions } from './options.js';
import { vfsRequiresDedicatedWorkers, WASQLiteVFS } from './wa-sqlite/vfs.js';

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

  return resolved;
}
