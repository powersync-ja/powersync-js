import {
  AbstractPowerSyncDatabase,
  createBaseLogger,
  createLogger,
  DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
  SqliteBucketStorage,
  SyncStatus
} from '@powersync/common';
import {
  OpenAsyncDatabaseConnection,
  SharedWebStreamingSyncImplementation,
  SharedWebStreamingSyncImplementationOptions,
  WASqliteConnection,
  WebRemote
} from '@powersync/web';
import * as Comlink from 'comlink';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { LockedAsyncDatabaseAdapter } from '../src/db/adapters/LockedAsyncDatabaseAdapter';
import { WebDBAdapter } from '../src/db/adapters/WebDBAdapter';
import { WorkerWrappedAsyncDatabaseConnection } from '../src/db/adapters/WorkerWrappedAsyncDatabaseConnection';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { generateTestDb, testSchema } from './utils/testDb';

const DB_FILENAME = 'test-multiple-instances.db';

describe('Multiple Instances', { sequential: true }, () => {
  const openDatabase = () =>
    generateTestDb({
      database: {
        dbFilename: DB_FILENAME
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

  it('should handled interrupted transactions', { timeout: Infinity }, async () => {
    //Create a shared PowerSync database. We'll just use this for internally managing connections.
    const powersync = openDatabase();
    await powersync.init();

    // Now get a shared connection to the same database
    const webAdapter = powersync.database as WebDBAdapter;

    // Allow us to share the connection. This is what shared sync workers will use.
    const shared = await webAdapter.shareConnection();
    const config = webAdapter.getConfiguration();
    const opener = Comlink.wrap<OpenAsyncDatabaseConnection>(shared.port);

    // Open up a shared connection
    const initialSharedConnection = (await opener(config)) as Comlink.Remote<WASqliteConnection>;
    onTestFinished(async () => {
      await initialSharedConnection.close();
    });

    // This will simulate another subsequent shared connection
    const subsequentSharedConnection = (await opener(config)) as Comlink.Remote<WASqliteConnection>;
    onTestFinished(async () => {
      await subsequentSharedConnection.close();
    });

    // In the beginning, we should not be in a transaction
    const isAutoCommit = await initialSharedConnection.isAutoCommit();
    // Should be true initially
    expect(isAutoCommit).true;

    // Now we'll simulate the locked connections which are used by the shared sync worker
    const wrappedInitialSharedConnection = new WorkerWrappedAsyncDatabaseConnection({
      baseConnection: initialSharedConnection,
      identifier: DB_FILENAME,
      remoteCanCloseUnexpectedly: true,
      remote: opener
    });

    // Wrap the second connection in a locked adapter, this simulates the actual use case
    const lockedInitialConnection = new LockedAsyncDatabaseAdapter({
      name: DB_FILENAME,
      openConnection: async () => wrappedInitialSharedConnection
    });

    // Allows us to unblock a transaction which is awaiting a promise
    let unblockTransaction: (() => void) | undefined;

    // Start a transaction that will be interrupted
    const transactionPromise = lockedInitialConnection.writeTransaction(async (tx) => {
      // Transaction should be started now

      // Wait till we are unblocked. Keep this transaction open.
      await new Promise<void>((resolve) => {
        unblockTransaction = resolve;
      });

      // This should throw if the db was closed
      await tx.get('SELECT 1');
    });

    // Wait for the transaction to have started
    await vi.waitFor(() => expect(unblockTransaction).toBeDefined(), { timeout: 2000 });

    // Since we're in a transaction from above
    expect(await initialSharedConnection.isAutoCommit()).false;

    // The in-use connection should be closed now
    // This simulates a tab being closed.
    await wrappedInitialSharedConnection.close();
    wrappedInitialSharedConnection.markRemoteClosed();

    // The transaction should be unblocked now
    unblockTransaction?.();

    // Since we closed while in the transaction, the execution call should have thrown
    await expect(transactionPromise).rejects.toThrow('Called operation on closed remote');

    // It will still be false until we request a new hold
    // Requesting a new hold will cleanup the previous transaction.
    expect(await subsequentSharedConnection.isAutoCommit()).false;

    // Allows us to simulate a new locked shared connection.
    const lockedSubsequentConnection = new LockedAsyncDatabaseAdapter({
      name: DB_FILENAME,
      openConnection: async () =>
        new WorkerWrappedAsyncDatabaseConnection({
          baseConnection: subsequentSharedConnection,
          identifier: DB_FILENAME,
          remoteCanCloseUnexpectedly: true,
          remote: opener
        })
    });

    // Starting a new transaction should work cleanup the old and work as expected
    await lockedSubsequentConnection.writeTransaction(async (tx) => {
      await tx.get('SELECT 1');
      expect(await subsequentSharedConnection.isAutoCommit()).false;
    });
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
      crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
      retryDelayMs: 90_000, // Large delay to allow for testing
      db: db.database as WebDBAdapter,
      subscriptions: []
    };

    const stream1 = new SharedWebStreamingSyncImplementation(syncOptions1);
    await stream1.connect();
    // Generate the second streaming sync implementation
    const connector2 = new TestConnector();
    const syncOptions2: SharedWebStreamingSyncImplementationOptions = {
      adapter: new SqliteBucketStorage(db.database),
      remote: new WebRemote(connector1),
      uploadCrud: async () => {
        await connector2.uploadData(db);
      },
      identifier,
      crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
      retryDelayMs: 90_000, // Large delay to allow for testing
      db: db.database as WebDBAdapter,
      subscriptions: []
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

  it('should trigger uploads from last connected clients', { timeout: Infinity }, async () => {
    // Generate the first streaming sync implementation
    const connector1 = new TestConnector();
    const spy1 = vi.spyOn(connector1, 'uploadData');

    await new Promise((resolve) => setTimeout(resolve, 5000));
    const db = openDatabase();
    await db.init();
    // They need to use the same identifier to use the same shared worker.
    const identifier = db.database.name;

    // Resolves once the first connector has been called to upload data
    let triggerUpload1: () => void;
    const upload1TriggeredPromise = new Promise<void>((resolve) => {
      triggerUpload1 = resolve;
    });

    const sharedSyncOptions = {
      adapter: new SqliteBucketStorage(db.database),
      remote: new WebRemote(connector1),
      db: db.database as WebDBAdapter,
      identifier,
      // The large delay here allows us to test between connection retries
      retryDelayMs: 90_000,
      crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
      subscriptions: [],
      flags: {
        broadcastLogs: true
      }
    };

    // Create the first streaming client
    const stream1 = new SharedWebStreamingSyncImplementation({
      ...sharedSyncOptions,
      uploadCrud: async () => {
        triggerUpload1();
        connector1.uploadData(db);
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
      ...sharedSyncOptions,
      uploadCrud: async () => {
        triggerUpload2();
        connector2.uploadData(db);
      }
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
    await stream1.connect();
    // Hack, set the status to connected in order to trigger the upload
    await (stream1 as any)['_testUpdateStatus'](new SyncStatus({ connected: true }));

    // The status in the second stream client should be updated
    await stream2UpdatedPromise;

    expect(stream2.isConnected).true;

    // Create something with CRUD in it.
    await db.execute('INSERT into customers (id, name, email) VALUES (uuid(), ?, ?)', [
      'steven',
      'steven@journeyapps.com'
    ]);

    stream1.triggerCrudUpload();
    // The second connector should be called to upload
    await upload2TriggeredPromise;

    // It should call the latest connected client
    expect(spy2).toHaveBeenCalledOnce();

    // Close the second client, leaving only the first one
    await stream2.dispose();

    // Hack, set the status to connected in order to trigger the upload
    await (stream1 as any)['_testUpdateStatus'](new SyncStatus({ connected: true }));
    stream1.triggerCrudUpload();
    // It should now upload from the first client
    await upload1TriggeredPromise;

    expect(spy1).toHaveBeenCalledOnce();
    await stream1.dispose();
  });
});
