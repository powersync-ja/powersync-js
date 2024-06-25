import { DBAdapter } from '@powersync/common';
import { WASQLiteDBAdapter } from './WASQLiteDBAdapter';
import { AbstractWebSQLOpenFactory } from '../AbstractWebSQLOpenFactory';

/**
 * Opens a SQLite connection using WA-SQLite.
 */
export class WASQLiteOpenFactory extends AbstractWebSQLOpenFactory {
  protected openAdapter(): DBAdapter {
    return new WASQLiteDBAdapter({
      ...this.options,
      flags: this.resolvedFlags
    });
  }
}
