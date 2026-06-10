import { LogLevels, SQLOpenOptions } from '@powersync/common';
import { WASQLiteVFS } from './wa-sqlite/vfs.js';

export interface WebSpecificOpenOptions {
  /**
   * SQLite operations are currently not supported in SSR mode.
   * A warning will be logged if attempting to use SQLite in SSR.
   * Setting this to `true` will disabled the warning above.
   */
  disableSSRWarning: boolean;

  /**
   * Enables multi tab support.
   *
   * Enabling multi-tab support will transparently make PowerSync manage the sync process in a shared worker collecting
   * Sync Streams across tabs. Additionally, it enables a shared worker for IndexedDB databases.
   *
   * It is still valid to open multiple tabs when this option is disabled, but the experience may be degrated as only
   * one tab can sync at the time.
   *
   * This is enabled by default on Desktop browsers if shared workers are enabled, except for Safari.
   */
  enableMultiTabs: boolean;

  /**
   * The SQLite connection is often executed through a web worker in order to offload computation and because some file
   * system implementations (notably those based on web filesystem APIs like OPFS) are only available in workers.
   *
   * Manually disabling the use of web workers is not recommended, but can be useful for testing or for environments
   * or toolchains where web workers are not supported.
   */
  useWebWorker: boolean;

  /**
   * Open in SSR placeholder mode. DB operations and Sync operations will be a No-op
   */
  ssrMode: boolean;

  /**
   * The log level for database workers.
   *
   * Defaults to {@link LogLevels.info}.
   */
  databaseWorkerLogLevel: number;

  /**
   * Where to store SQLite temporary files. Defaults to 'MEMORY'.
   * Setting this to `FILESYSTEM` can cause issues with larger queries or datasets.
   */
  temporaryStorage: TemporaryStorageOption;

  /**
   * Maximum SQLite cache size. Defaults to 50MB.
   *
   * For details, see: https://www.sqlite.org/pragma.html#pragma_cache_size
   */
  cacheSizeKb: number;

  /**
   * Encryption key for the database.
   * If set, the database will be encrypted using ChaCha20.
   */
  encryptionKey: string | undefined;

  vfs: WASQLiteVFS;

  /**
   * If the {@link vfs} supports it, an additional amount of read-only connections to open. Using additional read
   * connections can speed up queries by dispatching them to multiple workers running them concurrently.
   *
   * {@link WASQLiteVFS.OPFSWriteAheadVFS} is the only VFS with support for multiple connections, so this option is
   * ignored for other VFS implementations.
   *
   * Defaults to 1.
   */
  additionalReaders: number;

  /**
   * Allows you to override the default wasqlite db worker.
   *
   * You can either provide a path to the worker script
   * or a factory method that returns a worker.
   */
  worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => Worker | SharedWorker);

  /**
   * Use an existing port to an initialized worker.
   * A worker will be initialized if none is provided
   */
  workerPort?: MessagePort | undefined;
}

export interface ResolvedWebSQLOpenOptions extends SQLOpenOptions, WebSpecificOpenOptions {}

export interface WebSQLOpenOptions extends SQLOpenOptions, Partial<WebSpecificOpenOptions> {}

export enum TemporaryStorageOption {
  MEMORY = 'memory',
  FILESYSTEM = 'file'
}
