import {
  AbstractPowerSyncDatabase,
  AbstractRemote,
  BucketChecksum,
  Checkpoint,
  ColumnType,
  isStreamingSyncCheckpoint,
  isStreamingSyncCheckpointComplete,
  isStreamingSyncCheckpointDiff,
  isStreamingSyncCheckpointPartiallyComplete,
  isStreamingSyncData,
  PowerSyncControlCommand,
  SqliteBucketStorage,
  StreamingSyncLine,
  SyncDataBucket
} from '@powersync/web';
import { DynamicSchemaManager } from './DynamicSchemaManager';

/**
 * Tracks per-byte and per-operation progress for the Rust client.
 *
 * While per-operation progress is reported by the SDK as well, we need those counters for each bucket. Since that
 * information is internal to the Rust client and inaccessible to JavaScript, this intercepts the raw
 * `powersync_control` calls to decode sync lines and derive progress information.
 */
export class RustClientInterceptor extends SqliteBucketStorage {
  private rdb: AbstractPowerSyncDatabase;
  private lastStartedCheckpoint: Checkpoint | null = null;

  public tables: Record<string, Record<string, ColumnType>> = {};

  constructor(
    db: AbstractPowerSyncDatabase,
    private remote: AbstractRemote,
    private schemaManager: DynamicSchemaManager
  ) {
    super(db.database, (AbstractPowerSyncDatabase as any).transactionMutex);
    this.rdb = db;
  }

  async control(op: PowerSyncControlCommand, payload: string | Uint8Array | ArrayBuffer | null): Promise<string> {
    const response = await super.control(op, payload);

    if (op == PowerSyncControlCommand.PROCESS_TEXT_LINE) {
      await this.processTextLine(payload as string);
    } else if (op == PowerSyncControlCommand.PROCESS_BSON_LINE) {
      await this.processBinaryLine(payload as Uint8Array);
    }

    return response;
  }

  private processTextLine(line: string) {
    return this.processParsedLine(JSON.parse(line));
  }

  private async processBinaryLine(line: Uint8Array) {
    const bson = await this.remote.getBSON();
    await this.processParsedLine(bson.deserialize(line) as StreamingSyncLine);
  }

  private async processParsedLine(line: StreamingSyncLine) {
    if (isStreamingSyncCheckpoint(line)) {
      this.lastStartedCheckpoint = line.checkpoint;
      await this.trackCheckpoint(line.checkpoint);
    } else if (isStreamingSyncCheckpointDiff(line) && this.lastStartedCheckpoint) {
      const diff = line.checkpoint_diff;
      const newBuckets = new Map<string, BucketChecksum>();
      for (const checksum of this.lastStartedCheckpoint.buckets) {
        newBuckets.set(checksum.bucket, checksum);
      }
      for (const checksum of diff.updated_buckets) {
        newBuckets.set(checksum.bucket, checksum);
      }
      for (const bucket of diff.removed_buckets) {
        newBuckets.delete(bucket);
      }

      const newCheckpoint: Checkpoint = {
        last_op_id: diff.last_op_id,
        buckets: [...newBuckets.values()],
        write_checkpoint: diff.write_checkpoint
      };
      this.lastStartedCheckpoint = newCheckpoint;
      await this.trackCheckpoint(newCheckpoint);
    } else if (isStreamingSyncData(line)) {
      const batch = { buckets: [SyncDataBucket.fromRow(line.data)] };

      await this.rdb.writeTransaction(async (tx) => {
        for (const bucket of batch.buckets) {
          // Record metrics
          const size = JSON.stringify(bucket.data).length;
          await tx.execute(
            `UPDATE local_bucket_data SET
              download_size = IFNULL(download_size, 0) + ?,
              last_op = ?,
              downloading = ?,
              downloaded_operations = IFNULL(downloaded_operations, 0) + ?
            WHERE id = ?`,
            [size, bucket.next_after, bucket.has_more, bucket.data.length, bucket.bucket]
          );
        }
      });

      const schemaUpdated = await this.schemaManager.updateFromOperations(batch);
      if (schemaUpdated) {
        await this.schemaManager.refreshSchema(this.rdb);
      }
    } else if (isStreamingSyncCheckpointPartiallyComplete(line) || isStreamingSyncCheckpointComplete(line)) {
      setTimeout(() => {
        this.schemaManager.refreshSchema(this.rdb);
      }, 60);
    }
  }

  private async trackCheckpoint(checkpoint: Checkpoint) {
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
          [bucket.bucket, bucket.count, bucket.bucket, bucket.bucket, bucket.bucket, bucket.bucket]
        );
      }
    });
  }
}
