/**
 * Supports both shared and dedicated workers, based on how the worker is constructed (new SharedWorker vs new Worker()).
 */

import '@journeyapps/wa-sqlite';
import * as Comlink from 'comlink';
import { WASQLiteOpenOptions, WASqliteConnection } from '../../db/adapters/wa-sqlite/WASQLiteConnection';
import { getNavigatorLocks } from '../../shared/navigator';
import type { DBFunctionsInterface } from '../../shared/types';

/**
 * Keeps track of open DB connections and the clients which
 * are using it.
 */
type SharedDBWorkerConnection = {
  clientIds: Set<number>;
  db: DBFunctionsInterface;
};

const DBMap = new Map<string, SharedDBWorkerConnection>();
const OPEN_DB_LOCK = 'open-wasqlite-db';

let nextClientId = 1;

const openWorkerConnection = async (options: WASQLiteOpenOptions): Promise<DBFunctionsInterface> => {
  const connection = new WASqliteConnection(options);
  await connection.init();
  return {
    execute: async (sql: string, params?: any[]) => {
      const result = await connection.execute(sql, params);
      // Remove array index accessor functions
      return {
        rows: result.rows,
        rowsAffected: result.rowsAffected,
        insertId: result.insertId
      };
    },
    executeBatch: async (sql: string, params?: any[]) => {
      const result = await connection.executeBatch(sql, params);
      // Remove array index accessor functions
      return {
        rows: result.rows,
        rowsAffected: result.rowsAffected,
        insertId: result.insertId
      };
    },
    registerOnTableChange: (callback) => {
      // Proxy the callback remove function
      return Comlink.proxy(connection.registerOnTableChange(callback));
    }
  };
};

const openDBShared = async (options: WASQLiteOpenOptions): Promise<DBFunctionsInterface> => {
  // Prevent multiple simultaneous opens from causing race conditions
  return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
    const clientId = nextClientId++;
    const { dbFileName } = options;
    if (!DBMap.has(dbFileName)) {
      const clientIds = new Set<number>();
      const connection = await openWorkerConnection(options);
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

const openDBDedicated = async (options: WASQLiteOpenOptions): Promise<DBFunctionsInterface> => {
  const connection = await openWorkerConnection(options);
  return Comlink.proxy(connection);
};

// Check if we're in a SharedWorker context
if (typeof SharedWorkerGlobalScope !== 'undefined') {
  const _self: SharedWorkerGlobalScope = self as any;
  _self.onconnect = function (event: MessageEvent<string>) {
    const port = event.ports[0];
    console.debug('Exposing shared db on port', port);
    Comlink.expose(openDBShared, port);
  };

  addEventListener('unload', () => {
    Array.from(DBMap.values()).forEach(async (dbConnection) => {
      const db = await dbConnection.db;
      db.close?.();
    });
  });
} else {
  Comlink.expose(openDBDedicated);
}
