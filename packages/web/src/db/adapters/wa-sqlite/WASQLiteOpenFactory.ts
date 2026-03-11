import { createLogger, DBAdapter, ILogger, SQLOpenFactory, type ILogLevel } from '@powersync/common';
import * as Comlink from 'comlink';
import { openWorkerDatabasePort, resolveWorkerDatabasePortFactory } from '../../../worker/db/open-worker-database.js';
import {
  DEFAULT_CACHE_SIZE_KB,
  isServerSide,
  ResolvedWebSQLFlags,
  ResolvedWebSQLOpenOptions,
  resolveWebSQLFlags,
  TemporaryStorageOption,
  WebSQLOpenFactoryOptions
} from '../web-sql-flags.js';
import { SSRDBAdapter } from '../SSRDBAdapter.js';
import { vfsRequiresDedicatedWorkers, WASQLiteVFS } from './vfs.js';
import { MultiDatabaseServer } from '../../../worker/db/MultiDatabaseServer.js';
import { ClientOptions, DatabaseClient, OpenWorkerConnection } from './DatabaseClient.js';
import { generateTabCloseSignal } from '../../../shared/tab_close_signal.js';
import { AsyncDbAdapter } from '../AsyncWebAdapter.js';

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
    return new AsyncDbAdapter(this.openConnection(), this.options.dbFilename);
  }

  openDB(): DBAdapter {
    const {
      resolvedFlags: { disableSSRWarning, enableMultiTabs, ssrMode = isServerSide() }
    } = this;
    if (ssrMode) {
      if (!disableSSRWarning) {
        this.logger.warn(
          `
      Running PowerSync in SSR mode.
      Only empty query results will be returned.
      Disable this warning by setting 'disableSSRWarning: true' in options.`
        );
      }

      return new SSRDBAdapter();
    }

    if (!enableMultiTabs) {
      this.logger.warn(
        'Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.'
      );
    }

    return this.openAdapter();
  }

  async openConnection(): Promise<DatabaseClient> {
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

    const resolvedOptions: ResolvedWASQLiteOpenFactoryOptions = {
      dbFilename: this.options.dbFilename,
      dbLocation: this.options.dbLocation,
      debugMode: this.options.debugMode,
      vfs,
      temporaryStorage,
      cacheSizeKb,
      flags: this.resolvedFlags,
      encryptionKey: encryptionKey
    };

    let clientOptions: ClientOptions;
    let requiresPersistentTriggers = vfsRequiresDedicatedWorkers(vfs);

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

      const source = Comlink.wrap<OpenWorkerConnection>(workerPort);
      const closeSignal = new AbortController();
      const connection = await source({
        ...resolvedOptions,
        logLevel: this.logger.getLevel(),
        lockName: await generateTabCloseSignal(closeSignal.signal)
      });
      clientOptions = {
        connection,
        source,
        // This tab owns the worker, so we're guaranteed to outlive it.
        remoteCanCloseUnexpectedly: false,
        onClose: () => {
          closeSignal.abort();
          if (workerPort instanceof Worker) {
            workerPort.terminate();
          } else {
            workerPort.close();
          }
        }
      };
    } else {
      // Don't use a web worker. Instead, open the MultiDatabaseServer a worker would use locally.
      const localServer = new MultiDatabaseServer(this.logger);
      requiresPersistentTriggers = true;

      const connection = await localServer.openConnectionLocally(resolvedOptions);
      clientOptions = { connection, source: null, remoteCanCloseUnexpectedly: false };
    }

    return new DatabaseClient(clientOptions, {
      ...resolvedOptions,
      requiresPersistentTriggers
    });
  }
}

/**
 * Asserts that the factory options are valid.
 */
function assertValidWASQLiteOpenFactoryOptions(options: WASQLiteOpenFactoryOptions): void {
  // The OPFS VFS only works in dedicated web workers.
  if ('vfs' in options && 'flags' in options) {
    const { vfs, flags = {} } = options;
    if (vfs && vfsRequiresDedicatedWorkers(vfs) && 'useWebWorker' in flags && !flags.useWebWorker) {
      throw new Error(
        `Invalid configuration: The 'useWebWorker' flag must be true when using an OPFS-based VFS (${vfs}).`
      );
    }
  }
}
