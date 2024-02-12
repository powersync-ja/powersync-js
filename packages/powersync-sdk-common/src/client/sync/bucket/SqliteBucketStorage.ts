import { v4 as uuid } from 'uuid';
import { Mutex } from 'async-mutex';
import { DBAdapter, Transaction } from '../../../db/DBAdapter';
import { BucketState, BucketStorageAdapter, Checkpoint, SyncLocalDatabaseResult } from './BucketStorageAdapter';
import { OpTypeEnum } from './OpType';
import { CrudBatch } from './CrudBatch';
import { CrudEntry } from './CrudEntry';
import { SyncDataBatch } from './SyncDataBatch';
import Logger, { ILogger } from 'js-logger';

const COMPACT_OPERATION_INTERVAL = 1_000;

export class SqliteBucketStorage implements BucketStorageAdapter {
  static MAX_OP_ID = '9223372036854775807';

  public tableNames: Set<string>;
  private pendingBucketDeletes: boolean;
  private _hasCompletedSync: boolean;

  /**
   * Count up, and do a compact on startup.
   */
  private compactCounter = COMPACT_OPERATION_INTERVAL;

  constructor(
    private db: DBAdapter,
    private mutex: Mutex,
    private logger: ILogger = Logger.get('SqliteBucketStorage')
  ) {
    this._hasCompletedSync = false;
    this.pendingBucketDeletes = true;
    this.tableNames = new Set();
  }

