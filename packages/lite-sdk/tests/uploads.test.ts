import { Checkpoint, StreamingSyncLine } from '@powersync/service-core';
import { MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncOperationsHandler } from '../src/client/storage/SyncOperationsHandler.js';
import { Connector, type PowerSyncCredentials } from '../src/client/sync/Connector.js';
import { MockStreamFactory, createTestSyncClient, waitForSyncStatus } from './utils.js';

class PlaceholderConnector extends Connector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    return {
      endpoint: 'https://powersync.example.org',
      token: 'test-token'
    };
  }
}

const MOCK_EVENTS: StreamingSyncLine[] = [
  // Initial checkpoint
  {
    checkpoint: {
      last_op_id: '3',
      buckets: [
        {
          bucket: 'global[]',
          checksum: -1638234279,
          count: 3,
          priority: 3,
          subscriptions: [
            {
              default: 0
            }
          ]
        }
      ],
      streams: [
        {
          name: 'global',
          is_default: true,
          errors: []
        }
      ]
    }
  },
  // Initial data
  {
    data: {
      bucket: 'global[]',
      after: '0',
      has_more: false,
      data: [
        {
          op_id: '1',
          op: 'PUT',
          object_type: 'lists',
          object_id: '75f89104-d95a-4f16-8309-5363f1bb377a',
          checksum: 4029462408,
          subkey: '69145d63903a98286d921fa4/59a1abe9-f2fd-50c3-94d4-235ed2cbaba5',
          data: '{"id":"75f89104-d95a-4f16-8309-5363f1bb377a","created_at":"2025-11-12 10:11:41.568515Z","name":"Getting Started","owner_id":"fa428d64-038e-4764-9759-f57611831722"}'
        },
        {
          op_id: '2',
          op: 'PUT',
          object_type: 'todos',
          object_id: '4115b3f3-f33a-4c5d-b8a3-e837df1914d0',
          checksum: 320476424,
          subkey: '69145d63903a98286d921fa5/922996ae-eced-5644-9030-9d503af9df53',
          data: '{"id":"4115b3f3-f33a-4c5d-b8a3-e837df1914d0","created_at":"2025-11-12 10:11:41.569654Z","completed_at":null,"description":"Create a todo here. Query the todos table via a Postgres connection. Your todo should be synced","completed":0,"created_by":null,"completed_by":null,"list_id":"75f89104-d95a-4f16-8309-5363f1bb377a","photo_id":null}'
        },
        {
          op_id: '3',
          op: 'PUT',
          object_type: 'todos',
          object_id: '8e4af737-bfed-4a65-ac2b-03b47a0e5d7f',
          checksum: 2601761481,
          subkey: '69145d63903a98286d921fa5/b64718a0-8a3e-53be-82ad-803bb7a0148b',
          data: '{"id":"8e4af737-bfed-4a65-ac2b-03b47a0e5d7f","created_at":"2025-11-12 10:11:41.569289Z","completed_at":null,"description":"Run services locally","completed":1,"created_by":null,"completed_by":null,"list_id":"75f89104-d95a-4f16-8309-5363f1bb377a","photo_id":null}'
        }
      ],
      next_after: '3'
    }
  },
  // Checkpoint complete
  {
    checkpoint_complete: {
      last_op_id: '3'
    }
  }
];

