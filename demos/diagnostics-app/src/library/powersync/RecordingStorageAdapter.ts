import {
  AbstractPowerSyncDatabase,
  Checkpoint,
  ColumnType,
  DBAdapter,
  OpType,
  OpTypeEnum,
  SqliteBucketStorage,
  SyncDataBatch
} from '@journeyapps/powersync-sdk-web';
import { AppSchema } from './AppSchema';

export class RecordingStorageAdapter extends SqliteBucketStorage {
  private rdb: DBAdapter;

  public tables: Record<string, Record<string, ColumnType>> = {};

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

  async loadSchema() {
    if (Object.keys(this.tables).length == 0) {
      const existingSchema = await this.rdb.getOptional<{ data: string }>(
        'SELECT data from local_schema where id = ?',
        ['schema']
      );
      if (existingSchema != null) {
        this.tables = JSON.parse(existingSchema.data);
      }
    }
  }

  async saveSyncData(batch: SyncDataBatch) {
    await super.saveSyncData(batch);
    await this.loadSchema();

    let schemaDirty = false;
    await this.rdb.writeTransaction(async (tx) => {
      for (let bucket of batch.buckets) {
        // Record metrics
        const size = JSON.stringify(bucket.data).length;
        await tx.execute(
          'UPDATE local_bucket_data SET download_size = IFNULL(download_size, 0) + ?, last_op = ?, downloading = ? WHERE id = ?',
          [size, bucket.next_after, bucket.has_more, bucket.bucket]
        );

        // Build schema
        for (let op of bucket.data) {
          if (op.op.value == OpTypeEnum.PUT && op.data != null) {
            this.tables[op.object_type!] ??= {};
            const table = this.tables[op.object_type!];
            const data = JSON.parse(op.data);
            for (let [key, value] of Object.entries(data)) {
              if (key == 'id') {
                continue;
              }
              const existing = table[key];
              if (
                typeof value == 'number' &&
                Number.isInteger(value) &&
                existing != ColumnType.REAL &&
                existing != ColumnType.TEXT
              ) {
                if (table[key] != ColumnType.INTEGER) {
                  schemaDirty = true;
                }
                table[key] = ColumnType.INTEGER;
              } else if (typeof value == 'number' && existing != ColumnType.TEXT) {
                if (table[key] != ColumnType.REAL) {
                  schemaDirty = true;
                }
                table[key] = ColumnType.REAL;
              } else if (typeof value == 'string') {
                if (table[key] != ColumnType.TEXT) {
                  schemaDirty = true;
                }
                table[key] = ColumnType.TEXT;
              }
            }
          }
        }
      }
    });

    if (schemaDirty) {
      await this.rdb.execute('INSERT OR REPLACE INTO local_schema VALUES(?, ?)', [
        'schema',
        JSON.stringify(this.tables)
      ]);
      await this.updateSchema();
    }
  }

  async updateSchema() {
    await this.loadSchema();

    const json = AppSchema.toJSON();
    for (const [key, value] of Object.entries(this.tables)) {
      const table = {
        name: key,
        columns: Object.entries(value).map(([cname, ctype]) => {
          return {
            name: cname,
            type: ctype
          };
        })
      };
      json.tables.push(table as any);
    }
    await this.rdb.execute('SELECT powersync_replace_schema(?)', [JSON.stringify(json)]);
    console.log('Updated dynamic schema:', this.tables);
  }
}
