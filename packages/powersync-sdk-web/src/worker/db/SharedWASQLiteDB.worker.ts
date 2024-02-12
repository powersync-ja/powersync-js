import '@journeyapps/wa-sqlite';

import _ from 'lodash';
import * as Comlink from 'comlink';
import { DBWorkerInterface, _openDB } from './open-db';

const _self: SharedWorkerGlobalScope = self as any;

const DBMap = new Map<string, Promise<DBWorkerInterface>>();

const openDB = async (dbFileName: string): Promise<DBWorkerInterface> => {
  if (!DBMap.has(dbFileName)) {
    const openPromise = _openDB(dbFileName);
    DBMap.set(dbFileName, openPromise);
    openPromise.catch((error) => {
      // Allow for retries if an error ocurred
      console.error(error);
      DBMap.delete(dbFileName);
    });
  }
  return Comlink.proxy(await DBMap.get(dbFileName)!);
};

_self.onconnect = function (event: MessageEvent<string>) {
  const port = event.ports[0];
  console.debug('Exposing db on port', port);
  Comlink.expose(openDB, port);
};

addEventListener('beforeunload', (event) => {
  Array.from(DBMap.values()).forEach(async (dbPromise) => {
    const db = await dbPromise;
    db.close?.();
  });
});
