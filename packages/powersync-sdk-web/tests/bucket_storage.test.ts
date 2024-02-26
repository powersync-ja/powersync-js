import {
  BucketStorageAdapter,
  OpType,
  OpTypeEnum,
  OplogEntry,
  SqliteBucketStorage,
  SyncDataBatch,
  SyncDataBucket
} from '@journeyapps/powersync-sdk-common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase, Checkpoint } from '@journeyapps/powersync-sdk-common';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
import { Mutex } from 'async-mutex';
import { testSchema } from './test_schema';

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

describe.only('Bucket Storage', () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test-bucket-storage.db',
    flags: {
      enableMultiTabs: false
    },
    schema: testSchema
  });

  let db: AbstractPowerSyncDatabase;
  let bucketStorage: BucketStorageAdapter;

  beforeEach(async () => {
    db = factory.getInstance();
    await db.waitForReady();
    bucketStorage = new SqliteBucketStorage(db.database, new Mutex());
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  async function syncLocalChecked(checkpoint: Checkpoint) {
    var result = await bucketStorage.syncLocalDatabase(checkpoint);
    expect(result).deep.equals({ ready: true, checkpointValid: true });
  }

  async function expectAsset1_3() {
    expect(await db.getAll("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([
      { id: 'O1', description: 'bard', make: null }
    ]);
  }

  async function expectNoAsset1() {
    expect(await db.get("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([]);
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
      buckets: [{ bucket: 'bucket1', checksum: 6 }]
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
        { bucket: 'bucket1', checksum: 3 },
        { bucket: 'bucket2', checksum: 3 }
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
        { bucket: 'bucket1', checksum: 3 },
        { bucket: 'bucket2', checksum: 1 }
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
        { bucket: 'bucket1', checksum: 3 },
        { bucket: 'bucket2', checksum: 7 }
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
        { bucket: 'bucket1', checksum: 8 },
        { bucket: 'bucket2', checksum: 7 }
      ]
    });

    await expectNoAssets();
  });
});

// TODO, these still need to be ported over

//     test('should use subkeys', () async {
//       // subkeys cause this to be treated as a separate entity in the oplog,
//       // but same entity in the local db.
//       var put4 = OplogEntry(
//           opId: '4',
//           op: OpType.put,
//           subkey: 'b',
//           rowType: 'assets',
//           rowId: 'O1',
//           data: '{"description": "B"}',
//           checksum: 4);

//       var remove5 = OplogEntry(
//           opId: '5',
//           op: OpType.remove,
//           subkey: 'b',
//           rowType: 'assets',
//           rowId: 'O1',
//           checksum: 5);

//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//             bucket: 'bucket1', data: [putAsset1_1, putAsset1_3, put4]),
//       ]));

//       await syncLocalChecked(Checkpoint(lastOpId: '4', checksums: [
//         BucketChecksum(bucket: 'bucket1', checksum: 8),
//       ]));

//       expect(
//           db.select("SELECT id, description, make FROM assets WHERE id = 'O1'"),
//           equals([
//             {'id': 'O1', 'description': 'B', 'make': null}
//           ]));

//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(bucket: 'bucket1', data: [remove5]),
//       ]));

//       await syncLocalChecked(Checkpoint(lastOpId: '5', checksums: [
//         BucketChecksum(bucket: 'bucket1', checksum: 13),
//       ]));

//       expectAsset1_3();
//     });

//     test('should fail checksum validation', () async {
//       // Simple checksum validation
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//             bucket: 'bucket1', data: [putAsset1_1, putAsset2_2, putAsset1_3]),
//       ]));

//       var result = await bucketStorage
//           .syncLocalDatabase(Checkpoint(lastOpId: '3', checksums: [
//         BucketChecksum(bucket: 'bucket1', checksum: 10),
//         BucketChecksum(bucket: 'bucket2', checksum: 1)
//       ]));
//       expect(
//           result,
//           equals(SyncLocalDatabaseResult(
//               ready: false,
//               checkpointValid: false,
//               checkpointFailures: ['bucket1', 'bucket2'])));

