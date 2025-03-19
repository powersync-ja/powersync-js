import {
  AbstractPowerSyncDatabase,
  BucketStorageAdapter,
  Checkpoint,
  OpType,
  OpTypeEnum,
  OplogEntry,
  Schema,
  SqliteBucketStorage,
  SyncDataBatch,
  SyncDataBucket
} from '@powersync/common';
import { PowerSyncDatabase, WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
import { Mutex } from 'async-mutex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { testSchema } from './utils/testDb';

const putAsset1_1 = OplogEntry.fromRow({
  op_id: '1',
  op: new OpType(OpTypeEnum.PUT).toJSON(),
  object_type: 'assets',
  object_id: 'O1',
  data: '{"description": "bar"}',
  checksum: 1
});

const putAsset2_2 = OplogEntry.fromRow({
  op_id: '2',
  op: new OpType(OpTypeEnum.PUT).toJSON(),
  object_type: 'assets',
  object_id: 'O2',
  data: '{"description": "bar"}',
  checksum: 2
});

const putAsset1_3 = OplogEntry.fromRow({
  op_id: '3',
  op: new OpType(OpTypeEnum.PUT).toJSON(),
  object_type: 'assets',
  object_id: 'O1',
  data: '{"description": "bard"}',
  checksum: 3
});

const removeAsset1_4 = OplogEntry.fromRow({
  op_id: '4',
  op: new OpType(OpTypeEnum.REMOVE).toJSON(),
  object_type: 'assets',
  object_id: 'O1',
  checksum: 4
});

const removeAsset1_5 = OplogEntry.fromRow({
  op_id: '5',
  op: new OpType(OpTypeEnum.REMOVE).toJSON(),
  object_type: 'assets',
  object_id: 'O1',
  checksum: 5
});

describe('Bucket Storage', { sequential: true }, () => {
  let db: AbstractPowerSyncDatabase;
  let bucketStorage: BucketStorageAdapter;

  beforeEach(async () => {
    db = new PowerSyncDatabase({
      database: {
        dbFilename: 'test-bucket-storage.db'
      },
      flags: {
        enableMultiTabs: false
      },
      schema: testSchema
    });
    await db.waitForReady();
    bucketStorage = new SqliteBucketStorage(db.database, new Mutex());
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  async function syncLocalChecked(checkpoint: Checkpoint) {
    const result = await bucketStorage.syncLocalDatabase(checkpoint);
    expect(result).deep.equals({ ready: true, checkpointValid: true });
  }

  async function expectAsset1_3(database = db) {
    expect(await database.getAll("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([
      { id: 'O1', description: 'bard', make: null }
    ]);
  }

  async function expectNoAsset1() {
    expect(await db.getAll("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([]);
  }

  async function expectNoAssets() {
    expect(await db.getAll('SELECT id, description, make FROM assets')).deep.equals([]);
  }

  it('Basic Setup', async () => {
    await db.waitForReady();

    expect(await bucketStorage.getBucketStates()).empty;

    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    const bucketStates = await bucketStorage.getBucketStates();

    expect(bucketStates).deep.equals([
      {
        bucket: 'bucket1',
        op_id: '3'
      }
    ]);

    await syncLocalChecked({
      last_op_id: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    await expectAsset1_3();
  });

  it('should get an object from multiple buckets', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket('bucket1', [putAsset1_3], false),
        new SyncDataBucket('bucket2', [putAsset1_3], false)
      ])
    );

    await syncLocalChecked({
      last_op_id: '3',
      buckets: [
        { bucket: 'bucket1', checksum: 3, priority: 3 },
        { bucket: 'bucket2', checksum: 3, priority: 3 }
      ]
    });
    await expectAsset1_3();
  });

  it('should prioritize later updates', async () => {
    // Test behaviour when the same object is present in multiple buckets.
    // In this case, there are two different versions in the different buckets.
    // While we should not get this with our server implementation, the client still specifies this behaviour:
    // The largest op_id wins.
    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket('bucket1', [putAsset1_3], false),
        new SyncDataBucket('bucket2', [putAsset1_1], false)
      ])
    );

    await syncLocalChecked({
      last_op_id: '3',
      buckets: [
        { bucket: 'bucket1', checksum: 3, priority: 3 },
        { bucket: 'bucket2', checksum: 1, priority: 3 }
      ]
    });
    await expectAsset1_3();
  });

  it('should ignore a remove from one bucket', async () => {
    // When we have 1 PUT and 1 REMOVE, the object must be kept.
    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket('bucket1', [putAsset1_3], false),
        new SyncDataBucket('bucket2', [putAsset1_3, removeAsset1_4], false)
      ])
    );

    await syncLocalChecked({
      last_op_id: '4',
      buckets: [
        { bucket: 'bucket1', checksum: 3, priority: 3 },
        { bucket: 'bucket2', checksum: 7, priority: 3 }
      ]
    });
    await expectAsset1_3();
  });

  it('should remove when removed from all buckets', async () => {
    // When we only have REMOVE left for an object, it must be deleted.
    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket('bucket1', [putAsset1_3, removeAsset1_5], false),
        new SyncDataBucket('bucket2', [putAsset1_3, removeAsset1_4], false)
      ])
    );

    await syncLocalChecked({
      last_op_id: '5',
      buckets: [
        { bucket: 'bucket1', checksum: 8, priority: 3 },
        { bucket: 'bucket2', checksum: 7, priority: 3 }
      ]
    });

    await expectNoAssets();
  });

  it('should use subkeys', async () => {
    // subkeys cause this to be treated as a separate entity in the oplog,
    // but same entity in the local db.
    const put4 = OplogEntry.fromRow({
      op_id: '4',
      op: new OpType(OpTypeEnum.PUT).toJSON(),
      subkey: 'b',
      object_type: 'assets',
      object_id: 'O1',
      data: '{"description": "B"}',
      checksum: 4
    });

    const remove5 = OplogEntry.fromRow({
      op_id: '5',
      op: new OpType(OpTypeEnum.REMOVE).toJSON(),
      subkey: 'b',
      object_type: 'assets',
      object_id: 'O1',
      checksum: 5
    });

    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset1_3, put4], false)])
    );

    await syncLocalChecked({
      last_op_id: '4',
      buckets: [{ bucket: 'bucket1', checksum: 8, priority: 3 }]
    });

    expect(await db.getAll("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([
      { id: 'O1', description: 'B', make: null }
    ]);

    await bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [remove5], false)]));

    await syncLocalChecked({
      last_op_id: '5',
      buckets: [{ bucket: 'bucket1', checksum: 13, priority: 3 }]
    });

    await expectAsset1_3();
  });

  it('should fail checksum validation', async () => {
    // Simple checksum validation
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    const result = await bucketStorage.syncLocalDatabase({
      last_op_id: '3',
      buckets: [
        { bucket: 'bucket1', checksum: 10, priority: 3 },
        { bucket: 'bucket2', checksum: 1, priority: 3 }
      ]
    });

    expect(result).deep.equals({
      ready: false,
      checkpointValid: false,
      checkpointFailures: ['bucket1', 'bucket2']
    });

    await expectNoAssets();
  });

  it('should delete buckets', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket('bucket1', [putAsset1_3], false),
        new SyncDataBucket('bucket2', [putAsset1_3], false)
      ])
    );

    await bucketStorage.removeBuckets(['bucket2']);
    // The delete only takes effect after syncLocal.

    await syncLocalChecked({
      last_op_id: '3',
      buckets: [{ bucket: 'bucket1', checksum: 3, priority: 3 }]
    });

    // Bucket is deleted, but object is still present in other buckets.
    await expectAsset1_3();

    await bucketStorage.removeBuckets(['bucket1']);
    await syncLocalChecked({ last_op_id: '3', buckets: [] });
    // Both buckets deleted - object removed.
    await expectNoAssets();
  });

  it('should delete and re-create buckets', async () => {
    // Save some data
    await bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1], false)]));

    // Delete the bucket
    await bucketStorage.removeBuckets(['bucket1']);

    // Save some data again
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset1_3], false)])
    );
    // Delete again
    await bucketStorage.removeBuckets(['bucket1']);

    // Final save of data
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset1_3], false)])
    );

    // Check that the data is there
    await syncLocalChecked({
      last_op_id: '3',
      buckets: [{ bucket: 'bucket1', checksum: 4, priority: 3 }]
    });
    await expectAsset1_3();

    // Now final delete
    await bucketStorage.removeBuckets(['bucket1']);
    await syncLocalChecked({ last_op_id: '3', buckets: [] });
    await expectNoAssets();
  });

  it('should handle MOVE', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket(
          'bucket1',
          [
            OplogEntry.fromRow({
              op_id: '1',
              op: new OpType(OpTypeEnum.MOVE).toJSON(),
              checksum: 1
            })
          ],
          false
        )
      ])
    );

    await bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_3], false)]));

    await syncLocalChecked({
      last_op_id: '3',
      buckets: [{ bucket: 'bucket1', checksum: 4, priority: 3 }]
    });

    await expectAsset1_3();
  });

  it('should handle CLEAR', async () => {
    // Save some data
    await bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1], false)]));

    await syncLocalChecked({
      last_op_id: '1',
      buckets: [{ bucket: 'bucket1', checksum: 1, priority: 3 }]
    });

    // CLEAR, then save new data
    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket(
          'bucket1',
          [
            OplogEntry.fromRow({
              op_id: '2',
              op: new OpType(OpTypeEnum.CLEAR).toJSON(),
              checksum: 2
            }),
            OplogEntry.fromRow({
              op_id: '3',
              op: new OpType(OpTypeEnum.PUT).toJSON(),
              checksum: 3,
              data: putAsset2_2.data,
              object_id: putAsset2_2.object_id,
              object_type: putAsset2_2.object_type
            })
          ],
          false
        )
      ])
    );

    await syncLocalChecked({
      last_op_id: '3',
      // 2 + 3. 1 is replaced with 2.
      buckets: [{ bucket: 'bucket1', checksum: 5, priority: 3 }]
    });

    await expectNoAsset1();
    console.log(await db.getAll(`SELECT id, description FROM assets WHERE id = 'O2'`));
    expect(await db.get("SELECT id, description FROM assets WHERE id = 'O2'")).deep.equals({
      id: 'O2',
      description: 'bar'
    });
  });

  it('update with new types', async () => {
    const dbName = `test-bucket-storage-new-types.db`;
    // Test case where a type is added to the schema after we already have the data.
    const factory = new WASQLitePowerSyncDatabaseOpenFactory({
      dbFilename: dbName,
      flags: {
        enableMultiTabs: false
      },
      schema: new Schema([])
    });

    let powersync = factory.getInstance();
    await powersync.waitForReady();
    bucketStorage = new SqliteBucketStorage(powersync.database, new Mutex());

    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '4',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    await expect(powersync.getAll('SELECT * FROM assets')).rejects.toThrow('no such table');
    await powersync.close();

    // Now open another instance with new schema
    const factory2 = new WASQLitePowerSyncDatabaseOpenFactory({
      dbFilename: dbName,
      flags: {
        enableMultiTabs: false
      },
      schema: testSchema
    });

    powersync = factory2.getInstance();

    await expectAsset1_3(powersync);

    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('should remove types', async () => {
    const dbName = `test-bucket-storage-remove-types.db`;
    // Test case where a type is added to the schema after we already have the data.
    const factory = new WASQLitePowerSyncDatabaseOpenFactory({
      dbFilename: dbName,
      flags: {
        enableMultiTabs: false
      },
      schema: testSchema
    });

    let powersync = factory.getInstance();
    await powersync.waitForReady();
    bucketStorage = new SqliteBucketStorage(powersync.database, new Mutex());

    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    await expectAsset1_3(powersync);

    await powersync.close();

    // Now open another instance with new schema
    const factory2 = new WASQLitePowerSyncDatabaseOpenFactory({
      dbFilename: dbName,
      flags: {
        enableMultiTabs: false
      },
      schema: new Schema([])
    });

    powersync = factory2.getInstance();

    await expect(powersync.execute('SELECT * FROM assets')).rejects.toThrowError('no such table');
    await powersync.close();

    // Add schema again
    powersync = factory.getInstance();

    await expectAsset1_3(powersync);

    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('should compact', async () => {
    // Test compacting behaviour.
    // This test relies heavily on internals, and will have to be updated when the compact implementation is updated.

    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, removeAsset1_4], false)])
    );

    await syncLocalChecked({
      last_op_id: '4',
      write_checkpoint: '4',
      buckets: [{ bucket: 'bucket1', checksum: 7, priority: 3 }]
    });

    await bucketStorage.forceCompact();

    await syncLocalChecked({
      last_op_id: '4',
      write_checkpoint: '4',
      buckets: [{ bucket: 'bucket1', checksum: 7, priority: 3 }]
    });

    const stats = await db.getAll(
      'SELECT row_type as type, row_id as id, count(*) as count FROM ps_oplog GROUP BY row_type, row_id ORDER BY row_type, row_id'
    );
    expect(stats).deep.equals([{ type: 'assets', id: 'O2', count: 1 }]);
  });

  it('should not sync local db with pending crud - server removed', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Local save
    await db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
    expect(await db.getAll("SELECT id FROM assets WHERE id = 'O3'")).deep.equals([{ id: 'O3' }]);

    // At this point, we have data in the crud table, and are not able to sync the local db.
    const result = await bucketStorage.syncLocalDatabase({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    expect(result).deep.equals({ ready: false, checkpointValid: true });

    const batch = await bucketStorage.getCrudBatch();
    await batch!.complete();
    await bucketStorage.updateLocalTarget(async () => {
      return '4';
    });

    // At this point, the data has been uploaded, but not synced back yet.
    const result3 = await bucketStorage.syncLocalDatabase({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });
    expect(result3).deep.equals({ ready: false, checkpointValid: true });

    // The data must still be present locally.
    expect(await db.getAll("SELECT id FROM assets WHERE id = 'O3'")).deep.equals([{ id: 'O3' }]);

    await bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [], false)]));

    // Now we have synced the data back (or lack of data in this case),
    // so we can do a local sync.
    await syncLocalChecked({
      last_op_id: '5',
      write_checkpoint: '5',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Since the object was not in the sync response, it is deleted.
    expect(await db.getAll("SELECT id FROM assets WHERE id = 'O3'")).empty;
  });

  it('should not sync local db with pending crud when more crud is added (1)', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Local save
    await db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);

    const batch = await bucketStorage.getCrudBatch();
    await batch!.complete();
    await bucketStorage.updateLocalTarget(async () => {
      return '4';
    });

    const result3 = await bucketStorage.syncLocalDatabase({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });
    expect(result3).deep.equals({ ready: false, checkpointValid: true });

    await bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [], false)]));

    // Add more data before syncLocalDatabase.
    await db.execute('INSERT INTO assets(id) VALUES(?)', ['O4']);

    const result4 = await bucketStorage.syncLocalDatabase({
      last_op_id: '5',
      write_checkpoint: '5',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });
    expect(result4).deep.equals({ ready: false, checkpointValid: true });
  });

  it('should not sync local db with pending crud when more crud is added (2)', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Local save
    await db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
    const batch = await bucketStorage.getCrudBatch();
    // Add more data before the complete() call

    await db.execute('INSERT INTO assets(id) VALUES(?)', ['O4']);
    await batch!.complete();
    await bucketStorage.updateLocalTarget(async () => {
      return '4';
    });

    await bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [], false)]));

    const result4 = await bucketStorage.syncLocalDatabase({
      last_op_id: '5',
      write_checkpoint: '5',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });
    expect(result4).deep.equals({ ready: false, checkpointValid: true });
  });

  it('should not sync local db with pending crud - update on server', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Local save
    await db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
    const batch = await bucketStorage.getCrudBatch();
    await batch!.complete();
    await bucketStorage.updateLocalTarget(async () => {
      return '4';
    });

    await bucketStorage.saveSyncData(
      new SyncDataBatch([
        new SyncDataBucket(
          'bucket1',
          [
            OplogEntry.fromRow({
              op_id: '5',
              op: new OpType(OpTypeEnum.PUT).toJSON(),
              object_type: 'assets',
              object_id: 'O3',
              checksum: 5,
              data: '{"description": "server updated"}'
            })
          ],
          false
        )
      ])
    );

    await syncLocalChecked({
      last_op_id: '5',
      write_checkpoint: '5',
      buckets: [{ bucket: 'bucket1', checksum: 11, priority: 3 }]
    });

    expect(await db.getAll("SELECT description FROM assets WHERE id = 'O3'")).deep.equals([
      { description: 'server updated' }
    ]);
  });

  it('should revert a failing insert', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Local insert, later rejected by server
    await db.execute('INSERT INTO assets(id, description) VALUES(?, ?)', ['O3', 'inserted']);
    const batch = await bucketStorage.getCrudBatch();
    await batch!.complete();
    await bucketStorage.updateLocalTarget(async () => {
      return '4';
    });

    expect(await db.getAll("SELECT description FROM assets WHERE id = 'O3'")).deep.equals([
      { description: 'inserted' }
    ]);

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '4',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    expect(await db.getAll("SELECT description FROM assets WHERE id = 'O3'")).empty;
  });

  it('should revert a failing delete', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Local delete, later rejected by server
    await db.execute('DELETE FROM assets WHERE id = ?', ['O2']);

    expect(await db.getAll("SELECT description FROM assets WHERE id = 'O2'")).empty;
    // Simulate a permissions error when uploading - data should be preserved.
    const batch = await bucketStorage.getCrudBatch();
    await batch!.complete();

    await bucketStorage.updateLocalTarget(async () => {
      return '4';
    });

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '4',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    expect(await db.getAll("SELECT description FROM assets WHERE id = 'O2'")).deep.equals([{ description: 'bar' }]);
  });

  it('should revert a failing update', async () => {
    await bucketStorage.saveSyncData(
      new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)])
    );

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '3',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    // Local update, later rejected by server
    await db.execute('UPDATE assets SET description = ? WHERE id = ?', ['updated', 'O2']);

    expect(await db.getAll(`SELECT description FROM assets WHERE id = 'O2'`)).deep.equals([{ description: 'updated' }]);
    // Simulate a permissions error when uploading - data should be preserved.
    const batch = await bucketStorage.getCrudBatch();
    await batch!.complete();

    await bucketStorage.updateLocalTarget(async () => {
      return '4';
    });

    await syncLocalChecked({
      last_op_id: '3',
      write_checkpoint: '4',
      buckets: [{ bucket: 'bucket1', checksum: 6, priority: 3 }]
    });

    expect(await db.getAll("SELECT description FROM assets WHERE id = 'O2'")).deep.equals([{ description: 'bar' }]);
  });
});
