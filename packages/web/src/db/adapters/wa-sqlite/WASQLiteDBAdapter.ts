import { type PowerSyncOpenFactoryOptions } from '@powersync/common';
import * as Comlink from 'comlink';
import { resolveWebPowerSyncFlags } from '../../PowerSyncDatabase';
import { OpenAsyncDatabaseConnection } from '../AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter } from '../LockedAsyncDatabaseAdapter';
import { ResolvedWebSQLOpenOptions, TemporaryStorageOption, WebSQLFlags } from '../web-sql-flags';
import { WorkerWrappedAsyncDatabaseConnection } from '../WorkerWrappedAsyncDatabaseConnection';
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
  temporaryStorage?: TemporaryStorageOption;

  /**
   * Encryption key for the database.
   * If set, the database will be encrypted using multiple-ciphers.
   */
  encryptionKey?: string;
}

/**
 * Adapter for WA-SQLite SQLite connections.
 */
export class WASQLiteDBAdapter extends LockedAsyncDatabaseAdapter {
  constructor(options: WASQLiteDBAdapterOptions) {
    super({
      name: options.dbFilename,
      openConnection: async () => {
        const { workerPort, temporaryStorage } = options;
        if (workerPort) {
          const remote = Comlink.wrap<OpenAsyncDatabaseConnection>(workerPort);
          return new WorkerWrappedAsyncDatabaseConnection({
            remote,
            identifier: options.dbFilename,
            baseConnection: await remote({
              ...options,
              temporaryStorage: temporaryStorage ?? TemporaryStorageOption.MEMORY,
              flags: resolveWebPowerSyncFlags(options.flags),
              encryptionKey: options.encryptionKey
            })
          });
        }
        const openFactory = new WASQLiteOpenFactory({
          dbFilename: options.dbFilename,
          dbLocation: options.dbLocation,
          debugMode: options.debugMode,
          flags: options.flags,
          temporaryStorage,
          logger: options.logger,
          vfs: options.vfs,
          encryptionKey: options.encryptionKey,
          worker: options.worker
        });
        return openFactory.openConnection();
      },
      debugMode: options.debugMode,
      logger: options.logger
    });
  }
}
