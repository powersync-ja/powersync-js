import { DBAdapter, LogLevels, PowerSyncLogger, SQLOpenFactory } from '@powersync/common';
import * as Comlink from 'comlink';
import { ResolvedWebSQLOpenOptions, WebSQLOpenOptions } from '../options.js';
import { SSRDBAdapter } from '../SSRDBAdapter.js';
import { vfsRequiresDedicatedWorkers, WASQLiteVFS } from './vfs.js';
import { MultiDatabaseServer } from '../../../worker/db/MultiDatabaseServer.js';
import { DatabaseClient, DedicatedFeatureDetectionResult, OpenWorkerConnection } from './DatabaseClient.js';
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
        return { writer: await this.#openAuto(), additionalReaders: [] };
      case WASQLiteVFS.SimpleOpfsVFS:
        return { writer: await this.#openSimpleOpfs(), additionalReaders: [] };
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
   * Picks the best available storage for the `'auto'` VFS option. In order of preference, that is:
   *
   *  1. {@link WASQLiteVFS.SimpleOpfsVFS} through a shared worker spawning a nested dedicated worker.
   *  2. {@link WASQLiteVFS.SimpleOpfsVFS} in a dedicated worker.
   *  3. {@link WASQLiteVFS.InMemoryVfs} in a shared worker.
   *  4. {@link WASQLiteVFS.InMemoryVfs} in a dedicated worker.
   */
  async #openAuto(): Promise<DatabaseClient> {
    const shared = this.options.enableMultiTabs ? await this.#openSharedWorker() : null;
    if (shared) {
      // This doens't close the shared worker if it fails, so we can still use it for an in-memory fallback.
      const client = await this.#tryOpenSimpleOpfsNested(shared);
      if (client) return client;
    }

    const dedicated = this.#openWorker(false);
    const features = await dedicated.source.dedicatedFeatureDetection();
    if (features.opfs) {
      if (shared) closeWorker(shared);
      return this.#openSimpleOpfsDedicated(dedicated, features);
    }

    this.logger.log({ level: LogLevels.debug, message: `Falling back to in-memory because OPFS is unavailable.` });

    if (shared) {
      closeWorker(dedicated);
      return this.#connect(shared, { vfs: WASQLiteVFS.InMemoryVfs, readonly: false });
    }
    return this.#connect(dedicated, { vfs: WASQLiteVFS.InMemoryVfs, readonly: false });
  }

  /**
   * Opens a {@link WASQLiteVFS.SimpleOpfsVFS} database.
   *
   * This VFS has three different modes (shared workers, readwrite-unsafe, re-open fallback), see the doc comment on it.
   * We start a feature detection to check what the current browser supports.
   */
  async #openSimpleOpfs(): Promise<DatabaseClient> {
    if (this.options.enableMultiTabs) {
      const shared = await this.#openSharedWorker();
      if (shared) {
        const client = await this.#tryOpenSimpleOpfsNested(shared);
        if (client) {
          return client;
        } else {
          closeWorker(shared);
        }
      }
    }

    // We'll have to use a dedicated worker directly.
    const dedicated = this.#openWorker(false);
    return this.#openSimpleOpfsDedicated(dedicated, await dedicated.source.dedicatedFeatureDetection());
  }

  /**
   * Attempts to open a {@link WASQLiteVFS.SimpleOpfsVFS} database in a dedicated worker spawned by the shared worker.
   *
   * Returns `null` if the shared worker can't spawn nested workers with OPFS access. The shared worker is not closed in
   * that case.
   */
  async #tryOpenSimpleOpfsNested(shared: OpenedWorker): Promise<DatabaseClient | null> {
    try {
      const sharedFeatures = await shared.source.sharedFeatureDetection();
      if (sharedFeatures.nestedOpfs) {
        // Shared workers can open dedicated workers. Perfect, we'll have the shared worker spawn a nested worker and
        // connect to that.
        const inner = Comlink.wrap<OpenWorkerConnection>(await shared.source.spawnNested());
        return await this.#connect(
          { source: inner, connection: shared.connection },
          { vfs: WASQLiteVFS.SimpleOpfsVFS, readonly: false, simpleMode: 'shared' }
        );
      }
    } catch (error) {
      this.logger.log({ level: LogLevels.error, error, message: 'Could not connect to nested worker' });
    }

    return null;
  }

  #openSimpleOpfsDedicated(
    dedicated: OpenedWorker,
    features: DedicatedFeatureDetectionResult
  ): Promise<DatabaseClient> {
    // See if we can at least use readwrite-unsafe, as that is more efficient than the fallback of closing and
    // re-opening files on contention.
    const simpleMode =
      (this.options.simpleMode as SimpleOpfsMode | undefined) ?? (features.openWithMode ? 'rw-unsafe' : 'fallback');

    return this.#connect(dedicated, { vfs: WASQLiteVFS.SimpleOpfsVFS, readonly: false, simpleMode });
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
    const vfs = this.options.vfs == 'auto' ? WASQLiteVFS.InMemoryVfs : this.options.vfs;
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
