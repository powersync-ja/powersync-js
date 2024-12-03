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

  if (worker) {
    return !needsDedicated && multipleTabs
      ? new SharedWorker(`${worker}`, {
          /* @vite-ignore */
          name: `shared-DB-worker-${workerIdentifier}`
        }).port
      : new Worker(`${worker}`, {
          /* @vite-ignore */
          name: `DB-worker-${workerIdentifier}`
        });
  } else {
    /**
     *  Webpack V5 can bundle the worker automatically if the full Worker constructor syntax is used
     *  https://webpack.js.org/guides/web-workers/
     *  This enables multi tab support by default, but falls back if SharedWorker is not available
     *  (in the case of Android)
     */
    return !needsDedicated && multipleTabs
      ? new SharedWorker(new URL('./WASQLiteDB.worker.js', import.meta.url), {
          /* @vite-ignore */
          name: `shared-DB-worker-${workerIdentifier}`,
          type: 'module'
        }).port
      : new Worker(new URL('./WASQLiteDB.worker.js', import.meta.url), {
          /* @vite-ignore */
          name: `DB-worker-${workerIdentifier}`,
          type: 'module'
        });
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
