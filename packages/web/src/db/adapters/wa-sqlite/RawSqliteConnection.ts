import { Factory as WaSqliteFactory, SQLITE_ROW } from '@journeyapps/wa-sqlite';

import { DEFAULT_MODULE_FACTORIES, WASQLiteModuleFactory } from './vfs.js';
import { ResolvedWASQLiteOpenFactoryOptions } from './WASQLiteOpenFactory.js';

/**
 * A small wrapper around WA-sqlite to help with opening databases and running statements by preparing them internally.
 *
 * This is an internal class, and it must never be used directly. Wrappers are required to ensure raw connections aren't
 * used concurrently across tabs.
 */
export class RawSqliteConnection {
  private _sqliteAPI: SQLiteAPI | null = null;
  /**
   * The `sqlite3*` connection pointer.
   */
  private db: number = 0;
  private _moduleFactory: WASQLiteModuleFactory;

  constructor(readonly options: ResolvedWASQLiteOpenFactoryOptions) {
    this._moduleFactory = DEFAULT_MODULE_FACTORIES[this.options.vfs];
  }

  get isOpen(): boolean {
    return this.db != 0;
  }

  async init() {
    const api = (this._sqliteAPI = await this.openSQLiteAPI());
    this.db = await api.open_v2(this.options.dbFilename);
    await this.executeRaw(`PRAGMA temp_store = ${this.options.temporaryStorage};`);
    if (this.options.encryptionKey) {
      const escapedKey = this.options.encryptionKey.replace("'", "''");
      await this.executeRaw(`PRAGMA key = '${escapedKey}'`);
    }
    await this.executeRaw(`PRAGMA cache_size = -${this.options.cacheSizeKb};`);
  }

  private async openSQLiteAPI(): Promise<SQLiteAPI> {
    const { module, vfs } = await this._moduleFactory({
      dbFileName: this.options.dbFilename,
      encryptionKey: this.options.encryptionKey
    });
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
      const createResult = module.ccall('sqlite3mc_vfs_create', 'int', ['string', 'int'], [this.options.dbFilename, 1]);
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

  /**
   * This executes a single statement using SQLite3 and returns the results as an array of arrays.
   */
  protected async executeSingleStatementRaw(sql: string | TemplateStringsArray, bindings?: any[]): Promise<any[][]> {
    const results = await this.executeRaw(sql, bindings);

    return results.flatMap((resultset) => resultset.rows.map((row) => resultset.columns.map((_, index) => row[index])));
  }

  async executeRaw(
    sql: string | TemplateStringsArray,
    bindings?: any[]
  ): Promise<{ columns: string[]; rows: SQLiteCompatibleType[][] }[]> {
    const results = [];
    const api = this.requireSqlite();
    for await (const stmt of api.statements(this.db, sql as string)) {
      let columns;
      const wrappedBindings = bindings ? [bindings] : [[]];
      for (const binding of wrappedBindings) {
        // TODO not sure why this is needed currently, but booleans break
        binding.forEach((b, index, arr) => {
          if (typeof b == 'boolean') {
            arr[index] = b ? 1 : 0;
          }
        });

        api.reset(stmt);
        if (bindings) {
          api.bind_collection(stmt, binding);
        }

        const rows = [];
        while ((await api.step(stmt)) === SQLITE_ROW) {
          const row = api.row(stmt);
          rows.push(row);
        }

        columns = columns ?? api.column_names(stmt);
        if (columns.length) {
          results.push({ columns, rows });
        }
      }

      // When binding parameters, only a single statement is executed.
      if (bindings) {
        break;
      }
    }

    return results;
  }

  async close() {
    if (this.isOpen) {
      await this.requireSqlite().close(this.db);
      this.db = 0;
    }
  }
}
