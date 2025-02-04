import { BatchedUpdateNotification, QueryResult } from '@powersync/common';
import { ResolvedWebSQLOpenOptions } from './web-sql-flags';

/**
 * Proxied query result does not contain a function for accessing row values
 */
export type ProxiedQueryResult = Omit<QueryResult, 'rows'> & {
  rows: {
    _array: any[];
    length: number;
  };
};
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
  executeBatch(sql: string, params?: any[]): Promise<ProxiedQueryResult>;
  registerOnTableChange(callback: OnTableChangeCallback): Promise<() => void>;
  getConfig(): Promise<Config>;
}

export type OpenAsyncDatabaseConnection<Config extends ResolvedWebSQLOpenOptions = ResolvedWebSQLOpenOptions> = (
  config: Config
) => AsyncDatabaseConnection;
