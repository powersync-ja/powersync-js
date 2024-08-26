import * as Comlink from 'comlink';
import type { OpenDB } from '../../shared/types';

/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
export function openWorkerDatabasePort(workerIdentifier: string, multipleTabs = true, workerPath = '') {
  // This causes two sets of worker bundles to be created in the webpack build
  if (workerPath) {
    return multipleTabs
      ? new SharedWorker(`${workerPath}worker_SharedWASQLiteDB.umd.js`, {
          /* @vite-ignore */
          name: `shared-DB-worker-${workerIdentifier}`
        }).port
      : new Worker(`${workerPath}worker_WASQLiteDB.umd.js`, {
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
    return multipleTabs
      ? new SharedWorker(new URL('./SharedWASQLiteDB.worker.js', import.meta.url), {
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
export function getWorkerDatabaseOpener(workerIdentifier: string, multipleTabs = true, workerPath = '') {
  return Comlink.wrap<OpenDB>(openWorkerDatabasePort(workerIdentifier, multipleTabs, workerPath));
}
