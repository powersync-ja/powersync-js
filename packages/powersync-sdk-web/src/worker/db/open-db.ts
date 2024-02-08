import * as SQLite from '@journeyapps/wa-sqlite';
import '@journeyapps/wa-sqlite';
import _ from 'lodash';
import * as Comlink from 'comlink';
import { v4 as uuid } from 'uuid';
import { QueryResult } from '@journeyapps/powersync-sdk-common';

export type WASQLExecuteResult = Omit<QueryResult, 'rows'> & {
  rows: {
    _array: any[];
    length: number;
  };
};

export type DBWorkerInterface = {
  //   Close is only exposed when used in a single non shared webworker
  close?: () => void;
  execute: WASQLiteExecuteMethod;
  registerOnTableChange: (callback: OnTableChangeCallback) => void;
};

export type WASQLiteExecuteMethod = (sql: string, params?: any[]) => Promise<WASQLExecuteResult>;

export type OnTableChangeCallback = (opType: number, tableName: string, rowId: number) => void;
export type OpenDB = (dbFileName: string) => DBWorkerInterface;

export async function _openDB(dbFileName: string): Promise<DBWorkerInterface> {
  const { default: moduleFactory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
  const module = await moduleFactory();
  const sqlite3 = SQLite.Factory(module);

  const { IDBBatchAtomicVFS } = await import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
  const vfs = new IDBBatchAtomicVFS(dbFileName);
  sqlite3.vfs_register(vfs, true);

  const db = await sqlite3.open_v2(dbFileName);

  /**
   * Listeners are exclusive to the DB connection.
   */
  const listeners = new Map<string, OnTableChangeCallback>();

  sqlite3.register_table_onchange_hook(db, (opType: number, tableName: string, rowId: number) => {
    Array.from(listeners.values()).forEach((l) => l(opType, tableName, rowId));
  });

  const registerOnTableChange = (callback: OnTableChangeCallback) => {
    const id = uuid();
    listeners.set(id, callback);
    return Comlink.proxy(() => {
      listeners.delete(id);
    });
  };

  /**
   * This executes SQL statements.
   */
  const execute = async (sql: string | TemplateStringsArray, bindings?: any[]): Promise<WASQLExecuteResult> => {
    // Running multiple statements on the same connection concurrently should not be allowed
    return navigator.locks.request(`db-execute-${dbFileName}`, async () => {
      const results = [];
      for await (const stmt of sqlite3.statements(db, sql as string)) {
        let columns;
        const wrappedBindings = bindings ? [bindings] : [[]];
        for (const binding of wrappedBindings) {
          // TODO not sure why this is needed currently, but booleans break
          binding.forEach((b, index, arr) => {
            if (typeof b == 'boolean') {
              arr[index] = b ? 1 : 0;
            }
          });

          sqlite3.reset(stmt);
          if (bindings) {
            sqlite3.bind_collection(stmt, binding);
          }

          const rows = [];
          while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
            const row = sqlite3.row(stmt);
            rows.push(row);
          }

          columns = columns ?? sqlite3.column_names(stmt);
          if (columns.length) {
            results.push({ columns, rows });
          }
        }

        // When binding parameters, only a single statement is executed.
        if (bindings) {
          break;
        }
      }

      const rows = _.chain(results)
        .filter(({ rows }) => !!rows.length)
        .flatMap(({ columns, rows }) =>
          _.map(rows, (row) =>
            _.reduce(
              columns,
              (out: Record<string, any>, key: string, index) => {
                out[key] = row[index];
                return out;
              },
              {}
            )
          )
        )
        .value();

      const result = {
        insertId: sqlite3.last_insert_id(db),
        rowsAffected: sqlite3.changes(db),
        rows: {
          _array: rows,
          length: rows.length
        }
      };

      return result;
    });
  };

  return {
    execute: Comlink.proxy(execute),
    registerOnTableChange: Comlink.proxy(registerOnTableChange),
    close: Comlink.proxy(() => {
      sqlite3.close(db);
    })
  };
}
