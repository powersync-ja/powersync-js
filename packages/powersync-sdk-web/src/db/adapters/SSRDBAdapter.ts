import {
  BaseObserver,
  DBAdapterListener,
  DBAdapter,
  DBLockOptions,
  LockContext,
  QueryResult,
  Transaction
} from '@journeyapps/powersync-sdk-common';

import { Mutex } from 'async-mutex';

const MOCK_QUERY_RESPONSE: QueryResult = {
  rowsAffected: 0
};

/**
 * Implements a Mock DB adapter for use in Server Side Rendering (SSR).
 * This adapter will return empty results for queries, which will allow
 * server rendered views to initially generate scaffolding components
 */
export class SSRDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  name: string;
  readMutex: Mutex;
  writeMutex: Mutex;

  constructor() {
    super();
    this.name = 'SSR DB';
    this.readMutex = new Mutex();
    this.writeMutex = new Mutex();
  }

  close() {}

  async readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) {
    return this.readMutex.runExclusive(() => fn(this));
  }

  async readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) {
    return this.readLock(() => fn(this.generateMockTransactionContext()));
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) {
    return this.writeMutex.runExclusive(() => fn(this));
  }

  async writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) {
    return this.writeLock(() => fn(this.generateMockTransactionContext()));
  }

  async execute(query: string, params?: any[]): Promise<QueryResult> {
    return this.writeMutex.runExclusive(async () => MOCK_QUERY_RESPONSE);
  }

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return [];
  }

  async getOptional<T>(sql: string, parameters?: any[] | undefined): Promise<T | null> {
    return null;
  }

  async get<T>(sql: string, parameters?: any[] | undefined): Promise<T> {
    throw new Error(`No values are returned in SSR mode`);
  }

  /**
   * Generates a mock context for use in read/write transactions.
   * `this` already mocks most of the API, commit and rollback mocks
   *  are added here
   */
  private generateMockTransactionContext(): Transaction {
    return {
      ...this,
      commit: async () => {
        return MOCK_QUERY_RESPONSE;
      },
      rollback: async () => {
        return MOCK_QUERY_RESPONSE;
      }
    };
  }
}
