import { type Worker } from 'node:worker_threads';
import { SQLOpenOptions } from '@powersync/common';

export type WorkerOpener = (...args: ConstructorParameters<typeof Worker>) => InstanceType<typeof Worker>;

/**
 * Use the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) package as a SQLite driver for PowerSync.
 */
export interface BetterSqlite3Options {
  type: 'better-sqlite3';
  /**
   * The package import to resolve for better-sqlite3.
   *
   * While this defaults to `better-sqlite3`, this allows using forked better-sqlite3 packages, such as those used for
   * encryption.
   */
  package?: string;
}

/**
 * Use the experimental `node:sqlite` interface as a SQLite driver for PowerSync.
 *
 * Note that this option is not currently tested and highly unstable.
 */
export interface NodeSqliteOptions {
  type: 'node:sqlite';
}

export type NodeDatabaseImplementation = BetterSqlite3Options | NodeSqliteOptions;

/**
 * The {@link SQLOpenOptions} available across all PowerSync SDKs for JavaScript extended with
 * Node.JS-specific options.
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
   * @param args The arguments that would otherwise be passed to the {@link Worker} constructor.
   * @returns the resolved worker.
   */
  openWorker?: WorkerOpener;
}
