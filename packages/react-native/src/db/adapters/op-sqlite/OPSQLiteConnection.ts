import { DB, SQLBatchTuple } from '@op-engineering/op-sqlite';
import {
  LockContext,
  QueryResult,
  queryResultFromMapped,
  queryResultWithoutRows,
  RawQueryResult,
  SqliteValue
} from '@powersync/common';

export type OPSQLiteConnectionOptions = {
  baseDB: DB;
};

export class OPSQLiteConnection extends LockContext {
  protected DB: DB;

  constructor(protected options: OPSQLiteConnectionOptions) {
    super();
    this.DB = options.baseDB;
  }

  close() {
    return this.DB.close();
  }

  async execute<T>(query: string, params?: any[]): Promise<QueryResult<T>> {
    const res = await this.DB.execute(query, params);
    return queryResultFromMapped(res, res.rows as T[]);
  }

  async executeRaw(query: string, params?: any[]): Promise<RawQueryResult> {
    const { insertId, rowsAffected, columnNames, rawRows } = await this.DB.executeRaw(query, params);
    return {
      insertId: insertId,
      rowsAffected: rowsAffected,
      columnNames,
      rawRows: (rawRows ?? []) as SqliteValue[][]
    };
  }

  // NOTE: Do not override executeBatch here. OP-sqlite starts a transaction in executeBatch, so we can't use it if
  // we're already in a transaction. To be safe, we only call this method from the OPSqliteAdapter class overriding
  // executeBatch when called on the adapter directly (not within readLock / writeLock).
  async executeNativeBatch(query: string, params: any[][] = []): Promise<QueryResult<never>> {
    const tuple: SQLBatchTuple[] = [[query, params[0]]];
    params.slice(1).forEach((p) => tuple.push([query, p]));

    const result = await this.DB.executeBatch(tuple);
    return queryResultWithoutRows({
      rowsAffected: result.rowsAffected ?? 0
    });
  }

  async refreshSchema() {
    await this.get("PRAGMA table_info('sqlite_master')");
  }
}
