import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { isServerSide, resolveDBFlags } from '../../db/PowerSyncDatabase';
import { SSRDBAdapter } from './SSRDBAdapter';

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

/**
 * Options for opening a Web SQL connection
 */
export interface WebSQLOpenFactoryOptions extends SQLOpenOptions {
  flags?: WebSQLFlags;
}

export abstract class AbstractWebSQLOpenFactory implements SQLOpenFactory {
  protected resolvedFlags: WebSQLFlags;

  constructor(protected options: WebSQLOpenFactoryOptions) {
    this.resolvedFlags = resolveDBFlags(options.flags);
  }

  /**
   * Opens a DBAdapter if not in SSR mode
   */
  protected abstract openAdapter(): DBAdapter;

  /**
   * Opens a {@link DBAdapter} using resolved flags.
   * A SSR implementation is loaded if SSR mode is detected.
   */
  openDB() {
    const isSSR = isServerSide();
    if (isSSR && !this.resolvedFlags.disableSSRWarning) {
      console.warn(
        `
  Running PowerSync in SSR mode.
  Only empty query results will be returned.
  Disable this warning by setting 'disableSSRWarning: true' in options.`
      );
    }

    if (!this.resolvedFlags.enableMultiTabs) {
      console.warn(
        'Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.'
      );
    }

    if (isSSR) {
      return new SSRDBAdapter();
    }

    return this.openAdapter();
  }
}
