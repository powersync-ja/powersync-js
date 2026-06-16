import { DB, SQLBatchTuple, UpdateHookOperation } from '@op-engineering/op-sqlite';
import {
  BaseObserver,
  BatchedUpdateNotification,
  LockContext,
  QueryResult,
  RawResultSet,
  RowUpdateType,
  SqliteValue,
  UpdateNotification
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
  private updateBuffer: UpdateNotification[];
  readonly tableUpdateDispatcher = new BaseObserver();

  constructor(protected options: OPSQLiteConnectionOptions) {
    super();
    this.DB = options.baseDB;
    this.updateBuffer = [];

    this.DB.rollbackHook(() => {
      this.updateBuffer = [];
    });

    this.DB.updateHook((update) => {
      this.addTableUpdate(update);
    });
  }

  get connectionType() {
    return this.options.readonly ? 'queryOnly' : 'writer';
  }

  addTableUpdate(update: OPSQLiteUpdateNotification) {
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

    this.updateBuffer.push({
      table: update.table,
      opType,
      rowId: update.rowId
    });
  }

  flushUpdates() {
    if (!this.updateBuffer.length) {
      return;
    }

    const groupedUpdates = this.updateBuffer.reduce((grouping: Record<string, UpdateNotification[]>, update) => {
      const { table } = update;
      const updateGroup = grouping[table] || (grouping[table] = []);
      updateGroup.push(update);
      return grouping;
    }, {});

    const batchedUpdate: BatchedUpdateNotification = {
      groupedUpdates,
      rawUpdates: this.updateBuffer,
      tables: Object.keys(groupedUpdates)
    };

    this.updateBuffer = [];
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
