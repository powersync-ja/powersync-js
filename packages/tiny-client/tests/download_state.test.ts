import { checkpointId, LocalWriteState, RequestedCheckpoint } from '../src/checkpoints';
import { DownloadChanges, DownloadClientState, DownloadEvent } from '../src/download/buckets';
import { OpType, SyncDataBucket } from '../src/download/protocol';

import { describe, expect, test } from 'vitest';

const downloadClientTest = test.extend<{ client: TestClient }>({
  client: async ({}, use) => {
    use(new TestClient());
  }
});

downloadClientTest('applies changes', ({ client }) => {
  client.pushCheckpoint(1n, [{ name: 'a' }]);
  client.pushData({
    bucket: 'a',
    rowId: 'rowid',
    op: 'PUT',
    objectId: 'first',
    data: { foo: 'bar' }
  });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { first: { foo: 'bar' } } })]);
});

downloadClientTest('uses latest row', ({ client }) => {
  client.pushCheckpoint(2n, [{ name: 'a' }, { name: 'b' }]);
  client.pushData({
    bucket: 'a',
    rowId: 'rowid',
    op: 'PUT',
    objectId: 'first',
    data: { foo: 'bar' }
  });
  client.pushData({
    bucket: 'b',
    rowId: 'rowid',
    op: 'REMOVE',
    objectId: 'first',
    data: undefined
  });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { first: null } })]);
});

downloadClientTest('can delete buckets', ({ client }) => {
  client.pushCheckpoint(1n, [{ name: 'a' }]);
  client.pushData({
    bucket: 'a',
    rowId: 'rowid',
    op: 'PUT',
    objectId: 'first',
    data: { foo: 'bar' }
  });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { first: { foo: 'bar' } } })]);

  client.pushCheckpoint(1n, []);
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { first: null } })]);
});

downloadClientTest('can delete buckets with checkpoint diff', ({ client }) => {
  client.pushCheckpoint(1n, [{ name: 'a' }]);
  client.putRow('a', 'row-0', { col: 'hi' });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);

  expect(
    client.state.push({
      checkpoint_diff: { last_op_id: '1', write_checkpoint: null, updated_buckets: [], removed_buckets: ['a'] }
    })
  ).toStrictEqual([]);
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': null } })]);
});

downloadClientTest('does not publish until reaching checkpoint', ({ client }) => {
  client.pushCheckpoint(1n, priorityBuckets);
  client.localWrites.mutationGuard();

  // pushData asserts that data lines alone don't emit an event.
  client.putRow('prio1', 'row-0', { col: 'hi' });
  expect(client.pushCheckpointComplete()).toStrictEqual(['blockedDueToLocalData']);
});

describe('publishes with local data for prio=0 buckets', () => {
  downloadClientTest('for explicit partial checkpoint', ({ client }) => {
    client.pushCheckpoint(1n, priorityBuckets);
    client.localWrites.mutationGuard();

    client.putRow('prio0', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete(0)).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('for full checkpoint', ({ client }) => {
    // A full checkpoint might consist entirely of prio 0 buckets, in which case it should still be applied.
    client.pushCheckpoint(1n, [{ name: 'prio0', priority: 0 }]);
    const guard = client.localWrites.mutationGuard();

    client.putRow('prio0', 'row-0', { col: 'hi' });
    // The full checkpoint is still delayed, we only applied prio 0 buckets.
    expect(client.pushCheckpointComplete()).toStrictEqual([
      updatedRows({ items: { 'row-0': { col: 'hi' } } }),
      'blockedDueToLocalData'
    ]);

    // Once local writes are resolved, the full checkpoint is applied without further changes.
    guard.completeWith(client.fakeCheckpoint(1n));
    client.pushCheckpoint(1n, [{ name: 'prio0', priority: 0 }], 1n);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
  });

  downloadClientTest('does not apply prio 0 buckets if other priorities exist', ({ client }) => {
    // With multiple priorities, the service sends an explicit partial_checkpoint_complete line for prio 0.
    client.pushCheckpoint(2n, priorityBuckets);
    client.localWrites.mutationGuard();

    client.putRow('prio0', 'row-0', { col: 'hi' });
    client.putRow('prio1', 'row-1', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual(['blockedDueToLocalData']);
  });
});

downloadClientTest('does not publish with pending local data', ({ client }) => {
  client.pushCheckpoint(1n, [{ name: 'a' }]);
  const guard = client.localWrites.mutationGuard();

  client.pushCheckpoint(1n, [{ name: 'a' }]);
  client.pushData({ bucket: 'a', rowId: 'rowid', op: 'PUT', objectId: 'first', data: { foo: 'bar' } });
  expect(client.pushCheckpointComplete()).toStrictEqual(['blockedDueToLocalData']);

  guard.completeWith(client.fakeCheckpoint(2n));
  client.pushCheckpoint(1n, [{ name: 'a' }], 2n);
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { first: { foo: 'bar' } } })]);
});

