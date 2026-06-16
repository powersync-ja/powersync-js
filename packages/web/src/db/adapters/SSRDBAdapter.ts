import { DBAdapter, DBLockOptions, LockContext, QueryResult, RawResultSet } from '@powersync/common';
import { Mutex } from '@powersync/shared-internals';

const MOCK_QUERY_RESPONSE: QueryResult<never> = {
  rowsAffected: 0
};

/**
 * Implements a Mock DB adapter for use in Server Side Rendering (SSR).
 * This adapter will return empty results for queries, which will allow
 * server rendered views to initially generate scaffolding components
 */
export class SSRDBAdapter extends DBAdapter {
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
    return fn(new StubLockContext());
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) {
    return fn(new StubLockContext());
  }

  async refreshSchema(): Promise<void> {}
}

class StubLockContext extends LockContext {
  get connectionType() {
    return undefined;
  }

  async executeRaw(): Promise<QueryResult<RawResultSet>> {
    return MOCK_QUERY_RESPONSE;
  }
}
