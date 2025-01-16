export interface SqliteOptions {
  /**
   * SQLite journal mode. Defaults to [SqliteJournalMode.wal].
   */
  journalMode?: SqliteJournalMode;

  /**
   * SQLite synchronous flag. Defaults to [SqliteSynchronous.normal], which
   * is safe for WAL mode.
   */
  synchronous?: SqliteSynchronous;

  /**
   * Journal/WAL size limit. Defaults to 6MB.
   * The WAL may grow larger than this limit during writes, but SQLite will
   * attempt to truncate the file afterwards.
   */
  journalSizeLimit?: number;

  /**
   * Timeout in milliseconds waiting for locks to be released by other connections.
   * Defaults to 30 seconds.
   * Set to null or zero to fail immediately when the database is locked.
   */
  lockTimeoutMs?: number;

  /**
   * Encryption key for the database.
   * If set, the database will be encrypted using SQLCipher.
   */
  encryptionKey?: string;

  /**
   * Load extensions using the path and entryPoint.
   * More info can be found here https://op-engineering.github.io/op-sqlite/docs/api#loading-extensions.
   */
  extensions?: Array<{
    path: string;
    entryPoint?: string;
  }>;
}

// SQLite journal mode. Set on the primary connection.
// This library is written with WAL mode in mind - other modes may cause
// unexpected locking behavior.
enum SqliteJournalMode {
  // Use a write-ahead log instead of a rollback journal.
  // This provides good performance and concurrency.
  wal = 'WAL',
  delete = 'DELETE',
  truncate = 'TRUNCATE',
  persist = 'PERSIST',
  memory = 'MEMORY',
  off = 'OFF'
}

// SQLite file commit mode.
enum SqliteSynchronous {
  normal = 'NORMAL',
  full = 'FULL',
  off = 'OFF'
}

export const DEFAULT_SQLITE_OPTIONS: Required<SqliteOptions> = {
  journalMode: SqliteJournalMode.wal,
  synchronous: SqliteSynchronous.normal,
  journalSizeLimit: 6 * 1024 * 1024,
  lockTimeoutMs: 30000,
  encryptionKey: null,
  extensions: []
};
