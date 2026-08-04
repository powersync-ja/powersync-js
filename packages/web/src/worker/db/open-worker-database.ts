import * as Comlink from 'comlink';
import { vfsRequiresDedicatedWorkers, WASQLiteVFS } from '../../db/adapters/wa-sqlite/vfs.js';
import { OpenWorkerConnection } from '../../db/adapters/wa-sqlite/DatabaseClient.js';
import type { ILogger } from '@powersync/common';
import { logWorkerErrors } from '../errors.js';

/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
export function openWorkerDatabasePort(
  workerIdentifier: string,
  multipleTabs = true,
  worker: string | URL = '',
  vfs?: WASQLiteVFS,
  logger?: ILogger
) {
  const needsDedicated = vfs && vfsRequiresDedicatedWorkers(vfs);
  let resolvedWorker: Worker | SharedWorker;

  if (worker) {
    resolvedWorker =
      !needsDedicated && multipleTabs
        ? new SharedWorker(`${worker}`, {
            /* @vite-ignore */
            name: `shared-DB-worker-${workerIdentifier}`
          })
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
    resolvedWorker =
      !needsDedicated && multipleTabs
        ? new SharedWorker(new URL('./WASQLiteDB.worker.js', import.meta.url), {
            /* @vite-ignore */
            name: `shared-DB-worker-${workerIdentifier}`,
            type: 'module'
          })
        : new Worker(new URL('./WASQLiteDB.worker.js', import.meta.url), {
            /* @vite-ignore */
            name: `DB-worker-${workerIdentifier}`,
            type: 'module'
          });
  }

  return resolveWorkerDatabasePortFactory(() => resolvedWorker, logger);
}

/**
 * @returns A function which allows for opening database connections inside
 * a worker.
 */
export function getWorkerDatabaseOpener(workerIdentifier: string, multipleTabs = true, worker: string | URL = '') {
  return Comlink.wrap<OpenWorkerConnection>(openWorkerDatabasePort(workerIdentifier, multipleTabs, worker));
}

export function resolveWorkerDatabasePortFactory(worker: () => Worker | SharedWorker, logger?: ILogger) {
  const workerInstance = worker();
  if (logger) {
    logWorkerErrors(workerInstance, logger);
  }

  return isSharedWorker(workerInstance) ? workerInstance.port : workerInstance;
}

export function isSharedWorker(worker: Worker | SharedWorker): worker is SharedWorker {
  return 'port' in worker;
}
