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
import { expect, onTestFinished, test, vi } from 'vitest';
import { MockSyncService, getMockSyncServiceFromWorker } from './MockSyncServiceClient';

// Define schema similar to node tests
const lists = new Table({
  name: column.text
});

export const AppSchema = new Schema({
  lists
});

/**
 * Creates a test connector with vi.fn implementations for testing.
 */
export function createTestConnector(): PowerSyncBackendConnector {
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
  connectionPromise: Promise<void>;
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
  database: PowerSyncDatabase;
  connector: PowerSyncBackendConnector;
  connect: (customConnector?: PowerSyncBackendConnector) => Promise<ConnectResult>;
}>({
  database: async ({}, use) => {
    // Uses a unique database identifier per test to avoid conflicts
    const identifier = `test-${crypto.randomUUID()}.db`;

    // Create a logger with defaults enabled
    const logger = createBaseLogger();
    logger.setLevel(LogLevel.DEBUG);
    logger.useDefaults();

    // Create a PowerSync database with enableMultipleTabs: true
    const db = new PowerSyncDatabase({
      database: {
        dbFilename: identifier
      },
      flags: {
        enableMultiTabs: true
      },
      schema: AppSchema,
      logger
    });

    await db.init();

    onTestFinished(async () => {
      if (!db.closed) {
        await db.disconnect();
        await db.close();
      }
    });

    await use(db);
  },

  connector: async ({}, use) => {
    const connector = createTestConnector();
    await use(connector);
  },

  connect: async ({ database, connector }, use) => {
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
        { timeout: 10000 }
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

      return {
        syncService: mockService,
        connectionPromise
      };
    };

    await use(connectFn);
  }
});
