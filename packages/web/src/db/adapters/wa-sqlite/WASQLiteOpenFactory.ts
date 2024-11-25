import { DBAdapter } from '@powersync/common';
import { AbstractWebSQLOpenFactory } from '../AbstractWebSQLOpenFactory';
import { WebSQLOpenFactoryOptions } from '../web-sql-flags';
import { WASQLiteVFS } from './WASQLiteConnection';
import { WASQLiteDBAdapter } from './WASQLiteDBAdapter';

export interface WASQLiteOpenFactoryOptions extends WebSQLOpenFactoryOptions {
  vfs?: WASQLiteVFS;
}

/**
 * Opens a SQLite connection using WA-SQLite.
 */
export class WASQLiteOpenFactory extends AbstractWebSQLOpenFactory {
  constructor(options: WASQLiteOpenFactoryOptions) {
    super(options);
  }

  protected openAdapter(): DBAdapter {
    return new WASQLiteDBAdapter({
      ...this.options,
      flags: this.resolvedFlags
    });
  }
}
