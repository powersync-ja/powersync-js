/**
 * Supports both shared and dedicated workers, based on how the worker is constructed (new SharedWorker vs new Worker()).
 */

import '@journeyapps/wa-sqlite';
import * as Comlink from 'comlink';
import { AsyncDatabaseConnection } from '../../db/adapters/AsyncDatabaseConnection';
import { WASqliteConnection } from '../../db/adapters/wa-sqlite/WASQLiteConnection';
import { ResolvedWASQLiteOpenFactoryOptions } from '../../db/adapters/wa-sqlite/WASQLiteOpenFactory';
import { getNavigatorLocks } from '../../shared/navigator';

/**
 * Keeps track of open DB connections and the clients which
 * are using it.
 */
type SharedDBWorkerConnection = {
  clientIds: Set<number>;
  db: AsyncDatabaseConnection;
};

const DBMap = new Map<string, SharedDBWorkerConnection>();
const OPEN_DB_LOCK = 'open-wasqlite-db';

let nextClientId = 1;

const openWorkerConnection = async (options: ResolvedWASQLiteOpenFactoryOptions): Promise<AsyncDatabaseConnection> => {
  const connection = new WASqliteConnection(options);
  return {
    init: Comlink.proxy(() => connection.init()),
    getConfig: Comlink.proxy(() => connection.getConfig()),
    close: Comlink.proxy(() => connection.close()),
    execute: Comlink.proxy(async (sql: string, params?: any[]) => connection.execute(sql, params)),
    executeBatch: Comlink.proxy(async (sql: string, params?: any[]) => connection.executeBatch(sql, params)),
    registerOnTableChange: Comlink.proxy(async (callback) => {
      // Proxy the callback remove function
      return Comlink.proxy(await connection.registerOnTableChange(callback));
    })
  };
};

const openDBShared = async (options: ResolvedWASQLiteOpenFactoryOptions): Promise<AsyncDatabaseConnection> => {
  // Prevent multiple simultaneous opens from causing race conditions
  return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
    const clientId = nextClientId++;
    const { dbFilename } = options;
    if (!DBMap.has(dbFilename)) {
      const clientIds = new Set<number>();
      const connection = await openWorkerConnection(options);
      await connection.init();
      DBMap.set(dbFilename, {
        clientIds,
        db: connection
      });
    }

    const dbEntry = DBMap.get(dbFilename)!;
    dbEntry.clientIds.add(clientId);
    const { db } = dbEntry;

    const wrappedConnection = {
      ...db,
      init: Comlink.proxy(() => {
        // the init has been done automatically
      }),
      close: Comlink.proxy(() => {
        const { clientIds } = dbEntry;
        console.debug(`Close requested from client ${clientId} of ${[...clientIds]}`);
        clientIds.delete(clientId);
        if (clientIds.size == 0) {
          console.debug(`Closing connection to ${dbFilename}.`);
          DBMap.delete(dbFilename);
          return db.close?.();
        }
        console.debug(`Connection to ${dbFilename} not closed yet due to active clients.`);
        return;
      })
    };

    return Comlink.proxy(wrappedConnection);
  });
};

// Check if we're in a SharedWorker context
if (typeof SharedWorkerGlobalScope !== 'undefined') {
  const _self: SharedWorkerGlobalScope = self as any;
  _self.onconnect = function (event: MessageEvent<string>) {
    const port = event.ports[0];
    console.debug('Exposing shared db on port', port);
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
