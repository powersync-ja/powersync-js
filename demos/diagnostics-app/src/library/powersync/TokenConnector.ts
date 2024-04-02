import { db } from '@/components/providers/SystemProvider';
import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  BucketState,
  BucketStorageAdapter,
  BucketStorageListener,
  Checkpoint,
  PowerSyncBackendConnector,
  SyncDataBatch,
  WebRemote,
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '@journeyapps/powersync-sdk-web';
import { LocalBucketData } from './AppSchema';

export interface Credentials {
  token: string;
  endpoint: string;
}

export class TokenConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const value = localStorage.getItem('powersync_credentials');
    if (value == null) {
      return null;
    }
    return JSON.parse(value);
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    // Discard any data
    const tx = await database.getNextCrudTransaction();
    await tx?.complete();
  }

  async signIn(credentials: Credentials) {
    localStorage.setItem('powersync_credentials', JSON.stringify(credentials));
    await db.connect(this);
  }

  hasCredentials() {
    return localStorage.getItem('powersync_credentials') != null;
  }

  async loadCheckpoint(): Promise<Checkpoint> {
    const remote = new WebRemote(this);

    let resolveCheckpoint: any = null;
    let checkpointPromise: Promise<Checkpoint> = new Promise((resolve, reject) => {
      resolveCheckpoint = resolve;
    });

    const adapter = new RecordingStorageAdapter(db);
    adapter.registerListener({
      checkpointAvailable(checkpoint) {
        resolveCheckpoint(checkpoint);
      }
    });

    const syncOptions: WebStreamingSyncImplementationOptions = {
      adapter,
      remote,
      uploadCrud: async () => {
        // No-op
      },
      identifier: 'diagnostics'
    };
    const sync = new WebStreamingSyncImplementation(syncOptions);
    try {
      await sync.connect();

      const checkpoint = await checkpointPromise;
      console.log({ checkpoint });
      return checkpoint;
    } finally {
      // await sync.disconnect();
    }
  }
}

interface MockStorageListener extends BucketStorageListener {
  checkpointAvailable(checkpoint: Checkpoint): void;
}

class RecordingStorageAdapter extends BaseObserver<MockStorageListener> implements BucketStorageAdapter {
  private db: AbstractPowerSyncDatabase;

  constructor(db: AbstractPowerSyncDatabase) {
    super();
    this.db = db;
  }

  async getBucketStates(): Promise<BucketState[]> {
    const buckets = await this.db.getAll<LocalBucketData>('SELECT * FROM local_bucket_data');
    return buckets.map((bucket) => {
      return {
        bucket: bucket.id,
        op_id: bucket.last_op ?? '0'
      };
    });
  }

  startSession() {}
  async removeBuckets(buckets: string[]) {
    if (buckets.length == 0) {
      return;
    }
    await this.db.execute('DELETE FROM local_bucket_data WHERE id IN (SELECT e.value FROM json_each(?) e)', [
      JSON.stringify(buckets)
    ]);
  }
  async setTargetCheckpoint(checkpoint: Checkpoint) {
    await this.db.writeTransaction(async (tx) => {
      for (let bucket of checkpoint.buckets) {
        console.log('save', bucket);
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
        console.log('saved', bucket);
      }
    });
    this.iterateListeners((l) => {
      l.checkpointAvailable?.(checkpoint);
    });
  }
  async syncLocalDatabase(checkpoint: Checkpoint) {
    await this.db.execute('UPDATE local_bucket_data SET downloading = FALSE');
    return { checkpointValid: true, ready: true };
  }
  async hasCompletedSync() {
    return false;
  }
  async hasCrud() {
    return false;
  }
  getMaxOpId() {
    return '9223372036854775807';
  }
  async init() {}
  async saveSyncData(batch: SyncDataBatch) {
    await this.db.writeTransaction(async (tx) => {
      for (let bucket of batch.buckets) {
        const size = JSON.stringify(bucket.data).length;
        await tx.execute(
          'UPDATE local_bucket_data SET download_size = IFNULL(download_size, 0) + ?, last_op = ?, downloading = ? WHERE id = ?',
          [size, bucket.next_after, bucket.has_more, bucket.bucket]
        );
      }
    });
  }
  async dispose() {}
  async updateLocalTarget(cb: any) {
    return false;
  }
  async getCrudBatch(limit: any) {
    return null;
  }
  async forceCompact() {}
  async autoCompact() {}
}
