import { DownloadChanges, DownloadEvent, LocalWriteState } from '../../src/standalone';
import { DownloadClientState } from '../../src/standalone/client_state';
import { RowKey } from '../../src/standalone/oplog';
import { OpTypeJSON as OpType } from '../../src/standalone/sync_protocol';

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
  client.putRow('a', 'first', { foo: 'a' });
  client.putRow('b', 'first', { foo: 'b' });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { first: { foo: 'b' } } })]);
});

downloadClientTest('remove in one bucket does not hide put from another', ({ client }) => {
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
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { first: { foo: 'bar' } } })]);
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
      checkpoint_diff: { last_op_id: '1', updated_buckets: [], removed_buckets: ['a'] }
    })
  ).toStrictEqual([]);
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': null } })]);
});

downloadClientTest('does not use unapplied data from removed buckets', ({ client }) => {
  client.pushCheckpoint(1n, [{ name: 'a' }, { name: 'b' }]);
  client.putRow('b', 'row-0', { col: 'b' });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'b' } } })]);

  client.pushCheckpoint(3n, [{ name: 'a' }, { name: 'b' }]);
  client.putRow('a', 'row-0', { col: 'a' });
  expect(
    client.state.push({
      checkpoint_diff: { last_op_id: '2', updated_buckets: [], removed_buckets: ['a'] }
    })
  ).toStrictEqual([]);
  client.state.addToUpdatedRows(new RowKey('items', 'row-0'));
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'b' } } })]);
});

downloadClientTest('resolves rows across subkeys', ({ client }) => {
  client.pushCheckpoint(3n, [{ name: 'a' }]);
  client.pushData({ bucket: 'a', rowId: 'row', op: 'PUT', objectId: 'row', subkey: 's1', data: { from: 's1' } });
  client.pushData({ bucket: 'a', rowId: 'row', op: 'PUT', objectId: 'row', subkey: 's2', data: { from: 's2' } });
  client.pushData({ bucket: 'a', rowId: 'row', op: 'REMOVE', objectId: 'row', subkey: 's2', data: undefined });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { row: { from: 's1' } } })]);
});

downloadClientTest('accepts checksums above 2^31', ({ client }) => {
  client.pushCheckpoint(1n, [{ name: 'a', checksum: 3_000_000_000 }]);
  client.pushData({ bucket: 'a', rowId: 'row', op: 'PUT', objectId: 'row', checksum: 3_000_000_000, data: { a: 1 } });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { row: { a: 1 } } })]);
});

downloadClientTest('does not track rows for CLEAR operations', ({ client }) => {
  client.pushCheckpoint(2n, [{ name: 'a' }]);
  client.putRow('a', 'row-0', { col: 'hi' });
  client.pushData({ bucket: 'a', rowId: '', op: 'CLEAR', objectId: undefined, objectType: '', data: undefined });
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': null } })]);

  // Restarting marks all known rows as updated, which must not include a row for the CLEAR operation. row-0 has been
  // removed by the CLEAR, so it's no longer tracked either.
  client.state = new DownloadClientState(client.localWrites, client.state);
  client.pushCheckpoint(2n, []);
  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
});

