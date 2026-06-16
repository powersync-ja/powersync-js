import { QueryResult, RawResultSet } from '@powersync/common';
import { NodeDatabaseImplementation } from './options.js';

export interface AsyncDatabaseOpenOptions {
  path: string;
  isWriter: boolean;
  implementation: NodeDatabaseImplementation;
}

export interface AsyncDatabaseOpener {
  open(options: AsyncDatabaseOpenOptions): Promise<AsyncDatabase>;
}

export interface AsyncDatabase {
  executeRaw: (query: string, params: any[]) => Promise<QueryResult<RawResultSet>>;
  executeBatch: (query: string, params: any[][]) => Promise<QueryResult<never>>;
  close: () => Promise<void>;
}
