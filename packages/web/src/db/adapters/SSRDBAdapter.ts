import { DBAdapter, DBLockOptions, LockContext, RawQueryResult } from '@powersync/common';
import { Mutex } from '@powersync/shared-internals';

const MOCK_QUERY_RESPONSE: RawQueryResult = {
  rowsAffected: 0,
  columnNames: [],
  rawRows: []
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
  get connectionType(): 'readWrite' {
    return 'readWrite';
  }

  async executeRaw(): Promise<RawQueryResult> {
    return MOCK_QUERY_RESPONSE;
  }
}
