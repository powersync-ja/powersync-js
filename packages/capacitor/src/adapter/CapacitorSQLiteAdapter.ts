import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

import {
  BaseObserver,
  BatchedUpdateNotification,
  DBAdapter,
  DBAdapterListener,
  DBLockOptions,
  LockContext,
  QueryResult,
  Transaction
} from '@powersync/web';
import Lock from 'async-lock';
import { PowerSyncCore } from '../plugin/PowerSyncCore';
import { messageForErrorCode } from '../plugin/PowerSyncPlugin';
import { CapacitorSQLiteOpenFactoryOptions, DEFAULT_SQLITE_OPTIONS } from './CapacitorSQLiteOpenFactory';
/**
 * Monitors the execution time of a query and logs it to the performance timeline.
 */
async function monitorQuery(sql: string, executor: () => Promise<QueryResult>): Promise<QueryResult> {
  const start = performance.now();
  try {
    const r = await executor();
    performance.measure(`[SQL] ${sql}`, { start });
    return r;
  } catch (e: any) {
    performance.measure(`[SQL] [ERROR: ${e.message}] ${sql}`, { start });
    throw e;
  }
}
/**
 * An implementation of {@link DBAdapter} using the Capacitor Community SQLite [plugin](https://github.com/capacitor-community/sqlite).
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class CapacitorSQLiteAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  protected _writeConnection: SQLiteDBConnection | null;
  protected _readConnection: SQLiteDBConnection | null;
  protected initializedPromise: Promise<void>;
  protected lock: Lock;

  constructor(protected options: CapacitorSQLiteOpenFactoryOptions) {
    super();
    this._writeConnection = null;
    this._readConnection = null;
    this.lock = new Lock();
    this.initializedPromise = this.init();
  }

  protected get writeConnection(): SQLiteDBConnection {
    if (!this._writeConnection) {
      throw new Error('Init not completed yet');
    }
    return this._writeConnection;
  }

  protected get readConnection(): SQLiteDBConnection {
    if (!this._readConnection) {
      throw new Error('Init not completed yet');
    }
    return this._readConnection;
  }

  get name() {
    return this.options.dbFilename;
  }

  private async init() {
    const { responseCode: registrationResponseCode } = await PowerSyncCore.registerCore();
    if (registrationResponseCode != 0) {
      throw new Error(`Could not register PowerSync core extension: ${messageForErrorCode(registrationResponseCode)}`);
    }

    const sqlite = new SQLiteConnection(CapacitorSQLite);

    // It seems like the isConnection and retrieveConnection methods
    // only check a JS side map of connections.
    // On hot reload this JS cache can be cleared, while the connection
    // still exists natively. and `createConnection` will fail if it already exists.
    await sqlite.closeConnection(this.options.dbFilename, false).catch(() => {});
    await sqlite.closeConnection(this.options.dbFilename, true).catch(() => {});

    // TODO support encryption eventually
    this._writeConnection = await sqlite.createConnection(this.options.dbFilename, false, 'no-encryption', 1, false);
    this._readConnection = await sqlite.createConnection(this.options.dbFilename, false, 'no-encryption', 1, true);

    await this._writeConnection.open();

    const { cacheSizeKb, journalSizeLimit, synchronous } = { ...DEFAULT_SQLITE_OPTIONS, ...this.options.sqliteOptions };

    await this.writeConnection.query('PRAGMA journal_mode = WAL');
    await this.writeConnection.query(`PRAGMA journal_size_limit = ${journalSizeLimit}`);
    await this.writeConnection.query(`PRAGMA temp_store = memory`);
    await this.writeConnection.query(`PRAGMA synchronous = ${synchronous}`);
    await this.writeConnection.query(`PRAGMA cache_size = -${cacheSizeKb}`);

    await this._readConnection.open();

    const platform = Capacitor.getPlatform();
    if (platform == 'android') {
      /**
       * SQLCipher for Android enables dynamic loading of extensions.
       * On iOS we use a static auto extension registration.
       */
      const extensionQuery = "SELECT load_extension('libpowersync.so', 'sqlite3_powersync_init')";
      await this.writeConnection.query(extensionQuery);
      await this.readConnection.query(extensionQuery);
    }
    await this.writeConnection.query("SELECT powersync_update_hooks('install')");
  }

  async close(): Promise<void> {
    await this.initializedPromise;
    await this.writeConnection.close();
    await this.readConnection.close();
  }

  protected generateLockContext(db: SQLiteDBConnection): LockContext {
    const _query = async (query: string, params: any[] = []) => {
      const result = await db.query(query, params);
      const arrayResult = result.values ?? [];
      return {
        rowsAffected: 0,
        rows: {
          _array: arrayResult,
          length: arrayResult.length,
          item: (idx: number) => arrayResult[idx]
        }
      };
    };

    const _execute = async (query: string, params: any[] = []): Promise<QueryResult> => {
      const platform = Capacitor.getPlatform();

      if (db.getConnectionReadOnly()) {
        return _query(query, params);
      }

      if (platform == 'android') {
        // Android: use query for SELECT and executeSet for mutations
        // We cannot use `run` here for both cases.
        if (query.toLowerCase().trim().startsWith('select')) {
          return _query(query, params);
        } else {
          const result = await db.executeSet([{ statement: query, values: params }], false);
          return {
            insertId: result.changes?.lastId,
            rowsAffected: result.changes?.changes ?? 0,
            rows: {
              _array: [],
              length: 0,
              item: () => null
            }
          };
        }
      }

      // iOS (and other platforms): use run("all")
      const result = await db.run(query, params, false, 'all');
      const resultSet = result.changes?.values ?? [];
      return {
        insertId: result.changes?.lastId,
        rowsAffected: result.changes?.changes ?? 0,
        rows: {
          _array: resultSet,
          length: resultSet.length,
          item: (idx) => resultSet[idx]
        }
      };
    };

    const execute = this.options.debugMode
      ? (sql: string, params?: any[]) => monitorQuery(sql, () => _execute(sql, params))
      : _execute;

    const executeQuery = this.options.debugMode
      ? (sql: string, params?: any[]) => monitorQuery(sql, () => _query(sql, params))
      : _query;

    const getAll = async <T>(query: string, params?: any[]): Promise<T[]> => {
      const result = await executeQuery(query, params);
      return result.rows?._array ?? ([] as T[]);
    };

    const getOptional = async <T>(query: string, params?: any[]): Promise<T | null> => {
      const results = await getAll<T>(query, params);
      return results.length > 0 ? results[0] : null;
    };

    const get = async <T>(query: string, params?: any[]): Promise<T> => {
      const result = await getOptional<T>(query, params);
      if (!result) {
        throw new Error(`No results for query: ${query}`);
      }
      return result;
    };

    const executeRaw = async (query: string, params?: any[]): Promise<any[][]> => {
      // This is a workaround, we don't support multiple columns of the same name
      const results = await execute(query, params);
      return results.rows?._array.map((row) => Object.values(row)) ?? [];
    };

    return {
      getAll,
      getOptional,
      get,
      executeRaw,
      execute
    };
  }

  execute(query: string, params?: any[]): Promise<QueryResult> {
    return this.writeLock((tx) => tx.execute(query, params));
  }

  executeRaw(query: string, params?: any[]): Promise<any[][]> {
    return this.writeLock((tx) => tx.executeRaw(query, params));
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    return this.writeLock(async (tx) => {
      let result = await this.writeConnection.executeSet(
        params.map((param) => ({
          statement: query,
          values: param
        }))
      );

      return {
        rowsAffected: result.changes?.changes ?? 0,
        insertId: result.changes?.lastId
      };
    });
  }

  readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.lock.acquire('read_lock', async () => {
      await this.initializedPromise;
      return await fn(this.generateLockContext(this.readConnection));
    });
  }

  readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.readLock(async (ctx) => {
      return this.internalTransaction(ctx, fn);
    });
  }

  writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.lock.acquire('write_lock', async () => {
      await this.initializedPromise;
      const result = await fn(this.generateLockContext(this.writeConnection));

      // Fetch table updates
      const updates = await this.writeConnection.query("SELECT powersync_update_hooks('get') AS table_name");
      const jsonUpdates = updates.values?.[0];
      if (!jsonUpdates || !jsonUpdates.table_name) {
        throw new Error('Could not fetch table updates');
      }
      const notification: BatchedUpdateNotification = {
        rawUpdates: [],
        tables: JSON.parse(jsonUpdates.table_name),
        groupedUpdates: {}
      };
      this.iterateListeners((l) => l.tablesUpdated?.(notification));
      return result;
    });
  }

  writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeLock(async (ctx) => {
      return this.internalTransaction(ctx, fn);
    });
  }

  refreshSchema(): Promise<void> {
    return this.writeLock(async (writeTx) => {
      return this.readLock(async (readTx) => {
        const updateQuery = `PRAGMA table_info('sqlite_master')`;
        await writeTx.get(updateQuery);
        await readTx.get(updateQuery);
      });
    });
  }

  getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.readLock((tx) => tx.getAll<T>(sql, parameters));
  }

  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    return this.readLock((tx) => tx.getOptional<T>(sql, parameters));
  }

  get<T>(sql: string, parameters?: any[]): Promise<T> {
    return this.readLock((tx) => tx.get<T>(sql, parameters));
  }

  protected async internalTransaction<T>(ctx: LockContext, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    let finalized = false;
    const commit = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return ctx.execute('COMMIT');
    };
    const rollback = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return ctx.execute('ROLLBACK');
    };
    try {
      await ctx.execute('BEGIN');
      const result = await fn({
        ...ctx,
        commit,
        rollback
      });
      await commit();
      return result;
    } catch (ex) {
      try {
        await rollback();
      } catch (ex2) {
        // In rare cases, a rollback may fail.
        // Safe to ignore.
      }
      throw ex;
    }
  }
}
