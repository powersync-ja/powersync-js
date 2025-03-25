import { type Worker } from 'node:worker_threads';
import { SQLOpenOptions } from '@powersync/common';

export type WorkerOpener = (...args: ConstructorParameters<typeof Worker>) => InstanceType<typeof Worker>;

/**
 * The {@link SQLOpenOptions} available across all PowerSync SDKs for JavaScript extended with
 * Node.JS-specific options.
 */
export interface NodeSQLOpenOptions extends SQLOpenOptions {
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
