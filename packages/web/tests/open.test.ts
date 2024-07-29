import { AbstractPowerSyncDatabase } from '@powersync/common';
import {
  PowerSyncDatabase,
  WASQLiteDBAdapter,
  WASQLiteOpenFactory,
  WASQLitePowerSyncDatabaseOpenFactory
} from '@powersync/web';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { testSchema } from './utils/testDb';

const testId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';

export const basicTest = async (db: AbstractPowerSyncDatabase) => {
  await db.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
  expect(await db.getAll('SELECT * FROM assets')).length.gt(0);
  await db.disconnectAndClear();
  await db.close();
};

describe('Open Methods', () => {
  let originalSharedWorker: typeof SharedWorker;
  let originalWorker: typeof Worker;

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

  beforeAll(() => {
    // Store the original SharedWorker constructor
    originalSharedWorker = SharedWorker;
    originalWorker = Worker;

    // Create a proxy to intercept the worker constructors
    // The vi.SpyOn does not work well with constructors
    window.SharedWorker = new Proxy(SharedWorker, sharedWorkerProxyHandler);
    window.Worker = new Proxy(Worker, workerProxyHandler);
  });

  afterAll(() => {
    // Restore Worker
    window.SharedWorker = originalSharedWorker;
    window.Worker = originalWorker;
  });

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
    const sharedSpy = vi.spyOn(sharedWorkerProxyHandler, 'construct');

    const db = new PowerSyncDatabase({ database: { dbFilename: 'options-test.db' }, schema: testSchema });

    await basicTest(db);

    expect(sharedSpy).toBeCalledTimes(1);
  });

  it('Should use dedicated worker when multiple tabs disabled', async () => {
    const sharedSpy = vi.spyOn(sharedWorkerProxyHandler, 'construct');
    const dedicatedSpy = vi.spyOn(workerProxyHandler, 'construct');

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
    const sharedSpy = vi.spyOn(sharedWorkerProxyHandler, 'construct');
    const dedicatedSpy = vi.spyOn(workerProxyHandler, 'construct');

    const db = new PowerSyncDatabase({
      database: { dbFilename: 'options-test.db' },
      schema: testSchema,
      flags: { useWebWorker: false }
    });

    await basicTest(db);

    expect(sharedSpy).toBeCalledTimes(0);
    expect(dedicatedSpy).toBeCalledTimes(0);
  });
});
