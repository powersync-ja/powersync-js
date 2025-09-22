import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/web';
import { CapacitorSQLiteAdapter } from './CapacitorSQLiteAdapter';

enum SqliteSynchronous {
  normal = 'NORMAL',
  full = 'FULL',
  off = 'OFF'
}

export interface CapacitorSQLiteOptions {
  /**
   * Journal/WAL size limit. Defaults to 6MB.
   * The WAL may grow larger than this limit during writes, but SQLite will
   * attempt to truncate the file afterwards.
   */
  journalSizeLimit?: number;

  /**
   * SQLite synchronous flag. Defaults to [SqliteSynchronous.normal], which
   * is safe for WAL mode.
   */
  synchronous?: SqliteSynchronous;

  /**
   * Maximum SQLite cache size. Defaults to 50MB.
   *
   * For details, see: https://www.sqlite.org/pragma.html#pragma_cache_size
   */
  cacheSizeKb?: number;
}

export interface CapacitorSQLiteOpenFactoryOptions extends SQLOpenOptions {
  sqliteOptions?: CapacitorSQLiteOptions;
}

export const DEFAULT_SQLITE_OPTIONS: Required<CapacitorSQLiteOptions> = {
  journalSizeLimit: 6 * 1024 * 1024,
  synchronous: SqliteSynchronous.normal,
  cacheSizeKb: 50 * 1024
};

export class CapacitorSQLiteOpenFactory implements SQLOpenFactory {
  constructor(protected options: CapacitorSQLiteOpenFactoryOptions) {}

  openDB(): DBAdapter {
    return new CapacitorSQLiteAdapter(this.options);
  }
}