//       expectNoAssets();
//     });

//     test('should delete buckets', () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_3],
//         ),
//         SyncBucketData(
//           bucket: 'bucket2',
//           data: [putAsset1_3],
//         ),
//       ]));

//       await bucketStorage.removeBuckets(['bucket2']);
//       // The delete only takes effect after syncLocal.

//       await syncLocalChecked(Checkpoint(lastOpId: '3', checksums: [
//         BucketChecksum(bucket: 'bucket1', checksum: 3),
//       ]));

//       // Bucket is deleted, but object is still present in other buckets.
//       expectAsset1_3();

//       await bucketStorage.removeBuckets(['bucket1']);
//       await syncLocalChecked(Checkpoint(lastOpId: '3', checksums: []));
//       // Both buckets deleted - object removed.
//       expectNoAssets();
//     });

//     test('should delete and re-create buckets', () async {
//       // Save some data
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1],
//         ),
//       ]));

//       // Delete the bucket
//       await bucketStorage.removeBuckets(['bucket1']);

//       // Save some data again
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset1_3],
//         ),
//       ]));
//       // Delete again
//       await bucketStorage.removeBuckets(['bucket1']);

//       // Final save of data
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset1_3],
//         ),
//       ]));

//       // Check that the data is there
//       await syncLocalChecked(Checkpoint(lastOpId: '3', checksums: [
//         BucketChecksum(bucket: 'bucket1', checksum: 4),
//       ]));
//       expectAsset1_3();

//       // Now final delete
//       await bucketStorage.removeBuckets(['bucket1']);
//       await syncLocalChecked(Checkpoint(lastOpId: '3', checksums: []));
//       expectNoAssets();
//     });

//     test('should handle MOVE', () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [
//             OplogEntry(
//                 opId: '1',
//                 op: OpType.move,
//                 checksum: 1,
//                 data: '{"target": "3"}')
//           ],
//         ),
//       ]));

//       // At this point, we have target: 3, but don't have that op yet, so we cannot sync.
//       final result = await bucketStorage.syncLocalDatabase(Checkpoint(
//           lastOpId: '2',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 1)]));
//       // Checksum passes, but we don't have a complete checkpoint
//       expect(result, equals(SyncLocalDatabaseResult(ready: false)));

//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 4)]));

//       expectAsset1_3();
//     });

//     test('should handle CLEAR', () async {
//       // Save some data
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '1',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 1)]));

//       // CLEAR, then save new data
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [
//             OplogEntry(opId: '2', op: OpType.clear, checksum: 2),
//             OplogEntry(
//                 opId: '3',
//                 checksum: 3,
//                 op: putAsset2_2.op,
//                 data: putAsset2_2.data,
//                 rowId: putAsset2_2.rowId,
//                 rowType: putAsset2_2.rowType)
//           ],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           // 2 + 3. 1 is replaced with 2.
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 5)]));

//       expectNoAsset1();
//       expect(
//           db.select("SELECT id, description FROM assets WHERE id = 'O2'"),
//           equals([
//             {'id': 'O2', 'description': 'bar'}
//           ]));
//     });

//     test('update with new types', () async {
//       // Test case where a type is added to the schema after we already have the data.

//       // Re-initialize with empty database
//       await cleanDb(path: path);

//       powersync = PowerSyncDatabase.withFactory(TestOpenFactory(path: path),
//           schema: const Schema([]));
//       await powersync.initialize();
//       db = await setupSqlite(powersync: powersync);
//       bucketStorage = BucketStorage(db, mutex: Mutex());

//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '4',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));
//       expect(
//           () => db.select('SELECT * FROM assets'),
//           throwsA((e) =>
//               e is sqlite.SqliteException &&
//               e.message.contains('no such table')));

//       await powersync.close();

//       // Now open another instance with new schema
//       powersync = PowerSyncDatabase.withFactory(TestOpenFactory(path: path),
//           schema: schema);
//       db = await setupSqlite(powersync: powersync);

