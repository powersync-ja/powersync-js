import { DBAdapter } from '../db/DBAdapter.js';

/**
 * @public
 */
export interface SQLOpenOptions {
  /**
   * Filename for the database.
   */
  dbFilename: string;
  /**
   * Directory where the database file is located.
   *
   * When set, the directory must exist when the database is opened, it will
   * not be created automatically.
   */
  dbLocation?: string;

  /**
   * Enable debugMode to log queries to the performance timeline.
   *
   * Defaults to false.
   *
   * To enable in development builds, use:
   *
   *    debugMode: process.env.NODE_ENV !== 'production'
   */
  debugMode?: boolean;
}

/**
 * @public
 */
export interface SQLOpenFactory {
  /**
   * Opens a connection adapter to a SQLite DB
   */
  openDB(): DBAdapter;
}

/**
 * A source describing how to open databases.
 *
 * - A {@link DBAdapter} providing access to an opened SQLite connection pool.
 * - A {@link SQLOpenFactory} which will be used to open a SQLite connection pool lazily.
 * - A {@link SQLOpenOptions} for opening a SQLite connection with a default {@link SQLOpenFactory} for the current
 *   platform.
 *
 * @public
 */
export type DatabaseSource<OpenOptions extends SQLOpenOptions = SQLOpenOptions> =
  | { opened: DBAdapter }
  | { factory: SQLOpenFactory }
  | { database: OpenOptions };

/**
 * Internal helper to turn a {@link DatabaseSource} into an opened {@link DBAdapter}.
 *
 * @internal
 */
export function openDatabase<T extends SQLOpenOptions>(
  source: DatabaseSource<T>,
  defaultFactory: (options: T) => DBAdapter
): DBAdapter {
  if ('opened' in source) {
    return source.opened;
  } else if ('factory' in source) {
    return source.factory.openDB();
  } else {
    return defaultFactory(source.database);
  }
}
