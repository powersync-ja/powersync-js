import { DBAdapter } from '../db/DBAdapter.js';

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

  /**
   * Use a development database, requires no project setup.
   */
  developmentMode?: boolean;

  /**
   * Persister for the development database.
   *
   * @example
   * ```javascript
   * persister: {
   *     readFile: async () => null,
   *     writeFile: async () => {}
   * }
   * ```
   */
  developmentPersister?: Persister;
}

export interface Persister {
  readFile: () => Promise<ArrayLike<number> | Buffer | null>;
  writeFile: (data: ArrayLike<number> | Buffer) => Promise<void>;
}

export interface DevDBOptions {}

export interface SQLOpenFactory {
  /**
   * Opens a connection adapter to a SQLite DB
   */
  openDB(): DBAdapter;
}

/**
 * Tests if the input is a {@link SQLOpenOptions}
 */
export const isSQLOpenOptions = (test: any): test is SQLOpenOptions => {
  // typeof null is `object`, but you cannot use the `in` operator on `null.
  return test && typeof test == 'object' && 'dbFilename' in test;
};

/**
 * Tests if input is a {@link SQLOpenFactory}
 */
export const isSQLOpenFactory = (test: any): test is SQLOpenFactory => {
  return typeof test?.openDB == 'function';
};

/**
 * Tests if input is a {@link DBAdapter}
 */
export const isDBAdapter = (test: any): test is DBAdapter => {
  return typeof test?.writeTransaction == 'function';
};
