import type { Database } from 'better-sqlite3';
import { AsyncDatabase, AsyncDatabaseOpenOptions } from './AsyncDatabase.js';
import { PowerSyncWorkerOptions } from './SqliteWorker.js';
import { threadId } from 'node:worker_threads';
import { dynamicImport } from '../utils/modules.js';

class BlockingAsyncDatabase implements AsyncDatabase {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;

    db.function('node_thread_id', () => threadId);
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

export async function openDatabase(worker: PowerSyncWorkerOptions, options: AsyncDatabaseOpenOptions, pkg: string) {
  const BetterSQLite3Database: typeof Database = (await dynamicImport(pkg)).default;
  const baseDB = new BetterSQLite3Database(options.path);
  baseDB.pragma('journal_mode = WAL');
  baseDB.loadExtension(worker.extensionPath(), 'sqlite3_powersync_init');
  if (!options.isWriter) {
    baseDB.pragma('query_only = true');
  }

  const asyncDb = new BlockingAsyncDatabase(baseDB);
  return asyncDb;
}
