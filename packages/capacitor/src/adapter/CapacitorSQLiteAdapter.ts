import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

import {
  BatchedUpdateNotification,
  DBAdapter,
  DBLockOptions,
  LockContext,
  QueryResult,
  queryResultFromMapped,
  queryResultWithoutRows,
  RawQueryResult
} from '@powersync/web';
import { Mutex, timeoutSignal } from '@powersync/shared-internals';
import { PowerSyncCore } from '../plugin/PowerSyncCore.js';
import { messageForErrorCode } from '../plugin/PowerSyncPlugin.js';
import { CapacitorSQLiteOpenFactoryOptions, DEFAULT_SQLITE_OPTIONS } from './CapacitorSQLiteOpenFactory.js';
/**
 * Monitors the execution time of a query and logs it to the performance timeline.
 */
async function monitorQuery<T>(sql: string, executor: () => Promise<QueryResult<T>>): Promise<QueryResult<T>> {
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
 * Maps SQLite query parameter values to Capacitor Community supported formats.
 * This handles binary payloads for both iOS and Android.
 */
function mapSQLiteParameterValues({ platform, values }: { platform: string; values: any[] }) {
  return values.map((value) => {
    if (value instanceof Uint8Array) {
      switch (platform) {
        case 'ios': {
          /**
           * The Buffer polyfill, used in @powersync/common, is a Uint8Array subclass which defines additional fields like
           * `_isBuffer` and `parent` on its `prototype`. The additional fields are serialized when passed through the native bridge.
           * The Capacitor Community SQLite library expects a dictionary of indexes to numerical bytes.
           * The additional fields (which are not an index to numerical byte mapping) cause the parsing logic in the SQLite library to throw an error:
           *  "Error in reading buffer".
           *
           * Re-wrapping the same backing buffer as a plain Uint8Array removes the Buffer subclass wrapper
           * while keeping the same underlying bytes. This creates a new view, not a byte copy, so the
           * overhead should be minimal.
           */
          return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }
        case 'android': {
          /**
           * Android expects an object of the form:
           * { type: 'Buffer', data: [...]}
           */
          return {
            type: 'Buffer',
            data: Array.from(value)
          };
        }
      }
    }

    // return value as-is
    return value;
  });
}

/**
 * An implementation of {@link DBAdapter} using the Capacitor Community SQLite [plugin](https://github.com/capacitor-community/sqlite).
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class CapacitorSQLiteAdapter extends DBAdapter {
  protected _writeConnection: SQLiteDBConnection | null;
  protected _readConnection: SQLiteDBConnection | null;
  protected initializedPromise: Promise<void>;
  protected writeMutex: Mutex;
  protected readMutex: Mutex;

  constructor(protected options: CapacitorSQLiteOpenFactoryOptions) {
    super();
    this._writeConnection = null;
    this._readConnection = null;
    this.writeMutex = new Mutex();
    this.readMutex = new Mutex();
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
    const _query = async <T>(query: string, params: any[] = []): Promise<QueryResult<T>> => {
      const mappedParams = mapSQLiteParameterValues({
        platform: Capacitor.getPlatform(),
        values: params
      });
      const result = await db.query(query, mappedParams);
      const arrayResult = result.values ?? [];
      return queryResultFromMapped({ rowsAffected: 0 }, arrayResult);
    };

    const _execute = async <T>(query: string, params: any[] = []): Promise<QueryResult<T>> => {
      const platform = Capacitor.getPlatform();

      if (
        db.getConnectionReadOnly() ||
        // Android: use query for SELECT and executeSet for mutations
        // We cannot use `run` here for both cases.
        (platform == 'android' && query.toLowerCase().trim().startsWith('select'))
      ) {
        return _query(query, params);
      }

      const mappedParams = mapSQLiteParameterValues({
        platform,
        values: params
      });

      if (platform == 'android') {
        const result = await db.executeSet([{ statement: query, values: mappedParams }], false);
        return queryResultWithoutRows({ insertId: result.changes?.lastId, rowsAffected: result.changes?.changes ?? 0 });
      }

      // iOS (and other platforms): use run("all")
      const result = await db.run(query, mappedParams, false, 'all');
      const resultSet = result.changes?.values ?? [];
      return queryResultFromMapped(
        { insertId: result.changes?.lastId, rowsAffected: result.changes?.changes ?? 0 },
        resultSet
      );
    };

    const execute = this.options.debugMode
      ? <T>(sql: string, params?: any[]) => monitorQuery(sql, () => _execute<T>(sql, params))
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

    const executeRaw = async (query: string, params?: any[]): Promise<RawQueryResult> => {
      // This is a workaround, we don't support multiple columns of the same name
      const { insertId, rowsAffected, rows } = await execute(query, params);
      const mappedRows = rows?._array;

      return {
        insertId,
        rowsAffected,
        columnNames: mappedRows && mappedRows.length ? Object.keys(mappedRows[0]) : [],
        rawRows: mappedRows?.map((row) => Object.values(row)) ?? []
      };
    };

    const executeBatch = async (query: string, params: any[][] = []): Promise<QueryResult<never>> => {
      const platform = Capacitor.getPlatform();
      let result = await db.executeSet(
        params.map((param) => ({
          statement: query,
          values: mapSQLiteParameterValues({
            platform,
            values: param
          })
        })),
        false
      );

      return queryResultWithoutRows({
        rowsAffected: result.changes?.changes ?? 0,
        insertId: result.changes?.lastId
      });
    };

    class CapacitorLockContext extends LockContext {
      get connectionType(): 'readWrite' {
        return 'readWrite';
      }

      getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
        return getAll(sql, parameters);
      }

      get<T>(sql: string, parameters?: any[]): Promise<T> {
        return get(sql, parameters);
      }

      getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
        return getOptional(sql, parameters);
      }

      execute<T>(query: string, params?: any[] | undefined): Promise<QueryResult<T>> {
        return execute<T>(query, params);
      }

      executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult> {
        return executeRaw(query, params);
      }

      executeBatch(query: string, params?: any[][]): Promise<QueryResult<never>> {
        return executeBatch(query, params);
      }
    }

    return new CapacitorLockContext();
  }

  readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.readMutex.runExclusive(async () => {
      await this.initializedPromise;
      return fn(this.generateLockContext(this.readConnection));
    }, timeoutSignal(options?.timeoutMs));
  }

  writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeMutex.runExclusive(async () => {
      await this.initializedPromise;
      const result = await fn(this.generateLockContext(this.writeConnection));

      // Fetch table updates
      const updates = await this.writeConnection.query("SELECT powersync_update_hooks('get') AS table_name");
      const jsonUpdates = updates.values?.[0];
      if (!jsonUpdates || !jsonUpdates.table_name) {
        throw new Error('Could not fetch table updates');
      }
      const notification: BatchedUpdateNotification = {
        tables: JSON.parse(jsonUpdates.table_name)
      };
      this.iterateListeners((l) => l.tablesUpdated?.(notification));
      return result;
    }, timeoutSignal(options?.timeoutMs));
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
}
