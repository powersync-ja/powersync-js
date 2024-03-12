import '@journeyapps/wa-sqlite';

import * as Comlink from 'comlink';
import { v4 as uuid } from 'uuid';

import { DBWorkerInterface, _openDB } from './open-db';

/**
 * Keeps track of open DB connections and the clients which
 * are using it.
 */
type SharedDBWorkerConnection = {
  clientIds: Set<string>;
  db: DBWorkerInterface;
};

const _self: SharedWorkerGlobalScope = self as any;

const DBMap = new Map<string, SharedDBWorkerConnection>();
const OPEN_DB_LOCK = 'open-wasqlite-db';

const openDB = async (dbFileName: string): Promise<DBWorkerInterface> => {
  // Prevent multiple simultaneous opens from causing race conditions
  return navigator.locks.request(OPEN_DB_LOCK, async () => {
    const clientId = uuid();

    if (!DBMap.has(dbFileName)) {
      const clientIds = new Set<string>();
      const connection = await _openDB(dbFileName);
      DBMap.set(dbFileName, {
        clientIds,
        db: connection
      });
    }

    const dbEntry = DBMap.get(dbFileName)!;
    dbEntry.clientIds.add(clientId);
    const { db } = dbEntry;

    const wrappedConnection = {
      ...db,
      close: Comlink.proxy(() => {
        const { clientIds } = dbEntry;
        clientIds.delete(clientId);
        if (clientIds.size == 0) {
          console.debug(`Closing connection to ${dbFileName}.`);
          DBMap.delete(dbFileName);
          return db.close?.();
        }
        console.debug(`Connection to ${dbFileName} not closed yet due to active clients.`);
      })
    };

    return Comlink.proxy(wrappedConnection);
  });
};

_self.onconnect = function (event: MessageEvent<string>) {
  const port = event.ports[0];
  console.debug('Exposing db on port', port);
  Comlink.expose(openDB, port);
};

addEventListener('unload', () => {
  Array.from(DBMap.values()).forEach(async (dbConnection) => {
    const db = await dbConnection.db;
    db.close?.();
  });
});
