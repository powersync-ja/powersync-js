import { DBAdapter } from '@powersync/common';
import * as Comlink from 'comlink';
import { openWorkerDatabasePort, resolveWorkerDatabasePortFactory } from '../../../worker/db/open-worker-database';
import { AbstractWebSQLOpenFactory } from '../AbstractWebSQLOpenFactory';
import { OpenAsyncDatabaseConnection } from '../AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter } from '../LockedAsyncDatabaseAdapter';
import { WebSQLOpenFactoryOptions } from '../web-sql-flags';
import { WorkerLockedAsyncDatabaseAdapter } from '../WorkerLockedAsyncDatabaseAdapter';
import { WASqliteConnection, WASQLiteOpenOptions, WASQLiteVFS } from './WASQLiteConnection';

export interface WASQLiteOpenFactoryOptions extends WebSQLOpenFactoryOptions {
  vfs?: WASQLiteVFS;
}

/**
 * Opens a SQLite connection using WA-SQLite.
 */
export class WASQLiteOpenFactory extends AbstractWebSQLOpenFactory {
  constructor(options: WASQLiteOpenFactoryOptions) {
    super(options);
  }

  get waOptions(): WASQLiteOpenFactoryOptions {
    // Cast to extended type
    return this.options;
  }

  protected openAdapter(): DBAdapter {
    const { enableMultiTabs, useWebWorker } = this.resolvedFlags;
    if (!enableMultiTabs) {
      this.logger.warn('Multiple tabs are not enabled in this browser');
    }

    let adapter: DBAdapter;

    if (useWebWorker) {
      const optionsDbWorker = this.options.worker;

      const messagePort =
        typeof optionsDbWorker == 'function'
          ? resolveWorkerDatabasePortFactory(() =>
              optionsDbWorker({
                ...this.options,
                flags: this.resolvedFlags
              })
            )
          : openWorkerDatabasePort(this.options.dbFilename, enableMultiTabs, optionsDbWorker, this.waOptions.vfs);

      const workerDBOpener = Comlink.wrap<OpenAsyncDatabaseConnection<WASQLiteOpenOptions>>(messagePort);

      const workerAdapter = new WorkerLockedAsyncDatabaseAdapter({
        messagePort,
        openConnection: () =>
          workerDBOpener({
            dbFilename: this.options.dbFilename,
            vfs: this.waOptions.vfs,
            flags: this.resolvedFlags
          }),
        name: this.options.dbFilename,
        debugMode: this.options.debugMode,
        logger: this.logger
      });
      workerAdapter.init();
      adapter = workerAdapter;
    } else {
      // Don't use a web worker
      const contextAdapter = new LockedAsyncDatabaseAdapter({
        openConnection: async () =>
          new WASqliteConnection({
            dbFilename: this.options.dbFilename,
            dbLocation: this.options.dbLocation,
            debugMode: this.options.debugMode,
            vfs: this.waOptions.vfs,
            flags: this.resolvedFlags
          }),
        name: this.options.dbFilename,
        debugMode: this.options.debugMode,
        logger: this.logger
      });
      contextAdapter.init();
      adapter = contextAdapter;
    }

    return adapter;
  }
}
