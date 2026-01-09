import { LogLevel, Schema, SyncStreamConnectionMethod, TableV2, column, createLogger } from '@powersync/common';
import { PowerSyncDatabase, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { getMockSyncServiceFromWorker } from './MockSyncServiceClient.js';

/**
 * Initializes a PowerSync client in the current iframe context and notifies the parent.
 * This function is designed to be called from within an iframe's script tag.
 *
 * @param vfs - VFS option as a string (e.g., 'OPFSCoopSyncVFS' or 'IDBBatchAtomicVFS')
 */
export async function setupPowerSyncInIframe(
  dbFilename: string,
  identifier: string,
  vfs?: string,
  waitForConnection?: boolean,
  configureMockResponses?: boolean
): Promise<void> {
  try {
    // Track the number of times fetchCredentials has been called
    let credentialsFetchCount = 0;

    const connector = {
      async fetchCredentials() {
        credentialsFetchCount++;
        return { endpoint: 'http://localhost/test', token: 'test-token' };
      },
      async uploadData() {}
    };

    // Create a simple schema for testing
    const schema = new Schema({
      customers: new TableV2({
        name: column.text,
        email: column.text
      })
    });

    // Configure database with optional VFS
    // The vfs string value is the enum value itself (string enums)
    const databaseOptions = vfs
      ? new WASQLiteOpenFactory({
          dbFilename,
          vfs: vfs as WASQLiteVFS
        })
      : { dbFilename };

    // Configure verbose logging
    const logger = createLogger('iFrame test', {
      logLevel: LogLevel.DEBUG
    });

    const db = new PowerSyncDatabase({
      database: databaseOptions,
      schema: schema,
      retryDelayMs: 100,
      flags: { enableMultiTabs: true, useWebWorker: true },
      logger
    });

    // Connect to PowerSync (don't await this since we want to create multiple tabs)
    const connectionPromise = db.connect(connector, { connectionMethod: SyncStreamConnectionMethod.HTTP });

    if (waitForConnection) {
      await connectionPromise;
    }

    if (configureMockResponses) {
      // Wait for connecting:true before setting up mock responses
      const maxAttempts = 100;
      const delayMs = 50;
      for (let i = 0; i < maxAttempts; i++) {
        if (db.currentStatus.connecting) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const mockSyncService = await getMockSyncServiceFromWorker(dbFilename);
      if (mockSyncService) {
        await mockSyncService.setAutomaticResponse({
          // We want to confirm credentials are fetched due to invalidation.
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
        await mockSyncService.replyToAllPendingRequests();
      }
    }

    // Store reference for cleanup
    (window as any).powersyncClient = db;

    // Set up message handlers for test operations
    window.addEventListener('message', async (event: MessageEvent) => {
      // Only handle messages from parent window
      // Note: event.source might not match exactly with blob URLs, so we'll be less strict
      if (event.source && event.source !== window.parent && event.source !== window) {
        return;
      }

      const { type, requestId, query, parameters } = event.data || {};

      if (type === 'execute-query' && requestId) {
        try {
          const result = await db.getAll(query, parameters || []);
          window.parent.postMessage(
            {
              type: 'query-result',
              requestId,
              identifier,
              success: true,
              result
            },
            '*'
          );
        } catch (error) {
          window.parent.postMessage(
            {
              type: 'query-result',
              requestId,
              identifier,
              success: false,
              error: (error as Error).message
            },
            '*'
          );
        }
      } else if (type === 'get-credentials-count' && requestId) {
        try {
          window.parent.postMessage(
            {
              type: 'credentials-count-result',
              requestId,
              identifier,
              success: true,
              count: credentialsFetchCount
            },
            '*'
          );
        } catch (error) {
          window.parent.postMessage(
            {
              type: 'credentials-count-result',
              requestId,
              identifier,
              success: false,
              error: (error as Error).message
            },
            '*'
          );
        }
      }
    });

    // Notify parent that client is ready
    window.parent.postMessage(
      {
        type: 'powersync-ready',
        identifier: identifier
      },
      '*'
    );
  } catch (error) {
    console.error('PowerSync initialization error:', error);
    window.parent.postMessage(
      {
        type: 'powersync-error',
        identifier: identifier,
        error: (error as Error).message
      },
      '*'
    );
  }
}
