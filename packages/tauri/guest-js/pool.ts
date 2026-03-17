import {
  ConnectionPool,
  DBAdapterDefaultMixin,
  DBAdapterListener,
  DBGetUtilsDefaultMixin,
  DBLockOptions,
  LockContext,
  QueryResult,
  SqlExecutor
} from '@powersync/common';
import { ExecuteBatchResult, ExecuteSqlResult, powersyncCommand, SqliteValue } from './command';

/**
 *  A handle identfier that is set by an outer context after constructing the rust database instance.
 */
export interface LateHandle {
  handle: number;
}

class RustDatabase implements ConnectionPool {
  constructor(
    readonly name: string,
    readonly handle: LateHandle
  ) {}

  async close() {
    await powersyncCommand({ CloseHandle: this.handle.handle });
  }

  async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.lock(fn, false, options);
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.lock(fn, true, options);
  }

  private async lock<T>(fn: (tx: LockContext) => Promise<T>, write: boolean, options?: DBLockOptions): Promise<T> {
    let timeout: number | undefined;
    if (options?.timeoutMs) {
      timeout = options.timeoutMs / 1000;
    }

    const connection = await powersyncCommand({
      AcquireConnection: { database: this.handle.handle, write, timeout }
    });
    const handle = (connection as any).CreatedHandle as number;

    try {
      return await fn(new RustLockContext(handle));
    } finally {
      await await powersyncCommand({ CloseHandle: handle });
    }
  }

  async refreshSchema() {
    // TODO: Support this method (requires Rust SDK changes)
  }

  registerListener(listener: Partial<DBAdapterListener>): () => void {
    throw new Error('Listeners are registered through the main database instance.');
  }
}

/**
 * A SQLite connection pool backed by the PowerSync Rust SDK.
 */
export class RustDatabaseAdapter extends DBAdapterDefaultMixin(RustDatabase) {}

class RustSqlExecutor implements SqlExecutor {
  constructor(readonly handle: number) {}

  private async executeInner(query: string, params: any[]) {
    const result = await powersyncCommand({
      ExecuteSql: {
        connection: this.handle,
        sql: query,
        params: params,
        include_result_set: true
      }
    });
    const executeResult = (result as any).ExecuteSqlResult as ExecuteSqlResult;

    return {
      insertId: executeResult.last_insert_rowid,
      rowsAffected: executeResult.changes,
      columnNames: executeResult.column_names,
      rows: executeResult.rows
    };
  }

  async execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    const { rows, columnNames, insertId, rowsAffected } = await this.executeInner(query, params ?? []);

    return {
      insertId,
      rowsAffected,
      rows: {
        _array: rows,
        length: rows.length,
        item(idx) {
          const row = this._array[idx];
          const names = columnNames;
          const record: Record<string, SqliteValue> = {};
          for (let i = 0; i < names.length; i++) {
            record[names[i]] = row[i];
          }

          return record;
        }
      }
    };
  }

  async executeRaw(query: string, params?: any[] | undefined): Promise<any[][]> {
    const { rows } = await this.executeInner(query, params ?? []);
    return rows ?? [];
  }

  async executeBatch(query: string, params?: any[][]): Promise<QueryResult> {
    const result = await powersyncCommand({
      ExecuteBatch: {
        connection: this.handle,
        sql: query,
        params: params ?? []
      }
    });
    const batchResult = (result as any).ExecuteBatchResult as ExecuteBatchResult;
    return { insertId: batchResult.last_insert_rowid, rowsAffected: batchResult.changes };
  }
}

class RustLockContext extends DBGetUtilsDefaultMixin(RustSqlExecutor) {}
