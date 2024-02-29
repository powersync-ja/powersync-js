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
  db: Promise<DBWorkerInterface>;
};

const _self: SharedWorkerGlobalScope = self as any;

const DBMap = new Map<string, SharedDBWorkerConnection>();

const openDB = async (dbFileName: string): Promise<DBWorkerInterface> => {
  const clientId = uuid();

  if (!DBMap.has(dbFileName)) {
    const clientIds = new Set<string>();
    const openPromise = _openDB(dbFileName).then((dbWorkerInterface) => {
      // Wrap the close method to only close if there are no active subscribers
      return {
        ...dbWorkerInterface,
        close: Comlink.proxy(() => {
          clientIds.delete(clientId);
          if (clientIds.size == 0) {
            console.debug(`Closing connection to ${dbFileName}.`);
            return dbWorkerInterface.close?.();
          }
          console.debug(`Connection to ${dbFileName} not closed yet due to active clients.`);
        })
      };
    });

    DBMap.set(dbFileName, {
      clientIds,
      db: openPromise
    });
    openPromise.catch((error) => {
      // Allow for retries if an error ocurred
      console.error(error);
      DBMap.delete(dbFileName);
    });
  }

  const dbEntry = DBMap.get(dbFileName)!;
  dbEntry.clientIds.add(clientId);

  return Comlink.proxy(await DBMap.get(dbFileName)!.db);
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
