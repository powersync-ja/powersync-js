import { DB, SQLBatchTuple } from '@op-engineering/op-sqlite';
import { BaseObserver, DBAdapterListener, QueryResult, RowUpdateType } from '@powersync/common';

export type OPSQLiteConnectionOptions = {
  baseDB: DB;
};

export class OPSQLiteConnection extends BaseObserver<DBAdapterListener> {
  protected DB: DB;
  constructor(protected options: OPSQLiteConnectionOptions) {
    super();
    this.DB = options.baseDB;

    // link table update commands
    this.DB.updateHook((update) => {
      this.iterateListeners((cb) => {
        let opType: RowUpdateType;
        switch (update.operation) {
          case 'INSERT':
            opType = RowUpdateType.SQLITE_INSERT;
            break;
          case 'DELETE':
            opType = RowUpdateType.SQLITE_DELETE;
            break;
          case 'UPDATE':
            opType = RowUpdateType.SQLITE_UPDATE;
            break;
        }
        cb.tablesUpdated?.({ table: update.table, opType, rowId: update.rowId });
      });
    });
  }

  close() {
    return this.DB.close();
  }

  execute(query: string, params?: any[]): Promise<QueryResult> {
    return this.DB.executeAsync(query, params);
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const tuple: SQLBatchTuple[] = [[query, params[0]]];
    params.slice(1).forEach((p) => tuple.push([query, p]));

    const result = await this.DB.executeBatchAsync(tuple);
    return {
      rowsAffected: result.rowsAffected ?? 0
    };
  }

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    const result = await this.DB.executeAsync(sql, parameters);
    return result.rows?._array ?? [];
  }

  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    const result = await this.DB.executeAsync(sql, parameters);
    return result.rows?._array?.[0] ?? null;
  }

  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    const result = await this.getOptional(sql, parameters);
    if (!result) {
      // TODO more consistent error
      throw new Error(`No row returned for [get] query`);
    }
    return result as T;
  }
}
