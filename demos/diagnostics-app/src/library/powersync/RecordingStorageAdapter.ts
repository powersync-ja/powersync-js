import {
  AbstractPowerSyncDatabase,
  Checkpoint,
  DBAdapter,
  SqliteBucketStorage,
  SyncDataBatch
} from '@journeyapps/powersync-sdk-web';

export class RecordingStorageAdapter extends SqliteBucketStorage {
  private rdb: DBAdapter;

  constructor(db: DBAdapter) {
    super(db, (AbstractPowerSyncDatabase as any).transactionMutex);
    this.rdb = db;
  }

  async setTargetCheckpoint(checkpoint: Checkpoint) {
    await super.setTargetCheckpoint(checkpoint);
    await this.rdb.writeTransaction(async (tx) => {
      for (let bucket of checkpoint.buckets) {
        await tx.execute(
          `INSERT OR REPLACE INTO local_bucket_data(id, total_operations, last_op, download_size, downloading)
           VALUES (
            ?,
            ?,
            IFNULL((SELECT last_op FROM local_bucket_data WHERE id = ?), '0'),
            IFNULL((SELECT download_size FROM local_bucket_data WHERE id = ?), 0),
            IFNULL((SELECT downloading FROM local_bucket_data WHERE id = ?), TRUE)
            )`,
          [bucket.bucket, bucket.count, bucket.bucket, bucket.bucket, bucket.bucket]
        );
      }
    });
  }

  async syncLocalDatabase(checkpoint: Checkpoint) {
    const r = await super.syncLocalDatabase(checkpoint);
    if (r.checkpointValid) {
      await this.rdb.execute('UPDATE local_bucket_data SET downloading = FALSE');
    }
    return r;
  }

  async saveSyncData(batch: SyncDataBatch) {
    await super.saveSyncData(batch);
    await this.rdb.writeTransaction(async (tx) => {
      for (let bucket of batch.buckets) {
        const size = JSON.stringify(bucket.data).length;
        await tx.execute(
          'UPDATE local_bucket_data SET download_size = IFNULL(download_size, 0) + ?, last_op = ?, downloading = ? WHERE id = ?',
          [size, bucket.next_after, bucket.has_more, bucket.bucket]
        );
      }
    });
  }
}
