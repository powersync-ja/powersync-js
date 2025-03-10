import { AbstractPowerSyncDatabase, Schema } from '@powersync/common';
import {
  PowerSyncDatabase,
  WASQLiteDBAdapter,
  WASQLiteOpenFactory,
  WASQLitePowerSyncDatabaseOpenFactory
} from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testSchema } from './utils/testDb';

const testId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';

export const basicTest = async (db: AbstractPowerSyncDatabase) => {
  await db.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
  expect(await db.getAll('SELECT * FROM assets')).length.gt(0);
  await db.disconnectAndClear();
  await db.close();
};

const proxyWorkers = () => {
  const originalSharedWorker = SharedWorker;
  const originalWorker = Worker;

  const sharedWorkerProxyHandler = {
    construct(target: typeof SharedWorker, args: any[]) {
      const [url, options] = args;

      // Call the original constructor
      const instance = new target(url, options);
      return instance;
    }
  };
  const workerProxyHandler = {
    construct(target: typeof Worker, args: any[]) {
      const [url, options] = args;

      // Call the original constructor
      const instance = new target(url, options);
      return instance;
    }
  };

  window.SharedWorker = new Proxy(SharedWorker, sharedWorkerProxyHandler);
  window.Worker = new Proxy(Worker, workerProxyHandler);

  return {
    proxies: {
      sharedWorkerProxyHandler,
      workerProxyHandler
    },
    dispose: () => {
      window.SharedWorker = originalSharedWorker;
      window.Worker = originalWorker;
    }
  };
};

describe('Open Methods', { sequential: true }, () => {
  let mocks: ReturnType<typeof proxyWorkers>;

  beforeEach(() => {
    mocks = proxyWorkers();
  });

  afterEach(() => mocks?.dispose());

  it('Should open PowerSync clients from old factory methods', async () => {
    const db = new WASQLitePowerSyncDatabaseOpenFactory({
      dbFilename: `test-legacy.db`,
      schema: testSchema
    }).getInstance();

    await basicTest(db);
  });

  it('Should open with an existing DBAdapter', async () => {
    const adapter = new WASQLiteDBAdapter({ dbFilename: 'adapter-test.db' });
    const db = new PowerSyncDatabase({ database: adapter, schema: testSchema });

    await basicTest(db);
  });

  it('Should open with provided factory', async () => {
    const factory = new WASQLiteOpenFactory({ dbFilename: 'factory-test.db' });
    const db = new PowerSyncDatabase({ database: factory, schema: testSchema });

    await basicTest(db);
  });

  it('Should open with options', async () => {
    const db = new PowerSyncDatabase({ database: { dbFilename: 'options-test.db' }, schema: testSchema });

    await basicTest(db);
  });

  it('Should use shared worker for multiple tabs', async () => {
    const sharedSpy = vi.spyOn(mocks.proxies.sharedWorkerProxyHandler, 'construct');

    const db = new PowerSyncDatabase({ database: { dbFilename: 'options-test.db' }, schema: testSchema });

    await basicTest(db);

    expect(sharedSpy).toBeCalledTimes(1);
  });

  it('Should use dedicated worker when multiple tabs disabled', async () => {
    const sharedSpy = vi.spyOn(mocks.proxies.sharedWorkerProxyHandler, 'construct');
    const dedicatedSpy = vi.spyOn(mocks.proxies.workerProxyHandler, 'construct');

    const db = new PowerSyncDatabase({
      database: { dbFilename: 'options-test.db' },
      schema: testSchema,
      flags: { enableMultiTabs: false }
    });

    await basicTest(db);

    expect(sharedSpy).toBeCalledTimes(0);
    expect(dedicatedSpy).toBeCalledTimes(1);
  });

  it('Should not use workers when specified', async () => {
    const sharedSpy = vi.spyOn(mocks.proxies.sharedWorkerProxyHandler, 'construct');
    const dedicatedSpy = vi.spyOn(mocks.proxies.workerProxyHandler, 'construct');

    const db = new PowerSyncDatabase({
      database: { dbFilename: 'options-test.db' },
      schema: testSchema,
      flags: { useWebWorker: false }
    });

    await basicTest(db);

    expect(sharedSpy).toBeCalledTimes(0);
    expect(dedicatedSpy).toBeCalledTimes(0);
  });

  /**
   * TypeScript should prevent this kind of error. This scenario could happen
   * in pure JavaScript with no language server checking types.
   */
  it('Should throw if schema setting is not valid', async () => {
    const schemaError = 'The `schema` option should be provided';

    expect(
      () =>
        new PowerSyncDatabase({
          database: { dbFilename: 'test.sqlite' },
          // @ts-expect-error
          schema: null
        })
    ).throws(schemaError);

    expect(
      () =>
        new PowerSyncDatabase({
          database: { dbFilename: 'test.sqlite' },
          // @ts-expect-error
          schema: {}
        })
    ).throws(schemaError);

    expect(
      () =>
        new PowerSyncDatabase({
          database: { dbFilename: 'test.sqlite' },
          // @ts-expect-error
          schema: 'schema'
        })
    ).throws(schemaError);

    expect(
      () =>
        new PowerSyncDatabase({
          database: { dbFilename: 'test.sqlite' },
          // @ts-expect-error
          schema: undefined
        })
    ).throws(schemaError);

    // An Extended class should be fine
    class ExtendedSchema extends Schema {}

    const extendedClient = new PowerSyncDatabase({
      database: { dbFilename: 'test.sqlite' },
      schema: new ExtendedSchema([])
    });

    await extendedClient.close();
  });

  /**
   * TypeScript should prevent this kind of error. This scenario could happen
   * in pure JavaScript with no language server checking types.
   */
  it('Should throw if database setting is not valid', async () => {
    const dbError = 'The provided `database` option is invalid.';

    expect(
      () =>
        new PowerSyncDatabase({
          // @ts-expect-error
          database: null,
          schema: new Schema([])
        })
    ).throws(dbError);

    expect(
      () =>
        new PowerSyncDatabase({
          // @ts-expect-error
          database: {},
          schema: new Schema([])
        })
    ).throws(dbError);

    expect(
      () =>
        new PowerSyncDatabase({
          // @ts-expect-error
          database: 'db.sqlite',
          schema: new Schema([])
        })
    ).throws(dbError);
  });
});
