import * as Comlink from 'comlink';
import type { OpenDB } from '../../shared/types';

/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
export function openWorkerDatabasePort(workerIdentifier: string, multipleTabs = true) {
  /**
   *  Webpack V5 can bundle the worker automatically if the full Worker constructor syntax is used
   *  https://webpack.js.org/guides/web-workers/
   *  This enables multi tab support by default, but falls back if SharedWorker is not available
   *  (in the case of Android)
   */
  return multipleTabs
    ? new SharedWorker('/public/worker_SharedWASQLiteDB.umd.js', {
        /* @vite-ignore */
        name: `shared-DB-worker-${workerIdentifier}`
      }).port
    : new Worker('/public/worker_WASQLiteDB.umd.js', {
        /* @vite-ignore */
        name: `DB-worker-${workerIdentifier}`
      });
}

/**
 * @returns A function which allows for opening database connections inside
 * a worker.
 */
export function getWorkerDatabaseOpener(workerIdentifier: string, multipleTabs = true) {
  return Comlink.wrap<OpenDB>(openWorkerDatabasePort(workerIdentifier, multipleTabs));
}
