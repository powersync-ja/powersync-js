import {
  AbstractPowerSyncDatabase,
  BucketStorageAdapter,
  DBAdapter,
  PowerSyncCloseOptions,
  PowerSyncDatabaseOptions,
  SQLOpenOptions,
  StreamingSyncImplementation,
  SyncStatus,
  SyncStatusOptions,
  SyncStream,
  SyncStreamSubscribeOptions,
  SyncStreamSubscription
} from '@powersync/common';
import { LateHandle, RustDatabaseAdapter } from './pool';
import { powersyncCommand } from './command';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { join } from '@tauri-apps/api/path';

export type TauriPowerSyncOpenOptions = PowerSyncDatabaseOptions & {
  database: TauriSQLOpenOptions;
};

export interface TauriSQLOpenOptions extends SQLOpenOptions {
  /**
   * For Tauri databases, use {@link dbLocationAsync} instead.
   */
  dbLocation?: never;

  /**
   * A promise that resolves to the directory in which the PowerSync database should be stored.
   */
  dbLocationAsync?: () => Promise<string>;
}

/**
 * A PowerSync database backed by a Rust-owned structure for Tauri apps.
 */
export class PowerSyncTauriDatabase extends AbstractPowerSyncDatabase {
  declare private handle: LateHandle;
  private didInitializeSchema = false;
  private tableUpdateListener?: UnlistenFn;
  private syncStatusListener?: UnlistenFn;

  constructor(options: TauriPowerSyncOpenOptions) {
    super(options);
  }

  private async resolvePath(): Promise<string> {
    const options = this.options.database as TauriSQLOpenOptions;
    if (options.dbLocationAsync) {
      return await join(await options.dbLocationAsync(), options.dbFilename);
    } else {
      return options.dbFilename;
    }
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

  protected openDBAdapter(): DBAdapter {
    this.handle = { handle: -1 };
    return new RustDatabaseAdapter('uninitialized', this.handle);
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

  syncStream(name: string, params?: Record<string, any>): SyncStream {
    const database = this;
    const parameters = params ?? null;

    return {
      name,
      parameters,
      async subscribe(options?: SyncStreamSubscribeOptions): Promise<SyncStreamSubscription> {
        await database.init();
        const result = await powersyncCommand({
          SubscribeToStream: {
            database: database.rustHandle,
            name,
            parameters,
            priority: options?.priority,
            ttl: options?.ttl
          }
        });
        const subscriptionHandle = (result as any).CreatedHandle as number;

        return {
          name,
          parameters,
          async waitForFirstSync(abort) {
            await database.waitForStatus((status) => status.forStream(this)?.subscription.hasSynced, abort);
          },
          async unsubscribe() {
            await powersyncCommand({ CloseHandle: subscriptionHandle });
          }
        } satisfies SyncStreamSubscription;
      },
      async unsubscribeAll(): Promise<void> {
        await powersyncCommand({ UnsubscribeAll: { database: database.rustHandle, name, parameters } });
      }
    };
  }

  private updateSyncStatusFromRust(status: SyncStatusOptions) {
    const updatedStatus = new SyncStatus(status);
    this.currentStatus = updatedStatus;
    this.iterateListeners((l) => l.statusChanged?.(this.currentStatus));
  }

  protected async resolveOfflineSyncStatus(): Promise<void> {
    const result = await powersyncCommand({ GetSyncStatus: this.rustHandle });
    const status = (result as any).SyncStatus as SyncStatusOptions;

    this.updateSyncStatusFromRust(status);
  }

  async _initialize(): Promise<void> {
    const path = await this.resolvePath();
    this.tableUpdateListener = await listen<string[]>(`table-updates:${path}`, (event) => {
      const adapter = this.database;
      if (adapter instanceof RustDatabaseAdapter) {
        adapter.iterateListeners((l) =>
          l.tablesUpdated?.({ tables: event.payload, rawUpdates: [], groupedUpdates: {} })
        );
      }
    });
    this.syncStatusListener = await listen<SyncStatusOptions>(`sync-status:${path}`, (event) => {
      this.updateSyncStatusFromRust(event.payload);
    });

    const result = await powersyncCommand({
      OpenDatabase: {
        name: path,
        schema: this.schema.toJSON()
      }
    });

    this.handle.handle = (result as any).CreatedHandle as number;
    if (this.database instanceof RustDatabaseAdapter) {
      this.database.name = path;
    }
  }

  async close(options?: PowerSyncCloseOptions): Promise<void> {
    this.tableUpdateListener?.();
    this.syncStatusListener?.();

    await super.close(options);
  }
}
