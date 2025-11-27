import {
  LogLevel,
  Schema,
  SyncStatus,
  SyncStreamConnectionMethod,
  TableV2,
  column,
  createBaseLogger
} from '@powersync/common';
import { PowerSyncDatabase, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';

/**
 * Initializes a PowerSync client in the current iframe context and notifies the parent.
 * This function is designed to be called from within an iframe's script tag.
 *
 * @param vfs - VFS option as a string (e.g., 'OPFSCoopSyncVFS' or 'IDBBatchAtomicVFS')
 */
export async function setupPowerSyncInIframe(dbFilename: string, identifier: string, vfs?: string): Promise<void> {
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

    // Create the same schema as used in tests
    const schema = new Schema({
      assets: new TableV2(
        {
          created_at: column.text,
          make: column.text,
          model: column.text,
          serial_number: column.text,
          quantity: column.integer,
          user_id: column.text,
          customer_id: column.text,
          description: column.text
        },
        { indexes: { makemodel: ['make', 'model'] } }
      ),
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
    const logger = createBaseLogger();
    logger.setLevel(LogLevel.DEBUG);
    logger.useDefaults();

    const db = new PowerSyncDatabase({
      database: databaseOptions,
      schema: schema,
      flags: { enableMultiTabs: true, useWebWorker: true },
      logger
    });

    // Register a listener for sync status updates
    const updateStatusDisplay = (status: SyncStatus) => {
      const statusEl = document.getElementById('status');
      if (statusEl) {
        const connected = status.connected ? 'Connected' : 'Disconnected';
        const syncing = status.dataFlowStatus.downloading ? ' (Syncing...)' : '';
        statusEl.textContent = `${connected}${syncing}`;

        // Update color based on connection status
        if (status.connected) {
          statusEl.style.color = '#28a745';
          statusEl.style.borderColor = '#28a745';
        } else {
          statusEl.style.color = '#dc3545';
          statusEl.style.borderColor = '#dc3545';
        }
      }
    };

    // Register listener for status changes
    db.registerListener({
      statusChanged: (status) => {
        updateStatusDisplay(status);
      }
    });

    // Connect to PowerSync
    await db.connect(connector, { connectionMethod: SyncStreamConnectionMethod.HTTP });

    // Store reference for cleanup
    (window as any).powersyncClient = db;

    // Update initial status
    updateStatusDisplay(db.currentStatus);

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
      } else if (type === 'get-sync-status' && requestId) {
        try {
          const status = db.currentStatus;
          window.parent.postMessage(
            {
              type: 'sync-status-result',
              requestId,
              identifier,
              success: true,
              status: {
                connected: status.connected,
                connecting: status.connecting,
                downloading: status.dataFlowStatus.downloading,
                uploading: status.dataFlowStatus.uploading,
                lastSyncedAt: status.lastSyncedAt?.toISOString(),
                hasSynced: status.hasSynced
              }
            },
            '*'
          );
        } catch (error) {
          window.parent.postMessage(
            {
              type: 'sync-status-result',
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
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = 'Error: ' + (error as Error).message;
      statusEl.style.color = '#dc3545';
      statusEl.style.borderColor = '#dc3545';
    }
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
