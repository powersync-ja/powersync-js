import { Factory as WaSqliteFactory, SQLITE_ROW } from '@journeyapps/wa-sqlite';

import { loadModuleAndVfs, WASQLiteVFS } from './vfs.js';
import { TemporaryStorageOption } from '../options.js';
import { RawQueryResult, SqliteValue } from '@powersync/common';
import { PreparedStatementCache } from './StatementCache.js';

export interface RawWebResult extends Required<RawQueryResult> {
  autocommit: boolean;
}

export interface RawResultSet {
  columnNames: string[];
  rawRows: SqliteValue[][];
}

/**
 * @internal
 */
export interface RawWaSqliteDatabaseOptions {
  filename: string;
  readonly: boolean;
  vfs: WASQLiteVFS;
  encryptionKey: string | undefined;
  temporaryStorage: TemporaryStorageOption;
  cacheSizeKb: number;
  /**
   * The amount of prepared statements to cache, or 0 to disable caching.
   */
  preparedStatementsCache: number;
}

/**
 * A small wrapper around WA-sqlite to help with opening databases and running statements by preparing them internally.
 *
 * This is an internal class, and it must never be used directly. Wrappers are required to ensure raw connections aren't
 * used concurrently across tabs.
 */
export class RawSqliteConnection {
  private _sqliteAPI: SQLiteAPI | null = null;
  private sqlite3_stmt_isexplain!: (stmt: number) => 0 | 1 | 2;

  /**
   * The `sqlite3*` connection pointer.
   */
  private db: number = 0;
  private statementCache: PreparedStatementCache | null;

  constructor(readonly options: RawWaSqliteDatabaseOptions) {
    this.statementCache =
      options.preparedStatementsCache > 0 ? new PreparedStatementCache(options.preparedStatementsCache) : null;
  }

  get isOpen(): boolean {
    return this.db != 0;
  }

  async init() {
    const api = (this._sqliteAPI = await this.openSQLiteAPI());
    this.db = await api.open_v2(
      this.options.filename,
      this.options.readonly ? 1 /* SQLITE_OPEN_READONLY */ : 6 /* SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE */
    );
    await this.executeRaw(`PRAGMA temp_store = ${this.options.temporaryStorage};`);
    if (this.options.encryptionKey) {
      const escapedKey = this.options.encryptionKey.replaceAll("'", "''");
      await this.executeRaw(`PRAGMA key = '${escapedKey}';`);
    }
    await this.executeRaw(`PRAGMA cache_size = -${this.options.cacheSizeKb};`);

    await this.executeRaw(`SELECT powersync_update_hooks('install');`);
  }

  private async openSQLiteAPI(): Promise<SQLiteAPI> {
    const { module, vfs } = await loadModuleAndVfs(this.options);
    this.sqlite3_stmt_isexplain = module.cwrap('sqlite3_stmt_isexplain', 'int', ['int']);
    const sqlite3 = WaSqliteFactory(module);
    sqlite3.vfs_register(vfs, true);
    /**
     * Register the PowerSync core SQLite extension
     */
    module.ccall('powersync_init_static', 'int', []);

    /**
     * Create the multiple cipher vfs if an encryption key is provided
     */
    if (this.options.encryptionKey) {
      const createResult = module.ccall('sqlite3mc_vfs_create', 'int', ['string', 'int'], [this.options.filename, 1]);
      if (createResult !== 0) {
        throw new Error('Failed to create multiple cipher vfs, Database encryption will not work');
      }
    }

    return sqlite3;
  }

  requireSqlite(): SQLiteAPI {
    if (!this._sqliteAPI) {
      throw new Error(`Initialization has not completed`);
    }
    return this._sqliteAPI;
  }

  /**
   * Checks if the database connection is in autocommit mode.
   * @returns true if in autocommit mode, false if in a transaction
   */
  isAutoCommit(): boolean {
    return this.requireSqlite().get_autocommit(this.db) != 0;
  }

  async execute(sql: string, bindings?: any[]): Promise<RawWebResult> {
    const resultSet = await this.executeSingleStatementRaw(sql, bindings);
    return this.wrapQueryResults(this.requireSqlite(), resultSet);
  }

