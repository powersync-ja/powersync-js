import { type ILogLevel, DBAdapter } from '@powersync/common';
import * as Comlink from 'comlink';
import { openWorkerDatabasePort, resolveWorkerDatabasePortFactory } from '../../../worker/db/open-worker-database';
import { AbstractWebSQLOpenFactory } from '../AbstractWebSQLOpenFactory';
import { AsyncDatabaseConnection, OpenAsyncDatabaseConnection } from '../AsyncDatabaseConnection';
import { LockedAsyncDatabaseAdapter } from '../LockedAsyncDatabaseAdapter';
import {
  DEFAULT_CACHE_SIZE_KB,
  ResolvedWebSQLOpenOptions,
  TemporaryStorageOption,
  WebSQLOpenFactoryOptions
} from '../web-sql-flags';
import { WorkerWrappedAsyncDatabaseConnection } from '../WorkerWrappedAsyncDatabaseConnection';
import { WASqliteConnection, WASQLiteVFS } from './WASQLiteConnection';

export interface WASQLiteOpenFactoryOptions extends WebSQLOpenFactoryOptions {
  vfs?: WASQLiteVFS;
}

export interface ResolvedWASQLiteOpenFactoryOptions extends ResolvedWebSQLOpenOptions {
  vfs: WASQLiteVFS;
}

export interface WorkerDBOpenerOptions extends ResolvedWASQLiteOpenFactoryOptions {
  logLevel: ILogLevel;
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
      cacheSizeKb = DEFAULT_CACHE_SIZE_KB,
      encryptionKey
    } = this.waOptions;
    const shouldForceCloseOnPagehide =
      vfs === WASQLiteVFS.OPFSCoopSyncVFS || vfs === WASQLiteVFS.AccessHandlePoolVFS;

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

      let pagehideHandler: ((event: PageTransitionEvent) => void) | null = null;
      let pagehideTriggered = false;
      let wrapped: WorkerWrappedAsyncDatabaseConnection<WorkerDBOpenerOptions> | null = null;
      const terminateWorker = () => {
        if (workerPort instanceof Worker) {
          workerPort.terminate();
        } else {
          workerPort.close();
        }
      };
      const cleanupPagehide = () => {
        if (pagehideHandler && typeof window !== 'undefined') {
          window.removeEventListener('pagehide', pagehideHandler);
          pagehideHandler = null;
        }
      };

      if (shouldForceCloseOnPagehide && workerPort instanceof Worker && typeof window !== 'undefined') {
        // Register early so refresh/navigation during open still releases OPFS locks.
        pagehideHandler = (_event: PageTransitionEvent) => {
          if (pagehideTriggered) {
            return;
          }
          pagehideTriggered = true;
          if (wrapped) {
            wrapped.forceClose();
            return;
          }
          // Defer termination until open completes so OPFS locks can be released.
        };
        window.addEventListener('pagehide', pagehideHandler);
      }

      let baseConnection: AsyncDatabaseConnection;
      try {
        baseConnection = await workerDBOpener({
          dbFilename: this.options.dbFilename,
          vfs,
          temporaryStorage,
          cacheSizeKb,
          flags: this.resolvedFlags,
          encryptionKey: encryptionKey,
          logLevel: this.logger.getLevel()
        });
      } catch (error) {
        cleanupPagehide();
        terminateWorker();
        throw error;
      }

      const connection = new WorkerWrappedAsyncDatabaseConnection<WorkerDBOpenerOptions>({
        remote: workerDBOpener,
        // This tab owns the worker, so we're guaranteed to outlive it.
        remoteCanCloseUnexpectedly: false,
        baseConnection,
        identifier: this.options.dbFilename,
        onClose: () => {
          cleanupPagehide();
          terminateWorker();
        }
      });
      wrapped = connection;

      if (pagehideTriggered) {
        connection.forceClose();
      }

      return connection;
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
