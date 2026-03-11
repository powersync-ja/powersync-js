import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  LockContext as PowerSyncLockContext,
  DBLockOptions,
  ConnectionPool,
  DBGetUtilsDefaultMixin,
  LockContext,
  DBAdapterDefaultMixin,
  Transaction
} from '@powersync/common';
import type { QuickSQLiteConnection, LockContext as RNQSLockContext } from '@journeyapps/react-native-quick-sqlite';
import { QueryResult, SqlExecutor } from '@powersync/common/dist/index.cjs';

class RNQSConnectionPool extends BaseObserver<DBAdapterListener> implements ConnectionPool {
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
}

class QuickSqliteExecutor implements Omit<SqlExecutor, 'executeBatch'> {
  constructor(readonly context: RNQSLockContext) {}

  execute(query: string, params?: any[]) {
    return this.context.execute(query, params);
  }
  /**
   * 'executeRaw' is not implemented in RNQS, this falls back to 'execute'.
   */
  async executeRaw(query: string, params?: any[]): Promise<any[][]> {
    const result = await this.context.execute(query, params);
    const rows = result.rows?._array ?? [];
    return rows.map((row) => Object.values(row));
  }
}

class QuickSqliteContext extends DBGetUtilsDefaultMixin(QuickSqliteExecutor) implements LockContext {}

/**
 * Adapter for React Native Quick SQLite
 */
export class RNQSDBAdapter extends DBAdapterDefaultMixin(RNQSConnectionPool) implements DBAdapter {
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
