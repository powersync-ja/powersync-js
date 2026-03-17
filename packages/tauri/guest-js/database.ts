import {
  AbstractPowerSyncDatabase,
  BucketStorageAdapter,
  DBAdapter,
  PowerSyncCloseOptions,
  PowerSyncDatabaseOptionsWithSettings,
  SQLOpenOptions,
  StreamingSyncImplementation,
  SyncStatusOptions
} from '@powersync/common';
import { LateHandle, RustDatabaseAdapter } from './pool';
import { powersyncCommand } from './command';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

/**
 * A PowerSync database backed by a Rust-owned structure for Tauri apps.
 */
export class PowerSyncTauriDatabase extends AbstractPowerSyncDatabase {
  declare private handle: LateHandle;
  private didInitializeSchema = false;
  private tableUpdateListener?: UnlistenFn;
  private syncStatusListener?: UnlistenFn;

  private get name(): string {
    return (this.options.database as SQLOpenOptions).dbFilename;
  }

  /**
   * The id of the wrapped Rust database instance.
   *
   * This can be used together with custom Rust code to share a PowerSync database between JavaScript and
   * Rust.
   */
  get rustHandle(): number {
    return this.handle.handle;
  }

  protected openDBAdapter(options: PowerSyncDatabaseOptionsWithSettings): DBAdapter {
    this.handle = { handle: -1 };
    return new RustDatabaseAdapter(this.name, this.handle);
  }

  protected generateSyncStreamImplementation(): StreamingSyncImplementation {
    throw new Error('Should not be called, sync is implemented in Rust.');
  }

  async connect(): Promise<void> {
    throw new Error(
      'Calling connect() from JavaScript is not supported yet. Instead, call connect() in your Rust code.'
    );
  }

  async disconnect(): Promise<void> {
    await powersyncCommand({ Disconnect: this.handle.handle });
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return new Proxy<Partial<BucketStorageAdapter>>(
      {
        async init() {}
      },
      {
        get(target, symbol) {
          if (symbol in target) {
            return (...args: any[]) => (target as any)[symbol](...args);
          }

          return () => Promise.reject(new Error(`Stub bucket storage adapter, sync is not implemented in JavaScript.`));
        }
      }
    ) as BucketStorageAdapter;
  }

  async updateSchema(): Promise<void> {
    if (!this.didInitializeSchema) {
      this.didInitializeSchema = true;
      // No need to do anything, the initial schema is also initialized from Rust.
      return;
    }

    // To support this, we need to support reloading schemas. Also, we need to forward the serialized schema to the
    // native database instance so that raw tables are passed to the sync client correctly. This is not just a matter of
    // calling powersync_replace_schema.
    throw new Error('updateSchema() is not yet supported on the PowerSync Tauri SDK.');
  }

  async _initialize(): Promise<void> {
    const name = this.name;
    this.tableUpdateListener = await listen<string[]>(`table-updates:${name}`, (event) => {
      const adapter = this.database;
      if (adapter instanceof RustDatabaseAdapter) {
        adapter.iterateListeners((l) =>
          l.tablesUpdated?.({ tables: event.payload, rawUpdates: [], groupedUpdates: {} })
        );
      }
    });
    this.syncStatusListener = await listen<SyncStatusOptions[]>(`sync-status:${name}`, (event) => {});

    const result = await powersyncCommand({
      OpenDatabase: {
        name: name,
        schema: this.schema.toJSON()
      }
    });

    this.handle.handle = (result as any).CreatedHandle as number;
  }

  async close(options?: PowerSyncCloseOptions): Promise<void> {
    this.tableUpdateListener?.();
    this.syncStatusListener?.();

    await super.close(options);
  }
}
