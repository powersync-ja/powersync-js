import {
  BaseListener,
  BaseObserver,
  BatchedUpdateNotification,
  ControlledExecutor,
  DBAdapter,
  DBAdapterListener,
  DBLockOptions,
  LockContext,
  QueryResult,
  SQLOpenFactory,
  SQLOpenOptions,
  Transaction
} from '@powersync/common';
import { Mutex } from 'async-mutex';
// This uses a pure JS version which avoids the need for WebAssembly, which is not supported in React Native.
import SQLJs from '@powersync/sql-js/dist/sql-asm.js';

export interface SQLJSPersister {
  readFile: () => Promise<ArrayLike<number> | Buffer | null>;
  writeFile: (data: ArrayLike<number> | Buffer) => Promise<void>;
}

export interface SQLJSOpenOptions extends SQLOpenOptions {
  persister?: SQLJSPersister;
}

export interface ResolvedSQLJSOpenOptions extends SQLJSOpenOptions {
  persister: SQLJSPersister;
}

export class SQLJSOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLJSOpenOptions) {}

  openDB(): DBAdapter {
    return new SQLJSDBAdapter(this.options);
  }
}

(globalThis as any).onSqliteUpdate = (
  dbP: number,
  operation: string,
  database: string,
  table: string,
  rowId: number
) => {
  SQLJSDBAdapter.sharedObserver.iterateListeners((l) => l.tablesUpdated?.(dbP, operation, database, table, rowId));
};

interface TableObserverListener extends BaseListener {
  tablesUpdated?: (dpP: number, operation: string, database: string, table: string, rowId: number) => void;
}
class TableObserver extends BaseObserver<TableObserverListener> {}

export class SQLJSDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  protected initPromise: Promise<SQLJs.Database>;
  protected _db: SQLJs.Database | null;
  protected tableUpdateCache: Set<string>;
  protected dbP: number | null;
  protected writeScheduler: ControlledExecutor<SQLJs.Database>;
  protected options: ResolvedSQLJSOpenOptions;

  static sharedObserver = new TableObserver();
  protected disposeListener: () => void;

  protected mutex: Mutex;

  protected getDB(): Promise<SQLJs.Database> {
    return this.initPromise;
  }

  get name() {
    return this.options.dbFilename;
  }

  constructor(options: SQLJSOpenOptions) {
    super();
    this.options = this.resolveOptions(options);
    this.initPromise = this.init();
    this._db = null;
    this.tableUpdateCache = new Set<string>();
    this.mutex = new Mutex();
    this.dbP = null;
    this.disposeListener = SQLJSDBAdapter.sharedObserver.registerListener({
      tablesUpdated: (dbP: number, operation: string, database: string, table: string, rowId: number) => {
        if (this.dbP !== dbP) {
          // Ignore updates from other databases.
          return;
        }
        this.tableUpdateCache.add(table);
      }
    });

    this.writeScheduler = new ControlledExecutor(async (db: SQLJs.Database) => {
      await this.options.persister.writeFile(db.export());
    });
  }

  protected resolveOptions(options: SQLJSOpenOptions): ResolvedSQLJSOpenOptions {
    const persister = options.persister ?? {
      readFile: async () => null,
      writeFile: async () => {}
    };
    return {
      ...options,
      persister
    };
  }

  protected async init(): Promise<SQLJs.Database> {
    const SQL = await SQLJs({
      locateFile: (filename: any) => `../dist/${filename}`,
      print: (text) => {
        console.log('[stdout]', text);
      },
      printErr: (text) => {
        console.error('[stderr]', text);
      }
    });
    const existing = await this.options.persister.readFile();
    const db = new SQL.Database(existing);
    this.dbP = db['db'];
    // debugger;
    // (db as any).updateHook(function (operation, database, table, rowId) {
    //   console.log(`Update Hook: ${operation} on ${table}`);
    //   this.tableUpdateCache.add(table);
    // });
    this._db = db;
    return db;
  }

  async close() {
    const db = await this.getDB();
    this.disposeListener();
    db.close();
  }

  protected generateLockContext(): LockContext {
    const execute = async (query: string, params?: any[]): Promise<QueryResult> => {
      const db = await this.getDB();
      const statement = db.prepare(query);
      const rawResults: any[][] = [];
      let columnNames: string[] | null = null;
      try {
        if (params) {
          statement.bind(params);
        }
        while (statement.step()) {
          if (!columnNames) {
            columnNames = statement.getColumnNames();
          }
          rawResults.push(statement.get());
        }

        const rows = rawResults.map((row) => {
          return Object.fromEntries(row.map((value, index) => [columnNames![index], value]));
        });
        return {
          insertId: (db as any).lastInsertId(), // does not seem to be available in SQL.js??
          rowsAffected: db.getRowsModified(),
          rows: {
            _array: rows,
            length: rows.length,
            item: (idx: number) => rows[idx]
          }
        };
      } finally {
        statement.free();
      }
    };

    const getAll = async <T>(query: string, params?: any[]): Promise<T[]> => {
      const result = await execute(query, params);
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
      const db = await this.getDB();
      const statement = db.prepare(query);
      const rawResults: any[][] = [];
      try {
        if (params) {
          statement.bind(params);
        }
        while (statement.step()) {
          rawResults.push(statement.get());
        }
        return rawResults;
      } finally {
        statement.free();
      }
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
    let totalRowsAffected = 0;
    const db = await this.getDB();

    try {
      const stmt = db.prepare(query);

      for (const paramSet of params) {
        stmt.run(paramSet);
        totalRowsAffected += db.getRowsModified();
      }

      stmt.free();

      return {
        rowsAffected: totalRowsAffected
      };
    } catch (error) {
      throw error;
    }
  }

  readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeLock(fn, options);
  }

  readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.readLock(async (ctx) => {
      return this.internalTransaction(ctx, fn);
    });
  }

  writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const db = await this.getDB();
      const result = await fn(this.generateLockContext());

      this.writeScheduler.schedule(db);

      const notification: BatchedUpdateNotification = {
        rawUpdates: [],
        tables: Array.from(this.tableUpdateCache),
        groupedUpdates: {}
      };
      this.tableUpdateCache.clear();
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
    return this.get("PRAGMA table_info('sqlite_master')");
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
