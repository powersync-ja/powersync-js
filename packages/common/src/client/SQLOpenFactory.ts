import { DBAdapter } from '../db/DBAdapter';

export interface SQLOpenOptions {
  /**
   * Filename for the database.
   */
  dbFilename: string;
  /**
   * Directory where the database file is located.
   */
  dbLocation?: string;
}

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
  return typeof test == 'object' && 'dbFilename' in test;
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
