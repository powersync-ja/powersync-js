import { LockedAsyncDatabaseAdapter } from '../LockedAsyncDatabaseAdapter.js';
import { WebDBAdapterConfiguration } from '../WebDBAdapter.js';
import { needsDedicatedWorker, WASQLiteVFS } from './WASQLiteConnection.js';
import { ResolvedWASQLiteOpenFactoryOptions } from './WASQLiteOpenFactory.js';

/**
 * @internal
 * An intermediary implementation of WASQLiteDBAdapter, which takes the same
 * constructor arguments as {@link LockedAsyncDatabaseAdapter}, but provides some
 * basic WA-SQLite specific functionality.
 * This base class is used to avoid requiring overloading the constructor of {@link WASQLiteDBAdapter}
 */
export class InternalWASQLiteDBAdapter extends LockedAsyncDatabaseAdapter {
  getConfiguration(): WebDBAdapterConfiguration {
    // This is valid since we only handle WASQLite connections
    const baseConfig = super.getConfiguration() as unknown as ResolvedWASQLiteOpenFactoryOptions;
    return {
      ...super.getConfiguration(),
      // If the database is hosted in a dedicated worker, we can't expect in-memory triggers to be shared across tabs
      // (since each tab has its own independent connection).
      requiresPersistentTriggers: needsDedicatedWorker(baseConfig.vfs)
    };
  }
}
