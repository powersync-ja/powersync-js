import { QueryResult } from "@powersync/common";
import BetterSQLite3Database, { Database } from 'better-sqlite3';
import * as Comlink from 'comlink';
import { MessagePort, Worker, parentPort } from 'node:worker_threads';
import OS from 'node:os';
import url from 'node:url';

export type ProxiedQueryResult = Omit<QueryResult, 'rows'> & {
    rows?: {
      _array: any[];
      length: number;
    };
  };

export interface AsyncDatabase {
  execute: (query: string, params: any[]) => Promise<ProxiedQueryResult>;
  executeBatch: (query: string, params: any[][]) => Promise<ProxiedQueryResult>;
  close: () => Promise<void>;
}

class BlockingAsyncDatabase implements AsyncDatabase {
    private readonly db: Database

    constructor(db: Database) {
        this.db = db;
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
              length: rows.length,
            },
          };
        } else {
          const info = stmt.run(params);
          return {
            rowsAffected: info.changes,
            insertId: Number(info.lastInsertRowid),
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

export class BetterSqliteWorker {
    open(path: string, isWriter: boolean): AsyncDatabase {
        const baseDB = new BetterSQLite3Database(path);
        baseDB.pragma('journal_mode = WAL');
        loadExtension(baseDB);
        if (!isWriter) {
            baseDB.pragma('query_only = true');
        }

        return Comlink.proxy(new BlockingAsyncDatabase(baseDB));
    }
}

const platform = OS.platform();
let extensionPath: string;
if (platform === "win32") {
  extensionPath = 'powersync.dll';
} else if (platform === "linux") {
  extensionPath = 'libpowersync.so';
} else if (platform === "darwin") {
  extensionPath = 'libpowersync.dylib';
}

const loadExtension = (db: Database) => {
  const resolved = url.fileURLToPath(new URL(`../${extensionPath}`, import.meta.url));
  db.loadExtension(resolved, 'sqlite3_powersync_init');
}

function toComlink(port: MessagePort): Comlink.Endpoint {
    return {
        postMessage: port.postMessage.bind(port),
        start: port.start && port.start.bind(port),
        addEventListener: port.addEventListener.bind(port),
        removeEventListener: port.removeEventListener.bind(port),
    };
}

Comlink.expose(new BetterSqliteWorker(), toComlink(parentPort!));