describe('row state', () => {
  downloadClientTest('is dropped once removed in all buckets', ({ client }) => {
    client.pushCheckpoint(4n, [{ name: 'a' }, { name: 'b' }]);
    client.putRow('a', 'row-0', { col: 'a' });
    client.putRow('b', 'row-0', { col: 'b' });
    client.pushData({ bucket: 'a', rowId: 'row-0', op: 'REMOVE', objectId: 'row-0', data: undefined });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'b' } } })]);

    // Still referenced by a PUT in b, so a restart marks it as updated.
    client.state = new DownloadClientState(client.localWrites, client.state);
    client.pushCheckpoint(4n, [{ name: 'a' }, { name: 'b' }]);
    client.pushData({ bucket: 'b', rowId: 'row-0', op: 'REMOVE', objectId: 'row-0', data: undefined });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': null } })]);

    // Now removed everywhere, so no longer tracked.
    client.state = new DownloadClientState(client.localWrites, client.state);
    client.pushCheckpoint(4n, []);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
  });

  downloadClientTest('is kept while removal is pending in other priority', ({ client }) => {
    client.pushCheckpoint(4n, priorityBuckets);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    client.putRow('prio2', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);

    client.pushCheckpoint(6n, priorityBuckets);
    client.pushData({ bucket: 'prio1', rowId: 'row-0', op: 'REMOVE', objectId: 'row-0', data: undefined });
    client.pushData({ bucket: 'prio2', rowId: 'row-0', op: 'REMOVE', objectId: 'row-0', data: undefined });
    // The removal in prio2 is still pending, so the row is kept until the full checkpoint.
    expect(client.pushCheckpointComplete(1)).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } }, 1)]);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': null } })]);

    client.state = new DownloadClientState(client.localWrites, client.state);
    client.pushCheckpoint(6n, []);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
  });

  downloadClientTest('can be tracked again after being dropped', ({ client }) => {
    client.pushCheckpoint(3n, [{ name: 'a' }]);
    client.putRow('a', 'row-0', { col: 'a' });
    client.pushData({ bucket: 'a', rowId: 'row-0', op: 'REMOVE', objectId: 'row-0', data: undefined });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': null } })]);

    client.putRow('a', 'row-0', { col: 'again' });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'again' } } })]);
  });
});

downloadClientTest('does not publish until reaching checkpoint', ({ client }) => {
  client.pushCheckpoint(1n, priorityBuckets);
  client.localWrites.hasLocalWrites = true;

  // pushData asserts that data lines alone don't emit an event.
  client.putRow('prio1', 'row-0', { col: 'hi' });
  expect(client.pushCheckpointComplete()).toStrictEqual([blockedDueToWrite]);
});

describe('publishes with local data for prio=0 buckets', () => {
  downloadClientTest('for explicit partial checkpoint', ({ client }) => {
    client.pushCheckpoint(1n, priorityBuckets);
    client.localWrites.hasLocalWrites = true;

    client.putRow('prio0', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete(0)).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } }, 0)]);
  });

  downloadClientTest('for full checkpoint', ({ client }) => {
    // A full checkpoint might consist entirely of prio 0 buckets, in which case it should still be applied.
    client.pushCheckpoint(1n, [{ name: 'prio0', priority: 0 }]);
    client.localWrites.hasLocalWrites = true;

    client.putRow('prio0', 'row-0', { col: 'hi' });
    // The full checkpoint is still delayed, we only applied prio 0 buckets.
    expect(client.pushCheckpointComplete()).toStrictEqual([
      updatedRows({ items: { 'row-0': { col: 'hi' } } }, 0),
      blockedDueToWrite
    ]);

    // Once local writes are resolved, the full checkpoint is applied without further changes.
    client.localWrites.hasLocalWrites = false;
    client.localWrites.targetCheckpoint = 1n;
    client.pushCheckpoint(1n, [{ name: 'prio0', priority: 0 }], 1n);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
  });

  downloadClientTest('does not apply prio 0 buckets if other priorities exist', ({ client }) => {
    // With multiple priorities, the service sends an explicit partial_checkpoint_complete line for prio 0.
    client.pushCheckpoint(2n, priorityBuckets);
    client.localWrites.hasLocalWrites = true;

    client.putRow('prio0', 'row-0', { col: 'hi' });
    client.putRow('prio1', 'row-1', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([blockedDueToWrite]);
  });
});

downloadClientTest('does not publish with pending local data', ({ client }) => {
  client.pushCheckpoint(1n, [{ name: 'a' }]);
  client.localWrites.hasLocalWrites = true;

  client.pushCheckpoint(1n, [{ name: 'a' }]);
  client.pushData({ bucket: 'a', rowId: 'rowid', op: 'PUT', objectId: 'first', data: { foo: 'bar' } });
  expect(client.pushCheckpointComplete()).toStrictEqual([blockedDueToWrite]);

  client.localWrites.hasLocalWrites = false;
  client.localWrites.targetCheckpoint = 2n;

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
    expect(client.pushCheckpointComplete(i)).toStrictEqual([
      updatedRows({ items: { [`row-${i}`]: { col: `${i}` } } }, i)
    ]);
  }

  expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
});

