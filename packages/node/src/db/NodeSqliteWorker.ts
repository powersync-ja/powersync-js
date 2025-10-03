import { threadId } from 'node:worker_threads';
import type { DatabaseSync } from 'node:sqlite';

import { AsyncDatabase, AsyncDatabaseOpenOptions } from './AsyncDatabase.js';
import { PowerSyncWorkerOptions } from './SqliteWorker.js';
import { dynamicImport } from '../utils/modules.js';

class BlockingNodeDatabase implements AsyncDatabase {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync, write: boolean) {
    this.db = db;

    db.function('node_thread_id', () => threadId);
  }

  async close() {
    this.db.close();
  }

  async execute(query: string, params: any[]) {
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return {
      rowsAffected: 0,
      rows: {
        _array: rows,
        length: rows.length
      }
    };
  }

  async executeRaw(query: string, params: any[]) {
    const stmt = this.db.prepare(query);
    (stmt as any).setReturnArrays(true); // Missing in @types/node, https://nodejs.org/api/sqlite.html#statementsetreturnarraysenabled
    return stmt.all(...params) as any as any[][];
  }

  async executeBatch(query: string, params: any[][]) {
    params = params ?? [];

    let rowsAffected = 0;

    const stmt = this.db.prepare(query);
    for (const paramSet of params) {
      const info = stmt.run(...paramSet);
      rowsAffected += info.changes as number;
    }

    return { rowsAffected };
  }
}

export async function openDatabase(worker: PowerSyncWorkerOptions, options: AsyncDatabaseOpenOptions) {
  // NOTE: We want to import node:sqlite dynamically, to avoid bundlers unconditionally requiring node:sqlite in the
  // end, since that would make us incompatible with older Node.JS versions.
  const { DatabaseSync } = await dynamicImport('node:sqlite');

  const baseDB = new DatabaseSync(options.path, { allowExtension: true });
  baseDB.loadExtension(worker.extensionPath());

  return new BlockingNodeDatabase(baseDB, options.isWriter);
}