downloadClientTest('can publish partial checkpoints under different priorities', ({ client }) => {
  client.pushCheckpoint(4n, priorityBuckets);
  for (let i = 0; i < 4; i++) {
    client.putRow(`prio${i}`, `row-${i}`, { col: `${i}` });
  }

  // Each partial checkpoint includes all higher priorities, but those have already been applied in an earlier step.
  for (let i = 0; i < 4; i++) {
    expect(client.pushCheckpointComplete(i)).toStrictEqual([updatedRows({ items: { [`row-${i}`]: { col: `${i}` } } })]);
  }

  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
});

describe('applies pending changes', () => {
  // In these tests, re-sending checkpoint_complete stands in for the completed_upload control call of the core
  // extension: It retries applying the pending checkpoint.

  downloadClientTest('write checkpoint before upload complete', ({ client }) => {
    // Local write while offline
    const guard = client.localWrites.mutationGuard();

    // Assume data has been uploaded and a write checkpoint has been requested, but not received yet.
    client.pushCheckpoint(1n, priorityBuckets, 1n);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual(['blockedDueToLocalData']);

    // Now complete the upload process, this should apply the pending checkpoint.
    guard.completeWith(client.fakeCheckpoint(1n));
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('write checkpoint before upload complete, only prio 0', ({ client }) => {
    const guard = client.localWrites.mutationGuard();

    client.pushCheckpoint(1n, [{ name: 'prio0', priority: 0 }], 1n);
    client.putRow('prio0', 'row-0', { col: 'hi' });
    // Prio 0 buckets are applied as a partial checkpoint already.
    expect(client.pushCheckpointComplete()).toStrictEqual([
      updatedRows({ items: { 'row-0': { col: 'hi' } } }),
      'blockedDueToLocalData'
    ]);

    // Completing the upload should apply the full checkpoint.
    guard.completeWith(client.fakeCheckpoint(1n));
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
  });

  downloadClientTest('write checkpoint with synced data', ({ client }) => {
    // Local write while offline, followed by completed upload
    const guard = client.localWrites.mutationGuard();
    guard.completeWith(client.fakeCheckpoint(1n));

    // Sync afterwards containing data and write checkpoint.
    client.pushCheckpoint(1n, priorityBuckets, 1n);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('write checkpoint after synced data', ({ client }) => {
    const guard = client.localWrites.mutationGuard();

    // Upload changes, assume that triggered a checkpoint.
    client.pushCheckpoint(1n, priorityBuckets);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual(['blockedDueToLocalData']);

    // Now the upload is complete and requests a write checkpoint, which hasn't been synced yet.
    guard.completeWith(client.fakeCheckpoint(1n));
    expect(client.pushCheckpointComplete()).toStrictEqual([{ waitingForCheckpoint: 1n }]);

    // Which triggers a new iteration
    client.pushCheckpoint(1n, priorityBuckets, 1n);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('second local write', ({ client }) => {
    const guard0 = client.localWrites.mutationGuard();

    client.pushCheckpoint(1n, priorityBuckets, 1n);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual(['blockedDueToLocalData']);

    // Second local write during sync, before the first upload completed.
    const guard1 = client.localWrites.mutationGuard();
    expect(client.pushCheckpointComplete()).toStrictEqual(['blockedDueToLocalData']);

    // Uploading the second write requests a newer write checkpoint, so the current one isn't sufficient.
    const cp = client.fakeCheckpoint(2n);
    guard0.completeWith(cp);
    guard1.completeWith(cp);
    expect(client.pushCheckpointComplete()).toStrictEqual([{ waitingForCheckpoint: 2n }]);

    client.pushCheckpoint(1n, priorityBuckets, 2n);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });
});

describe('errors', () => {
  downloadClientTest('diff without prior checkpoint', ({ client }) => {
    expect(() =>
      client.state.push({
        checkpoint_diff: { last_op_id: '1', write_checkpoint: null, updated_buckets: [], removed_buckets: [] }
      })
    ).toThrow();
  });

  downloadClientTest('can retry', ({ client }) => {
    expect(() =>
      client.state.push({ checkpoint: { last_op_id: 'invalid op id', write_checkpoint: null, buckets: [] } })
    ).toThrow();

    // Realistically, clients would abort on this error. Still, verify that we're able to try again.
    client.pushCheckpoint(1n, [{ name: 'a' }]);
    client.putRow('a', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });
});

const priorityBuckets: Bucket[] = [0, 1, 2, 3].map((priority) => ({ name: `prio${priority}`, priority }));

function updatedRows(tables: Record<string, Record<string, Record<string, unknown> | null>>): DownloadChanges {
  return {
    updatedRows: new Map(Object.entries(tables).map(([table, rows]) => [table, new Map(Object.entries(rows))]))
  };
}

class TestClient {
  localWrites = new LocalWriteState();
  state = new DownloadClientState(this.localWrites);
  nextOpId = 1n;

  pushCheckpoint(lastOpId: bigint, buckets: Bucket[], checkpointRequest?: bigint) {
    const result = this.state.push({
      checkpoint: {
        last_op_id: String(lastOpId),
        write_checkpoint: checkpointRequest == null ? null : String(checkpointRequest),
        buckets: buckets.map((b) => ({ bucket: b.name, priority: b.priority ?? 3, checksum: 0 }))
      }
    });
    expect(result).toStrictEqual([]);
  }

  pushData(data: TestData) {
    const id = this.nextOpId;
    this.nextOpId += 1n;
    const result = this.state.push({
      data: {
        bucket: data.bucket,
        data: [
          {
            op_id: String(id),
            op: data.op,
            object_type: data.objectType ?? 'items',
            object_id: data.objectId,
            checksum: 0,
            data: JSON.stringify(data.data)
          }
        ]
      }
    });
    expect(result).toStrictEqual([]);
  }

  putRow(bucket: string, id: string, data: Record<string, unknown>) {
    this.pushData({ bucket, rowId: id, op: 'PUT', objectId: id, data });
  }

  pushCheckpointComplete(priority?: number): DownloadEvent[] {
    return this.state.push(
      priority == null
        ? { checkpoint_complete: { last_op_id: String(this.nextOpId - 1n) } }
        : {
            partial_checkpoint_complete: {
              last_op_id: String(this.nextOpId - 1n),
              priority
            }
          }
    );
  }

  fakeCheckpoint(id: bigint) {
    return { [checkpointId]: id } satisfies RequestedCheckpoint;
  }
}

interface TestData {
  bucket: string;
  rowId: string;
  op: OpType;
  data: unknown | undefined;
  objectId?: string;
  objectType?: string;
}

interface Bucket {
  name: string;
  priority?: number;
}
