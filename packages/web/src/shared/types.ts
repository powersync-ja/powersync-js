import type { BatchedUpdateNotification, QueryResult } from '@powersync/common';

export type WASQLExecuteResult = Omit<QueryResult, 'rows'> & {
  rows: {
    _array: any[];
    length: number;
  };
};

export type DBFunctionsInterface = {
  //   Close is only exposed when used in a single non shared webworker
  close?: () => void;
  execute: WASQLiteExecuteMethod;
  executeBatch: WASQLiteExecuteBatchMethod;
  registerOnTableChange: (callback: OnTableChangeCallback) => void;
};

/**
 * @deprecated use [DBFunctionsInterface instead]
 */
export type DBWorkerInterface = DBFunctionsInterface;

export type WASQLiteExecuteMethod = (sql: string, params?: any[]) => Promise<WASQLExecuteResult>;
export type WASQLiteExecuteBatchMethod = (sql: string, params?: any[]) => Promise<WASQLExecuteResult>;
export type OnTableChangeCallback = (event: BatchedUpdateNotification) => void;
export type OpenDB = (dbFileName: string) => DBWorkerInterface;

export type SQLBatchTuple = [string] | [string, Array<any> | Array<Array<any>>];
