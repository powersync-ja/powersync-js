/**
 * Supports both shared and dedicated workers, based on how the worker is constructed (new SharedWorker vs new Worker()).
 */

import '@journeyapps/wa-sqlite';
import { createBaseLogger, createLogger, ILogHandler, LogLevel } from '@powersync/common';
import * as Comlink from 'comlink';
import { AsyncDatabaseConnection, WorkerLogHandler } from '../../db/adapters/AsyncDatabaseConnection';
import { WASqliteConnection } from '../../db/adapters/wa-sqlite/WASQLiteConnection';
import {
  ResolvedWASQLiteOpenFactoryOptions,
  WorkerDBOpenerOptions
} from '../../db/adapters/wa-sqlite/WASQLiteOpenFactory';
import { getNavigatorLocks } from '../../shared/navigator';
import { LogHandler } from './LogHandler';

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

function logUnhandledException(error: Error) {
  const errorMessage = `
  Name: ${error.name}
  Cause: ${error.cause}
  Message: ${error.message}
  Stack: ${error.stack}`.trim();

  for (const dbFilename of DBMap.keys()) {
    logBroadcaster.pushLog({
      loggerName: dbFilename,
      logLevel: LogLevel.ERROR.name,
      messages: ['Uncaught Exception in DB worker', errorMessage]
    });
  }
}

// Report unhandled exceptions to all loggers
addEventListener('unhandledrejection', (event) => {
  logUnhandledException(event.reason);
});

addEventListener('error', (event) => {
  logUnhandledException(event.error);
});

const baseLogger = createBaseLogger();

const logBroadcaster = new LogHandler();

const defaultHandler = baseLogger.createDefaultHandler();
const logHandler: ILogHandler = (messages, context) => {
  logBroadcaster.pushLog({
    loggerName: context.name ?? 'unknown',
    logLevel: context.level.name,
    messages: messages.map((m) => String(m))
  });
  defaultHandler(messages, context);
};

baseLogger.useDefaults({
  formatter: logHandler
});

const workerLogger = createLogger('db-worker');

const openWorkerConnection = async (options: ResolvedWASQLiteOpenFactoryOptions): Promise<AsyncDatabaseConnection> => {
  const connection = new WASqliteConnection(options);
  return {
    init: Comlink.proxy(() => connection.init()),
    getConfig: Comlink.proxy(async () => {
      // Can't send the logger over
      const { logger, ...rest } = await connection.getConfig();
      return rest;
    }),
    close: Comlink.proxy(() => connection.close()),
    execute: Comlink.proxy(async (sql: string, params?: any[]) => connection.execute(sql, params)),
    executeRaw: Comlink.proxy(async (sql: string, params?: any[]) => connection.executeRaw(sql, params)),
    executeBatch: Comlink.proxy(async (sql: string, params?: any[]) => connection.executeBatch(sql, params)),
    registerOnTableChange: Comlink.proxy(async (callback) => {
      // Proxy the callback remove function
      return Comlink.proxy(await connection.registerOnTableChange(callback));
    })
  };
};

const openDBShared = async (
  options: WorkerDBOpenerOptions,
  logHandler?: WorkerLogHandler
): Promise<AsyncDatabaseConnection> => {
  // Prevent multiple simultaneous opens from causing race conditions
  return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
    const clientId = nextClientId++;
    const { dbFilename, logLevel } = options;

    // This updates the log level for the worker-level logger
    // The DB connection logger will automatically track the main context logger
    // since it passes logs to it.
    workerLogger.setLevel(logLevel);

    let disposeLogListener = logHandler
      ? logBroadcaster.registerListener({
          onLog: (event) => {
            if (event.loggerName !== dbFilename) {
              return;
            }
            logHandler(event);
          }
        })
      : null;

    if (!DBMap.has(dbFilename)) {
      const clientIds = new Set<number>();
      const logger = createLogger(dbFilename);
      const connection = await openWorkerConnection({
        ...options,
        logger
      });
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
      init: Comlink.proxy(async () => {
        // the init has been done automatically
      }),
      close: Comlink.proxy(async () => {
        const { clientIds } = dbEntry;
        disposeLogListener?.();
        workerLogger.debug(`Close requested from client ${clientId} of ${[...clientIds]}`);
        clientIds.delete(clientId);
        if (clientIds.size == 0) {
          workerLogger.debug(`Closing connection to ${dbFilename}.`);
          DBMap.delete(dbFilename);
          return db.close?.();
        }
        workerLogger.debug(`Connection to ${dbFilename} not closed yet due to active clients.`);
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
