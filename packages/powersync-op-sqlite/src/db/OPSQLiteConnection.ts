import { DB, SQLBatchTuple, UpdateHookOperation } from '@op-engineering/op-sqlite';
import {
  BaseObserver,
  BatchedUpdateNotification,
  DBAdapterListener,
  QueryResult,
  RowUpdateType,
  UpdateNotification
} from '@powersync/common';

export type OPSQLiteConnectionOptions = {
  baseDB: DB;
};

export type OPSQLiteUpdateNotification = {
  table: string;
  operation: UpdateHookOperation;
  row?: any;
  rowId: number;
};

export class OPSQLiteConnection extends BaseObserver<DBAdapterListener> {
  protected DB: DB;
  private updateBuffer: UpdateNotification[];

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
    this.iterateListeners((l) => l.tablesUpdated?.(batchedUpdate));
  }

  close() {
    return this.DB.close();
  }

  async execute(query: string, params?: any[]): Promise<QueryResult> {
    const res = await this.DB.execute(query, params);
    return {
      insertId: res.insertId,
      rowsAffected: res.rowsAffected,
      rows: {
        _array: res.rows ?? [],
        length: res.rows?.length ?? 0,
        item: (index: number) => res.rows?.[index]
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

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    const result = await this.DB.execute(sql, parameters);
    return (result.rows ?? []) as T[];
  }

  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    const result = await this.DB.execute(sql, parameters);
    return (result.rows?.[0] as T) ?? null;
  }

  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    const result = await this.getOptional(sql, parameters);
    if (!result) {
      throw new Error('Result set is empty');
    }
    return result as T;
  }

  async refreshSchema() {
    await this.get("PRAGMA table_info('sqlite_master')");
  }
}
