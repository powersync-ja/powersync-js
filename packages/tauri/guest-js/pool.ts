import {
  DBAdapter,
  DBLockOptions,
  LockContext,
  QueryResult,
  queryResultWithoutRows,
  RawQueryResult
} from '@powersync/common';
import { ExecuteBatchResult, ExecuteSqlResult, powersyncCommand } from './command';

/**
 *  A handle identfier that is set by an outer context after constructing the rust database instance.
 */
export interface LateHandle {
  handle: number;
}

/**
 * A SQLite connection pool backed by the PowerSync Rust SDK.
 */
export class RustDatabaseAdapter extends DBAdapter {
  name: string;

  constructor(
    name: string,
    readonly handle: LateHandle
  ) {
    super();
    this.name = name;
  }

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
      return await fn(new RustLockContext(handle, write ? 'readWrite' : 'readOnly'));
    } finally {
      await await powersyncCommand({ CloseHandle: handle });
    }
  }

  async refreshSchema() {
    // TODO: Support this method (requires Rust SDK changes)
  }
}

class RustLockContext extends LockContext {
  constructor(
    readonly handle: number,
    readonly connectionType: 'readWrite' | 'readOnly'
  ) {
    super();
  }

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

  async executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult> {
    const { rows, insertId, rowsAffected, columnNames } = await this.executeInner(query, params ?? []);

    return {
      rowsAffected,
      insertId,
      columnNames,
      rawRows: rows
    };
  }

  async executeBatch(query: string, params?: any[][]): Promise<QueryResult<never>> {
    const result = await powersyncCommand({
      ExecuteBatch: {
        connection: this.handle,
        sql: query,
        params: params ?? []
      }
    });
    const batchResult = (result as any).ExecuteBatchResult as ExecuteBatchResult;
    return queryResultWithoutRows({ insertId: batchResult.last_insert_rowid, rowsAffected: batchResult.changes });
  }
}
