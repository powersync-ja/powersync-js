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
   * Allows you to override the default shared sync worker.
   *
   * You can either provide a string representing the path to the worker script
   * or a factory method that returns a SharedWorker instance.
   */

  sharedSyncWorker?: string | (() => SharedWorker);
  /**
   * Allows you to override the default wasqlite db worker.
   *
   * You can either provide a string representing the path to the worker script
   * or a factory method that returns a Worker or SharedWorker instance.
   */
  wasqliteDBWorker?: string | (() => Worker | SharedWorker);
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
