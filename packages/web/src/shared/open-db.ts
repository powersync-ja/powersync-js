import '@journeyapps/wa-sqlite';
import * as SQLite from '@journeyapps/wa-sqlite';
import { BatchedUpdateNotification } from '@powersync/common';
import { Mutex } from 'async-mutex';
import * as Comlink from 'comlink';
import type { DBFunctionsInterface, OnTableChangeCallback, WASQLExecuteResult } from './types';

let nextId = 1;

export async function _openDB(
  dbFileName: string,
  options: { useWebWorker: boolean } = { useWebWorker: true }
): Promise<DBFunctionsInterface> {
  const { default: moduleFactory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
  const module = await moduleFactory();
  const sqlite3 = SQLite.Factory(module);

  const { IDBBatchAtomicVFS } = await import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
  // @ts-ignore TODO update types
  const vfs = await IDBBatchAtomicVFS.create(dbFileName, module, { lockPolicy: 'shared+hint' });
  sqlite3.vfs_register(vfs, true);

  const db = await sqlite3.open_v2(dbFileName);
  const statementMutex = new Mutex();

  /**
   * Listeners are exclusive to the DB connection.
   */
  const listeners = new Map<number, OnTableChangeCallback>();

  let updatedTables = new Set<string>();
  let updateTimer: any = null;

  function fireUpdates() {
    updateTimer = null;
    const event: BatchedUpdateNotification = { tables: [...updatedTables], groupedUpdates: {}, rawUpdates: [] };
    updatedTables.clear();
    Array.from(listeners.values()).forEach((l) => l(event));
  }

  sqlite3.register_table_onchange_hook(db, (opType: number, tableName: string, rowId: number) => {
    updatedTables.add(tableName);
    if (updateTimer == null) {
      updateTimer = setTimeout(fireUpdates, 0);
    }
  });

  /**
   * This executes single SQL statements inside a requested lock.
   */
  const execute = async (sql: string | TemplateStringsArray, bindings?: any[]): Promise<WASQLExecuteResult> => {
    // Running multiple statements on the same connection concurrently should not be allowed
    return _acquireExecuteLock(async () => {
      return executeSingleStatement(sql, bindings);
    });
  };

  /**
   * This requests a lock for executing statements.
   * Should only be used internally.
   */
  const _acquireExecuteLock = <T>(callback: () => Promise<T>): Promise<T> => {
    return statementMutex.runExclusive(callback);
  };

  /**
   * This executes a single statement using SQLite3.
   */
  const executeSingleStatement = async (
    sql: string | TemplateStringsArray,
    bindings?: any[]
  ): Promise<WASQLExecuteResult> => {
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

    const rows: Record<string, any>[] = [];
    for (const resultset of results) {
      for (const row of resultset.rows) {
        const outRow: Record<string, any> = {};
        resultset.columns.forEach((key, index) => {
          outRow[key] = row[index];
        });
        rows.push(outRow);
      }
    }

    const result = {
      insertId: sqlite3.last_insert_id(db),
      rowsAffected: sqlite3.changes(db),
      rows: {
        _array: rows,
        length: rows.length
      }
    };

    return result;
  };

  /**
   * This executes SQL statements in a batch.
   */
  const executeBatch = async (sql: string, bindings?: any[][]): Promise<WASQLExecuteResult> => {
    return _acquireExecuteLock(async (): Promise<WASQLExecuteResult> => {
      let affectedRows = 0;

      try {
        await executeSingleStatement('BEGIN TRANSACTION');

        const wrappedBindings = bindings ? bindings : [];
        for await (const stmt of sqlite3.statements(db, sql)) {
          if (stmt === null) {
            return {
              rowsAffected: 0,
              rows: { _array: [], length: 0 }
            };
          }

          //Prepare statement once
          for (const binding of wrappedBindings) {
            // TODO not sure why this is needed currently, but booleans break
            for (let i = 0; i < binding.length; i++) {
              const b = binding[i];
              if (typeof b == 'boolean') {
                binding[i] = b ? 1 : 0;
              }
            }

            if (bindings) {
              sqlite3.bind_collection(stmt, binding);
            }
            const result = await sqlite3.step(stmt);
            if (result === SQLite.SQLITE_DONE) {
              //The value returned by sqlite3_changes() immediately after an INSERT, UPDATE or DELETE statement run on a view is always zero.
              affectedRows += sqlite3.changes(db);
            }

            sqlite3.reset(stmt);
          }
        }

        await executeSingleStatement('COMMIT');
      } catch (err) {
        await executeSingleStatement('ROLLBACK');
        return {
          rowsAffected: 0,
          rows: { _array: [], length: 0 }
        };
      }
      const result = {
        rowsAffected: affectedRows,
        rows: { _array: [], length: 0 }
      };

      return result;
    });
  };

  if (options.useWebWorker) {
    const registerOnTableChange = (callback: OnTableChangeCallback) => {
      const id = nextId++;
      listeners.set(id, callback);
      return Comlink.proxy(() => {
        listeners.delete(id);
      });
    };

    return {
      execute: Comlink.proxy(execute),
      executeBatch: Comlink.proxy(executeBatch),
      registerOnTableChange: Comlink.proxy(registerOnTableChange),
      close: Comlink.proxy(() => {
        sqlite3.close(db);
      })
    };
  }

  const registerOnTableChange = (callback: OnTableChangeCallback) => {
    const id = nextId++;
    listeners.set(id, callback);
    return () => {
      listeners.delete(id);
    };
  };

  return {
    execute: execute,
    executeBatch: executeBatch,
    registerOnTableChange: registerOnTableChange,
    close: () => sqlite3.close(db)
  };
}
