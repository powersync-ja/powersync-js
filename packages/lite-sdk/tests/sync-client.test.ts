import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SyncOperationsHandler } from '../src/client/storage/SyncOperationsHandler.js';
import { Connector, type PowerSyncCredentials } from '../src/client/sync/Connector.js';
import { MockStreamFactory, checkpoint, createTestSyncClient, waitForSyncStatus } from './utils.js';

class PlaceholderConnector extends Connector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    return {
      endpoint: 'https://powersync.example.org',
      token: 'test-token'
    };
  }
}

describe('SyncClient', () => {
  let mockStreamFactory: MockStreamFactory;
  const defaultOperationsHandler: SyncOperationsHandler = {
    handleCheckpoint: async () => {
      // No-op for tests
    }
  };

  beforeEach(() => {
    mockStreamFactory = new MockStreamFactory();
  });

  afterEach(() => {
    mockStreamFactory.closeAll();
  });

  it('should connect and receive checkpoint', async () => {
    const client = createTestSyncClient({}, mockStreamFactory, {
      handleCheckpoint: async () => {
        // No-op for tests
      }
    });

    const connector = new PlaceholderConnector();

    client.connect(connector);

    // Wait for connection
    await waitForSyncStatus(client, (status) => status.connected === true, 1000);

    // Send checkpoint
    const controllers = mockStreamFactory.getControllers();
    expect(controllers.length).eq(1);

    const checkpointLine = checkpoint({
      last_op_id: 0,
      buckets: []
    });

    mockStreamFactory.pushLine(checkpointLine);

    // Wait for checkpoint to be processed
    await waitForSyncStatus(client, (status) => status.downloading === true, 1000);

    // Send checkpoint complete
    mockStreamFactory.pushLine({
      checkpoint_complete: { last_op_id: '0' }
    });

    // Wait for sync to complete
    await waitForSyncStatus(client, (status) => status.hasSynced === true, 2000);

    client.disconnect();
  });

  it('should set last sync time after checkpoint complete', async () => {
    const client = createTestSyncClient({}, mockStreamFactory, defaultOperationsHandler);
    const connector = new PlaceholderConnector();

    client.connect(connector);
    await waitForSyncStatus(client, (status) => status.connected === true, 1000);

    const now = Date.now();

    // Send checkpoint and complete
    mockStreamFactory.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: []
      })
    );

    await waitForSyncStatus(client, (status) => status.downloading === true, 1000);

    mockStreamFactory.pushLine({
      checkpoint_complete: { last_op_id: '0' }
    });

    await waitForSyncStatus(client, (status) => status.hasSynced === true && status.lastSyncedAt !== null, 2000);

    const status = client.status;
    expect(status.lastSyncedAt).not.toBeNull();
    if (status.lastSyncedAt) {
      const lastSyncedAt = status.lastSyncedAt.getTime();
      // The reported time should be close to the current time (5s is generous)
      expect(Math.abs(lastSyncedAt - now)).toBeLessThan(5000);
    }

    client.disconnect();
  });

  it('should handle data lines', async () => {
    const client = createTestSyncClient({}, mockStreamFactory, defaultOperationsHandler);
    const connector = new PlaceholderConnector();

    client.connect(connector);
    await waitForSyncStatus(client, (status) => status.connected === true, 1000);

    // Send checkpoint
    mockStreamFactory.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: [
          {
            bucket: 'test-bucket',
            count: 1,
            checksum: 0,
            priority: 3,
            subscriptions: []
          }
        ]
      })
    );

    await waitForSyncStatus(client, (status) => status.downloading === true, 1000);

    // Send data line
    mockStreamFactory.pushLine({
      data: {
        bucket: 'test-bucket',
        data: [
          {
            op_id: '1',
            op: 'PUT',
            object_id: 'obj1',
            object_type: 'test',
            checksum: 0,
            data: '{"test": "data"}'
          }
        ],
        has_more: false,
        after: '0',
        next_after: '1'
      }
    });

    // Send checkpoint complete - should match the highest op_id from the data
    mockStreamFactory.pushLine({
      checkpoint_complete: { last_op_id: '1' }
    });

    await waitForSyncStatus(client, (status) => status.hasSynced === true, 2000);

    client.disconnect();
  });

  it('should handle checkpoint diff', async () => {
    const client = createTestSyncClient({}, mockStreamFactory, defaultOperationsHandler);
    const connector = new PlaceholderConnector();

    client.connect(connector);
    await waitForSyncStatus(client, (status) => status.connected === true, 1000);

    // Initial checkpoint
    mockStreamFactory.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: [
          {
            bucket: 'bucket-a',
            count: 5,
            checksum: 0,
            priority: 3,
            subscriptions: []
          }
        ]
      })
    );

    await waitForSyncStatus(client, (status) => status.downloading === true, 1000);

    // Send checkpoint diff
    mockStreamFactory.pushLine({
      checkpoint_diff: {
        last_op_id: '2',
        updated_buckets: [
          {
            bucket: 'bucket-a',
            count: 7,
            checksum: 0,
            priority: 3,
            subscriptions: []
          }
        ],
        removed_buckets: []
      }
    });

    await waitForSyncStatus(client, (status) => status.downloading === true, 1000);

    // Complete checkpoint
    mockStreamFactory.pushLine({
      checkpoint_complete: { last_op_id: '2' }
    });

    await waitForSyncStatus(client, (status) => status.hasSynced === true, 2000);

    client.disconnect();
  });

  it('should handle partial checkpoint complete', async () => {
    const client = createTestSyncClient({}, mockStreamFactory, defaultOperationsHandler);
    const connector = new PlaceholderConnector();

    client.connect(connector);
    await waitForSyncStatus(client, (status) => status.connected === true, 1000);

    // Send checkpoint with multiple buckets
    mockStreamFactory.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: [
          {
            bucket: 'bucket-a',
            count: 5,
            checksum: 0,
            priority: 0,
            subscriptions: []
          },
          {
            bucket: 'bucket-b',
            count: 5,
            checksum: 0,
            priority: 2,
            subscriptions: []
          }
        ]
      })
    );

    await waitForSyncStatus(client, (status) => status.downloading === true, 1000);

    // Send partial checkpoint complete for priority 0
    mockStreamFactory.pushLine({
      partial_checkpoint_complete: {
        last_op_id: '0',
        priority: 0
      }
    });

    // Send checkpoint complete
    mockStreamFactory.pushLine({
      checkpoint_complete: { last_op_id: '0' }
    });

    await waitForSyncStatus(client, (status) => status.hasSynced === true, 2000);

    client.disconnect();
  });

  it('should track connection status', async () => {
    const client = createTestSyncClient({}, mockStreamFactory, defaultOperationsHandler);
    const connector = new PlaceholderConnector();

    expect(client.status.connected).toBe(false);
    expect(client.status.connecting).toBe(false);

    client.connect(connector);

    // Should be connecting
    await waitForSyncStatus(client, (status) => status.connecting === true, 1000);
  });
});
