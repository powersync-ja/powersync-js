import * as SQLite from '@journeyapps/wa-sqlite';
import { BaseObserver, BatchedUpdateNotification } from '@powersync/common';
import { Mutex } from 'async-mutex';
import { AsyncDatabaseConnection, OnTableChangeCallback, ProxiedQueryResult } from '../AsyncDatabaseConnection';
import { ResolvedWASQLiteOpenFactoryOptions } from './WASQLiteOpenFactory';

/**
 * List of currently tested virtual filesystems
 */
export enum WASQLiteVFS {
  IDBBatchAtomicVFS = 'IDBBatchAtomicVFS',
  OPFSCoopSyncVFS = 'OPFSCoopSyncVFS',
  AccessHandlePoolVFS = 'AccessHandlePoolVFS'
}

/**
 * @internal
 */
export type WASQLiteBroadCastTableUpdateEvent = {
  changedTables: Set<string>;
  connectionId: number;
};

/**
 * @internal
 */
export type WASQLiteConnectionListener = {
  tablesUpdated: (event: BatchedUpdateNotification) => void;
};

/**
 * @internal
 */
export type SQLiteModule = Parameters<typeof SQLite.Factory>[0];

/**
 * @internal
 */
export type WASQLiteModuleFactoryOptions = { dbFileName: string; encryptionKey?: string };

/**
 * @internal
 */
export type WASQLiteModuleFactory = (
  options: WASQLiteModuleFactoryOptions
) => Promise<{ module: SQLiteModule; vfs: SQLiteVFS }>;

/**
 * @internal
 */
export const AsyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
  return factory();
};

/**
 * @internal
 */
export const MultiCipherAsyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs');
  return factory();
};

/**
 * @internal
 */
export const SyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite.mjs');
  return factory();
};

/**
 * @internal
 */
export const MultiCipherSyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs');
  return factory();
};

/**
 * @internal
 */
