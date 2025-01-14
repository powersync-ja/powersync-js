import { DBAdapter } from '@powersync/common';
import * as Comlink from 'comlink';
import { openWorkerDatabasePort, resolveWorkerDatabasePortFactory } from '../../../worker/db/open-worker-database';
import { AbstractWebSQLOpenFactory } from '../AbstractWebSQLOpenFactory';
import { AsyncDatabaseConnection, OpenAsyncDatabaseConnection } from '../AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter } from '../LockedAsyncDatabaseAdapter';
import { ResolvedWebSQLOpenOptions, TemporaryStorageOption, WebSQLOpenFactoryOptions } from '../web-sql-flags';
import { WorkerWrappedAsyncDatabaseConnection } from '../WorkerWrappedAsyncDatabaseConnection';
import { WASqliteConnection, WASQLiteVFS } from './WASQLiteConnection';

export interface WASQLiteOpenFactoryOptions extends WebSQLOpenFactoryOptions {
  vfs?: WASQLiteVFS;
}

export interface ResolvedWASQLiteOpenFactoryOptions extends ResolvedWebSQLOpenOptions {
  vfs: WASQLiteVFS;
}
/**
 * Opens a SQLite connection using WA-SQLite.
 */
export class WASQLiteOpenFactory extends AbstractWebSQLOpenFactory {
  constructor(options: WASQLiteOpenFactoryOptions) {
    super(options);

    assertValidWASQLiteOpenFactoryOptions(options);
  }

  get waOptions(): WASQLiteOpenFactoryOptions {
    // Cast to extended type
    return this.options;
  }

  protected openAdapter(): DBAdapter {
    return new LockedAsyncDatabaseAdapter({
      name: this.options.dbFilename,
      openConnection: () => this.openConnection(),
      debugMode: this.options.debugMode,
      logger: this.logger
    });
  }

  async openConnection(): Promise<AsyncDatabaseConnection> {
    const { enableMultiTabs, useWebWorker } = this.resolvedFlags;
    const {
      vfs = WASQLiteVFS.IDBBatchAtomicVFS,
      temporaryStorage = TemporaryStorageOption.MEMORY,
      encryptionKey
    } = this.waOptions;

    if (!enableMultiTabs) {
      this.logger.warn('Multiple tabs are not enabled in this browser');
    }

    if (useWebWorker) {
      const optionsDbWorker = this.options.worker;

      const workerPort =
        typeof optionsDbWorker == 'function'
          ? resolveWorkerDatabasePortFactory(() =>
              optionsDbWorker({
                ...this.options,
                temporaryStorage,
                flags: this.resolvedFlags,
                encryptionKey
              })
            )
          : openWorkerDatabasePort(this.options.dbFilename, enableMultiTabs, optionsDbWorker, this.waOptions.vfs);

      const workerDBOpener = Comlink.wrap<OpenAsyncDatabaseConnection<ResolvedWASQLiteOpenFactoryOptions>>(workerPort);

      return new WorkerWrappedAsyncDatabaseConnection({
        remote: workerDBOpener,
        baseConnection: await workerDBOpener({
          dbFilename: this.options.dbFilename,
          vfs,
          temporaryStorage,
          flags: this.resolvedFlags,
          encryptionKey: encryptionKey
        }),
        identifier: this.options.dbFilename
      });
    } else {
      // Don't use a web worker
      return new WASqliteConnection({
        dbFilename: this.options.dbFilename,
        dbLocation: this.options.dbLocation,
        debugMode: this.options.debugMode,
        vfs,
        temporaryStorage,
        flags: this.resolvedFlags,
        encryptionKey: encryptionKey
      });
    }
  }
}

/**
 * Asserts that the factory options are valid.
 */
function assertValidWASQLiteOpenFactoryOptions(options: WASQLiteOpenFactoryOptions): void {
  // The OPFS VFS only works in dedicated web workers.
  if ('vfs' in options && 'flags' in options) {
    const { vfs, flags = {} } = options;
    if (vfs !== WASQLiteVFS.IDBBatchAtomicVFS && 'useWebWorker' in flags && !flags.useWebWorker) {
      throw new Error(
        `Invalid configuration: The 'useWebWorker' flag must be true when using an OPFS-based VFS (${vfs}).`
      );
    }
  }
}