describe('applies pending changes', () => {
  // In these tests, re-sending checkpoint_complete stands in for the completed_upload control call of the core
  // extension: It retries applying the pending checkpoint.

  downloadClientTest('write checkpoint before upload complete', ({ client }) => {
    // Local write while offline
    client.localWrites.hasLocalWrites = true;

    // Assume data has been uploaded and a write checkpoint has been requested, but not received yet.
    client.pushCheckpoint(1n, priorityBuckets, 1n);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([blockedDueToWrite]);

    // Now complete the upload process, this should apply the pending checkpoint.
    client.localWrites.hasLocalWrites = false;
    client.localWrites.targetCheckpoint = 1n;
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('write checkpoint before upload complete, only prio 0', ({ client }) => {
    client.localWrites.hasLocalWrites = true;

    client.pushCheckpoint(1n, [{ name: 'prio0', priority: 0 }], 1n);
    client.putRow('prio0', 'row-0', { col: 'hi' });
    // Prio 0 buckets are applied as a partial checkpoint already.
    expect(client.pushCheckpointComplete()).toStrictEqual([
      updatedRows({ items: { 'row-0': { col: 'hi' } } }, 0),
      blockedDueToWrite
    ]);

    // Completing the upload should apply the full checkpoint.
    client.localWrites.hasLocalWrites = false;
    client.localWrites.targetCheckpoint = 1n;
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({})]);
  });

  downloadClientTest('write checkpoint with synced data', ({ client }) => {
    // Local write while offline, followed by completed upload
    client.localWrites.targetCheckpoint = 1n;

    // Sync afterwards containing data and write checkpoint.
    client.pushCheckpoint(1n, priorityBuckets, 1n);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('write checkpoint after synced data', ({ client }) => {
    client.localWrites.hasLocalWrites = true;

    // Upload changes, assume that triggered a checkpoint.
    client.pushCheckpoint(1n, priorityBuckets);
    client.putRow('prio1', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([blockedDueToWrite]);

    // Now the upload is complete and requests a write checkpoint, which hasn't been synced yet.
    client.localWrites.hasLocalWrites = false;
    client.localWrites.targetCheckpoint = 1n;
    expect(client.pushCheckpointComplete()).toStrictEqual([
      { received: null, target: 1n, type: 'waitingForCheckpoint' }
    ]);

    // Which triggers a new iteration
    client.pushCheckpoint(1n, priorityBuckets, 1n);
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });
});

downloadClientTest('emits stream descriptions from checkpoints', ({ client }) => {
  const streams = [
    { name: 'a', is_default: false, errors: [] },
    { name: 'b', is_default: false, errors: [{ subscription: 1, message: 'invalid parameters' }] }
  ];
  expect(client.state.push({ checkpoint: { last_op_id: '0', buckets: [], streams } })).toStrictEqual([
    { type: 'resolvedStreams', streams }
  ]);

  // Checkpoint diffs don't describe streams.
  expect(
    client.state.push({ checkpoint_diff: { last_op_id: '0', updated_buckets: [], removed_buckets: [] } })
  ).toStrictEqual([]);
});

describe('retryCheckpoint', () => {
  downloadClientTest('applies checkpoint received before target was known', ({ client }) => {
    // The checkpoint request response arrives after the checkpoint with the write checkpoint, which has been applied
    // already.
    client.pushCheckpoint(1n, [{ name: 'a' }], 1n);
    client.putRow('a', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);

    client.localWrites.targetCheckpoint = 1n;
    expect(client.state.retryCheckpoint()).toStrictEqual([updatedRows({})]);
  });

  downloadClientTest('applies blocked checkpoint', ({ client }) => {
    client.localWrites.targetCheckpoint = 1n;
    client.pushCheckpoint(1n, [{ name: 'a' }], 2n);
    client.putRow('a', 'row-0', { col: 'hi' });
    client.localWrites.targetCheckpoint = 3n;
    expect(client.pushCheckpointComplete()).toStrictEqual([{ received: 2n, target: 3n, type: 'waitingForCheckpoint' }]);

    client.localWrites.targetCheckpoint = 2n;
    expect(client.state.retryCheckpoint()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('does not apply incomplete checkpoints', ({ client }) => {
    expect(client.state.retryCheckpoint()).toStrictEqual([]);

    client.pushCheckpoint(1n, [{ name: 'a' }]);
    client.putRow('a', 'row-0', { col: 'hi' });
    expect(client.state.retryCheckpoint()).toStrictEqual([]);

    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
    expect(
      client.state.push({ checkpoint_diff: { last_op_id: '2', updated_buckets: [], removed_buckets: [] } })
    ).toStrictEqual([]);
    expect(client.state.retryCheckpoint()).toStrictEqual([]);
  });
});

describe('errors', () => {
  downloadClientTest('diff without prior checkpoint', ({ client }) => {
    expect(() =>
      client.state.push({
        checkpoint_diff: { last_op_id: '1', updated_buckets: [], removed_buckets: [] }
      })
    ).toThrow();
  });

  downloadClientTest('can retry', ({ client }) => {
    expect(() => client.state.push({ checkpoint: { last_op_id: 'invalid op id', buckets: [] } })).toThrow();

    // Realistically, clients would abort on this error. Still, verify that we're able to try again.
    client.pushCheckpoint(1n, [{ name: 'a' }]);
    client.putRow('a', 'row-0', { col: 'hi' });
    expect(client.pushCheckpointComplete()).toStrictEqual([updatedRows({ items: { 'row-0': { col: 'hi' } } })]);
  });

  downloadClientTest('checksum mismatch', ({ client }) => {
    client.pushCheckpoint(1n, [{ name: 'a', checksum: 1234, priority: 3 }]);
    client.pushData({
      bucket: 'a',
      rowId: '1',
      op: 'PUT',
      objectId: '1',
      objectType: 'tbl',
      data: { col: 'a' }
    });

    expect(() => client.pushCheckpointComplete()).toThrow();
  });
});

const priorityBuckets: Bucket[] = [0, 1, 2, 3].map((priority) => ({ name: `prio${priority}`, priority }));

function updatedRows(
  tables: Record<string, Record<string, Record<string, unknown> | null>>,
  priority?: number
): DownloadEvent {
  const changes: DownloadChanges = {
    updatedRows: new Map(Object.entries(tables).map(([table, rows]) => [table, new Map(Object.entries(rows))]))
  };
  return priority == null ? { type: 'rows', changes } : { type: 'rows', changes, priority };
}

const blockedDueToWrite: DownloadEvent = { type: 'blockedDueToLocalData' };

class TestClient {
  localWrites = new LocalWriteState();
  state = new DownloadClientState(this.localWrites);
  nextOpId = 1n;

  pushCheckpoint(lastOpId: bigint, buckets: Bucket[], checkpointRequest?: bigint) {
    const result = this.state.push({
      checkpoint: {
        last_op_id: String(lastOpId),
        write_checkpoint: checkpointRequest == null ? undefined : String(checkpointRequest),
        buckets: buckets.map((b) => ({ bucket: b.name, priority: b.priority ?? 3, checksum: b.checksum ?? 0 }))
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
            subkey: data.subkey,
            checksum: data.checksum ?? 0,
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
}

interface TestData {
  bucket: string;
  rowId: string;
  op: OpType;
  data: unknown | undefined;
  objectId?: string;
  objectType?: string;
  subkey?: string;
  checksum?: number;
}

interface Bucket {
  name: string;
  priority?: number;
  checksum?: number;
}
