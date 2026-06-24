import type { Database } from 'better-sqlite3';
import { AsyncDatabase, AsyncDatabaseOpenOptions, MappedQueryResult } from './AsyncDatabase.js';
import { PowerSyncWorkerOptions } from './SqliteWorker.js';
import { threadId } from 'node:worker_threads';
import { QueryResult, queryResultWithoutRows, RawQueryResult, SqliteValue } from '@powersync/common';

class BlockingAsyncDatabase implements AsyncDatabase {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;

    db.function('node_thread_id', () => threadId);
  }

  async close() {
    this.db.close();
  }

  async execute(query: string, params: any[]): Promise<MappedQueryResult> {
    const stmt = this.db.prepare(query);
    if (stmt.reader) {
      const rows = stmt.all(params);
      return {
        rowsAffected: 0,
        rows
      };
    } else {
      const info = stmt.run(params);
      return {
        rowsAffected: info.changes,
        insertId: Number(info.lastInsertRowid)
      };
    }
  }

  async executeRaw(query: string, params: any[]): Promise<RawQueryResult> {
    const stmt = this.db.prepare(query);
    if (stmt.reader) {
      stmt.raw();
      const rows = stmt.all(params);
      return {
        rowsAffected: 0,
        columnNames: stmt.columns().map((c) => c.name),
        rawRows: rows as SqliteValue[][]
      };
    } else {
      const info = stmt.run(params);
      return {
        rowsAffected: info.changes,
        insertId: Number(info.lastInsertRowid),
        rawRows: [],
        columnNames: []
      };
    }
  }

  async executeBatch(query: string, params: any[][]): Promise<QueryResult<never>> {
    params = params ?? [];

    let rowsAffected = 0;

    const stmt = this.db.prepare(query);
    for (const paramSet of params) {
      const info = stmt.run(paramSet);
      rowsAffected += info.changes;
    }

    return queryResultWithoutRows({ rowsAffected });
  }
}

export async function openDatabase(worker: PowerSyncWorkerOptions, options: AsyncDatabaseOpenOptions) {
  const BetterSQLite3Database = await worker.loadBetterSqlite3();
  const baseDB = new BetterSQLite3Database(options.path, { readonly: !options.isWriter });
  baseDB.loadExtension(worker.extensionPath(), 'sqlite3_powersync_init');

  const asyncDb = new BlockingAsyncDatabase(baseDB);
  return asyncDb;
}
