import {
  AbstractPowerSyncDatabase,
  createBaseLogger,
  createLogger,
  SqliteBucketStorage,
  SyncStatus
} from '@powersync/common';
import {
  SharedWebStreamingSyncImplementation,
  SharedWebStreamingSyncImplementationOptions,
  WebRemote
} from '@powersync/web';

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { WebDBAdapter } from '../src/db/adapters/WebDBAdapter';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { generateTestDb, testSchema } from './utils/testDb';

describe('Multiple Instances', { sequential: true }, () => {
  const openDatabase = () =>
    generateTestDb({
      database: {
        dbFilename: `test-multiple-instances.db`
      },
      schema: testSchema
    });

  beforeAll(() => createBaseLogger().useDefaults());

  function createAsset(powersync: AbstractPowerSyncDatabase) {
    return powersync.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['test']);
  }

  it('should share data between instances', async () => {
    const powersync = openDatabase();

    // Create an asset on the first connection
    await createAsset(powersync);

    // Create a new connection and verify it can read existing assets
    const db2 = openDatabase();
    const assets = await db2.getAll('SELECT * FROM assets');
    expect(assets.length).equals(1);
  });

  it('should broadcast logs from shared sync worker', { timeout: 20000 }, async () => {
    const logger = createLogger('test-logger');
    const spiedErrorLogger = vi.spyOn(logger, 'error');
    const spiedDebugLogger = vi.spyOn(logger, 'debug');

    const powersync = generateTestDb({
      logger,
      database: {
        dbFilename: 'broadcast-logger-test.sqlite'
      },
      schema: testSchema
    });

    powersync.connect({
      fetchCredentials: async () => {
        return {
          endpoint: 'http://localhost/does-not-exist',
          token: 'none'
        };
      },
      uploadData: async (db) => {}
    });

    // Should log that a connection attempt has been made
    const message = 'Streaming sync iteration started';
    await vi.waitFor(
      () =>
        expect(
          spiedDebugLogger.mock.calls
            .flat(1)
            .find((argument) => typeof argument == 'string' && argument.includes(message))
        ).exist,
      { timeout: 2000 }
    );

    // The connection should fail with an error
    await vi.waitFor(() => expect(spiedErrorLogger.mock.calls.length).gt(0), { timeout: 2000 });
    // This test seems to take quite long while waiting for this disconnect call
  });

  it('should maintain DB connections if instances call close', async () => {
    /**
     * The shared webworker should use the same DB connection for both instances.
     * The shared connection should only be closed if all PowerSync clients
     * close themselves.
     */
    const powersync1 = openDatabase();
    const powersync2 = openDatabase();
    await powersync1.close();

    // Create an asset on the first connection
    await createAsset(powersync2);
  });

  it('should watch table changes between instances', async () => {
    const db1 = openDatabase();
    const db2 = openDatabase();

    const watchedPromise = new Promise<void>(async (resolve) => {
      const controller = new AbortController();
      for await (const result of db2.watch('SELECT * FROM assets', [], { signal: controller.signal })) {
        if (result.rows?.length) {
          resolve();
          controller.abort();
        }
      }
    });

    await createAsset(db1);

    await watchedPromise;
  });

  it('should share sync updates', async () => {
    // Generate the first streaming sync implementation
    const connector1 = new TestConnector();
    const db = openDatabase();
    await db.init();

    // They need to use the same identifier to use the same shared worker.
    const identifier = 'streaming-sync-shared';
    const syncOptions1: SharedWebStreamingSyncImplementationOptions = {
      adapter: new SqliteBucketStorage(db.database),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        await connector1.uploadData(db);
      },
      identifier,
      db: db.database as WebDBAdapter
    };

    const stream1 = new SharedWebStreamingSyncImplementation(syncOptions1);

    // Generate the second streaming sync implementation
    const connector2 = new TestConnector();
    const syncOptions2: SharedWebStreamingSyncImplementationOptions = {
      adapter: new SqliteBucketStorage(db.database),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        await connector2.uploadData(db);
      },
      identifier,
      db: db.database as WebDBAdapter
    };

    const stream2 = new SharedWebStreamingSyncImplementation(syncOptions2);

    const stream2UpdatedPromise = new Promise<void>((resolve, reject) => {
      const l = stream2.registerListener({
        statusChanged: (status) => {
          if (status.connected) {
            resolve();
            l();
          }
        }
      });
    });

    // hack to set the status to a new one for tests
    (stream1 as any)['_testUpdateStatus'](new SyncStatus({ connected: true }));

    await stream2UpdatedPromise;
    expect(stream2.isConnected).true;

    await stream1.dispose();
    await stream2.dispose();
  });

  it('should trigger uploads from last connected clients', async () => {
    // Generate the first streaming sync implementation
    const connector1 = new TestConnector();
    const spy1 = vi.spyOn(connector1, 'uploadData');

    const db = openDatabase();
    await db.init();
    // They need to use the same identifier to use the same shared worker.
    const identifier = db.database.name;

    // Resolves once the first connector has been called to upload data
    let triggerUpload1: () => void;
    const upload1TriggeredPromise = new Promise<void>((resolve) => {
      triggerUpload1 = resolve;
    });

    // Create the first streaming client
    const stream1 = new SharedWebStreamingSyncImplementation({
      adapter: new SqliteBucketStorage(db.database),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        triggerUpload1();
        connector1.uploadData(db);
      },
      db: db.database as WebDBAdapter,
      identifier,
      retryDelayMs: 100,
      flags: {
        broadcastLogs: true
      }
    });

    // Generate the second streaming sync implementation
    const connector2 = new TestConnector();
    // The second connector will be called first to upload, we don't want it to actually upload
    // This will cause the sync uploads to be delayed as the CRUD queue did not change
    const spy2 = vi.spyOn(connector2, 'uploadData').mockImplementation(async () => {});

    let triggerUpload2: () => void;
    const upload2TriggeredPromise = new Promise<void>((resolve) => {
      triggerUpload2 = resolve;
    });

    const stream2 = new SharedWebStreamingSyncImplementation({
      adapter: new SqliteBucketStorage(db.database),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        triggerUpload2();
        connector2.uploadData(db);
      },
      identifier,
      retryDelayMs: 100,
      flags: {
        broadcastLogs: true
      },
      db: db.database as WebDBAdapter
    });

    // Waits for the stream to be marked as connected
    const stream2UpdatedPromise = new Promise<void>((resolve, reject) => {
      const l = stream2.registerListener({
        statusChanged: (status) => {
          if (status.connected) {
            resolve();
            l();
          }
        }
      });
    });

    // hack to set the status to connected for tests
    (stream1 as any)['_testUpdateStatus'](new SyncStatus({ connected: true }));

    // The status in the second stream client should be updated
    await stream2UpdatedPromise;

    expect(stream2.isConnected).true;

    // Create something with CRUD in it.
    await db.execute('INSERT into customers (id, name, email) VALUES (uuid(), ?, ?)', [
      'steven',
      'steven@journeyapps.com'
    ]);

    // Manual trigger since tests don't entirely configure watches for ps_crud
    stream1.triggerCrudUpload();
    // The second connector should be called to upload
    await upload2TriggeredPromise;

    // It should call the latest connected client
    expect(spy2).toHaveBeenCalledOnce();

    // Close the second client, leaving only the first one
    await stream2.dispose();

    stream1.triggerCrudUpload();
    // It should now upload from the first client
    await upload1TriggeredPromise;

    expect(spy1).toHaveBeenCalledOnce();

    await stream1.dispose();
  });
});
