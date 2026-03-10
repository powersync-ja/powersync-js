import { ILogger } from '@powersync/common';
import { ClientConnectionView, DatabaseServer } from '../../db/adapters/wa-sqlite/DatabaseServer.js';
import { WorkerDBOpenerOptions } from '../../db/adapters/wa-sqlite/WASQLiteOpenFactory.js';
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
    // Prevent multiple simultaneous opens from causing race conditions
    return getNavigatorLocks().request(OPEN_DB_LOCK, async () => {
      const { dbFilename, logLevel, lockName } = options;

      this.logger.setLevel(logLevel);

      let server: DatabaseServer | undefined = this.activeDatabases.get(dbFilename);
      if (server == null) {
        const connection = new RawSqliteConnection(options);
        await connection.init();

        const onClose = () => this.activeDatabases.delete(dbFilename);
        server = new DatabaseServer(new ConcurrentSqliteConnection(connection), this.logger, onClose);
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