//       expectAsset1_3();
//     });

//     test('should remove types', () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       expectAsset1_3();

//       await powersync.close();

//       // Now open another instance with new schema
//       powersync = PowerSyncDatabase.withFactory(TestOpenFactory(path: path),
//           schema: const Schema([]));
//       db = await setupSqlite(powersync: powersync);
//       expect(
//           () => db.select('SELECT * FROM assets'),
//           throwsA((e) =>
//               e is sqlite.SqliteException &&
//               e.message.contains('no such table')));

//       // Add schema again
//       powersync = PowerSyncDatabase.withFactory(TestOpenFactory(path: path),
//           schema: schema);
//       db = await setupSqlite(powersync: powersync);

//       expectAsset1_3();
//     });

//     test('should compact', () async {
//       // Test compacting behaviour.
//       // This test relies heavily on internals, and will have to be updated when the compact implementation is updated.

//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//             bucket: 'bucket1', data: [putAsset1_1, putAsset2_2, removeAsset1_4])
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '4',
//           writeCheckpoint: '4',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 7)]));

//       await bucketStorage.forceCompact();

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '4',
//           writeCheckpoint: '4',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 7)]));

//       final stats = db.select(
//           'SELECT row_type as type, row_id as id, count(*) as count FROM ps_oplog GROUP BY row_type, row_id ORDER BY row_type, row_id');
//       expect(
//           stats,
//           equals([
//             {'type': 'assets', 'id': 'O2', 'count': 1}
//           ]));
//     });

//     test('should not sync local db with pending crud - server removed',
//         () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Local save
//       db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
//       expect(
//           db.select('SELECT id FROM assets WHERE id = \'O3\''),
//           equals([
//             {'id': 'O3'}
//           ]));

//       // At this point, we have data in the crud table, and are not able to sync the local db.
//       final result = await bucketStorage.syncLocalDatabase(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));
//       expect(result, equals(SyncLocalDatabaseResult(ready: false)));

//       final batch = bucketStorage.getCrudBatch();
//       await batch!.complete();
//       await bucketStorage.updateLocalTarget(() async {
//         return '4';
//       });

//       // At this point, the data has been uploaded, but not synced back yet.
//       final result3 = await bucketStorage.syncLocalDatabase(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));
//       expect(result3, equals(SyncLocalDatabaseResult(ready: false)));

//       // The data must still be present locally.
//       expect(
//           db.select('SELECT id FROM assets WHERE id = \'O3\''),
//           equals([
//             {'id': 'O3'}
//           ]));

//       await bucketStorage.saveSyncData(
//           SyncDataBatch([SyncBucketData(bucket: 'bucket1', data: [])]));

//       // Now we have synced the data back (or lack of data in this case),
//       // so we can do a local sync.
//       await syncLocalChecked(Checkpoint(
//           lastOpId: '5',
//           writeCheckpoint: '5',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Since the object was not in the sync response, it is deleted.
//       expect(db.select('SELECT id FROM assets WHERE id = \'O3\''), equals([]));
//     });

//     test(
//         'should not sync local db with pending crud when more crud is added (1)',
//         () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Local save
//       db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);

//       final batch = bucketStorage.getCrudBatch();
//       await batch!.complete();
//       await bucketStorage.updateLocalTarget(() async {
//         return '4';
//       });

//       final result3 = await bucketStorage.syncLocalDatabase(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));
//       expect(result3, equals(SyncLocalDatabaseResult(ready: false)));

//       await bucketStorage.saveSyncData(
//           SyncDataBatch([SyncBucketData(bucket: 'bucket1', data: [])]));

//       // Add more data before syncLocalDatabase.
//       db.execute('INSERT INTO assets(id) VALUES(?)', ['O4']);

//       final result4 = await bucketStorage.syncLocalDatabase(Checkpoint(
//           lastOpId: '5',
//           writeCheckpoint: '5',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));
//       expect(result4, equals(SyncLocalDatabaseResult(ready: false)));
//     });

