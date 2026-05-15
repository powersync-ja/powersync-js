/**
 * Supports both shared and dedicated workers, based on how the worker is constructed (new SharedWorker vs new Worker()).
 */

import '@journeyapps/wa-sqlite';
import { createPowerSyncLogger, LogLevels } from '@powersync/common';
import * as Comlink from 'comlink';
import { isSharedWorker, MultiDatabaseServer } from './MultiDatabaseServer.js';
import { OpenWorkerConnection } from '../../db/adapters/wa-sqlite/DatabaseClient.js';

const logger = createPowerSyncLogger({ prefix: 'db-worker', minLevel: LogLevels.trace });

const server = new MultiDatabaseServer(logger);
const exposedFunctions: OpenWorkerConnection = {
  connect: (config) => server.handleConnection(config),
  connectToExisting: ({ identifier, lockName }) => server.connectToExisting(identifier, lockName)
};

// Check if we're in a SharedWorker context
if (isSharedWorker) {
  const _self: SharedWorkerGlobalScope = self as any;
  _self.onconnect = function (event: MessageEvent<string>) {
    const port = event.ports[0];
    Comlink.expose(exposedFunctions, port);
  };
} else {
  // A dedicated worker can be shared externally
  Comlink.expose(exposedFunctions);
}

addEventListener('unload', () => {
  server.closeAll();
});
