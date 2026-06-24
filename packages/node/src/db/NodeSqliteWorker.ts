import type { DatabaseSync } from 'node:sqlite';
import { threadId } from 'node:worker_threads';

import { AsyncDatabase, AsyncDatabaseOpenOptions, MappedQueryResult } from './AsyncDatabase.js';
import { PowerSyncWorkerOptions } from './SqliteWorker.js';
import { QueryResult, queryResultWithoutRows, RawQueryResult, SqliteValue } from '@powersync/common';

class BlockingNodeDatabase implements AsyncDatabase {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync, write: boolean) {
    this.db = db;

    db.function('node_thread_id', () => threadId);
  }

  async close() {
    this.db.close();
  }

  async execute(query: string, params: any[]): Promise<MappedQueryResult> {
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return {
      rowsAffected: 0,
      rows
    };
  }

  async executeRaw(query: string, params: any[]): Promise<RawQueryResult> {
    const stmt = this.db.prepare(query);
    (stmt as any).setReturnArrays(true); // Missing in @types/node, https://nodejs.org/api/sqlite.html#statementsetreturnarraysenabled

    const rows = stmt.all(...params) as any as SqliteValue[][];
    return {
      rawRows: rows,
      columnNames: stmt.columns().map((c) => c.name!)
    };
  }

  async executeBatch(query: string, params: any[][]): Promise<QueryResult<never>> {
    params = params ?? [];

    let rowsAffected = 0;

    const stmt = this.db.prepare(query);
    for (const paramSet of params) {
      const info = stmt.run(...paramSet);
      rowsAffected += info.changes as number;
    }

    return queryResultWithoutRows({ rowsAffected });
  }
}

export async function openDatabase(worker: PowerSyncWorkerOptions, options: AsyncDatabaseOpenOptions) {
  // NOTE: We want to import node:sqlite dynamically, to avoid bundlers unconditionally requiring node:sqlite in the
  // end, since that would make us incompatible with older Node.JS versions.
  const { DatabaseSync } = await import('node:sqlite');

  const baseDB = new DatabaseSync(options.path, { allowExtension: true, readOnly: !options.isWriter });
  // @ts-expect-error (type definition is wrong)
  baseDB.loadExtension(worker.extensionPath(), 'sqlite3_powersync_init');

  return new BlockingNodeDatabase(baseDB, options.isWriter);
}
