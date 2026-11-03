import { type Worker } from 'node:worker_threads';
import { LockContext, SQLOpenOptions } from '@powersync/common';

/**
 * Signature of a function opening database workers.
 *
 * @public
 */
export type WorkerOpener = (...args: ConstructorParameters<typeof Worker>) => InstanceType<typeof Worker>;

/**
 * Use the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) package as a SQLite driver for PowerSync.
 *
 * @public
 */
export interface BetterSqlite3Options {
  type: 'better-sqlite3';
}

/**
 * Use the experimental `node:sqlite` interface as a SQLite driver for PowerSync.
 *
 * Note that this option is not currently tested and highly unstable.
 *
 * @alpha
 */
export interface NodeSqliteOptions {
  type: 'node:sqlite';
}

/**
 * The database driver package to use.
 *
 * @see {@link NodeSQLOpenOptions.openWorker}
 *
 * @public
 */
export type NodeDatabaseImplementation = BetterSqlite3Options | NodeSqliteOptions;

/**
 * The open options available across all PowerSync SDKs for JavaScript extended with Node.JS-specific options.
 *
 * @public
 */
export interface NodeSQLOpenOptions extends SQLOpenOptions {
  implementation?: NodeDatabaseImplementation;

  /**
   * The Node.JS SDK will use one worker to run writing queries and additional workers to run reads.
   * This option controls how many workers to use for reads.
   */
  readWorkerCount?: number;
  /**
   * A callback to allow customizing how the Node.JS SDK loads workers. This can be customized to
   * use workers at different paths.
   *
   * @param args - The arguments that would otherwise be passed to the [Worker](https://nodejs.org/docs/latest/api/worker_threads.html#class-worker)
   * constructor.
   * @returns the resolved worker.
   */
  openWorker?: WorkerOpener;

  /**
   * Initializes a created database connection.
   *
   * This can be used to e.g. set encryption keys, if an encrypted database should be used.
   */
  initializeConnection?: (db: LockContext, isWriter: boolean) => Promise<void>;
}
