import { AbstractPowerSyncDatabase, createBaseLogger, createLogger, LogLevel } from '@powersync/common';
import { OpenAsyncDatabaseConnection, WASqliteConnection } from '@powersync/web';
import * as Comlink from 'comlink';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { LockedAsyncDatabaseAdapter } from '../src/db/adapters/LockedAsyncDatabaseAdapter.js';
import { WebDBAdapter } from '../src/db/adapters/WebDBAdapter.js';
import { WorkerWrappedAsyncDatabaseConnection } from '../src/db/adapters/WorkerWrappedAsyncDatabaseConnection.js';
import { createTestConnector, sharedMockSyncServiceTest } from './utils/mockSyncServiceTest.js';
import { TEST_SCHEMA } from './utils/test-schema.js';
import { generateTestDb } from './utils/testDb.js';

const DB_FILENAME = 'test-multiple-instances.db';

describe('Multiple Instances', { sequential: true }, () => {
  const openDatabase = () =>
    generateTestDb({
      database: {
        dbFilename: DB_FILENAME
      },
      schema: TEST_SCHEMA
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

  sharedMockSyncServiceTest(
    'should broadcast logs from shared sync worker',
    { timeout: 10_000 },
    async ({ context: { openDatabase, mockService } }) => {
      const logger = createLogger('test-logger');
      logger.setLevel(LogLevel.TRACE);
      const spiedErrorLogger = vi.spyOn(logger, 'error');
      const spiedTraceLogger = vi.spyOn(logger, 'trace');

      // Open an additional database which we can spy on the logs.
      const powersync = openDatabase({
        logger
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

      await vi.waitFor(
        async () => {
          const requests = await mockService.getPendingRequests();
          expect(requests.length).toBeGreaterThan(0);
          const pendingRequestId = requests[0].id;
          // Generate an error
          await mockService.createResponse(pendingRequestId, 401, { 'Content-Type': 'application/json' });
          await mockService.completeResponse(pendingRequestId);
        },
        { timeout: 3_000 }
      );

      // Asserting that powersync_control logs exists verifies that some connection attempt was made.
      await vi.waitFor(
        () =>
          expect(
            spiedTraceLogger.mock.calls
              .flat(1)
              .find((argument) => typeof argument == 'string' && argument.includes('powersync_control'))
          ).exist,
        { timeout: 2000 }
      );

      // The connection should fail with an error
      await vi.waitFor(() => expect(spiedErrorLogger.mock.calls.length).gt(0), { timeout: 2000 });
    }
  );

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

  it('should handled interrupted transactions', async () => {
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

  sharedMockSyncServiceTest(
    'should share sync updates',
    { timeout: 10_000 },
    async ({ context: { database, connect, openDatabase } }) => {
      const secondDatabase = openDatabase();

      expect(database.currentStatus.connected).false;
      expect(secondDatabase.currentStatus.connected).false;
      // connect the second database in order for it to have access to the sync service.
      secondDatabase.connect(createTestConnector());
      // Timing of this can be tricky due to the need for responding to a pending request.
      await vi.waitFor(() => expect(secondDatabase.currentStatus.connecting).true, { timeout: 5_000 });
      // connect the first database - this will actually connect to the sync service.
      await connect();

      expect(database.currentStatus.connected).true;

      await vi.waitFor(() => expect(secondDatabase.currentStatus.connected).true, { timeout: 5_000 });
    }
  );

  sharedMockSyncServiceTest(
    'should trigger uploads from last connected clients',
    async ({ context: { database, openDatabase, connect, connector, mockService } }) => {
      const secondDatabase = openDatabase();

      expect(database.currentStatus.connected).false;
      expect(secondDatabase.currentStatus.connected).false;

      // Don't actually upload data
      connector.uploadData.mockImplementation(async (db) => {
        console.log('uploading from first client');
      });

      // Create something with CRUD in it.
      await database.execute('INSERT into lists (id, name) VALUES (uuid(), ?)', ['steven']);

      // connect from the first database
      await connect();

      await vi.waitFor(() => expect(database.currentStatus.connected).true);

      // It should initially try and upload from the first client
      await vi.waitFor(() => expect(connector.uploadData).toHaveBeenCalledOnce(), { timeout: 2000 });

      const secondConnector = createTestConnector();
      // Don't actually upload data
      secondConnector.uploadData.mockImplementation(async (db) => {
        console.log('uploading from second client');
      });

      // Connect the second database and wait for a pending request to appear
      const secondConnectPromise = secondDatabase.connect(secondConnector);
      let _pendingRequestId: string;
      await vi.waitFor(async () => {
        const requests = await mockService.getPendingRequests();
        expect(requests.length).toBeGreaterThan(0);
        _pendingRequestId = requests[0].id;
      });
      const pendingRequestId = _pendingRequestId!;
      await mockService.createResponse(pendingRequestId, 200, { 'Content-Type': 'application/json' });
      await mockService.pushBodyLine(pendingRequestId, {
        token_expires_in: 10000000
      });
      await secondConnectPromise;

      // It should now upload from the second client
      await vi.waitFor(() => expect(secondConnector.uploadData).toHaveBeenCalledOnce());
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // Now disconnect and close the second client
      await secondDatabase.close();

      expect(database.currentStatus.connected).true;

      // It should now upload from the first client
      await vi.waitFor(() => expect(connector.uploadData.mock.calls.length).greaterThanOrEqual(2), { timeout: 3000 });
    }
  );
});
