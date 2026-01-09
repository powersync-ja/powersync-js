import { BatchedUpdateNotification, QueryResult } from '@powersync/common';
import { ResolvedWebSQLOpenOptions } from './web-sql-flags.js';

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
  /**
   * Marks the connection as in-use by a certain actor.
   * @returns A hold ID which can be used to release the hold.
   */
  markHold(): Promise<string>;
  /**
   * Releases a hold on the connection.
   * @param holdId The hold ID to release.
   */
  releaseHold(holdId: string): Promise<void>;
  /**
   * Checks if the database connection is in autocommit mode.
   * @returns true if in autocommit mode, false if in a transaction
   */
  isAutoCommit(): Promise<boolean>;
  execute(sql: string, params?: any[]): Promise<ProxiedQueryResult>;
  executeRaw(sql: string, params?: any[]): Promise<any[][]>;
  executeBatch(sql: string, params?: any[]): Promise<ProxiedQueryResult>;
  registerOnTableChange(callback: OnTableChangeCallback): Promise<() => void>;
  getConfig(): Promise<Config>;
}

/**
 * @internal
 */
export type OpenAsyncDatabaseConnection<Config extends ResolvedWebSQLOpenOptions = ResolvedWebSQLOpenOptions> = (
  config: Config
) => AsyncDatabaseConnection;
