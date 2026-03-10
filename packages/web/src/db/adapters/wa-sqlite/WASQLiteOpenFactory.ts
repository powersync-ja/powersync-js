import { createLogger, DBAdapter, ILogger, SQLOpenFactory, type ILogLevel } from '@powersync/common';
import * as Comlink from 'comlink';
import { openWorkerDatabasePort, resolveWorkerDatabasePortFactory } from '../../../worker/db/open-worker-database.js';
import { AsyncDatabaseConnection, OpenAsyncDatabaseConnection } from '../AsyncDatabaseConnection.js';
import { WorkerWrappedAsyncDatabaseConnection } from '../WorkerWrappedAsyncDatabaseConnection.js';
import {
  DEFAULT_CACHE_SIZE_KB,
  isServerSide,
  ResolvedWebSQLFlags,
  ResolvedWebSQLOpenOptions,
  resolveWebSQLFlags,
  TemporaryStorageOption,
  WebSQLOpenFactoryOptions
} from '../web-sql-flags.js';
import { InternalWASQLiteDBAdapter } from './InternalWASQLiteDBAdapter.js';
import { WASqliteConnection } from './WASQLiteConnection.js';
import { SSRDBAdapter } from '../SSRDBAdapter.js';
import { WASQLiteVFS } from './vfs.js';

export interface WASQLiteOpenFactoryOptions extends WebSQLOpenFactoryOptions {
  vfs?: WASQLiteVFS;
}

export interface ResolvedWASQLiteOpenFactoryOptions extends ResolvedWebSQLOpenOptions {
  vfs: WASQLiteVFS;
}

export interface WorkerDBOpenerOptions extends ResolvedWASQLiteOpenFactoryOptions {
  logLevel: ILogLevel;
  /**
   * A lock that is currently held by the client. When the lock is returned, we know the client is gone and that we need
   * to clean up resources.
   */
  lockName: string;
}

/**
 * Opens a SQLite connection using WA-SQLite.
 */
export class WASQLiteOpenFactory implements SQLOpenFactory {
  private resolvedFlags: ResolvedWebSQLFlags;
  private logger: ILogger;

  constructor(private options: WASQLiteOpenFactoryOptions) {
    assertValidWASQLiteOpenFactoryOptions(options);
    this.resolvedFlags = resolveWebSQLFlags(options.flags);
    this.logger = options.logger ?? createLogger(`WASQLiteOpenFactory - ${this.options.dbFilename}`);
  }

  get waOptions(): WASQLiteOpenFactoryOptions {
    // Cast to extended type
    return this.options;
  }

  protected openAdapter(): DBAdapter {
    return new InternalWASQLiteDBAdapter({
      name: this.options.dbFilename,
      openConnection: () => this.openConnection(),
      debugMode: this.options.debugMode,
      logger: this.logger
    });
  }

  openDB(): DBAdapter {
    const {
      resolvedFlags: { disableSSRWarning, enableMultiTabs, ssrMode = isServerSide() }
    } = this;
    if (ssrMode && !disableSSRWarning) {
      this.logger.warn(
        `
      Running PowerSync in SSR mode.
      Only empty query results will be returned.
      Disable this warning by setting 'disableSSRWarning: true' in options.`
      );
    }

    if (!enableMultiTabs) {
      this.logger.warn(
        'Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.'
      );
    }

    if (ssrMode) {
      return new SSRDBAdapter();
    }

    return this.openAdapter();
  }

  async openConnection(): Promise<AsyncDatabaseConnection> {
    const { enableMultiTabs, useWebWorker } = this.resolvedFlags;
    const {
      vfs = WASQLiteVFS.IDBBatchAtomicVFS,
      temporaryStorage = TemporaryStorageOption.MEMORY,
      cacheSizeKb = DEFAULT_CACHE_SIZE_KB,
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
                cacheSizeKb,
                flags: this.resolvedFlags,
                encryptionKey
              })
            )
          : openWorkerDatabasePort(this.options.dbFilename, enableMultiTabs, optionsDbWorker, this.waOptions.vfs);

      const workerDBOpener = Comlink.wrap<OpenAsyncDatabaseConnection<WorkerDBOpenerOptions>>(workerPort);

      return new WorkerWrappedAsyncDatabaseConnection({
        remote: workerDBOpener,
        // This tab owns the worker, so we're guaranteed to outlive it.
        remoteCanCloseUnexpectedly: false,
        baseConnection: await workerDBOpener({
          dbFilename: this.options.dbFilename,
          vfs,
          temporaryStorage,
          cacheSizeKb,
          flags: this.resolvedFlags,
          encryptionKey: encryptionKey,
          logLevel: this.logger.getLevel()
        }),
        identifier: this.options.dbFilename,
        onClose: () => {
          if (workerPort instanceof Worker) {
            workerPort.terminate();
          } else {
            workerPort.close();
          }
        }
      });
    } else {
      // Don't use a web worker
      return new WASqliteConnection({
        dbFilename: this.options.dbFilename,
        dbLocation: this.options.dbLocation,
        debugMode: this.options.debugMode,
        vfs,
        temporaryStorage,
        cacheSizeKb,
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