//     test(
//         'should not sync local db with pending crud when more crud is added (2)',
//         () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Local save
//       db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
//       final batch = bucketStorage.getCrudBatch();
//       // Add more data before the complete() call

//       db.execute('INSERT INTO assets(id) VALUES(?)', ['O4']);
//       await batch!.complete();
//       await bucketStorage.updateLocalTarget(() async {
//         return '4';
//       });

//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [],
//         ),
//       ]));

//       final result4 = await bucketStorage.syncLocalDatabase(Checkpoint(
//           lastOpId: '5',
//           writeCheckpoint: '5',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));
//       expect(result4, equals(SyncLocalDatabaseResult(ready: false)));
//     });

//     test('should not sync local db with pending crud - update on server',
//         () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Local save
//       db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
//       final batch = bucketStorage.getCrudBatch();
//       await batch!.complete();
//       await bucketStorage.updateLocalTarget(() async {
//         return '4';
//       });

//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [
//             OplogEntry(
//                 opId: '5',
//                 op: OpType.put,
//                 rowType: 'assets',
//                 rowId: 'O3',
//                 checksum: 5,
//                 data: '{"description": "server updated"}')
//           ],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '5',
//           writeCheckpoint: '5',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 11)]));

//       expect(
//           db.select('SELECT description FROM assets WHERE id = \'O3\''),
//           equals([
//             {'description': 'server updated'}
//           ]));
//     });

//     test('should revert a failing insert', () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Local insert, later rejected by server
//       db.execute('INSERT INTO assets(id, description) VALUES(?, ?)',
//           ['O3', 'inserted']);
//       final batch = bucketStorage.getCrudBatch();
//       await batch!.complete();
//       await bucketStorage.updateLocalTarget(() async {
//         return '4';
//       });

//       expect(
//           db.select('SELECT description FROM assets WHERE id = \'O3\''),
//           equals([
//             {'description': 'inserted'}
//           ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '4',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       expect(db.select('SELECT description FROM assets WHERE id = \'O3\''),
//           equals([]));
//     });

//     test('should revert a failing delete', () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Local delete, later rejected by server
//       db.execute('DELETE FROM assets WHERE id = ?', ['O2']);

//       expect(db.select('SELECT description FROM assets WHERE id = \'O2\''),
//           equals([]));
//       // Simulate a permissions error when uploading - data should be preserved.
//       final batch = bucketStorage.getCrudBatch();
//       await batch!.complete();

//       await bucketStorage.updateLocalTarget(() async {
//         return '4';
//       });

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '4',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       expect(
//           db.select('SELECT description FROM assets WHERE id = \'O2\''),
//           equals([
//             {'description': 'bar'}
//           ]));
//     });

//     test('should revert a failing update', () async {
//       await bucketStorage.saveSyncData(SyncDataBatch([
//         SyncBucketData(
//           bucket: 'bucket1',
//           data: [putAsset1_1, putAsset2_2, putAsset1_3],
//         ),
//       ]));

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '3',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       // Local update, later rejected by server
//       db.execute(
//           'UPDATE assets SET description = ? WHERE id = ?', ['updated', 'O2']);

//       expect(
//           db.select('SELECT description FROM assets WHERE id = \'O2\''),
//           equals([
//             {'description': 'updated'}
//           ]));
//       // Simulate a permissions error when uploading - data should be preserved.
//       final batch = bucketStorage.getCrudBatch();
//       await batch!.complete();

//       await bucketStorage.updateLocalTarget(() async {
//         return '4';
//       });

//       await syncLocalChecked(Checkpoint(
//           lastOpId: '3',
//           writeCheckpoint: '4',
//           checksums: [BucketChecksum(bucket: 'bucket1', checksum: 6)]));

//       expect(
//           db.select('SELECT description FROM assets WHERE id = \'O2\''),
//           equals([
//             {'description': 'bar'}
//           ]));
//     });
//   });
// }
