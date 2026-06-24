import { BaseQueryResult, QueryResult, RawQueryResult } from '@powersync/common';
import { NodeDatabaseImplementation } from './options.js';

export interface MappedQueryResult extends BaseQueryResult {
  rows?: unknown[];
}

export interface AsyncDatabaseOpenOptions {
  path: string;
  isWriter: boolean;
  implementation: NodeDatabaseImplementation;
}

export interface AsyncDatabaseOpener {
  open(options: AsyncDatabaseOpenOptions): Promise<AsyncDatabase>;
}

export interface AsyncDatabase {
  execute: (query: string, params: any[]) => Promise<MappedQueryResult>;
  executeRaw: (query: string, params: any[]) => Promise<RawQueryResult>;
  executeBatch: (query: string, params: any[][]) => Promise<QueryResult<never>>;
  close: () => Promise<void>;
}
