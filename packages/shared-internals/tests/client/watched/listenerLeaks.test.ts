import { DBAdapter, LockContext, RawQueryResult, Schema } from '@powersync/common';
import { describe, expect, it } from 'vitest';
import { BasePowerSyncDatabase } from '../../../src/client/BasePowerSyncDatabase.js';

class MockLockContext extends LockContext {
  async executeRaw(): Promise<RawQueryResult> {
    return { columnNames: [], rawRows: [] };
  }
}

class MockDBAdapter extends DBAdapter {
  /**
   * Read locks await this promise before executing.
   * Tests use this to park a query (e.g. `resolveTables`) mid-await.
   */
  readGate: Promise<void> = Promise.resolve();

  get name() {
    return 'mock-db';
  }

  /**
   * The number of registered adapter listeners. Exposed for leak assertions.
   */
  get registeredListenerCount() {
    return this.listeners.size;
  }

  async close() {}

  async refreshSchema() {}

  async readLock<T>(fn: (tx: LockContext) => Promise<T>): Promise<T> {
    await this.readGate;
    return fn(new MockLockContext());
  }

  async writeLock<T>(fn: (tx: LockContext) => Promise<T>): Promise<T> {
    return fn(new MockLockContext());
  }
}

class TestPowerSyncDatabase extends BasePowerSyncDatabase {
  /**
   * When set, `waitForReady` awaits this promise.
   * Tests use this to park watched-query initialization mid-await.
   */
  readyGate: Promise<void> | null = null;

  /**
   * The number of registered database listeners. Exposed for leak assertions.
   */
  get registeredListenerCount() {
    return this.listeners.size;
  }

  get mockAdapter() {
    return this.database as MockDBAdapter;
  }

  protected openDBAdapter(): DBAdapter {
    return new MockDBAdapter();
  }

  protected generateSyncStreamImplementation(): never {
    throw new Error('Sync is not required for these tests');
  }

  protected generateBucketStorageAdapter(): never {
    return null as never;
  }

  protected async _initialize() {}

  // The real initialization runs queries against the SQLite database, which is not required here.
  protected async initialize() {
    this.ready = true;
  }

  async waitForReady(): Promise<void> {
    await this.readyGate;
  }
}

const createTestDatabase = () => new TestPowerSyncDatabase({ schema: new Schema([]) });

const watchQuery = (db: TestPowerSyncDatabase) =>
  db
    .customQuery<{ id: string }>({
      compile: () => ({ sql: 'SELECT * FROM todos', parameters: [] }),
      execute: async () => []
    })
    .watch({});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

/** Waits for pending micro and macro tasks to complete. */
const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r));
  }
};

describe('watched query listener cleanup', () => {
  it('onChangeWithCallback should not register an adapter listener for an already-aborted signal', () => {
    const db = createTestDatabase();
    const controller = new AbortController();
    controller.abort();

    const dispose = db.onChangeWithCallback({ onChange: () => {} }, { signal: controller.signal, tables: ['todos'] });

    expect(db.mockAdapter.registeredListenerCount).toEqual(0);
    // The returned dispose function should still be safe to call
    dispose();
    expect(db.mockAdapter.registeredListenerCount).toEqual(0);
  });

  it('onChangeWithCallback should dispose the adapter listener when the signal aborts', () => {
    const db = createTestDatabase();
    const controller = new AbortController();

    db.onChangeWithCallback({ onChange: () => {} }, { signal: controller.signal, tables: ['todos'] });

    expect(db.mockAdapter.registeredListenerCount).toEqual(1);
    controller.abort();
    expect(db.mockAdapter.registeredListenerCount).toEqual(0);
  });

  it('should register and dispose listeners across a watched query lifecycle', async () => {
    const db = createTestDatabase();
    const baseListenerCount = db.registeredListenerCount;

    const query = watchQuery(db);
    await settle();

    expect(db.mockAdapter.registeredListenerCount).toEqual(1);
    // The closing and schemaChanged listeners
    expect(db.registeredListenerCount).toEqual(baseListenerCount + 2);

    await query.close();
    await settle();

    expect(db.mockAdapter.registeredListenerCount).toEqual(0);
    expect(db.registeredListenerCount).toEqual(baseListenerCount);
  });

  it('should not leak listeners when a watched query is closed while resolving tables', async () => {
    const db = createTestDatabase();
    const baseListenerCount = db.registeredListenerCount;

    // Park the query's `resolveTables` call on its read lock
    const readGate = deferred();
    db.mockAdapter.readGate = readGate.promise;

    // Mimics React's useQuery, which creates a watched query during render
    // and closes it from a mount effect one frame later.
    const query = watchQuery(db);
    await settle();
    await query.close();

    readGate.resolve();
    await settle();

    expect(db.mockAdapter.registeredListenerCount).toEqual(0);
    expect(db.registeredListenerCount).toEqual(baseListenerCount);
  });

  it('should not leak listeners when a watched query is closed while waiting for ready', async () => {
    const db = createTestDatabase();
    const baseListenerCount = db.registeredListenerCount;

    // Park the watched query's initialization on `waitForReady`
    const readyGate = deferred();
    db.readyGate = readyGate.promise;

    const query = watchQuery(db);
    await settle();

    // The closing listener is registered before waiting for ready
    expect(db.registeredListenerCount).toEqual(baseListenerCount + 1);

    await query.close();
    readyGate.resolve();
    await settle();

    expect(db.registeredListenerCount).toEqual(baseListenerCount);
    expect(db.mockAdapter.registeredListenerCount).toEqual(0);
  });
});
