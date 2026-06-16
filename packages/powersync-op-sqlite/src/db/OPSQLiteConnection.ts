import { DB, SQLBatchTuple, UpdateHookOperation } from '@op-engineering/op-sqlite';
import {
  BaseObserver,
  BatchedUpdateNotification,
  LockContext,
  QueryResult,
  RawResultSet,
  SqliteValue
} from '@powersync/common';

export type OPSQLiteConnectionOptions = {
  baseDB: DB;
  readonly: boolean;
};

export type OPSQLiteUpdateNotification = {
  table: string;
  operation: UpdateHookOperation;
  row?: any;
  rowId: number;
};

export class OPSQLiteConnection extends LockContext {
  protected DB: DB;
  private updateBuffer: Set<string>;
  readonly tableUpdateDispatcher = new BaseObserver();

  constructor(protected options: OPSQLiteConnectionOptions) {
    super();
    this.DB = options.baseDB;
    this.updateBuffer = new Set();

    this.DB.rollbackHook(() => {
      this.updateBuffer = new Set();
    });

    this.DB.updateHook((update) => {
      this.addTableUpdate(update);
    });
  }

  get connectionType() {
    return this.options.readonly ? 'queryOnly' : 'writer';
  }

  addTableUpdate(update: OPSQLiteUpdateNotification) {
    this.updateBuffer.add(update.table);
  }

  flushUpdates() {
    if (!this.updateBuffer.size) {
      return;
    }

    const batchedUpdate: BatchedUpdateNotification = {
      tables: Array.from(this.updateBuffer)
    };

    this.updateBuffer = new Set();
    this.tableUpdateDispatcher.iterateListeners((l) => l.tablesUpdated?.(batchedUpdate));
  }

  close() {
    return this.DB.close();
  }

  async executeRaw(query: string, params?: any[]): Promise<QueryResult<RawResultSet>> {
    const { insertId, rowsAffected, columnNames, rawRows } = await this.DB.execute(query, params);
    return {
      insertId: insertId,
      rowsAffected: rowsAffected,
      rows: columnNames &&
        rawRows && {
          columnNames,
          rawRows: rawRows as SqliteValue[][]
        }
    };
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const tuple: SQLBatchTuple[] = [[query, params[0]]];
    params.slice(1).forEach((p) => tuple.push([query, p]));

    const result = await this.DB.executeBatch(tuple);
    return {
      rowsAffected: result.rowsAffected ?? 0
    };
  }

  async refreshSchema() {
    await this.get("PRAGMA table_info('sqlite_master')");
  }
}
