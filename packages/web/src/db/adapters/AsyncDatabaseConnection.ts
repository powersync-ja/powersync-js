import { BatchedUpdateNotification, QueryResult, SQLOpenOptions } from '@powersync/common';

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
export interface AsyncDatabaseConnection {
  init(): Promise<void>;
  close(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<ProxiedQueryResult>;
  executeBatch(sql: string, params?: any[]): Promise<ProxiedQueryResult>;
  registerOnTableChange(callback: OnTableChangeCallback): Promise<() => void>;
}

export type OpenAsyncDatabaseConnection<Options extends SQLOpenOptions = SQLOpenOptions> = (
  options: Options
) => AsyncDatabaseConnection;
