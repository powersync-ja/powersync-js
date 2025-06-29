import * as path from 'node:path';
import BetterSQLite3Database, { Database } from '@powersync/better-sqlite3';
import { BatchedUpdateNotification, RowUpdateType, TableUpdateOperation, UpdateNotification } from '@powersync/common';
import * as Comlink from 'comlink';
import { parentPort, threadId } from 'node:worker_threads';
import OS from 'node:os';
import url from 'node:url';
import { AsyncDatabase, AsyncDatabaseOpener } from './AsyncDatabase.js';

class BlockingAsyncDatabase implements AsyncDatabase {
  private readonly db: Database;

  private readonly uncommittedUpdates = new Array<UpdateNotification>();
  private readonly committedUpdates = new Array<UpdateNotification>();

  constructor(db: Database) {
    this.db = db;

    db.function('node_thread_id', () => threadId);
  }

  async collectCommittedUpdates() {
    const rawUpdates: UpdateNotification[] = [];
    const groupedUpdates: Record<string, TableUpdateOperation[]> = {};

    for (const rawUpdate of this.committedUpdates) {
      rawUpdates.push(rawUpdate);
      groupedUpdates[rawUpdate.table] ??= [];
      groupedUpdates[rawUpdate.table].push(rawUpdate);
    }

    const result: BatchedUpdateNotification = {
      tables: Object.keys(groupedUpdates),
      rawUpdates,
      groupedUpdates
    };

    this.committedUpdates.length = 0;

    return result;
  }

  installUpdateHooks() {
    this.db.updateHook(
      (
        operation: 'SQLITE_INSERT' | 'SQLITE_UPDATE' | 'SQLITE_DELETE',
        _dbName: string,
        table: string,
        rowId: number
      ) => {
        let opType: RowUpdateType;
        switch (operation) {
          case 'SQLITE_INSERT':
            opType = RowUpdateType.SQLITE_INSERT;
            break;
          case 'SQLITE_UPDATE':
            opType = RowUpdateType.SQLITE_UPDATE;
            break;
          case 'SQLITE_DELETE':
            opType = RowUpdateType.SQLITE_DELETE;
            break;
        }

        this.uncommittedUpdates.push({ table, opType, rowId });
      }
    );

    this.db.commitHook(() => {
      this.committedUpdates.push(...this.uncommittedUpdates);
      this.uncommittedUpdates.length = 0;
      return true;
    });

    this.db.rollbackHook(() => {
      this.uncommittedUpdates.length = 0;
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

class BetterSqliteWorker implements AsyncDatabaseOpener {
  options: PowerSyncWorkerOptions;

  constructor(options: PowerSyncWorkerOptions) {
    this.options = options;
  }

  async open(path: string, isWriter: boolean): Promise<AsyncDatabase> {
    const baseDB = new BetterSQLite3Database(path);
    baseDB.pragma('journal_mode = WAL');
    baseDB.loadExtension(this.options.extensionPath(), 'sqlite3_powersync_init');
    if (!isWriter) {
      baseDB.pragma('query_only = true');
    }

    const asyncDb = new BlockingAsyncDatabase(baseDB);
    asyncDb.installUpdateHooks();

    return Comlink.proxy(asyncDb);
  }
}

export interface PowerSyncWorkerOptions {
  /**
   * A function responsible for finding the powersync DLL/so/dylib file.
   *
   * @returns The absolute path of the PowerSync SQLite core extensions library.
   */
  extensionPath: () => string;
}

export function startPowerSyncWorker(options?: Partial<PowerSyncWorkerOptions>) {
  const resolvedOptions: PowerSyncWorkerOptions = {
    extensionPath() {
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

      return resolved;
    },
    ...options
  };

  Comlink.expose(new BetterSqliteWorker(resolvedOptions), parentPort! as Comlink.Endpoint);
}