  async init() {
    this._hasCompletedSync = false;
    const existingTableRows = await this.db.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'ps_data_*'`
    );
    for (const row of existingTableRows.rows?._array ?? []) {
      this.tableNames.add(row.name);
    }
  }

  getMaxOpId() {
    return SqliteBucketStorage.MAX_OP_ID;
  }
  /**
   * Reset any caches.
   */
  startSession(): void {}

  async getBucketStates(): Promise<BucketState[]> {
    const result = await this.db.execute(
      'SELECT name as bucket, cast(last_op as TEXT) as op_id FROM ps_buckets WHERE pending_delete = 0'
    );
    return result.rows?._array ?? [];
  }

  async saveSyncData(batch: SyncDataBatch) {
    await this.writeTransaction(async (tx) => {
      let count = 0;
      for (const b of batch.buckets) {
        const result = await tx.execute('INSERT INTO powersync_operations(op, data) VALUES(?, ?)', [
          'save',
          JSON.stringify({ buckets: [b.toJSON()] })
        ]);
        this.logger.debug('saveSyncData', JSON.stringify(result));
        count += b.data.length;
      }
      this.compactCounter += count;
    });
  }

  async removeBuckets(buckets: string[]): Promise<void> {
    for (const bucket of buckets) {
      await this.deleteBucket(bucket);
    }
  }

  /**
   * Mark a bucket for deletion.
   */
  private async deleteBucket(bucket: string) {
    // Delete a bucket, but allow it to be re-created.
    // To achieve this, we rename the bucket to a new temp name, and change all ops to remove.
    // By itself, this new bucket would ensure that the previous objects are deleted if they contain no more references.
    // If the old bucket is re-added, this new bucket would have no effect.
    const newName = `$delete_${bucket}_${uuid()}`;
    this.logger.debug('Deleting bucket', bucket);
    // This
    await this.writeTransaction(async (tx) => {
      await tx.execute(
        `UPDATE ps_oplog SET op=${OpTypeEnum.REMOVE}, data=NULL WHERE op=${OpTypeEnum.PUT} AND superseded=0 AND bucket=?`,
        [bucket]
      );
      // Rename bucket
      await tx.execute('UPDATE ps_oplog SET bucket=? WHERE bucket=?', [newName, bucket]);
      await tx.execute('DELETE FROM ps_buckets WHERE name = ?', [bucket]);
      await tx.execute(
        'INSERT INTO ps_buckets(name, pending_delete, last_op) SELECT ?, 1, IFNULL(MAX(op_id), 0) FROM ps_oplog WHERE bucket = ?',
        [newName, newName]
      );
    });
    this.logger.debug('done deleting bucket');
    this.pendingBucketDeletes = true;
  }

  async hasCompletedSync() {
    if (this._hasCompletedSync) {
      return true;
    }
    const r = await this.db.execute(`SELECT name, last_applied_op FROM ps_buckets WHERE last_applied_op > 0 LIMIT 1`);
    const completed = !!r.rows?.length;
    if (completed) {
      this._hasCompletedSync = true;
    }
    return completed;
  }

  async syncLocalDatabase(checkpoint: Checkpoint): Promise<SyncLocalDatabaseResult> {
    const r = await this.validateChecksums(checkpoint);
    if (!r.checkpointValid) {
      this.logger.error('Checksums failed for', r.failures);
      for (const b of r.failures ?? []) {
        await this.deleteBucket(b);
      }
      return { ready: false, checkpointValid: false, failures: r.failures };
    }

    const bucketNames = checkpoint.buckets.map((b) => b.bucket);
    await this.writeTransaction(async (tx) => {
      await tx.execute(`UPDATE ps_buckets SET last_op = ? WHERE name IN (SELECT json_each.value FROM json_each(?))`, [
        checkpoint.last_op_id,
        JSON.stringify(bucketNames)
      ]);

      if (checkpoint.write_checkpoint) {
        await tx.execute("UPDATE ps_buckets SET last_op = ? WHERE name = '$local'", [checkpoint.write_checkpoint]);
      }
    });

    const valid = await this.updateObjectsFromBuckets(checkpoint);
    if (!valid) {
      this.logger.debug('Not at a consistent checkpoint - cannot update local db');
      return { ready: false, checkpointValid: true };
    }

    await this.forceCompact();

    return {
      ready: true,
      checkpointValid: true
    };
  }

  /**
   * Atomically update the local state to the current checkpoint.
   *
   * This includes creating new tables, dropping old tables, and copying data over from the oplog.
   */
  private async updateObjectsFromBuckets(checkpoint: Checkpoint) {
    return this.writeTransaction(async (tx) => {
      const { insertId: result } = await tx.execute('INSERT INTO powersync_operations(op, data) VALUES(?, ?)', [
        'sync_local',
        ''
      ]);
      return result == 1;
    });
  }

  async validateChecksums(checkpoint: Checkpoint): Promise<SyncLocalDatabaseResult> {
    const rs = await this.db.execute('SELECT powersync_validate_checkpoint(?) as result', [JSON.stringify(checkpoint)]);

    const resultItem = rs.rows?.item(0);
    this.logger.debug('validateChecksums result item', resultItem);
    if (!resultItem) {
      return {
        checkpointValid: false,
        ready: false,
        failures: []
      };
    }

    const result = JSON.parse(resultItem['result']);

    if (result['valid']) {
      return { ready: true, checkpointValid: true };
    } else {
      return {
        checkpointValid: false,
        ready: false,
        failures: result['failed_buckets']
      };
    }
  }

  /**
   * Force a compact, for tests.
   */
  async forceCompact() {
    this.compactCounter = COMPACT_OPERATION_INTERVAL;
    this.pendingBucketDeletes = true;

    await this.autoCompact();
  }

  async autoCompact() {
    await this.deletePendingBuckets();
    await this.clearRemoveOps();
  }

  private async deletePendingBuckets() {
    if (this.pendingBucketDeletes !== false) {
      await this.writeTransaction(async (tx) => {
        await tx.execute(
          'DELETE FROM ps_oplog WHERE bucket IN (SELECT name FROM ps_buckets WHERE pending_delete = 1 AND last_applied_op = last_op AND last_op >= target_op)'
        );
        await tx.execute(
          'DELETE FROM ps_buckets WHERE pending_delete = 1 AND last_applied_op = last_op AND last_op >= target_op'
        );
      });
      // Executed once after start-up, and again when there are pending deletes.
      this.pendingBucketDeletes = false;
    }
  }

  private async clearRemoveOps() {
    if (this.compactCounter < COMPACT_OPERATION_INTERVAL) {
      return;
    }

    await this.writeTransaction(async (tx) => {
      await tx.execute('INSERT INTO powersync_operations(op, data) VALUES (?, ?)', ['clear_remove_ops', '']);
    });
    this.compactCounter = 0;
  }

  async updateLocalTarget(cb: () => Promise<string>): Promise<boolean> {
    const rs1 = await this.db.execute("SELECT target_op FROM ps_buckets WHERE name = '$local' AND target_op = ?", [
      SqliteBucketStorage.MAX_OP_ID
    ]);
    if (!rs1.rows?.length) {
      // Nothing to update
      return false;
    }
    const rs = await this.db.execute("SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud'");
    if (!rs.rows?.length) {
      // Nothing to update
      return false;
    }
    const seqBefore: number = rs.rows?.item(0)['seq'];

    const opId = await cb();

    this.logger.debug(`[updateLocalTarget] Updating target to checkpoint ${opId}`);

    return this.writeTransaction(async (tx) => {
      const anyData = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
      if (anyData.rows?.length) {
        // if isNotEmpty
        this.logger.debug('updateLocalTarget', 'ps crud is not empty');
        return false;
      }

      const rs = await tx.execute("SELECT seq FROM sqlite_sequence WHERE name = 'ps_crud'");
      if (!rs.rows?.length) {
        // assert isNotEmpty
        throw new Error('SQlite Sequence should not be empty');
      }

      const seqAfter: number = rs.rows?.item(0)['seq'];
      this.logger.debug('seqAfter', JSON.stringify(rs.rows?.item(0)));
      if (seqAfter != seqBefore) {
        this.logger.debug('seqAfter != seqBefore', seqAfter, seqBefore);
        // New crud data may have been uploaded since we got the checkpoint. Abort.
        return false;
      }

      const response = await tx.execute("UPDATE ps_buckets SET target_op = ? WHERE name='$local'", [opId]);
      this.logger.debug(['[updateLocalTarget] Response from updating target_op ', JSON.stringify(response)]);
      return true;
    });
  }

  async hasCrud(): Promise<boolean> {
    const anyData = await this.db.execute('SELECT 1 FROM ps_crud LIMIT 1');
    return !!anyData.rows?.length;
  }

  /**
   * Get a batch of objects to send to the server.
   * When the objects are successfully sent to the server, call .complete()
   */
  async getCrudBatch(limit: number = 100): Promise<CrudBatch | null> {
    if (!(await this.hasCrud())) {
      return null;
    }

    const crudResult = await this.db.execute('SELECT * FROM ps_crud ORDER BY id ASC LIMIT ?', [limit]);

    const all: CrudEntry[] = [];
    for (const row of crudResult.rows?._array ?? []) {
      all.push(CrudEntry.fromRow(row));
    }

    if (all.length === 0) {
      return null;
    }

    const last = all[all.length - 1];
    return {
      crud: all,
      haveMore: true,
      complete: async (writeCheckpoint?: string) => {
        return this.writeTransaction(async (tx) => {
          await tx.execute('DELETE FROM ps_crud WHERE id <= ?', [last.clientId]);
          if (writeCheckpoint) {
            const crudResult = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
            if (crudResult.rows?.length) {
              await tx.execute("UPDATE ps_buckets SET target_op = ? WHERE name='$local'", [writeCheckpoint]);
            }
          } else {
            await tx.execute("UPDATE ps_buckets SET target_op = ? WHERE name='$local'", [this.getMaxOpId()]);
          }
        });
      }
    };
  }

  async writeTransaction<T>(callback: (tx: Transaction) => Promise<T>, options?: { timeoutMs: number }): Promise<T> {
    return this.db.writeTransaction(callback, options);
  }

  /**
   * Set a target checkpoint.
   */
  async setTargetCheckpoint(checkpoint: Checkpoint) {
    // No-op for now
  }
}
