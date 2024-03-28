import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbstractPowerSyncDatabase, SqliteBucketStorage, SyncStatus } from '@journeyapps/powersync-sdk-common';
import {
  SharedWebStreamingSyncImplementation,
  WASQLitePowerSyncDatabaseOpenFactory,
  WebRemote,
  WebStreamingSyncImplementationOptions
} from '@journeyapps/powersync-sdk-web';
import { testSchema } from './utils/test-schema';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { Mutex } from 'async-mutex';

describe('Multiple Instances', () => {
  const dbFilename = 'test-multiple-instances.db';
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename,
    schema: testSchema
  });

  let db: AbstractPowerSyncDatabase;

  beforeEach(() => {
    db = factory.getInstance();
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  function createAsset(powersync: AbstractPowerSyncDatabase = db) {
    return powersync.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['test']);
  }

  it('should share data between instances', async () => {
    // Create an asset on the first connection
    await createAsset();

    // Create a new connection and verify it can read existing assets
    const db2 = factory.getInstance();
    const assets = await db2.getAll('SELECT * FROM assets');
    expect(assets.length).equals(1);

    await db2.close();
  });

  it('should maintain DB connections if instances call close', async () => {
    /**
     * The shared webworker should use the same DB connection for both instances.
     * The shared connection should only be closed if all PowerSync clients
     * close themselves.
     */
    const db2 = factory.getInstance();
    await db2.close();

    // Create an asset on the first connection
    await createAsset();
  });

  it('should watch table changes between instances', async () => {
    const db2 = factory.getInstance();

    const watchedPromise = new Promise<void>(async (resolve) => {
      const controller = new AbortController();
      for await (const result of db2.watch('SELECT * FROM assets')) {
        resolve();
        controller.abort();
      }
    });

    await createAsset();

    expect(watchedPromise).rejects;
  });

  it('should share sync updates', async () => {
    // Generate the first streaming sync implementation
    const connector1 = new TestConnector();

    // They need to use the same identifier to use the same shared worker.
    const identifier = 'streaming-sync-shared';
    const syncOptions1: WebStreamingSyncImplementationOptions = {
      adapter: new SqliteBucketStorage(db.database, new Mutex()),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        await connector1.uploadData(db);
      },
      identifier
    };

    const stream1 = new SharedWebStreamingSyncImplementation(syncOptions1);

    // Generate the second streaming sync implementation
    const connector2 = new TestConnector();
    const syncOptions2: WebStreamingSyncImplementationOptions = {
      adapter: new SqliteBucketStorage(db.database, new Mutex()),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        await connector2.uploadData(db);
      },
      identifier
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

    // They need to use the same identifier to use the same shared worker.
    const identifier = dbFilename;

    // Resolves once the first connector has been called to upload data
    let triggerUpload1: () => void;
    const upload1TriggeredPromise = new Promise<void>((resolve) => {
      triggerUpload1 = resolve;
    });

    // Create the first streaming client
    const syncOptions1: WebStreamingSyncImplementationOptions = {
      adapter: new SqliteBucketStorage(db.database, new Mutex()),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        triggerUpload1();
        connector1.uploadData(db);
      },
      identifier
    };
    const stream1 = new SharedWebStreamingSyncImplementation(syncOptions1);

    // Generate the second streaming sync implementation
    const connector2 = new TestConnector();
    const spy2 = vi.spyOn(connector2, 'uploadData');
    let triggerUpload2: () => void;
    const upload2TriggeredPromise = new Promise<void>((resolve) => {
      triggerUpload2 = resolve;
    });
    const syncOptions2: WebStreamingSyncImplementationOptions = {
      adapter: new SqliteBucketStorage(db.database, new Mutex()),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        triggerUpload2();
        connector2.uploadData(db);
      },
      identifier
    };
    const stream2 = new SharedWebStreamingSyncImplementation(syncOptions2);

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
