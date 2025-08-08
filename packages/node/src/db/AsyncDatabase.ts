import { QueryResult } from '@powersync/common';
import { NodeDatabaseImplementation } from './options.js';

export type ProxiedQueryResult = Omit<QueryResult, 'rows'> & {
  rows?: {
    _array: any[];
    length: number;
  };
};

export interface AsyncDatabaseOpenOptions {
  path: string;
  isWriter: boolean;
  implementation: NodeDatabaseImplementation;
}

export interface AsyncDatabaseOpener {
  open(options: AsyncDatabaseOpenOptions): Promise<AsyncDatabase>;
}

export interface AsyncDatabase {
  execute: (query: string, params: any[]) => Promise<ProxiedQueryResult>;
  executeRaw: (query: string, params: any[]) => Promise<any[][]>;
  executeBatch: (query: string, params: any[][]) => Promise<ProxiedQueryResult>;
  close: () => Promise<void>;
  // Collect table updates made since the last call to collectCommittedUpdates.
  // This happens on the worker because we otherwise get race conditions when wrapping
  // callbacks to invoke on the main thread (we need a guarantee that collectCommittedUpdates
  // contains entries immediately after calling COMMIT).
  collectCommittedUpdates: () => Promise<string[]>;
}
