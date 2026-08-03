import {
  BatchedUpdateNotification,
  createConsoleLogger,
  DBAdapter,
  DBLockOptions,
  LockContext,
  LogLevels,
  PowerSyncLogger,
  QueryResult,
  SQLOpenFactory,
  SQLOpenOptions,
  SqliteValue,
  RawQueryResult,
  queryResultWithoutRows
} from '@powersync/common';
import { Mutex, timeoutSignal, ControlledExecutor } from '@powersync/shared-internals';
// This uses a pure JS version which avoids the need for WebAssembly, which is not supported in React Native.
import SQLJs from '@powersync/sql-js/dist/sql-asm.js';

export interface SQLJSPersister {
  readFile: () => Promise<ArrayLike<number> | Buffer | null>;
  writeFile: (data: ArrayLike<number> | Buffer) => Promise<void>;
}

export interface SQLJSOpenOptions extends SQLOpenOptions {
  persister?: SQLJSPersister;
  logger?: PowerSyncLogger;
}

export interface ResolvedSQLJSOpenOptions extends SQLJSOpenOptions {
  persister?: SQLJSPersister;
  logger: PowerSyncLogger;
}

export class SQLJSOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLJSOpenOptions) {}

  openDB(): DBAdapter {
    return new SQLJSDBAdapter(this.options);
  }
}

export class SQLJSDBAdapter extends DBAdapter {
  protected initPromise: Promise<SQLJs.Database>;
  protected _db: SQLJs.Database | null;
  protected dbP: number | null;
  protected writeScheduler: ControlledExecutor<SQLJs.Database>;
  protected options: ResolvedSQLJSOpenOptions;

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
    this.mutex = new Mutex();
    this.dbP = null;

    this.writeScheduler = new ControlledExecutor(async (db: SQLJs.Database) => {
      const persister = this.options.persister;
      if (!persister) {
        return;
      }

      const blob = db.export();
      // Calling export() closes and re-opens the database, so we need to re-install update hooks.
      this.setup(db);
      await persister.writeFile(blob);
    });
  }

  protected resolveOptions(options: SQLJSOpenOptions): ResolvedSQLJSOpenOptions {
    const logger = options.logger ?? createConsoleLogger({ prefix: 'SQLJSDBAdapter' });

    return {
      ...options,
      logger
    };
  }

  protected async init(): Promise<SQLJs.Database> {
    const SQL = await SQLJs({
      locateFile: (filename: any) => `../dist/${filename}`,
      print: (text) => {
        this.options.logger.log({ level: LogLevels.info, message: text });
      },
      printErr: (text) => {
        this.options.logger.log({ level: LogLevels.error, message: `[stderr]: ${text}` });
      }
    });
    const existing = await this.options.persister?.readFile();
    const db = new SQL.Database(existing);
    this.dbP = (db as any)['db'] as number;
    this._db = db;
    this.setup(db);
    return db;
  }

  private setup(db: SQLJs.Database) {
    db.exec("SELECT powersync_update_hooks('install')");
  }

  async close() {
    const db = await this.getDB();
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
      const context = new SqlJsLockContext(db);
      const result = await fn(context);

      const { rawRows: rawUpdates } = await context.executeRaw("SELECT powersync_update_hooks('get')");
      const updatedTables = JSON.parse(rawUpdates[0][0] as string);

      if (updatedTables.length) {
        const notification: BatchedUpdateNotification = {
          tables: updatedTables
        };
        this.iterateListeners((l) => l.tablesUpdated?.(notification));
      }

      // No point to schedule a write if there's no persister.
      if (this.options.persister) {
        this.writeScheduler.schedule(db);
      }

      return result;
    }, timeoutSignal(options?.timeoutMs));
  }

  async refreshSchema(): Promise<void> {
    await this.writeLock((ctx) => ctx.get("PRAGMA table_info('sqlite_master')"));
  }
}

class SqlJsLockContext extends LockContext {
  constructor(readonly db: SQLJs.Database) {
    super();
  }

  async executeRaw(query: string, params?: any[]): Promise<RawQueryResult> {
    const db = this.db;
    const statement = db.prepare(query);
    const rawResults: SqliteValue[][] = [];

    try {
      if (params) {
        statement.bind(params);
      }
      while (statement.step()) {
        rawResults.push(statement.get());
      }

      return {
        rowsAffected: db.getRowsModified(),
        // `lastInsertId` is not available in the original version of SQL.js or its types, but it's available in the fork we use.
        insertId: (db as any).lastInsertId(),
        columnNames: statement.getColumnNames(),
        rawRows: rawResults
      };
    } finally {
      statement.free();
    }
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult<never>> {
    let totalRowsAffected = 0;
    const db = this.db;

    const stmt = db.prepare(query);
    try {
      for (const paramSet of params) {
        stmt.run(paramSet);
        totalRowsAffected += db.getRowsModified();
      }

      return queryResultWithoutRows({
        rowsAffected: totalRowsAffected
      });
    } finally {
      stmt.free();
    }
  }
}
