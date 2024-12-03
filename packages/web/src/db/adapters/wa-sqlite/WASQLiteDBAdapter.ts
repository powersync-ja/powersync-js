import { type PowerSyncOpenFactoryOptions } from '@powersync/common';
import * as Comlink from 'comlink';
import { OpenAsyncDatabaseConnection } from '../AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter } from '../LockedAsyncDatabaseAdapter';
import { ResolvedWebSQLOpenOptions, WebSQLFlags } from '../web-sql-flags';
import { WASQLiteVFS } from './WASQLiteConnection';
import { WASQLiteOpenFactory } from './WASQLiteOpenFactory';

/**
 * These flags are the same as {@link WebSQLFlags}.
 * This export is maintained only for API consistency
 */
export type WASQLiteFlags = WebSQLFlags;

export interface WASQLiteDBAdapterOptions extends Omit<PowerSyncOpenFactoryOptions, 'schema'> {
  flags?: WASQLiteFlags;

  /**
   * Use an existing port to an initialized worker.
   * A worker will be initialized if none is provided
   */
  workerPort?: MessagePort;

  worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => Worker | SharedWorker);

  vfs?: WASQLiteVFS;
}

/**
 * Adapter for WA-SQLite SQLite connections.
 */
export class WASQLiteDBAdapter extends LockedAsyncDatabaseAdapter {
  constructor(options: WASQLiteDBAdapterOptions) {
    super({
      name: options.dbFilename,
      openConnection: async () => {
        const { workerPort } = options;
        if (workerPort) {
          const wrapped = Comlink.wrap<OpenAsyncDatabaseConnection>(workerPort);
          return wrapped(options);
        }
        const openFactory = new WASQLiteOpenFactory({
          dbFilename: options.dbFilename,
          dbLocation: options.dbLocation,
          debugMode: options.debugMode,
          flags: options.flags,
          logger: options.logger,
          vfs: options.vfs,
          worker: options.worker
        });
        return openFactory.openConnection();
      },
      debugMode: options.debugMode,
      logger: options.logger
    });
  }
}
