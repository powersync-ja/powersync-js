import type {
  Checkpoint,
  ColumnType,
  DBAdapter,
  PowerSyncDatabase,
  SyncDataBatch,
} from '@powersync/web'
import { AbstractPowerSyncDatabase, SqliteBucketStorage } from '@powersync/web'
import type { DynamicSchemaManager } from './DynamicSchemaManager'
import type { Ref } from 'vue'

export class RecordingStorageAdapter extends SqliteBucketStorage {
  private rdb: DBAdapter
  private schemaManager: DynamicSchemaManager

  public tables: Record<string, Record<string, ColumnType>> = {}

  constructor(
    db: Ref<PowerSyncDatabase>,
    schemaManager: Ref<DynamicSchemaManager>,
  ) {
    super(
      db.value.database,

      (AbstractPowerSyncDatabase as any).transactionMutex,
    )
    this.rdb = db.value.database
    this.schemaManager = schemaManager.value
  }

  override async setTargetCheckpoint(checkpoint: Checkpoint) {
    await super.setTargetCheckpoint(checkpoint)
    await this.rdb.writeTransaction(async (tx) => {
      for (const bucket of checkpoint.buckets) {
        await tx.execute(
          `INSERT OR REPLACE INTO local_bucket_data(id, total_operations, last_op, download_size, downloading, downloaded_operations)
             VALUES (
              ?,
              ?,
              IFNULL((SELECT last_op FROM local_bucket_data WHERE id = ?), '0'),
              IFNULL((SELECT download_size FROM local_bucket_data WHERE id = ?), 0),
              IFNULL((SELECT downloading FROM local_bucket_data WHERE id = ?), TRUE),
              IFNULL((SELECT downloaded_operations FROM local_bucket_data WHERE id = ?), TRUE)
              )`,
          [
            bucket.bucket,
            bucket.count,
            bucket.bucket,
            bucket.bucket,
            bucket.bucket,
            bucket.bucket,
          ],
        )
      }
    })
  }

  override async syncLocalDatabase(checkpoint: Checkpoint, priority?: number) {
    const r = await super.syncLocalDatabase(checkpoint, priority)

    setTimeout(() => {
      this.schemaManager.refreshSchema(this.rdb)
    }, 60)
    if (r.checkpointValid) {
      await this.rdb.execute(
        'UPDATE local_bucket_data SET downloading = FALSE',
      )
    }
    return r
  }

  override async saveSyncData(batch: SyncDataBatch) {
    await super.saveSyncData(batch)

    await this.rdb.writeTransaction(async (tx) => {
      for (const bucket of batch.buckets) {
        // Record metrics
        const size = JSON.stringify(bucket.data).length
        await tx.execute(
          `UPDATE local_bucket_data SET
                download_size = IFNULL(download_size, 0) + ?,
                last_op = ?,
                downloading = ?,
                downloaded_operations = IFNULL(downloaded_operations, 0) + ?
              WHERE id = ?`,
          [
            size,
            bucket.next_after,
            bucket.has_more,
            bucket.data.length,
            bucket.bucket,
          ],
        )
      }
    })

    await this.schemaManager.updateFromOperations(batch)
  }
}
