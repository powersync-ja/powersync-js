import {
  BaseObserver,
  LogLevels,
  PowerSyncLogger,
  DBAdapter,
  Transaction,
  CrudEntry,
  CrudBatch,
  SqliteValue
} from '@powersync/common';

import {
  BucketStorageAdapter,
  BucketStorageListener,
  PowerSyncControlCommand,
  PSInternalTable,
  rawPowerSyncControl,
  targetCheckpointRequestId,
  UpdateLocalTargetResult
} from './BucketStorageAdapter.js';
import { CrudEntryImpl, CrudEntryJSON } from './CrudEntry.js';
import { MAX_OP_ID } from '../../../constants.js';

/**
 * @internal
 */
export class SqliteBucketStorage extends BaseObserver<BucketStorageListener> implements BucketStorageAdapter {
  private updateListener: () => void;
  private _clientId?: Promise<string>;

  constructor(
    private db: DBAdapter,
    private logger: PowerSyncLogger
  ) {
    super();
    this.updateListener = db.registerListener({
      tablesUpdated: ({ tables }) => {
        if (tables.includes(PSInternalTable.CRUD)) {
          this.iterateListeners((l) => l.crudUpdate?.());
        }
      }
    });
  }

  async dispose() {
    this.updateListener?.();
  }

  async _getClientId() {
    const row = await this.db.get<{ client_id: string }>('SELECT powersync_client_id() as client_id');
    return row['client_id'];
  }

  getClientId() {
    if (this._clientId == null) {
      this._clientId = this._getClientId();
    }
    return this._clientId!;
  }

  async updateLocalTarget(cb: () => Promise<string>): Promise<UpdateLocalTargetResult> {
    const sequenceBefore = await this.db.readTransaction(async (tx): Promise<number | undefined> => {
      const currentCheckpoint = await targetCheckpointRequestId(tx);
      if (currentCheckpoint != MAX_OP_ID) return;

      const rs = await tx.getOptional<{ seq: number }>("SELECT seq FROM main.sqlite_sequence WHERE name = 'ps_crud'");
      return rs?.seq;
    });

    if (sequenceBefore == null) {
      // Nothing to update
      return 'no_crud_sequence';
    }

    const opId = await cb();

    return this.writeTransaction(async (tx) => {
      const anyData = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
      if (anyData.rows?.length) {
        // if isNotEmpty
        this.logger.log({
          level: LogLevels.debug,
          message: `New data uploaded since write checkpoint ${opId} - need new write checkpoint`
        });
        return 'new_data';
      }

      const { seq: seqAfter } = await tx.get<{ seq: number }>(
        "SELECT seq FROM main.sqlite_sequence WHERE name = 'ps_crud'"
      );

      if (seqAfter != sequenceBefore) {
        this.logger.log({
          level: LogLevels.debug,
          message: `New data uploaded since write checpoint ${opId} - need new write checkpoint (sequence updated)`
        });

        // New crud data may have been uploaded since we got the checkpoint. Abort.
        return 'sequence_changed';
      }

      this.logger.log({
        level: LogLevels.debug,
        message: `Updating target write checkpoint to ${opId}`
      });
      await targetCheckpointRequestId(tx, opId);
      return 'updated_checkpoint';
    });
  }

  readCheckpointRequestId(variant: 'next' | 'current' | 'seed', payload: string | null = null): Promise<string> {
    // This needs to run in a write transaction because some checkpoint request reads interact with sync client state
    // bound to the write connection.
    return this.db.writeTransaction(async (tx) => {
      return (await rawPowerSyncControl(tx, `${variant}_checkpoint_request_id`, payload))!;
    });
  }

  async nextCrudItem(): Promise<CrudEntry | undefined> {
    const next = await this.db.getOptional<CrudEntryJSON>('SELECT * FROM ps_crud ORDER BY id ASC LIMIT 1');
    if (!next) {
      return;
    }
    return CrudEntryImpl.fromRow(next);
  }

  async hasCrud(): Promise<boolean> {
    const anyData = await this.db.getOptional('SELECT 1 FROM ps_crud LIMIT 1');
    return !!anyData;
  }

  /**
   * Get a batch of objects to send to the server.
   * When the objects are successfully sent to the server, call .complete()
   */
  async getCrudBatch(limit: number = 100): Promise<CrudBatch | null> {
    if (!(await this.hasCrud())) {
      return null;
    }

    const crudResult = await this.db.getAll<CrudEntryJSON>('SELECT * FROM ps_crud ORDER BY id ASC LIMIT ?', [limit]);

    const all: CrudEntry[] = [];
    for (const row of crudResult) {
      all.push(CrudEntryImpl.fromRow(row));
    }

    if (all.length === 0) {
      return null;
    }

    const last = all[all.length - 1];
    return {
      crud: all,
      haveMore: true,
      complete: async (writeCheckpoint?: string) => {
        return this.handleCrudCheckpoint(last.clientId, writeCheckpoint);
      }
    };
  }

  handleCrudCheckpoint(lastClientId: number, writeCheckpoint?: string): Promise<void> {
    return this.writeTransaction(async (tx) => {
      await tx.execute('DELETE FROM ps_crud WHERE id <= ?', [lastClientId]);
      if (writeCheckpoint) {
        const crudResult = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
        if (crudResult.rows?.length) {
          await targetCheckpointRequestId(tx, writeCheckpoint);
        }
      } else {
        await targetCheckpointRequestId(tx, MAX_OP_ID);
      }
    });
  }

  async writeTransaction<T>(callback: (tx: Transaction) => Promise<T>, options?: { timeoutMs: number }): Promise<T> {
    return this.db.writeTransaction(callback, options);
  }

  async control(op: PowerSyncControlCommand, payload: string | Uint8Array | ArrayBuffer | null): Promise<string> {
    return await this.writeTransaction(async (tx) => {
      return (await rawPowerSyncControl(tx, op, payload as SqliteValue))!;
    });
  }

  async hasMigratedSubkeys(): Promise<boolean> {
    const { r } = await this.db.get<{ r: number }>('SELECT EXISTS(SELECT * FROM ps_kv WHERE key = ?) as r', [
      SqliteBucketStorage._subkeyMigrationKey
    ]);
    return r != 0;
  }

  async migrateToFixedSubkeys(): Promise<void> {
    await this.writeTransaction(async (tx) => {
      await tx.execute('UPDATE ps_oplog SET key = powersync_remove_duplicate_key_encoding(key);');
      await tx.execute('INSERT OR REPLACE INTO ps_kv (key, value) VALUES (?, ?);', [
        SqliteBucketStorage._subkeyMigrationKey,
        '1'
      ]);
    });
  }

  static _subkeyMigrationKey = 'powersync_js_migrated_subkeys';
}