describe('Sync Uploads', () => {
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

  it('should connect and receive checkpoints', async () => {
    const crudManager = {
      hasCrud: vi.fn(async () => false),
      performUpload: vi.fn(async () => {
        // No-op for tests
      })
    };

    const checkpointHandler = {
      handleCheckpoint: vi.fn(async () => {})
    };

    const client = createTestSyncClient(
      {
        crudManager
      },
      mockStreamFactory,
      checkpointHandler
    );

    const connector = new PlaceholderConnector();

    client.connect(connector);

    // Wait for connection
    await waitForSyncStatus(client, (status) => status.connected === true, 1000);

    // Send checkpoint
    const controllers = mockStreamFactory.getControllers();
    expect(controllers.length).eq(1);

    // Send initial events
    for (const event of MOCK_EVENTS) {
      mockStreamFactory.pushLine(event);
    }

    // Wait for sync to complete
    await waitForSyncStatus(client, (status) => status.hasSynced === true, 2000);

    // We should have applied the ops for the checkpoint
    expect(checkpointHandler.handleCheckpoint.mock.calls.length).toBe(1);

    // Now we can perform some uploads
    const target = await client.bucketStorage.getLocalState();
    // We haven't uploaded any data yet, so the write checkpoint target should be 0
    expect(target.targetOpId).toBe(0n);

    // Simulate an upload
    // Report that we have CRUD items to upload
    crudManager.hasCrud.mockImplementation(async () => true);

    crudManager.performUpload.mockImplementation(async () => {
      // Don't need to actually do any upload, lets create a write checkpoint

      // If we still report that there is crud, the write checkpoint should not be updated
      const response = await client.checkpoint();
      expect(response.targetUpdated).toBe(false);

      // Now mock that the "CRUD queue" has been emptied
      crudManager.hasCrud.mockImplementation(async () => false);

      // Now the write checkpoint should be updated
      // We use a custom checkpoint here since that requires less mocks
      const responseAfter = await client.checkpoint('1');
      expect(responseAfter.targetUpdated).toBe(true);
      expect(responseAfter.targetCheckpoint).toEqual('1');
    });

    client.triggerCrudUpload();
    await vi.waitFor(() => expect(crudManager.performUpload.mock.calls.length).toBe(1));

    await waitForSyncStatus(client, (status) => status.uploading == false, 2000);

    // The target checkpoint should be the write checkpoint after uploading
    const localStateAfter = await client.bucketStorage.getLocalState();
    expect(localStateAfter.targetOpId).toEqual(1n);

    // Now if we receive more data where the write checkpoint is not reached.
    // The data should not be presented to the operations handler until we validate the checkpoint correlating to the target write checkpoint

    // Send more data

    // Spy on the applyCheckpoint method
    const appliedCheckpointSpy = vi.spyOn(client as any, 'applyCheckpoint') as MockInstance<
      (checkpoint: Checkpoint) => Promise<{ applied: boolean; endIteration: boolean }>
    >;

    mockStreamFactory.pushLine({
      checkpoint_diff: {
        last_op_id: '4',
        removed_buckets: [],
        updated_buckets: [
          {
            bucket: 'global[]',
            checksum: -1298840993,
            count: 4,
            priority: 3,
            subscriptions: [
              {
                default: 0
              }
            ]
          }
        ]
      }
    });
    mockStreamFactory.pushLine({
      data: {
        bucket: 'global[]',
        after: '3',
        has_more: false,
        data: [
          {
            op_id: '4',
            op: 'PUT',
            object_type: 'lists',
            object_id: '75f89104-d95a-4f16-8309-5363f1bb377a',
            checksum: 339393286,
            subkey: '69145d63903a98286d921fa4/59a1abe9-f2fd-50c3-94d4-235ed2cbaba5',
            data: '{"id":"75f89104-d95a-4f16-8309-5363f1bb377a","created_at":"2025-11-12 10:11:41.568515Z","name":"Getting Started Updated","owner_id":"fa428d64-038e-4764-9759-f57611831722"}'
          }
        ],
        next_after: '4'
      }
    });

    mockStreamFactory.pushLine({
      checkpoint_complete: {
        last_op_id: '4'
      }
    });

    // It should have attempted to apply the checkpoint
    await vi.waitFor(() => expect(appliedCheckpointSpy.mock.calls.length).toBe(1));
    // It should not have applied the checkpoint yet
    expect(appliedCheckpointSpy.mock.calls[0][0].last_op_id).toBe('4');
    expect((await appliedCheckpointSpy.mock.results[0].value).applied).toBe(false);
    expect((await appliedCheckpointSpy.mock.results[0].value).endIteration).toBe(false);

    // Now send a diff to update the target checkpoint
    mockStreamFactory.pushLine({
      checkpoint_diff: {
        last_op_id: '5',
        updated_buckets: [],
        removed_buckets: [],
        write_checkpoint: '1'
      }
    });

    mockStreamFactory.pushLine({
      checkpoint_complete: {
        last_op_id: '5'
      }
    });

    await vi.waitFor(() => expect(appliedCheckpointSpy.mock.calls.length).toBe(2));
    // It should have applied the checkpoint
    expect(appliedCheckpointSpy.mock.calls[1][0].last_op_id).toBe('5');
    expect((await appliedCheckpointSpy.mock.results[1].value).applied).toBe(true);
    expect((await appliedCheckpointSpy.mock.results[1].value).endIteration).toBe(false);
    expect(checkpointHandler.handleCheckpoint.mock.calls.length).toBe(2);

    client.disconnect();
  });
});
