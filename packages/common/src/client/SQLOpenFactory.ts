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
 * For most apps, using the `database` key with {@link SQLOpenOptions} is the easiest and recommended option.
 *
 * @public
 */
export type DatabaseSource<OpenOptions extends SQLOpenOptions = SQLOpenOptions> =
  | {
      /**
       * Wrap an opened {@link DBAdapter} as a PowerSync database instance.
       *
       * This is primarily useful for testing. On most platforms, PowerSync would open a pool of SQLite connections by
       * default. This option allows using a single in-memory instance instead. It can also be used to customize the
       * database used by default, e.g. to install additional logging on SQL statements by intercepting methods.
       */
      opened: DBAdapter;
    }
  | {
      /**
       * Construct a PowerSync database that will call {@link SQLOpenFactory.openDB} when opened.
       *
       * On most SDKs, passing {@link SQLOpenOptions} is a better option. An exception is React Native, where using an
       * [OP-SQLite factory](https://docs.powersync.com/client-sdks/reference/react-native-and-expo#op-sqlite) is
       * recommended.
       */
      factory: SQLOpenFactory;
    }
  | {
      /**
       * Construct a PowerSync database opening a connection pool from the {@link SQLOpenOptions}.
       *
       * At the very least, options include the {@link SQLOpenOptions.dbFilename} to open. Depending on the PowerSync
       * SDK used, additional options are available. For example, the web SDK allows configuring the virtual file system
       * implementation used to persist files on the web too.
       */
      database: OpenOptions;
    };
