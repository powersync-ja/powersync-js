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
  const name = `${shared ? 'shared' : ''}-powersync-${databaseIdentifier}`;
  let worker: Worker | SharedWorker;

  if (customWorker) {
    worker = shared
      ? new SharedWorker(customWorker, {
          /* @vite-ignore */
          name
        })
      : new Worker(customWorker, {
          /* @vite-ignore */
          name
        });
  } else {
    // When users depend on the web SDK, we assume they use their own bundler (either vite or webpack). Both recognize
    // the syntax of worker constructors with a string literal and will rewrite the URL as part of their source
    // transformations.
    // Users with custom workers can copy @powersync/web/bundled_worker into a static output directory and use that url
    // as an option when constructing databases.
    worker = shared
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

  return connectToExistingWorker(worker, service);
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
