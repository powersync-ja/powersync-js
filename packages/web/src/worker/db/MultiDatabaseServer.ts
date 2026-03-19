import { ILogger } from '@powersync/common';
import * as Comlink from 'comlink';
import { ClientConnectionView, DatabaseServer } from '../../db/adapters/wa-sqlite/DatabaseServer.js';
import {
  ResolvedWASQLiteOpenFactoryOptions,
  WorkerDBOpenerOptions
} from '../../db/adapters/wa-sqlite/WASQLiteOpenFactory.js';
import { getNavigatorLocks } from '../../shared/navigator.js';
import { RawSqliteConnection } from '../../db/adapters/wa-sqlite/RawSqliteConnection.js';
import { ConcurrentSqliteConnection } from '../../db/adapters/wa-sqlite/ConcurrentConnection.js';

const OPEN_DB_LOCK = 'open-wasqlite-db';

/**
 * Shared state to manage multiple database connections hosted by a worker.
 */
export class MultiDatabaseServer {
  private activeDatabases = new Map<string, DatabaseServer>();

  constructor(readonly logger: ILogger) {}

  async handleConnection(options: WorkerDBOpenerOptions): Promise<ClientConnectionView> {
    this.logger.setLevel(options.logLevel);
    return Comlink.proxy(await this.openConnectionLocally(options, options.lockName));
  }

  async connectToExisting(name: string, lockName: string): Promise<ClientConnectionView> {
    return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
      const server = this.activeDatabases.get(name);
      if (server == null) {
        throw new Error(`connectToExisting(${name}) failed because the worker doesn't own a database with that name.`);
      }

      return Comlink.proxy(await server.connect(lockName));
    });
  }

  async openConnectionLocally(options: ResolvedWASQLiteOpenFactoryOptions, lockName?: string) {
    // Prevent multiple simultaneous opens from causing race conditions
    return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
      const { dbFilename } = options;

      let server: DatabaseServer | undefined = this.activeDatabases.get(dbFilename);
      if (server == null) {
        const needsNavigatorLocks = !isSharedWorker;
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

        const onClose = () => this.activeDatabases.delete(dbFilename);
        server = new DatabaseServer({
          inner: withSafeConcurrency,
          logger: this.logger,
          onClose
        });
        this.activeDatabases.set(dbFilename, server);
      }

      return server.connect(lockName);
    });
  }

  closeAll() {
    const existingDatabases = [...this.activeDatabases.values()];
    return Promise.all(
      existingDatabases.map((db) => {
        db.forceClose();
      })
    );
  }
}

export const isSharedWorker = 'SharedWorkerGlobalScope' in globalThis;
