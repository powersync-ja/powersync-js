import * as path from 'node:path';
import BetterSQLite3Database, { Database } from '@powersync/better-sqlite3';
import * as Comlink from 'comlink';
import { parentPort, threadId } from 'node:worker_threads';
import OS from 'node:os';
import url from 'node:url';
import { AsyncDatabase, AsyncDatabaseOpener } from './AsyncDatabase.js';

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

class BetterSqliteWorker implements AsyncDatabaseOpener {
  async open(path: string, isWriter: boolean): Promise<AsyncDatabase> {
    const baseDB = new BetterSQLite3Database(path);
    baseDB.pragma('journal_mode = WAL');
    loadExtension(baseDB);
    if (!isWriter) {
      baseDB.pragma('query_only = true');
    }

    const asyncDb = new BlockingAsyncDatabase(baseDB);
    asyncDb.installUpdateHooks();

    return Comlink.proxy(asyncDb);
  }
}

const loadExtension = (db: Database) => {
  const isCommonJsModule = import.meta.isBundlingToCommonJs ?? false;

  const platform = OS.platform();
  let extensionPath: string;
  if (platform === 'win32') {
    extensionPath = 'powersync.dll';
  } else if (platform === 'linux') {
    extensionPath = 'libpowersync.so';
  } else if (platform === 'darwin') {
    extensionPath = 'libpowersync.dylib';
  } else {
    throw 'Unknown platform, PowerSync for Node.js currently supports Windows, Linux and macOS.';
  }

  let resolved: string;
  if (isCommonJsModule) {
    resolved = path.resolve(__dirname, '../lib/', extensionPath);
  } else {
    resolved = url.fileURLToPath(new URL(`../${extensionPath}`, import.meta.url));
  }

  db.loadExtension(resolved, 'sqlite3_powersync_init');
};

Comlink.expose(new BetterSqliteWorker(), parentPort! as Comlink.Endpoint);
