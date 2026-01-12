import { LockedAsyncDatabaseAdapter } from '../LockedAsyncDatabaseAdapter';
import { WebDBAdapterConfiguration } from '../WebDBAdapter';
import { WASQLiteVFS } from './WASQLiteConnection';
import { ResolvedWASQLiteOpenFactoryOptions } from './WASQLiteOpenFactory';

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
      requiresPersistentTriggers:
        baseConfig.vfs == WASQLiteVFS.OPFSCoopSyncVFS || baseConfig.vfs == WASQLiteVFS.AccessHandlePoolVFS
    };
  }
}
