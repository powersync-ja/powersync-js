/**
 * Supports both shared and dedicated workers, based on how the worker is constructed (new SharedWorker vs new Worker()).
 */

import '@journeyapps/wa-sqlite';
import { createBaseLogger, createLogger } from '@powersync/common';
import * as Comlink from 'comlink';
import { WorkerDBOpenerOptions } from '../../db/adapters/wa-sqlite/WASQLiteOpenFactory.js';
import { MultiDatabaseServer } from './MultiDatabaseServer.js';

const baseLogger = createBaseLogger();
baseLogger.useDefaults();
const logger = createLogger('db-worker');

const server = new MultiDatabaseServer(logger);

async function serveDatabase(options: WorkerDBOpenerOptions) {
  return await server.handleConnection(options);
}

// Check if we're in a SharedWorker context
if (typeof SharedWorkerGlobalScope !== 'undefined') {
  const _self: SharedWorkerGlobalScope = self as any;
  _self.onconnect = function (event: MessageEvent<string>) {
    const port = event.ports[0];
    Comlink.expose(serveDatabase, port);
  };
} else {
  // A dedicated worker can be shared externally
  Comlink.expose(serveDatabase);
}

addEventListener('unload', () => {
  server.closeAll();
});
