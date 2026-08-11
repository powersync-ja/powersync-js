import { LogLevels, PowerSyncLogger } from '@powersync/common';
import * as Comlink from 'comlink';
import { ClientConnectionView, DatabaseServer } from '../../db/adapters/wa-sqlite/DatabaseServer.js';
import { getNavigatorLocks } from '../../shared/navigator.js';
import { RawSqliteConnection, RawWaSqliteDatabaseOptions } from '../../db/adapters/wa-sqlite/RawSqliteConnection.js';
import { ConcurrentSqliteConnection } from '../../db/adapters/wa-sqlite/ConcurrentConnection.js';
import { WASQLiteVFS } from '../../db/adapters/wa-sqlite/vfs.js';
import { Mutex } from '@powersync/shared-internals';

const OPEN_DB_LOCK = 'open-wasqlite-db';

export interface ConnectToMultiDatabaseServerOptions {
  logLevel: number;
  database: RawWaSqliteDatabaseOptions;
  lockName: string;
}

/**
 * Shared state to manage multiple database connections hosted by a worker.
 */
export class MultiDatabaseServer {
  readonly #activeDatabases = new Map<string, DatabaseServer>();
  readonly #localOpenLock = new Mutex();

  constructor(readonly logger: PowerSyncLogger) {}

  async handleConnection({
    logLevel,
    database,
    lockName
  }: ConnectToMultiDatabaseServerOptions): Promise<ClientConnectionView> {
    const logger: PowerSyncLogger = {
      log: (record) => {
        if (record.level >= logLevel) this.logger.log(record);
      }
    };

    return Comlink.proxy(await this.openConnectionLocally(logger, database, lockName));
  }

  async connectToExisting(name: string, lockName: string): Promise<ClientConnectionView> {
    return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
      const server = this.#activeDatabases.get(name);
      if (server == null) {
        throw new Error(`connectToExisting(${name}) failed because the worker doesn't own a database with that name.`);
      }

      return Comlink.proxy(await server.connect(lockName));
    });
  }

  async openConnectionLocally(logger: PowerSyncLogger, options: RawWaSqliteDatabaseOptions, lockName?: string) {
    // Especially on Firefox, we're sometimes seeing "NoModificationAllowedError"s when opening OPFS databases we can
    // work around by retrying.
    const maxAttempts = 3;
    let server: DatabaseServer | null;

    for (let count = 0; count < maxAttempts - 1; count++) {
      try {
        server = await this.#databaseOpenAttempt(logger, options);
      } catch (error) {
        this.logger.log({
          level: LogLevels.warn,
          message: `Attempt ${count + 1} of ${maxAttempts} to open database failed, retrying in 1 second...`,
          error
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Final attempt if we haven't been able to open the server - rethrow errors if we still can't open.
    server ??= await this.#databaseOpenAttempt(logger, options);
    return server.connect(lockName);
  }

  async #databaseOpenAttempt(logger: PowerSyncLogger, options: RawWaSqliteDatabaseOptions): Promise<DatabaseServer> {
    const { filename, readonly, vfs } = options;
    // We don't need navigator locks for shared workers because all queries run in this shared worker exclusively.
    // For read-only connections, we use a VFS that supports concurrent reads (so a single lock on the connection is
    // fine). In-memory databases either run in a shared worker or aren't shared across tabs at all, so the internal
    // lock is enough.
    const needsNavigatorLocks = !(isSharedWorker || readonly || vfs == WASQLiteVFS.InMemoryVfs);
    const activeDatabases = this.#activeDatabases;

    async function openDatabase() {
      let server: DatabaseServer | undefined = activeDatabases.get(filename);
      if (server == null) {
        const connection = new RawSqliteConnection(options);
        const withSafeConcurrency = new ConcurrentSqliteConnection(connection, needsNavigatorLocks);

        // Initializing the RawSqliteConnection will run some pragmas that might write to the database file, so we want
        // to do that in an exclusive lock. Note that OPEN_DB_LOCK is not enough for that, as another tab might have
        // already created a connection (and is thus outside of OPEN_DB_LOCK) while currently writing to it.
        const returnLease = await withSafeConcurrency.acquireMutex();
        try {
          await connection.init();
        } catch (e) {
          returnLease();
          await connection.close();
          throw e;
        }
        returnLease();

        const onClose = () => activeDatabases.delete(filename);
        server = new DatabaseServer({
          inner: withSafeConcurrency,
          logger,
          onClose
        });
        activeDatabases.set(filename, server);
      }

      return server;
    }

    if (needsNavigatorLocks) {
      return getNavigatorLocks().request(OPEN_DB_LOCK, openDatabase);
    } else {
      // Even if we don't need navigator locks, this avoids a race between the activeDatabases.get() call, the async
      // open logic and the final activeDatabases.set() step.
      return this.#localOpenLock.runExclusive(openDatabase);
    }
  }

  closeAll() {
    const existingDatabases = [...this.#activeDatabases.values()];
    return Promise.all(
      existingDatabases.map((db) => {
        db.forceClose();
      })
    );
  }
}

export const isSharedWorker = 'SharedWorkerGlobalScope' in globalThis;
