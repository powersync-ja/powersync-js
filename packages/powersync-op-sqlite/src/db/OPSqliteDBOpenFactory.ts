import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { OPSQLiteDBAdapter } from './OPSqliteAdapter';
import { DEFAULT_SQLITE_OPTIONS, SqliteOptions } from './SqliteOptions';
import { OPSQLiteConnection } from './OPSQLiteConnection';
import { DB } from '@op-engineering/op-sqlite';

export interface OPSQLiteOpenFactoryOptions extends SQLOpenOptions {
  sqliteOptions?: SqliteOptions;
}
export class OPSqliteOpenFactory implements SQLOpenFactory {
  private sqliteOptions: Required<SqliteOptions>;
  private adapters: Set<OPSQLiteDBAdapter> = new Set();

  constructor(protected options: OPSQLiteOpenFactoryOptions) {
    this.sqliteOptions = {
      ...DEFAULT_SQLITE_OPTIONS,
      ...this.options.sqliteOptions
    };
  }

  openDB(): DBAdapter {
    const adapter = new OPSQLiteDBAdapter({
      name: this.options.dbFilename,
      dbLocation: this.options.dbLocation,
      sqliteOptions: this.sqliteOptions
    });
    this.adapters.add(adapter);
    (adapter as any).abortController.signal.addEventListener('abort', () => {
      this.adapters.delete(adapter);
    });

    return adapter;
  }

  /**
   * Opens a direct op-sqlite DB connection. This can be used concurrently with PowerSyncDatabase.
   *
   * This can be used to execute synchronous queries, or to access other op-sqlite functionality directly.
   *
   * Update notifications are propagated to any other PowerSyncDatabase opened with this factory.
   *
   * If a write statement or transaction is currently open on any of the other adapters, any
   * write statements on this connection will block until the others are done. This may create a deadlock,
   * since this also blocks the JavaScript thread. For that reason, do any write statements in a
   * writeLock() on the PowerSyncDatabase.
   *
   * Read statements can execute concurrently with write statements, so does not have the same risk.
   *
   * This is not recommended for most use cases, as synchronous queries block the JavaScript thread,
   * and the code is not portable to other platforms.
   */
  async openDirectConnection(): Promise<DB> {
    const adapter = new OPSQLiteDBAdapter({
      name: this.options.dbFilename,
      dbLocation: this.options.dbLocation,
      sqliteOptions: {
        ...this.sqliteOptions,
        readConnections: 0,
        // Configure the BUSY_TIMEOUT to be very short, since this is a direct connection.
        // In general, we should not wait for a lock when using any synchronous queries,
        // since any locks won't be released while we lock the JS thread.
        lockTimeoutMs: 50
      }
    });
    await (adapter as any).initialized;

    const connection = (adapter as any).writeConnection as OPSQLiteConnection;
    connection.registerListener({
      tablesUpdated: (updateNotification) => {
        // Pass on to all other adapters.
        this.adapters.forEach((adapter) => {
          adapter.iterateListeners((listener) => {
            listener.tablesUpdated?.(updateNotification);
          });
        });
      }
    });
    const database = (connection as any).DB as DB;

    database.commitHook(() => {
      // This is effectively a "pre-commit" hook, so changes may not actually reflect yet.
      // To make sure the changes reflect, we first get start a new write transaction (not just a
      // write lock, since we need to get a lock on the actual SQLite file).
      const firstAdapter = [...this.adapters][0];
      if (firstAdapter != null && connection.hasUpdates()) {
        firstAdapter
          .writeLock(async (tx) => {
            // Slightly less overhead than writeTransaction().
            await tx.execute('BEGIN EXCLUSIVE; ROLLBACK;');
          })
          .catch((e) => {
            // Ignore
          })
          .finally(() => {
            // This triggers the listeners registered above
            connection.flushUpdates();
          });
      }
    });

    return database;
  }
}
