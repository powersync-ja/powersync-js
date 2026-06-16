import {
  DBAdapter,
  LockContext as PowerSyncLockContext,
  DBLockOptions,
  LockContext,
  RawResultSet
} from '@powersync/common';
import type { QuickSQLiteConnection, LockContext as RNQSLockContext } from '@journeyapps/react-native-quick-sqlite';
import { QueryResult } from '@powersync/common';

/**
 * Adapter for React Native Quick SQLite
 */
export class RNQSDBAdapter extends DBAdapter {
  constructor(
    protected baseDB: QuickSQLiteConnection,
    public name: string
  ) {
    super();
    // link table update commands
    baseDB.registerTablesChangedHook((update) => {
      this.iterateListeners((cb) => cb.tablesUpdated?.(update));
    });
  }

  close() {
    return this.baseDB.close();
  }

  readLock<T>(fn: (tx: PowerSyncLockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.baseDB.readLock((dbTx) => fn(this.generateContext(dbTx)), options);
  }

  writeLock<T>(fn: (tx: PowerSyncLockContext) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.baseDB.writeLock((dbTx) => fn(this.generateContext(dbTx)), options);
  }

  generateContext<T extends RNQSLockContext>(ctx: T) {
    return new QuickSqliteContext(ctx);
  }

  async refreshSchema() {
    await this.baseDB.refreshSchema();
  }

  // We don't want the default implementation here, RNQS does not support executeBatch for lock contexts so that would
  // be less efficient.
  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const commands: any[] = [];

    for (let i = 0; i < params.length; i++) {
      commands.push([query, params[i]]);
    }

    const result = await this.baseDB.executeBatch(commands);
    return {
      rowsAffected: result.rowsAffected ? result.rowsAffected : 0
    };
  }
}

class QuickSqliteContext extends LockContext {
  constructor(readonly context: RNQSLockContext) {
    super();
  }

  get connectionType() {
    return undefined;
  }

  async execute(query: string, params?: any[]): Promise<QueryResult> {
    const { insertId, rowsAffected, metadata, rows } = await this.context.execute(query, params);
    let columnNames = metadata?.map((m) => m.columnName);
    if (columnNames == null && rows != null && rows.length > 0) {
      columnNames = Object.keys(rows._array[0]);
    }
    columnNames ??= [];

    return {
      insertId,
      rowsAffected,
      rows:
        rows == null
          ? rows
          : {
              columnNames,
              _array: rows._array,
              rawRows: rows._array.map((r) => Object.values(r)),
              length: rows.length,
              mapped() {
                return rows._array;
              },
              item(idx) {
                return rows.item(idx);
              }
            }
    };
  }

  /**
   * 'executeRaw' is not implemented in RNQS, this falls back to 'execute'.
   */
  async executeRaw(query: string, params?: any[]): Promise<QueryResult<RawResultSet>> {
    return await this.execute(query, params);
  }
}
