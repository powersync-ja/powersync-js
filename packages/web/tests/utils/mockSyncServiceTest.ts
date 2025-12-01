import {
  LogLevel,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  Schema,
  SyncStreamConnectionMethod,
  Table,
  column,
  createBaseLogger
} from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { MockedFunction, expect, onTestFinished, test, vi } from 'vitest';
import { MockSyncService, getMockSyncServiceFromWorker } from './MockSyncServiceClient';

// Define schema similar to node tests
const lists = new Table({
  name: column.text
});

export const AppSchema = new Schema({
  lists
});

export type MockedTestConnector = {
  [Key in keyof PowerSyncBackendConnector]: MockedFunction<PowerSyncBackendConnector[Key]>;
};
/**
 * Creates a test connector with vi.fn implementations for testing.
 */
export function createTestConnector(): MockedTestConnector {
  return {
    fetchCredentials: vi.fn().mockResolvedValue({
      endpoint: 'http://localhost:3000',
      token: 'test-token'
    } as PowerSyncCredentials),
    uploadData: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * Result of calling the connect function
 */
export interface ConnectResult {
  syncService: MockSyncService;
  syncRequestId: string;
}

/**
 * Vitest test extension for mocking sync service in shared worker environments.
 * Similar to mockSyncServiceTest in the node SDK package.
 *
 * This extension:
 * - Sets up a PowerSync database with the lists schema
 * - Exposes a connect function that calls powersync.connect(), waits for connecting: true,
 *   creates the sync service, and returns both
 * - Exposes the database and test connector
 */
export const sharedMockSyncServiceTest = test.extend<{
  context: {
    /** An automatically opened database */
    connector: MockedTestConnector;
    connect: (customConnector?: PowerSyncBackendConnector) => Promise<ConnectResult>;
    database: PowerSyncDatabase;
    databaseName: string;
    openDatabase: () => PowerSyncDatabase;
  };
}>({
  context: async ({}, use) => {
    const dbFilename = `test-${crypto.randomUUID()}.db`;
    const logger = createBaseLogger();
    logger.setLevel(LogLevel.DEBUG);
    logger.useDefaults();

    const openDatabase = () => {
      const db = new PowerSyncDatabase({
        database: {
          dbFilename
        },
        flags: {
          enableMultiTabs: true
        },
        retryDelayMs: 1000,
        crudUploadThrottleMs: 1000,
        schema: AppSchema,
        logger
      });
      onTestFinished(async () => {
        if (!db.closed) {
          await db.disconnect();
          await db.close();
        }
      });
      return db;
    };

    const database = openDatabase();

    const connector = createTestConnector();

    const connectFn = async (customConnector?: PowerSyncBackendConnector): Promise<ConnectResult> => {
      const connectorToUse = customConnector ?? connector;

      // Call powersync.connect() to start the sync worker
      const connectionPromise = database.connect(connectorToUse, {
        connectionMethod: SyncStreamConnectionMethod.HTTP
      });

      // Wait for the database to report connecting: true before using the sync service
      await vi.waitFor(
        () => {
          expect(database.connecting).toBe(true);
        },
        { timeout: 1000 }
      );

      // Get the identifier from the database.name property
      const identifier = database.database.name;

      // Connect to the shared worker to get the mock service
      const mockService = await getMockSyncServiceFromWorker(identifier);

      if (!mockService) {
        throw new Error(
          'Mock service not available - ensure enableMultiTabs is true and running in a test environment'
        );
      }

      let _syncRequestId: string;
      await vi.waitFor(async () => {
        const requests = await mockService.getPendingRequests();
        expect(requests.length).toBeGreaterThan(0);
        _syncRequestId = requests[0].id;
      });

      const syncRequestId = _syncRequestId!;

      await mockService.createResponse(syncRequestId, 200, { 'Content-Type': 'application/json' });

      // Send a Keepalive just as the first message
      await mockService.pushBodyLine(syncRequestId, {
        token_expires_in: 10_000_000
      });

      await connectionPromise;

      return {
        syncService: mockService,
        syncRequestId
      };
    };

    await use({
      connector,
      connect: connectFn,
      database,
      databaseName: dbFilename,
      openDatabase
    });
  }
});
