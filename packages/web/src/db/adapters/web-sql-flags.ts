import { SQLOpenOptions } from '@powersync/common';
import { ILogger } from 'js-logger';

/**
 * Common settings used when creating SQL connections on web.
 */
export interface WebSQLFlags {
  /**
   * Broadcast logs from shared workers, such as the shared sync worker,
   * to individual tabs. This defaults to true.
   */
  broadcastLogs?: boolean;

  /**
   * SQLite operations are currently not supported in SSR mode.
   * A warning will be logged if attempting to use SQLite in SSR.
   * Setting this to `true` will disabled the warning above.
   */
  disableSSRWarning?: boolean;

  /**
   * Enables multi tab support
   */
  enableMultiTabs?: boolean;

  /**
   * The SQLite connection is often executed through a web worker
   * in order to offload computation. This can be used to manually
   * disable the use of web workers in environments where web workers
   * might be unstable.
   */
  useWebWorker?: boolean;

  /**
   * Open in SSR placeholder mode. DB operations and Sync operations will be a No-op
   */
  ssrMode?: boolean;
}

export type ResolvedWebSQLFlags = Required<WebSQLFlags>;

export interface ResolvedWebSQLOpenOptions extends SQLOpenOptions {
  flags: ResolvedWebSQLFlags;
  /**
   * Where to store SQLite temporary files. Defaults to 'MEMORY'.
   * Setting this to `FILESYSTEM` can cause issues with larger queries or datasets.
   */
  temporaryStorage: TemporaryStorageOption;

  /**
   * Encryption key for the database.
   * If set, the database will be encrypted using ChaCha20.
   */
  encryptionKey?: string;
}

export enum TemporaryStorageOption {
  MEMORY = 'memory',
  FILESYSTEM = 'file'
}

/**
 * Options for opening a Web SQL connection
 */
export interface WebSQLOpenFactoryOptions extends SQLOpenOptions {
  flags?: WebSQLFlags;

  /**
   * Allows you to override the default wasqlite db worker.
   *
   * You can either provide a path to the worker script
   * or a factory method that returns a worker.
   */
  worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => Worker | SharedWorker);

  logger?: ILogger;
  /**
   * Where to store SQLite temporary files. Defaults to 'MEMORY'.
   * Setting this to `FILESYSTEM` can cause issues with larger queries or datasets.
   */
  temporaryStorage?: TemporaryStorageOption;

  /**
   * Encryption key for the database.
   * If set, the database will be encrypted using ChaCha20.
   */
  encryptionKey?: string;
}

export function isServerSide() {
  return typeof window == 'undefined';
}

export const DEFAULT_WEB_SQL_FLAGS: ResolvedWebSQLFlags = {
  broadcastLogs: true,
  disableSSRWarning: false,
  ssrMode: isServerSide(),
  /**
   * Multiple tabs are by default not supported on Android, iOS and Safari.
   * Other platforms will have multiple tabs enabled by default.
   */
  enableMultiTabs:
    typeof globalThis.navigator !== 'undefined' && // For SSR purposes
    typeof SharedWorker !== 'undefined' &&
    !navigator.userAgent.match(/(Android|iPhone|iPod|iPad)/i) &&
    !(window as any).safari,
  useWebWorker: true
};

export function resolveWebSQLFlags(flags?: WebSQLFlags): ResolvedWebSQLFlags {
  const resolvedFlags = {
    ...DEFAULT_WEB_SQL_FLAGS,
    ...(flags ?? {})
  };
  if (typeof flags?.enableMultiTabs != 'undefined') {
    resolvedFlags.enableMultiTabs = flags.enableMultiTabs;
  }
  if (flags?.useWebWorker === false) {
    resolvedFlags.enableMultiTabs = false;
  }
  return resolvedFlags;
}
