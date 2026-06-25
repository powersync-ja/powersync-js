import { DBAdapter, LogLevels, PowerSyncLogger, SQLOpenFactory } from '@powersync/common';
import * as Comlink from 'comlink';
import { ResolvedWebSQLOpenOptions, WebSQLOpenOptions } from '../options.js';
import { SSRDBAdapter } from '../SSRDBAdapter.js';
import { vfsRequiresDedicatedWorkers, WASQLiteVFS } from './vfs.js';
import { MultiDatabaseServer } from '../../../worker/db/MultiDatabaseServer.js';
import { DatabaseClient, OpenWorkerConnection } from './DatabaseClient.js';
import { generateTabCloseSignal } from '../../../shared/tab_close_signal.js';
import { AsyncDbAdapter, PoolConnection } from '../AsyncWebAdapter.js';
import { RawWaSqliteDatabaseOptions } from './RawSqliteConnection.js';
import { resolveAndValidateOptions } from '../resolveAndValidateOptions.js';
import { connectToExistingWorker, connectToWorker, WorkerConnection } from '../../../worker/client.js';

export interface WASQLiteOpenFactoryOptions {
  open: WebSQLOpenOptions;
  logger: PowerSyncLogger;
}

/**
 * Opens a SQLite connection using WA-SQLite.
 */
export class WASQLiteOpenFactory implements SQLOpenFactory {
  private options: ResolvedWebSQLOpenOptions;
  private logger: PowerSyncLogger;

  constructor(options: WASQLiteOpenFactoryOptions) {
    this.options = resolveAndValidateOptions(options.open);
    this.logger = options.logger;
  }

  protected openAdapter(): DBAdapter {
    return new AsyncDbAdapter(this.openConnection(), this.options.dbFilename);
  }

  openDB(): DBAdapter {
    const { disableSSRWarning, enableMultiTabs, ssrMode } = this.options;

    if (ssrMode) {
      if (!disableSSRWarning) {
        this.logger.log({
          level: LogLevels.warn,
          message: `
      Running PowerSync in SSR mode.
      Only empty query results will be returned.
      Disable this warning by setting 'disableSSRWarning: true' in options.`
        });
      }

      return new SSRDBAdapter();
    }

    if (!enableMultiTabs) {
      this.logger.log({
        level: LogLevels.warn,
        message: 'Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.'
      });
    }

    return this.openAdapter();
  }

  async openConnection(): Promise<PoolConnection> {
    const { enableMultiTabs, useWebWorker, vfs, dbFilename, encryptionKey, temporaryStorage, cacheSizeKb } =
      this.options;

    if (!enableMultiTabs) {
      this.logger.log({ level: LogLevels.warn, message: 'Multiple tabs are not enabled in this browser' });
    }

    let client: DatabaseClient;
    let additionalReaders: DatabaseClient[] = [];
    let requiresPersistentTriggers = vfsRequiresDedicatedWorkers(vfs);

    function resolveRawWaSqliteDatabaseOptions(readonly: boolean): RawWaSqliteDatabaseOptions {
      return {
        filename: dbFilename,
        readonly,
        vfs,
        encryptionKey,
        temporaryStorage,
        cacheSizeKb
      };
    }

    if (useWebWorker) {
      const optionsDbWorker = this.options.worker;

      const openDatabaseWorker = async (readonly: boolean): Promise<DatabaseClient> => {
        let workerConnection: WorkerConnection;
        if (typeof optionsDbWorker == 'function') {
          const worker = optionsDbWorker(this.options);
          workerConnection = connectToExistingWorker(worker, 'database');
        } else {
          const needsDedicated = vfsRequiresDedicatedWorkers(vfs);
          const useShared = !needsDedicated && enableMultiTabs;

          workerConnection = connectToWorker({
            service: 'database',
            databaseIdentifier: this.options.dbFilename,
            shared: useShared,
            customWorker: optionsDbWorker
          });
        }

        const source = Comlink.wrap<OpenWorkerConnection>(workerConnection.endpoint);
        const closeSignal = new AbortController();
        const connection = await source.connect({
          database: resolveRawWaSqliteDatabaseOptions(readonly),
          logLevel: this.options.databaseWorkerLogLevel,
          lockName: await generateTabCloseSignal(closeSignal.signal)
        });
        const clientOptions = {
          connection,
          source,
          // This tab owns the worker, so we're guaranteed to outlive it.
          remoteCanCloseUnexpectedly: false,
          onClose: () => {
            closeSignal.abort();
            workerConnection.close();
          }
        };

        return new DatabaseClient(clientOptions, {
          ...this.options,
          requiresPersistentTriggers
        });
      };

      client = await openDatabaseWorker(false);

      if (vfs == WASQLiteVFS.OPFSWriteAheadVFS) {
        // This VFS supports concurrent reads, so we can open additional workers to host read-only connections for
        // concurrent reads / writes.
        const additionalReadersCount = this.options.additionalReaders ?? 1;
        for (let i = 0; i < additionalReadersCount; i++) {
          const reader = await openDatabaseWorker(true);
          additionalReaders.push(reader);
        }
      }
    } else {
      // Don't use a web worker. Instead, open the MultiDatabaseServer a worker would use locally.
      const localServer = new MultiDatabaseServer(this.logger);
      requiresPersistentTriggers = true;

      const connection = await localServer.openConnectionLocally(this.logger, resolveRawWaSqliteDatabaseOptions(false));
      client = new DatabaseClient(
        { connection, source: null, remoteCanCloseUnexpectedly: false },
        {
          ...this.options,
          requiresPersistentTriggers
        }
      );
    }

    return {
      writer: client,
      additionalReaders
    };
  }
}
