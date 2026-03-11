import {
  BaseListener,
  BaseObserver,
  BatchedUpdateNotification,
  ConnectionPool,
  ControlledExecutor,
  createLogger,
  DBAdapter,
  DBAdapterDefaultMixin,
  DBAdapterListener,
  DBGetUtilsDefaultMixin,
  DBLockOptions,
  ILogger,
  LockContext,
  QueryResult,
  SqlExecutor,
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
  logger?: ILogger;
}

export interface ResolvedSQLJSOpenOptions extends SQLJSOpenOptions {
  persister?: SQLJSPersister;
  logger: ILogger;
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

class SqlJsConnectionPool extends BaseObserver<DBAdapterListener> implements ConnectionPool {
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
      if (!this.options.persister) {
        return;
      }

      await this.options.persister.writeFile(db.export());
    });
  }

  protected resolveOptions(options: SQLJSOpenOptions): ResolvedSQLJSOpenOptions {
    const logger = options.logger ?? createLogger('SQLJSDBAdapter');

    return {
      ...options,
      logger
    };
  }

  protected async init(): Promise<SQLJs.Database> {
    const SQL = await SQLJs({
      locateFile: (filename: any) => `../dist/${filename}`,
      print: (text) => {
        this.options.logger.info(text);
      },
      printErr: (text) => {
        this.options.logger.error('[stderr]', text);
      }
    });
    const existing = await this.options.persister?.readFile();
    const db = new SQL.Database(existing);
    this.dbP = db['db'];
    this._db = db;
    return db;
  }

  async close() {
    const db = await this.getDB();
    this.disposeListener();
    db.close();
  }

  /**
   * We're not using separate read/write locks here because we can't implement connection pools on top of SQL.js.
   */
  readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeLock(fn, options);
  }

  writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const db = await this.getDB();
      const result = await fn(new SqlJsLockContext(db));

      // No point to schedule a write if there's no persister.
      if (this.options.persister) {
        this.writeScheduler.schedule(db);
      }

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

  async refreshSchema(): Promise<void> {
    await this.writeLock((ctx) => ctx.get("PRAGMA table_info('sqlite_master')"));
  }
}

class SqlJsExecutor implements SqlExecutor {
  constructor(readonly db: SQLJs.Database) {}

  async execute(query: string, params?: any[]): Promise<QueryResult> {
    const db = this.db;
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
        // `lastInsertId` is not available in the original version of SQL.js or its types, but it's available in the fork we use.
        insertId: (db as any).lastInsertId(),
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
  }

  async executeRaw(query: string, params?: any[]): Promise<any[][]> {
    const db = this.db;
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
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    let totalRowsAffected = 0;
    const db = this.db;

    const stmt = db.prepare(query);
    try {
      for (const paramSet of params) {
        stmt.run(paramSet);
        totalRowsAffected += db.getRowsModified();
      }

      return {
        rowsAffected: totalRowsAffected
      };
    } finally {
      stmt.free();
    }
  }
}

class SqlJsLockContext extends DBGetUtilsDefaultMixin(SqlJsExecutor) implements LockContext {}

export class SQLJSDBAdapter extends DBAdapterDefaultMixin(SqlJsConnectionPool) implements DBAdapter {}
