import * as Comlink from 'comlink';

import { createConsoleLogger, LogLevels } from '@powersync/common';
import { isSharedWorker, MultiDatabaseServer } from './db/MultiDatabaseServer.js';
import { SharedSyncImplementation } from './sync/SharedSyncImplementation.js';
import { OpenWorkerConnection } from '../db/adapters/wa-sqlite/DatabaseClient.js';
import { SharedWorkerConnectionRequest } from './SharedWorkerConnectionRequest.js';
import { WorkerClient } from './sync/WorkerClient.js';

const sharedSyncImplementation = new SharedSyncImplementation();
const server = new MultiDatabaseServer(createConsoleLogger({ prefix: 'db-worker', minLevel: LogLevels.trace }));

const exposedDatabaseFunctions: OpenWorkerConnection = {
  connect: (config) => server.handleConnection(config),
  connectToExisting: ({ identifier, lockName }) => server.connectToExisting(identifier, lockName)
};

if (isSharedWorker) {
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
      } else {
        new WorkerClient(sharedSyncImplementation, port);
      }
    };
  };
} else {
  // Dedicated workers are only used for databases, so we don't need an intermediate layer.
  Comlink.expose(exposedDatabaseFunctions);
}
