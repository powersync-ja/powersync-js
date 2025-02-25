import * as Comlink from 'comlink';
import { OpenAsyncDatabaseConnection } from '../..//db/adapters/AsyncDatabaseConnection';
import { WASQLiteVFS } from '../../db/adapters/wa-sqlite/WASQLiteConnection';

/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
export function openWorkerDatabasePort(
  workerIdentifier: string,
  multipleTabs = true,
  worker: string | URL = '',
  vfs?: WASQLiteVFS
) {
  const needsDedicated = vfs == WASQLiteVFS.AccessHandlePoolVFS || vfs == WASQLiteVFS.OPFSCoopSyncVFS;

  const handleError = (event: ErrorEvent) => {
    // We don't expect worker errors, so turn errors on workers into unhandled errors in this context
    // to fail tests.
    throw `Unexpected worker error: ${event.error}`;
  }

  const openWorker = (resolvedUri: string | URL, options: WorkerOptions = {}) => {
    const useShared = !needsDedicated && multipleTabs;
    if (useShared) {
      const sharedWorker = new SharedWorker(`${worker}`, {
        ...options,
        /* @vite-ignore */
        name: `shared-DB-worker-${workerIdentifier}`
      });
      sharedWorker.onerror = handleError;
      return sharedWorker.port;
    } else {
      const dedicatedWorker = new Worker(`${worker}`, {
        ...options,
        /* @vite-ignore */
        name: `DB-worker-${workerIdentifier}`
      });
      dedicatedWorker.onerror = handleError;

      return dedicatedWorker;
    }
  };

  if (worker) {
    return openWorker(worker);
  } else {
    /**
     *  Webpack V5 can bundle the worker automatically if the full Worker constructor syntax is used
     *  https://webpack.js.org/guides/web-workers/
     *  This enables multi tab support by default, but falls back if SharedWorker is not available
     *  (in the case of Android)
     */
    return openWorker(new URL('./WASQLiteDB.worker.js', import.meta.url), { type: 'module' });
  }
}

/**
 * @returns A function which allows for opening database connections inside
 * a worker.
 */
export function getWorkerDatabaseOpener(workerIdentifier: string, multipleTabs = true, worker: string | URL = '') {
  return Comlink.wrap<OpenAsyncDatabaseConnection>(openWorkerDatabasePort(workerIdentifier, multipleTabs, worker));
}

export function resolveWorkerDatabasePortFactory(worker: () => Worker | SharedWorker) {
  const workerInstance = worker();
  return isSharedWorker(workerInstance) ? workerInstance.port : workerInstance;
}

export function isSharedWorker(worker: Worker | SharedWorker): worker is SharedWorker {
  return 'port' in worker;
}
