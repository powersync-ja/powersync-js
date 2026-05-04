import Logger, { ILogger } from 'js-logger';
import { DBAdapter, extractTableUpdates, Transaction } from '../../../db/DBAdapter.js';
import { BaseObserver } from '../../../utils/BaseObserver.js';
import { MAX_OP_ID } from '../../constants.js';
import {
  BucketStorageAdapter,
  BucketStorageListener,
  PowerSyncControlCommand,
  PSInternalTable
} from './BucketStorageAdapter.js';
import { CrudBatch } from './CrudBatch.js';
import { CrudEntry, CrudEntryJSON } from './CrudEntry.js';

export class SqliteBucketStorage extends BaseObserver<BucketStorageListener> implements BucketStorageAdapter {
  public tableNames: Set<string>;
  private updateListener: () => void;
  private _clientId?: Promise<string>;

  constructor(
    private db: DBAdapter,
    private logger: ILogger = Logger.get('SqliteBucketStorage')
  ) {
    super();
    this.tableNames = new Set();
    this.updateListener = db.registerListener({
      tablesUpdated: (update) => {
        const tables = extractTableUpdates(update);
        if (tables.includes(PSInternalTable.CRUD)) {
          this.iterateListeners((l) => l.crudUpdate?.());
        }
      }
    });
  }

  async init() {
    const existingTableRows = await this.db.getAll<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'ps_data_*'`
    );
    for (const row of existingTableRows ?? []) {
      this.tableNames.add(row.name);
    }
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

  getMaxOpId() {
    return MAX_OP_ID;
  }

  async updateLocalTarget(cb: () => Promise<string>): Promise<boolean> {
    const rs1 = await this.db.getAll(
      "SELECT target_op FROM ps_buckets WHERE name = '$local' AND target_op = CAST(? as INTEGER)",
      [MAX_OP_ID]
    );
    if (!rs1.length) {
      // Nothing to update
      return false;
    }
    const rs = await this.db.getAll<{ seq: number }>("SELECT seq FROM main.sqlite_sequence WHERE name = 'ps_crud'");
    if (!rs.length) {
      // Nothing to update
      return false;
    }

    const seqBefore: number = rs[0]['seq'];

    const opId = await cb();

    return this.writeTransaction(async (tx) => {
      const anyData = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
      if (anyData.rows?.length) {
        // if isNotEmpty
        this.logger.debug(`New data uploaded since write checkpoint ${opId} - need new write checkpoint`);
        return false;
      }

      const rs = await tx.execute("SELECT seq FROM main.sqlite_sequence WHERE name = 'ps_crud'");
      if (!rs.rows?.length) {
        // assert isNotEmpty
        throw new Error('SQLite Sequence should not be empty');
      }

      const seqAfter: number = rs.rows?.item(0)['seq'];
      if (seqAfter != seqBefore) {
        this.logger.debug(
          `New data uploaded since write checpoint ${opId} - need new write checkpoint (sequence updated)`
        );

        // New crud data may have been uploaded since we got the checkpoint. Abort.
        return false;
      }

      this.logger.debug(`Updating target write checkpoint to ${opId}`);
      await tx.execute("UPDATE ps_buckets SET target_op = CAST(? as INTEGER) WHERE name='$local'", [opId]);
      return true;
    });
  }

  async nextCrudItem(): Promise<CrudEntry | undefined> {
    const next = await this.db.getOptional<CrudEntryJSON>('SELECT * FROM ps_crud ORDER BY id ASC LIMIT 1');
    if (!next) {
      return;
    }
    return CrudEntry.fromRow(next);
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
              await tx.execute("UPDATE ps_buckets SET target_op = CAST(? as INTEGER) WHERE name='$local'", [
                writeCheckpoint
              ]);
            }
          } else {
            await tx.execute("UPDATE ps_buckets SET target_op = CAST(? as INTEGER) WHERE name='$local'", [
              this.getMaxOpId()
            ]);
          }
        });
      }
    };
  }

  async writeTransaction<T>(callback: (tx: Transaction) => Promise<T>, options?: { timeoutMs: number }): Promise<T> {
    return this.db.writeTransaction(callback, options);
  }

  async control(op: PowerSyncControlCommand, payload: string | Uint8Array | ArrayBuffer | null): Promise<string> {
    return await this.writeTransaction(async (tx) => {
      const [[raw]] = await tx.executeRaw('SELECT powersync_control(?, ?)', [op, payload]);
      return raw;
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