  async executeBatch(sql: string, bindings: any[][]): Promise<RawWebResult[]> {
    const results = [];
    const api = this.requireSqlite();
    for await (const stmt of api.statements(this.db, sql)) {
      let columns;

      for (const parameterSet of bindings) {
        const rs = await this.stepThroughStatement(api, stmt, parameterSet, columns, false);
        results.push(this.wrapQueryResults(api, rs));
      }

      // executeBatch can only use a single statement
      break;
    }

    return results;
  }

  private wrapQueryResults(api: SQLiteAPI, { rawRows, columnNames }: RawResultSet): RawWebResult {
    return {
      rowsAffected: api.changes(this.db),
      insertId: api.last_insert_id(this.db),
      autocommit: api.get_autocommit(this.db) != 0,
      rawRows,
      columnNames
    };
  }

  /**
   * This executes a single statement using SQLite3 and returns the results as a {@link RawResultSet}.
   */
  private async executeSingleStatementRaw(sql: string, bindings?: any[]): Promise<RawResultSet> {
    const results = await this.executeRaw(sql, bindings);
    return results.length ? results[0] : { columnNames: [], rawRows: [] };
  }

  async executeRaw(sql: string, bindings?: any[]): Promise<RawResultSet[]> {
    const results = [];
    const api = this.requireSqlite();
    for await (const stmt of this.cachedStatements(api, sql)) {
      let columns;

      const rs = await this.stepThroughStatement(api, stmt, bindings ?? [], columns);
      columns = rs.columnNames;
      if (columns.length) {
        results.push(rs);
      }

      // When binding parameters, only a single statement is executed.
      if (bindings) {
        break;
      }
    }

    return results;
  }

  private async stepThroughStatement(
    api: SQLiteAPI,
    stmt: number,
    bindings: any[],
    knownColumns: string[] | undefined,
    includeResults: boolean = true
  ): Promise<RawResultSet> {
    // TODO not sure why this is needed currently, but booleans break
    bindings.forEach((b, index, arr) => {
      if (typeof b == 'boolean') {
        arr[index] = b ? 1 : 0;
      }
    });

    api.reset(stmt);
    if (bindings) {
      api.bind_collection(stmt, bindings);
    }

    const rows = [];
    while ((await api.step(stmt)) === SQLITE_ROW) {
      if (includeResults) {
        const row = api.row(stmt);
        rows.push(row);
      }
    }

    knownColumns ??= api.column_names(stmt);
    return { columnNames: knownColumns, rawRows: rows };
  }

  async close() {
    if (this.isOpen) {
      const api = this.requireSqlite();

      if (this.statementCache) {
        for (const stmt of this.statementCache.drain()) {
          await api.finalize(stmt);
        }
      }

      await api.close(this.db);
      this.db = 0;
    }
  }

  async *cachedStatements(api: SQLiteAPI, sql: string): AsyncIterable<number> {
    {
      const existing = this.statementCache?.lookup(sql);
      if (existing != null) {
        yield existing;
        return;
      }
    }

    const inner = api.statements(this.db, sql, { unscoped: true });
    const preparedStatements: number[] = [];

    try {
      for await (const stmt of inner) {
        preparedStatements.push(stmt);
        yield stmt;
      }
    } finally {
      // We can only cache statements if the sql text corresponds to a single statement, otherwise it's not clear what
      // portion of the original sql text to use as a key.
      if (preparedStatements.length == 1 && this.statementCache) {
        const stmt = preparedStatements[0];
        // Don't cache EXPLAIN statements, their result becomes invalid after schema changes.
        if (this.sqlite3_stmt_isexplain(stmt) == 0) {
          const evicted = this.statementCache.addStatement(sql, stmt);
          if (evicted != null) {
            await api.finalize(evicted);
          }

          return;
        }
      }

      // We're not caching statements, so finalize them.
      for (const stmt of preparedStatements) {
        await api.finalize(stmt);
      }
    }
  }
}
