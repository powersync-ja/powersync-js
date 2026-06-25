import { SharedWorkerConnectionRequest, WorkerService } from './SharedWorkerConnectionRequest.js';

export interface OpenWorkerOptions {
  service: WorkerService;
  databaseIdentifier: string;
  customWorker?: string | URL;
  shared: boolean;
}

export interface WorkerConnection {
  endpoint: MessagePort | Worker;
  worker: Worker | SharedWorker;
  close: () => void;
}

export function connectToWorker({
  service,
  databaseIdentifier,
  customWorker,
  shared
}: OpenWorkerOptions): WorkerConnection {
  const name = `${shared ? 'shared-' : ''}powersync-${databaseIdentifier}`;
  let worker: Worker | SharedWorker;

  if (customWorker) {
    worker = shared
      ? new SharedWorker(customWorker, {
          /* @vite-ignore */
          name,
          type: 'module'
        })
      : new Worker(customWorker, {
          /* @vite-ignore */
          name,
          type: 'module'
        });
  } else {
    worker = spawnDefaultPowerSyncWorker(shared, name);
  }

  return connectToExistingWorker(worker, service);
}

/**
 * Opens the default PowerSync worker.
 *
 * When users depend on the web SDK, we assume they use their own bundler (either vite or webpack). Both recognize the
 * syntax of worker constructors with a string literal and will rewrite the URL as part of their bundling processes.
 *
 * React Native / Metro users can't rely on this on the web, as their app is not a JavaScript module and import.meta.url
 * is not rewritten by Metro. For those users, we include a pre-bundled worker they can copy into a static assets
 * directory and load with a custom URI. This also means that defaultWorker cannot work with Metro for React Native Web.
 * We have a custom rollup plugin and conditional exports that replaces this function with a throwing stub for that
 * platform. This allows a helpful error message.
 */
// Note: When changing this function, also update disableDefaultWorkers in rollup.config.ts.
function spawnDefaultPowerSyncWorker(shared: boolean, name: string): Worker | SharedWorker {
  return shared
    ? new SharedWorker(new URL('./worker.js', import.meta.url), {
        /* @vite-ignore */
        name,
        type: 'module'
      })
    : new Worker(new URL('./worker.js', import.meta.url), {
        /* @vite-ignore */
        name,
        type: 'module'
      });
}

export function connectToExistingWorker(worker: Worker | SharedWorker, service: WorkerService): WorkerConnection {
  const isShared = isSharedWorker(worker);
  if (isShared) {
    const { port1, port2 } = new MessageChannel();
    const mainPort = (worker as SharedWorker).port;
    mainPort.start();
    mainPort.postMessage({ port: port1, service } satisfies SharedWorkerConnectionRequest, [port1]);

    port2.start();
    return {
      endpoint: port2,
      worker,
      close() {
        port2.close();
      }
    };
  } else {
    return {
      endpoint: worker as Worker,
      worker,
      close() {
        worker.terminate();
      }
    };
  }
}

export function isSharedWorker(worker: Worker | SharedWorker): worker is SharedWorker {
  return 'port' in worker;
}