export const DEFAULT_MODULE_FACTORIES = {
  [WASQLiteVFS.IDBBatchAtomicVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    let module;
    if (options.encryptionKey) {
      module = await MultiCipherAsyncWASQLiteModuleFactory();
    } else {
      module = await AsyncWASQLiteModuleFactory();
    }
    const { IDBBatchAtomicVFS } = await import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
    return {
      module,
      // @ts-expect-error The types for this static method are missing upstream
      vfs: await IDBBatchAtomicVFS.create(options.dbFileName, module, { lockPolicy: 'exclusive' })
    };
  },
  [WASQLiteVFS.AccessHandlePoolVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    let module;
    if (options.encryptionKey) {
      module = await MultiCipherSyncWASQLiteModuleFactory();
    } else {
      module = await SyncWASQLiteModuleFactory();
    }
    // @ts-expect-error The types for this static method are missing upstream
    const { AccessHandlePoolVFS } = await import('@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js');
    return {
      module,
      vfs: await AccessHandlePoolVFS.create(options.dbFileName, module)
    };
  },
  [WASQLiteVFS.OPFSCoopSyncVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    let module;
    if (options.encryptionKey) {
      module = await MultiCipherSyncWASQLiteModuleFactory();
    } else {
      module = await SyncWASQLiteModuleFactory();
    }
    // @ts-expect-error The types for this static method are missing upstream
    const { OPFSCoopSyncVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js');
    return {
      module,
      vfs: await OPFSCoopSyncVFS.create(options.dbFileName, module)
    };
  }
};

/**
 * @internal
 * WA-SQLite connection which directly interfaces with WA-SQLite.
 * This is usually instantiated inside a worker.
 */
export class WASqliteConnection
  extends BaseObserver<WASQLiteConnectionListener>
  implements AsyncDatabaseConnection<ResolvedWASQLiteOpenFactoryOptions>
{
  private _sqliteAPI: SQLiteAPI | null = null;
  private _dbP: number | null = null;
  private _moduleFactory: WASQLiteModuleFactory;

  protected updatedTables: Set<string>;
  protected updateTimer: ReturnType<typeof setTimeout> | null;
  protected statementMutex: Mutex;
  protected broadcastChannel: BroadcastChannel | null;
  /**
   * Unique id for this specific connection. This is used to prevent broadcast table change
   * notification loops.
   */
  protected connectionId: number;

  constructor(protected options: ResolvedWASQLiteOpenFactoryOptions) {
    super();
    this.updatedTables = new Set();
    this.updateTimer = null;
    this.broadcastChannel = null;
    this.connectionId = new Date().valueOf() + Math.random();
    this.statementMutex = new Mutex();
    this._moduleFactory = DEFAULT_MODULE_FACTORIES[this.options.vfs];
  }

  protected get sqliteAPI() {
    if (!this._sqliteAPI) {
      throw new Error(`Initialization has not completed`);
    }
    return this._sqliteAPI;
  }

  protected get dbP() {
    if (!this._dbP) {
      throw new Error(`Initialization has not completed`);
    }
    return this._dbP;
  }

  protected async openDB() {
    this._dbP = await this.sqliteAPI.open_v2(this.options.dbFilename);
    return this._dbP;
  }

  protected async executeEncryptionPragma(): Promise<void> {
    if (this.options.encryptionKey) {
      await this.executeSingleStatement(`PRAGMA key = "${this.options.encryptionKey}"`);
    }
    return;
  }

  protected async openSQLiteAPI(): Promise<SQLiteAPI> {
    const { module, vfs } = await this._moduleFactory({
      dbFileName: this.options.dbFilename,
      encryptionKey: this.options.encryptionKey
    });
    const sqlite3 = SQLite.Factory(module);
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

  protected registerBroadcastListeners() {
    this.broadcastChannel = new BroadcastChannel(`${this.options.dbFilename}-table-updates`);
    this.broadcastChannel.addEventListener('message', (event) => {
      const data: WASQLiteBroadCastTableUpdateEvent = event.data;
      if (this.connectionId == data.connectionId) {
        // Ignore messages from the same connection
        return;
      }
      this.queueTableUpdate(data.changedTables);
    });
  }

  protected queueTableUpdate(tableNames: Set<string>) {
    tableNames.forEach((tableName) => this.updatedTables.add(tableName));
    if (this.updateTimer == null) {
      this.updateTimer = setTimeout(() => this.fireUpdates(), 0);
    }
  }

  async init() {
    this._sqliteAPI = await this.openSQLiteAPI();
    await this.openDB();
    this.registerBroadcastListeners();
    await this.executeSingleStatement(`PRAGMA temp_store = ${this.options.temporaryStorage};`);
    await this.executeEncryptionPragma();

    this.sqliteAPI.update_hook(this.dbP, (updateType: number, dbName: string | null, tableName: string | null) => {
      if (!tableName) {
        return;
      }
      const changedTables = new Set([tableName]);
      this.queueTableUpdate(changedTables);
    });
  }

  async getConfig(): Promise<ResolvedWASQLiteOpenFactoryOptions> {
    return this.options;
  }

  fireUpdates() {
    this.updateTimer = null;
    const event: BatchedUpdateNotification = { tables: [...this.updatedTables], groupedUpdates: {}, rawUpdates: [] };
    // Share to other connections
    this.broadcastChannel!.postMessage({
      changedTables: this.updatedTables,
      connectionId: this.connectionId
    } satisfies WASQLiteBroadCastTableUpdateEvent);
    this.updatedTables.clear();
    this.iterateListeners((cb) => cb.tablesUpdated?.(event));
  }

  /**
   * This executes SQL statements in a batch.
   */
  async executeBatch(sql: string, bindings?: any[][]): Promise<ProxiedQueryResult> {
    return this.acquireExecuteLock(async (): Promise<ProxiedQueryResult> => {
      let affectedRows = 0;

      try {
        await this.executeSingleStatement('BEGIN TRANSACTION');

        const wrappedBindings = bindings ? bindings : [];
        for await (const stmt of this.sqliteAPI.statements(this.dbP, sql)) {
          if (stmt === null) {
            return {
              rowsAffected: 0,
              rows: { _array: [], length: 0 }
            };
          }

          //Prepare statement once
          for (const binding of wrappedBindings) {
            // TODO not sure why this is needed currently, but booleans break
            for (let i = 0; i < binding.length; i++) {
              const b = binding[i];
              if (typeof b == 'boolean') {
                binding[i] = b ? 1 : 0;
              }
            }

            if (bindings) {
              this.sqliteAPI.bind_collection(stmt, binding);
            }
            const result = await this.sqliteAPI.step(stmt);
            if (result === SQLite.SQLITE_DONE) {
              //The value returned by sqlite3_changes() immediately after an INSERT, UPDATE or DELETE statement run on a view is always zero.
              affectedRows += this.sqliteAPI.changes(this.dbP);
            }

            this.sqliteAPI.reset(stmt);
          }
        }

        await this.executeSingleStatement('COMMIT');
      } catch (err) {
        await this.executeSingleStatement('ROLLBACK');
        return {
          rowsAffected: 0,
          rows: { _array: [], length: 0 }
        };
      }
      const result = {
        rowsAffected: affectedRows,
        rows: { _array: [], length: 0 }
      };

      return result;
    });
  }

  /**
   * This executes single SQL statements inside a requested lock.
   */
  async execute(sql: string | TemplateStringsArray, bindings?: any[]): Promise<ProxiedQueryResult> {
    // Running multiple statements on the same connection concurrently should not be allowed
    return this.acquireExecuteLock(async () => {
      return this.executeSingleStatement(sql, bindings);
    });
  }

  async close() {
    this.broadcastChannel?.close();
    await this.sqliteAPI.close(this.dbP);
  }

  async registerOnTableChange(callback: OnTableChangeCallback) {
    return this.registerListener({
      tablesUpdated: (event) => callback(event)
    });
  }

  /**
   * This requests a lock for executing statements.
   * Should only be used internally.
   */
  protected acquireExecuteLock = <T>(callback: () => Promise<T>): Promise<T> => {
    return this.statementMutex.runExclusive(callback);
  };

  /**
   * This executes a single statement using SQLite3.
   */
  protected async executeSingleStatement(
    sql: string | TemplateStringsArray,
    bindings?: any[]
  ): Promise<ProxiedQueryResult> {
    const results = [];
    for await (const stmt of this.sqliteAPI.statements(this.dbP, sql as string)) {
      let columns;
      const wrappedBindings = bindings ? [bindings] : [[]];
      for (const binding of wrappedBindings) {
        // TODO not sure why this is needed currently, but booleans break
        binding.forEach((b, index, arr) => {
          if (typeof b == 'boolean') {
            arr[index] = b ? 1 : 0;
          }
        });

        this.sqliteAPI.reset(stmt);
        if (bindings) {
          this.sqliteAPI.bind_collection(stmt, binding);
        }

        const rows = [];
        while ((await this.sqliteAPI.step(stmt)) === SQLite.SQLITE_ROW) {
          const row = this.sqliteAPI.row(stmt);
          rows.push(row);
        }

        columns = columns ?? this.sqliteAPI.column_names(stmt);
        if (columns.length) {
          results.push({ columns, rows });
        }
      }

      // When binding parameters, only a single statement is executed.
      if (bindings) {
        break;
      }
    }

    const rows: Record<string, any>[] = [];
    for (const resultSet of results) {
      for (const row of resultSet.rows) {
        const outRow: Record<string, any> = {};
        resultSet.columns.forEach((key, index) => {
          outRow[key] = row[index];
        });
        rows.push(outRow);
      }
    }

    const result = {
      insertId: this.sqliteAPI.last_insert_id(this.dbP),
      rowsAffected: this.sqliteAPI.changes(this.dbP),
      rows: {
        _array: rows,
        length: rows.length
      }
    };

    return result;
  }
}
