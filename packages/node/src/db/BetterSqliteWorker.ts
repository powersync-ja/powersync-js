import * as Comlink from 'comlink';
import BetterSQLite3Database, { Database } from '@powersync/better-sqlite3';
import { AsyncDatabase, AsyncDatabaseOpener, AsyncDatabaseOpenOptions } from './AsyncDatabase.js';
import { PowerSyncWorkerOptions } from './SqliteWorker.js';
import { threadId } from 'node:worker_threads';

class BlockingAsyncDatabase implements AsyncDatabase {
  private readonly db: Database;

  private readonly uncommittedUpdatedTables = new Set<string>();
  private readonly committedUpdatedTables = new Set<string>();

  constructor(db: Database) {
    this.db = db;

    db.function('node_thread_id', () => threadId);
  }

  collectCommittedUpdates() {
    const resolved = Promise.resolve([...this.committedUpdatedTables]);
    this.committedUpdatedTables.clear();
    return resolved;
  }

  installUpdateHooks() {
    this.db.updateHook((_op: string, _dbName: string, tableName: string, _rowid: bigint) => {
      this.uncommittedUpdatedTables.add(tableName);
    });

    this.db.commitHook(() => {
      for (const tableName of this.uncommittedUpdatedTables) {
        this.committedUpdatedTables.add(tableName);
      }
      this.uncommittedUpdatedTables.clear();
      return true;
    });

    this.db.rollbackHook(() => {
      this.uncommittedUpdatedTables.clear();
    });
  }

  async close() {
    this.db.close();
  }

  async execute(query: string, params: any[]) {
    const stmt = this.db.prepare(query);
    if (stmt.reader) {
      const rows = stmt.all(params);
      return {
        rowsAffected: 0,
        rows: {
          _array: rows,
          length: rows.length
        }
      };
    } else {
      const info = stmt.run(params);
      return {
        rowsAffected: info.changes,
        insertId: Number(info.lastInsertRowid)
      };
    }
  }

  async executeRaw(query: string, params: any[]) {
    const stmt = this.db.prepare(query);

    if (stmt.reader) {
      return stmt.raw().all(params);
    } else {
      stmt.raw().run(params);
      return [];
    }
  }

  async executeBatch(query: string, params: any[][]) {
    params = params ?? [];

    let rowsAffected = 0;

    const stmt = this.db.prepare(query);
    for (const paramSet of params) {
      const info = stmt.run(paramSet);
      rowsAffected += info.changes;
    }

    return { rowsAffected };
  }
}

export async function openDatabase(worker: PowerSyncWorkerOptions, options: AsyncDatabaseOpenOptions) {
  const baseDB = new BetterSQLite3Database(options.path);
  baseDB.pragma('journal_mode = WAL');
  baseDB.loadExtension(worker.extensionPath(), 'sqlite3_powersync_init');
  if (!options.isWriter) {
    baseDB.pragma('query_only = true');
  }

  const asyncDb = new BlockingAsyncDatabase(baseDB);
  asyncDb.installUpdateHooks();
  return asyncDb;
}
