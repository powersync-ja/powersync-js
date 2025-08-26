import { BatchedUpdateNotification, QueryResult } from '@powersync/common';
import { ResolvedWebSQLOpenOptions } from './web-sql-flags';

/**
 * @internal
 * Proxied query result does not contain a function for accessing row values
 */
export type ProxiedQueryResult = Omit<QueryResult, 'rows'> & {
  rows: {
    _array: any[];
    length: number;
  };
};

/**
 * @internal
 */
export type OnTableChangeCallback = (event: BatchedUpdateNotification) => void;

/**
 * @internal
 * An async Database connection which provides basic async SQL methods.
 * This is usually a proxied through a web worker.
 */
export interface AsyncDatabaseConnection<Config extends ResolvedWebSQLOpenOptions = ResolvedWebSQLOpenOptions> {
  init(): Promise<void>;
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<ProxiedQueryResult>;
  executeRaw(sql: string, params?: any[]): Promise<any[][]>;
  executeBatch(sql: string, params?: any[]): Promise<ProxiedQueryResult>;
  registerOnTableChange(callback: OnTableChangeCallback): Promise<() => void>;
  getConfig(): Promise<Config>;
}

/**
 * @internal
 */
export interface DBWorkerLogEvent {
  loggerName: string;
  logLevel: string;
  messages: string[];
}

/**
 * @internal
 */
export type WorkerLogHandler = (event: DBWorkerLogEvent) => void;

/**
 * @internal
 */
export type OpenAsyncDatabaseConnection<Config extends ResolvedWebSQLOpenOptions = ResolvedWebSQLOpenOptions> = (
  config: Config,
  logger?: WorkerLogHandler
) => AsyncDatabaseConnection;
