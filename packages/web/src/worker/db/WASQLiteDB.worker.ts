/**
 * Supports both shared and dedicated workers, based on how the worker is constructed (new SharedWorker vs new Worker()).
 */

import '@journeyapps/wa-sqlite';
import { createBaseLogger, createLogger } from '@powersync/common';
import * as Comlink from 'comlink';
import { AsyncDatabaseConnection } from '../../db/adapters/AsyncDatabaseConnection';
import { WorkerDBOpenerOptions } from '../../db/adapters/wa-sqlite/WASQLiteOpenFactory';
import { getNavigatorLocks } from '../../shared/navigator';
import { SharedDBWorkerConnection, SharedWASQLiteConnection } from './SharedWASQLiteConnection';
import { WorkerWASQLiteConnection } from './WorkerWASQLiteConnection';

const baseLogger = createBaseLogger();
baseLogger.useDefaults();
const logger = createLogger('db-worker');

const DBMap = new Map<string, SharedDBWorkerConnection>();
const OPEN_DB_LOCK = 'open-wasqlite-db';
let nextClientId = 1;

const openDBShared = async (options: WorkerDBOpenerOptions): Promise<AsyncDatabaseConnection> => {
  // Prevent multiple simultaneous opens from causing race conditions
  return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
    const clientId = nextClientId++;
    const { dbFilename, logLevel } = options;

    logger.setLevel(logLevel);

    if (!DBMap.has(dbFilename)) {
      const clientIds = new Set<number>();
      // This format returns proxy objects for function callbacks
      const connection = new WorkerWASQLiteConnection(options);
      await connection.init();

      connection.registerListener({
        holdOverwritten: async () => {
          /**
           * The previous hold has been overwritten, without being released.
           * we need to cleanup any resources associated with it.
           * We can perform a rollback to release any potential transactions that were started.
           */
          await connection.execute('ROLLBACK').catch(() => {});
        }
      });

      DBMap.set(dbFilename, {
        clientIds,
        db: connection
      });
    }

    // Associates this clientId with the shared connection entry
    const sharedConnection = new SharedWASQLiteConnection({
      dbMap: DBMap,
      dbFilename,
      clientId,
      logger
    });

    return Comlink.proxy(sharedConnection);
  });
};

// Check if we're in a SharedWorker context
if (typeof SharedWorkerGlobalScope !== 'undefined') {
  const _self: SharedWorkerGlobalScope = self as any;
  _self.onconnect = function (event: MessageEvent<string>) {
    const port = event.ports[0];
    Comlink.expose(openDBShared, port);
  };
} else {
  // A dedicated worker can be shared externally
  Comlink.expose(openDBShared);
}

addEventListener('unload', () => {
  Array.from(DBMap.values()).forEach(async (dbConnection) => {
    const { db } = dbConnection;
    db.close?.();
  });
});
