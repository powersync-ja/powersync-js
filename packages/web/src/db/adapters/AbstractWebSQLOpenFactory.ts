import { DBAdapter, SQLOpenFactory } from '@powersync/common';
import { SSRDBAdapter } from './SSRDBAdapter';
import { RequiredWebSQLFlags, WebSQLOpenFactoryOptions, isServerSide, resolveWebSQLFlags } from './web-sql-flags';

export abstract class AbstractWebSQLOpenFactory implements SQLOpenFactory {
  protected resolvedFlags: RequiredWebSQLFlags;

  constructor(protected options: WebSQLOpenFactoryOptions) {
    this.resolvedFlags = resolveWebSQLFlags(options.flags);
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
    const {
      resolvedFlags: { disableSSRWarning, enableMultiTabs, ssrMode = isServerSide() }
    } = this;
    if (ssrMode && !disableSSRWarning) {
      console.warn(
        `
  Running PowerSync in SSR mode.
  Only empty query results will be returned.
  Disable this warning by setting 'disableSSRWarning: true' in options.`
      );
    }

    if (!enableMultiTabs) {
      console.warn(
        'Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.'
      );
    }

    if (ssrMode) {
      return new SSRDBAdapter();
    }

    return this.openAdapter();
  }
}
