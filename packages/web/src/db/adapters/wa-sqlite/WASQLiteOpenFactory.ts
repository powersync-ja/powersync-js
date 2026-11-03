import { DBAdapter, LogLevels, PowerSyncLogger, SQLOpenFactory } from '@powersync/common';
import * as Comlink from 'comlink';
import { ResolvedWebSQLOpenOptions, WebSQLOpenOptions } from '../options.js';
import { SSRDBAdapter } from '../SSRDBAdapter.js';
import { vfsRequiresDedicatedWorkers, WASQLiteVFS } from './vfs.js';
import { MultiDatabaseServer } from '../../../worker/db/MultiDatabaseServer.js';
import { DatabaseClient, OpenWorkerConnection, SharedFeatureDetectionResult } from './DatabaseClient.js';
import { generateTabCloseSignal } from '../../../shared/locks.js';
import { AsyncDbAdapter, PoolConnection } from '../AsyncWebAdapter.js';
import { RawWaSqliteDatabaseOptions, SimpleOpfsMode } from './RawSqliteConnection.js';
import { maxPathNameLength, resolveAndValidateOptions } from '../resolveAndValidateOptions.js';
import { connectToExistingWorker, connectToWorker, isSharedWorker, WorkerConnection } from '../../../worker/client.js';

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

    // Account for the fact that SQLite might append -journal suffixes
    const maxLength = maxPathNameLength - 16;
    if (this.options.dbFilename.length > maxLength) {
      throw new Error(`dbFilename too long (max length is ${maxLength})`);
    }

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
    const { enableMultiTabs, useWebWorker, vfs } = this.options;

    if (!enableMultiTabs) {
      this.logger.log({ level: LogLevels.warn, message: 'Multiple tabs are not enabled in this browser' });
    }

    if (!useWebWorker) {
      return { writer: await this.#openInCurrentContext(), additionalReaders: [] };
    }

    switch (vfs) {
      case 'auto':
        return { writer: await this.#openSimpleOpfs(true), additionalReaders: [] };
      case WASQLiteVFS.SimpleOpfsVFS:
        return { writer: await this.#openSimpleOpfs(false), additionalReaders: [] };
      case WASQLiteVFS.OPFSWriteAheadVFS: {
        // This VFS supports concurrent reads, so we can open additional workers to host read-only connections for
        // concurrent reads / writes.
        const writer = await this.#openInWorker({ vfs, readonly: false });
        const additionalReadersCount = this.options.additionalReaders ?? 1;
        const additionalReaders = await Promise.all(
          Array.from({ length: additionalReadersCount }, () => this.#openInWorker({ vfs, readonly: true }))
        );
        return { writer, additionalReaders };
      }
      default:
        return { writer: await this.#openInWorker({ vfs, readonly: false }), additionalReaders: [] };
    }
  }

  /**
   * Opens a {@link WASQLiteVFS.SimpleOpfsVFS} database, or picks the best available storage for the `'auto'` VFS
   * option if `fallbackToMemory` is set.
   *
   * This VFS has three different modes (shared workers, readwrite-unsafe, re-open fallback), see the doc comment on it.
   * We start a feature detection to check what the current browser supports. In order of preference, we use:
   *
   *  1. {@link WASQLiteVFS.SimpleOpfsVFS} through a shared worker spawning a nested dedicated worker.
   *  2. {@link WASQLiteVFS.SimpleOpfsVFS} in a dedicated worker.
   *  3. {@link WASQLiteVFS.InMemoryVfs} in a shared worker (only with `fallbackToMemory`).
   *  4. {@link WASQLiteVFS.InMemoryVfs} in a dedicated worker (only with `fallbackToMemory`).
   */
  async #openSimpleOpfs(fallbackToMemory: boolean): Promise<DatabaseClient> {
    const shared = this.options.enableMultiTabs ? await this.#openSharedWorker() : null;
    let nested: Comlink.Remote<OpenWorkerConnection> | null = null;
    let dedicated: OpenedWorker | null = null;
    // The worker hosting the opened database, which is then owned by the returned client. We close all other workers.
    let used: OpenedWorker | null = null;

    const connect = async (worker: OpenedWorker, options: ResolvedDatabaseOptions) => {
      const client = await this.#connect(worker, options);
      used = worker;
      return client;
    };
    const connectInMemory = (worker: OpenedWorker) => {
      this.logger.log({ level: LogLevels.warn, message: 'Falling back to in-memory because OPFS is unavailable.' });
      return connect(worker, { vfs: WASQLiteVFS.InMemoryVfs, readonly: false });
    };

    try {
      if (shared) {
        const features = await this.#detectNestedFeatures(shared);
        if (features?.worker) {
          if (features.worker.opfs) {
            // Shared workers can open dedicated workers. Perfect, we'll have the shared worker spawn a nested worker
            // and connect to that.
            nested = Comlink.wrap<OpenWorkerConnection>(await shared.source.spawnNested());
            return await connect(
              { source: nested, connection: shared.connection },
              { vfs: WASQLiteVFS.SimpleOpfsVFS, readonly: false, simpleMode: 'shared' }
            );
          } else if (fallbackToMemory) {
            // The nested worker doesn't have OPFS access, so a dedicated worker started by us won't have that either.
            return await connectInMemory(shared);
          }
        }
      }

      // We'll have to use a dedicated worker directly.
      dedicated = this.#openWorker(false);
      const features = await dedicated.source.dedicatedFeatureDetection();
      if (features.opfs || !fallbackToMemory) {
        // See if we can at least use readwrite-unsafe, as that is more efficient than the fallback of closing and
        // re-opening files on contention.
        const simpleMode =
          (this.options.simpleMode as SimpleOpfsMode | undefined) ?? (features.openWithMode ? 'rw-unsafe' : 'fallback');

        return await connect(dedicated, { vfs: WASQLiteVFS.SimpleOpfsVFS, readonly: false, simpleMode });
      }

      return await connectInMemory(shared ?? dedicated);
    } finally {
      const usedWorker = used as OpenedWorker | null;
      if (nested && usedWorker?.source !== nested) nested[Comlink.releaseProxy]();
      if (shared && usedWorker?.connection !== shared.connection) closeWorker(shared);
      if (dedicated && usedWorker !== dedicated) closeWorker(dedicated);
    }
  }

  /** Asks a shared worker whether it can spawn nested workers with OPFS access, or returns null if that fails. */
  async #detectNestedFeatures(shared: OpenedWorker): Promise<SharedFeatureDetectionResult | null> {
    try {
      return await shared.source.sharedFeatureDetection();
    } catch (error) {
      this.logger.log({ level: LogLevels.error, error, message: 'Could not detect features of shared worker' });
      return null;
    }
  }

  /**
   * Opens a database with a VFS that doesn't need feature detection, using a shared worker when the VFS and options
   * allow that.
   */
  async #openInWorker(options: ResolvedDatabaseOptions): Promise<DatabaseClient> {
    const useShared = !vfsRequiresDedicatedWorkers(options.vfs) && this.options.enableMultiTabs;
    return this.#connect(this.#openWorker(useShared), options);
  }

  /**
   * Don't use a web worker. Instead, open the MultiDatabaseServer a worker would use locally.
   *
   * Without workers, the only storage the `'auto'` option can pick is an in-memory database.
   */
  async #openInCurrentContext(): Promise<DatabaseClient> {
    let vfs = this.options.vfs;
    if (vfs == 'auto') {
      this.logger.log({ level: LogLevels.warn, message: 'Using in-memory database because web workers are disabled.' });
      vfs = WASQLiteVFS.InMemoryVfs;
    }
    const localServer = new MultiDatabaseServer(this.logger);
    const connection = await localServer.openConnectionLocally(
      this.logger,
      this.#resolveRawWaSqliteDatabaseOptions({ vfs, readonly: false })
    );

    return new DatabaseClient(
      { connection, source: null, remoteCanCloseUnexpectedly: false },
      { ...this.options, vfs, requiresPersistentTriggers: true }
    );
  }

  async #connect(worker: OpenedWorker, options: ResolvedDatabaseOptions): Promise<DatabaseClient> {
    const { source, connection: workerConnection } = worker;
    const closeSignal = new AbortController();
    const connection = await source.connect({
      database: this.#resolveRawWaSqliteDatabaseOptions(options),
      logLevel: this.options.databaseWorkerLogLevel,
      lockName: await generateTabCloseSignal(closeSignal.signal)
    });

    return new DatabaseClient(
      {
        connection,
        source,
        // This tab owns the worker, so we're guaranteed to outlive it.
        remoteCanCloseUnexpectedly: false,
        onClose: () => {
          closeSignal.abort();
          workerConnection.close();
        }
      },
      {
        ...this.options,
        vfs: options.vfs,
        requiresPersistentTriggers: vfsRequiresDedicatedWorkers(options.vfs)
      }
    );
  }

  async #openSharedWorker(): Promise<OpenedWorker | null> {
    const shared = this.#openWorker(true);
    if (!isSharedWorker(shared.connection.worker)) {
      // A custom worker factory might not respect the `shared` option, and dedicated workers can't share the
      // database across tabs. Fall back to the modes relying on navigator locks.
      closeWorker(shared);
      return null;
    }

    return shared;
  }

  #openWorker(shared: boolean): OpenedWorker {
    const optionsDbWorker = this.options.worker;
    let connection: WorkerConnection;

    if (typeof optionsDbWorker == 'function') {
      const worker = optionsDbWorker({ ...this.options, shared });
      connection = connectToExistingWorker(worker, this.logger, 'database');
    } else {
      connection = connectToWorker({
        service: 'database',
        databaseIdentifier: this.options.dbFilename,
        shared: shared,
        customWorker: optionsDbWorker,
        loggerForErrors: this.logger
      });
    }

    return { connection, source: Comlink.wrap<OpenWorkerConnection>(connection.endpoint) };
  }

  #resolveRawWaSqliteDatabaseOptions({
    vfs,
    readonly,
    simpleMode
  }: ResolvedDatabaseOptions): RawWaSqliteDatabaseOptions {
    const {
      dbFilename,
      encryptionKey,
      temporaryStorage,
      cacheSizeKb,
      preparedStatementsCache,
      additionalInitializationFunctions,
      storageBucket
    } = this.options;

    return {
      filename: dbFilename,
      readonly,
      vfs,
      encryptionKey,
      temporaryStorage,
      cacheSizeKb,
      // TODO: Enable prepared statement cache by default?
      preparedStatementsCache: preparedStatementsCache ?? 0,
      additionalInitializationFunctions,
      storageBucket,
      simpleMode
    };
  }
}

/**
 * Options for a database connection after the `'auto'` VFS option and the {@link SimpleOpfsMode} have been
 * resolved.
 */
interface ResolvedDatabaseOptions {
  vfs: WASQLiteVFS;
  readonly: boolean;
  simpleMode?: SimpleOpfsMode;
}

/**
 * A worker we're connected to, but haven't necessarily opened a database in yet.
 */
interface OpenedWorker {
  connection: WorkerConnection;
  source: Comlink.Remote<OpenWorkerConnection>;
}

function closeWorker(worker: OpenedWorker) {
  worker.source[Comlink.releaseProxy]();
  worker.connection.close();
}
