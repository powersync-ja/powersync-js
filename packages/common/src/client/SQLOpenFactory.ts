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
 * Tests if the input is a {@link SQLOpenOptions}
 *
 * @internal
 */
export const isSQLOpenOptions = (test: any): test is SQLOpenOptions => {
  // typeof null is `object`, but you cannot use the `in` operator on `null.
  return test && typeof test == 'object' && 'dbFilename' in test;
};

/**
 * Tests if input is a {@link SQLOpenFactory}
 *
 * @internal
 */
export const isSQLOpenFactory = (test: any): test is SQLOpenFactory => {
  return typeof test?.openDB == 'function';
};

/**
 * Tests if input is a {@link DBAdapter}
 *
 * @internal
 */
export const isDBAdapter = (test: any): test is DBAdapter => {
  return typeof test?.writeTransaction == 'function';
};
