import {
  AbstractPowerSyncDatabase,
  BucketStorageAdapter,
  CreateSyncImplementationOptions,
  DBAdapter,
  PowerSyncBackendConnector,
  PowerSyncDatabaseOptionsWithSettings,
  RequiredAdditionalConnectionOptions,
  SQLOpenOptions,
  StreamingSyncImplementation
} from '@powersync/common';
import { LateHandle, RustDatabaseAdapter } from './pool';
import { powersyncCommand } from './command';

/**
 * A PowerSync database backed by a Rust-owned structure for Tauri apps.
 */
export class PowerSyncTauriDatabase extends AbstractPowerSyncDatabase {
  #handle: LateHandle = { handle: -1 };

  get #name(): string {
    return (this.options.database as SQLOpenOptions).dbFilename;
  }

  protected openDBAdapter(options: PowerSyncDatabaseOptionsWithSettings): DBAdapter {
    return new RustDatabaseAdapter(this.#name, this.#handle);
  }

  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: CreateSyncImplementationOptions & RequiredAdditionalConnectionOptions
  ): StreamingSyncImplementation {
    throw new Error('Method not implemented.');
  }

  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    throw new Error('generateBucketStorageAdapter() is not supported in Tauri because sync is implemented in Rust.');
  }

  updateSchema(): Promise<void> {
    // To support this, we need to support reloading schemas. Also, we need to forward the serialized schema to the
    // native database instance so that raw tables are passed to the sync client correctly. This is not just a matter of
    // calling powersync_replace_schema.
    throw new Error('updateSchema() is not yet supported on the PowerSync Tauri SDK.');
  }

  async _initialize(): Promise<void> {
    const result = await powersyncCommand({
      OpenDatabase: {
        name: this.#name,
        schema: this.schema.toJSON()
      }
    });

    this.#handle.handle = (result as any).CreatedHandle as number;
  }
}
