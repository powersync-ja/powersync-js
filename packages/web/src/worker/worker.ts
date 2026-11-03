import * as Comlink from 'comlink';

import { createConsoleLogger, LogLevels } from '@powersync/common';
import { isSharedWorker, MultiDatabaseServer } from './db/MultiDatabaseServer.js';
import { SharedSyncImplementation } from './sync/SharedSyncImplementation.js';
import type { DedicatedFeatureDetectionResult, OpenWorkerConnection } from '../db/adapters/wa-sqlite/DatabaseClient.js';
import type { SharedWorkerConnectionRequest } from './SharedWorkerConnectionRequest.js';
import { WorkerClient } from './sync/WorkerClient.js';

interface NestedWorker {
  remote: Comlink.Remote<OpenWorkerConnection>;
  features: DedicatedFeatureDetectionResult;
}

const server = new MultiDatabaseServer(createConsoleLogger({ prefix: 'db-worker', minLevel: LogLevels.trace }));
let nestedWorker: Promise<NestedWorker> | null = null;

const exposedDatabaseFunctions: OpenWorkerConnection = {
  connect: (config) => server.handleConnection(config),
  connectToExisting: ({ identifier, lockName }) => server.connectToExisting(identifier, lockName),
  sharedFeatureDetection: async () => {
    let supportsOpfsInNestedWorkers = false;
    if ('Worker' in globalThis) {
      try {
        const worker = await (nestedWorker ??= trySpawningNestedWorker());
        supportsOpfsInNestedWorkers = worker.features.opfs;
      } catch (e) {
        // We don't support nested workers.
      }
    }

    return {
      nestedOpfs: supportsOpfsInNestedWorkers
    };
  },
  dedicatedFeatureDetection: async () => {
    return {
      openWithMode: fileSystemSupportsOpenMode(),
      opfs: await checkOpfsSupport()
    };
  },
  spawnNested: async () => {
    const { remote } = await (nestedWorker ??= trySpawningNestedWorker());

    const port = await remote[Comlink.createEndpoint]();
    return Comlink.transfer(port, [port]);
  }
};

async function checkOpfsSupport(): Promise<boolean> {
  const storage = navigator.storage;
  if (storage == null) return false;

  try {
    await storage.getDirectory();
    return true;
  } catch (e) {
    return false;
  }
}

function trySpawningNestedWorker(): Promise<NestedWorker> {
  const fork = new Worker(location.href, { type: 'module' });

  return new Promise((resolve, reject) => {
    let done = false;
    const wrapped = Comlink.wrap<OpenWorkerConnection>(fork);

    wrapped.dedicatedFeatureDetection().then(
      (features) => {
        done = true;
        resolve({ remote: wrapped, features });
      },
      (e) => {
        done = true;
        reject(e);
      }
    );

    fork.addEventListener('error', (e) => {
      if (!done) {
        done = true;
        reject(e);
      } else {
        console.error('Nested worker error', e);
      }
    });
  });
}

function fileSystemSupportsOpenMode(): boolean {
  // Credits: https://github.com/whatwg/fs/issues/34#issuecomment-1780168010
  return 'FileSystemSyncAccessHandle' in globalThis && FileSystemSyncAccessHandle.prototype.hasOwnProperty('mode');
}

if (isSharedWorker) {
  const sharedSyncImplementation = new SharedSyncImplementation();

  // A shared worker can either be an IndexedDB-VFS database server or a shared sync coordinator.
  // To be able to know what service a client is connecting to, we let clients send an inner MessagePort through the
  // top-level port along with a tag describing what they need.
  const _self = self as unknown as SharedWorkerGlobalScope;
  _self.onconnect = (outerEvent: MessageEvent) => {
    const port = outerEvent.ports[0];
    port.onmessage = (event: MessageEvent<SharedWorkerConnectionRequest>) => {
      const { service, port } = event.data;
      if (service === 'database') {
        Comlink.expose(exposedDatabaseFunctions, port);
      } else if (service === 'sync') {
        new WorkerClient(sharedSyncImplementation, port);
      }
    };
  };
} else {
  // Dedicated workers are only used for databases, so we don't need an intermediate layer.
  Comlink.expose(exposedDatabaseFunctions);
}
