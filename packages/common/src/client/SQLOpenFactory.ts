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
