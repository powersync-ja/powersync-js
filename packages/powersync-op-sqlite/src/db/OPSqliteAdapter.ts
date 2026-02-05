import { ANDROID_DATABASE_PATH, getDylibPath, IOS_LIBRARY_PATH, open, type DB } from '@op-engineering/op-sqlite';
import { BaseObserver, DBAdapter, DBAdapterListener, DBLockOptions, QueryResult, Transaction } from '@powersync/common';
import Lock from 'async-lock';
import { Platform } from 'react-native';
import { OPSQLiteConnection } from './OPSQLiteConnection';
import { SqliteOptions } from './SqliteOptions';

/**
 * Adapter for React Native Quick SQLite
 */
export type OPSQLiteAdapterOptions = {
  name: string;
  dbLocation?: string;
  sqliteOptions?: SqliteOptions;
};

enum LockType {
  READ = 'read',
  WRITE = 'write'
}

const READ_CONNECTIONS = 5;

export class OPSQLiteDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  name: string;
  protected locks: Lock;

  protected initialized: Promise<void>;

  protected readConnections: Array<{ busy: boolean; connection: OPSQLiteConnection }> | null;

  protected writeConnection: OPSQLiteConnection | null;

  private readQueue: Array<() => void> = [];
  private abortController: AbortController;

  constructor(protected options: OPSQLiteAdapterOptions) {
    super();
    this.name = this.options.name;

    this.locks = new Lock();
    this.readConnections = null;
    this.writeConnection = null;
    this.abortController = new AbortController();
    this.initialized = this.init();
  }

  protected async init() {
    const { lockTimeoutMs, journalMode, journalSizeLimit, synchronous, cacheSizeKb, temporaryStorage } =
      this.options.sqliteOptions!;
    const dbFilename = this.options.name;

    this.writeConnection = await this.openConnection(dbFilename);

    const baseStatements = [
      `PRAGMA busy_timeout = ${lockTimeoutMs}`,
      `PRAGMA cache_size = -${cacheSizeKb}`,
      `PRAGMA temp_store = ${temporaryStorage}`
    ];

    const writeConnectionStatements = [
      ...baseStatements,
      `PRAGMA journal_mode = ${journalMode}`,
      `PRAGMA journal_size_limit = ${journalSizeLimit}`,
      `PRAGMA synchronous = ${synchronous}`
    ];

    const readConnectionStatements = [...baseStatements, 'PRAGMA query_only = true'];

    for (const statement of writeConnectionStatements) {
      for (let tries = 0; tries < 30; tries++) {
        try {
          await this.writeConnection!.execute(statement);
          break;
        } catch (e: any) {
          if (e instanceof Error && e.message.includes('database is locked') && tries < 29) {
            continue;
          } else {
            throw e;
          }
        }
      }
    }

    // Changes should only occur in the write connection
    this.writeConnection!.registerListener({
      tablesUpdated: (notification) => this.iterateListeners((cb) => cb.tablesUpdated?.(notification))
    });

    this.readConnections = [];
    for (let i = 0; i < READ_CONNECTIONS; i++) {
      const conn = await this.openConnection(dbFilename);
      for (let statement of readConnectionStatements) {
        await conn.execute(statement);
      }
      this.readConnections.push({ busy: false, connection: conn });
    }
  }

  protected async openConnection(filenameOverride?: string): Promise<OPSQLiteConnection> {
    const dbFilename = filenameOverride ?? this.options.name;
    const DB: DB = this.openDatabase(dbFilename, this.options.sqliteOptions?.encryptionKey ?? undefined);

    //Load extensions for all connections
    this.loadAdditionalExtensions(DB);
    this.loadPowerSyncExtension(DB);

    await DB.execute('SELECT powersync_init()');

    return new OPSQLiteConnection({
      baseDB: DB
    });
  }

  private openDatabase(dbFilename: string, encryptionKey?: string): DB {
    const openOptions: Parameters<typeof open>[0] = {
      name: dbFilename
    };

    if (this.options.dbLocation) {
      openOptions.location = this.options.dbLocation;
    }

    // If the encryption key is undefined/null when using SQLCipher it will cause the open function to fail
    if (encryptionKey) {
      openOptions.encryptionKey = encryptionKey;
    }

    return open(openOptions);
  }

  private loadAdditionalExtensions(DB: DB) {
    if (this.options.sqliteOptions?.extensions && this.options.sqliteOptions.extensions.length > 0) {
      for (const extension of this.options.sqliteOptions.extensions) {
        DB.loadExtension(extension.path, extension.entryPoint);
      }
    }
  }

  private async loadPowerSyncExtension(DB: DB) {
    if (Platform.OS === 'ios') {
      const libPath = getDylibPath('co.powersync.sqlitecore', 'powersync-sqlite-core');
      DB.loadExtension(libPath, 'sqlite3_powersync_init');
    } else {
      DB.loadExtension('libpowersync', 'sqlite3_powersync_init');
    }
  }

  async close() {
    await this.initialized;
    // Abort any pending operations
    this.abortController.abort();
    this.readQueue = [];

    this.writeConnection!.close();
    this.readConnections!.forEach((c) => c.connection.close());
  }

  async readLock<T>(fn: (tx: OPSQLiteConnection) => Promise<T>, options?: DBLockOptions): Promise<T> {
    await this.initialized;
    return new Promise(async (resolve, reject) => {
      const execute = async () => {
        // Find an available connection that is not busy
        const availableConnection = this.readConnections!.find((conn) => !conn.busy);

        // If we have an available connection, use it
        if (availableConnection) {
          availableConnection.busy = true;
          try {
            resolve(await fn(availableConnection.connection));
          } catch (error) {
            reject(error);
          } finally {
            availableConnection.busy = false;
            // After query execution, process any queued tasks
            this.processQueue();
          }
        } else {
          // If no available connections, add to the queue
          this.readQueue.push(execute);
        }
      };

      execute();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.readQueue.length > 0) {
      const next = this.readQueue.shift();
      if (next) {
        next();
      }
    }
  }

  async writeLock<T>(fn: (tx: OPSQLiteConnection) => Promise<T>, options?: DBLockOptions): Promise<T> {
    await this.initialized;

    return new Promise(async (resolve, reject) => {
      try {
        // Set up abort signal listener
        const abortListener = () => {
          reject(new Error('Database connection was closed'));
        };
        this.abortController.signal.addEventListener('abort', abortListener);

        await this.locks
          .acquire(
            LockType.WRITE,
            async () => {
              // Check if operation was aborted before executing
              if (this.abortController.signal.aborted) {
                reject(new Error('Database connection was closed'));
              }
              resolve(await fn(this.writeConnection!));
            },
            { timeout: options?.timeoutMs }
          )
          .then(() => {
            // flush updates once a write lock has been released
            this.writeConnection!.flushUpdates();
          })
          .finally(() => {
            this.abortController.signal.removeEventListener('abort', abortListener);
          });
      } catch (ex) {
        reject(ex);
      }
    });
  }

  readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.readLock((ctx) => this.internalTransaction(ctx, fn));
  }

  writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeLock((ctx) => this.internalTransaction(ctx, fn));
  }

  getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.readLock((ctx) => ctx.getAll(sql, parameters));
  }

  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    return this.readLock((ctx) => ctx.getOptional(sql, parameters));
  }

  get<T>(sql: string, parameters?: any[]): Promise<T> {
    return this.readLock((ctx) => ctx.get(sql, parameters));
  }

  execute(query: string, params?: any[]) {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  executeRaw(query: string, params?: any[]) {
    return this.writeLock((ctx) => ctx.executeRaw(query, params));
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    return this.writeLock((ctx) => ctx.executeBatch(query, params));
  }

  protected async internalTransaction<T>(
    connection: OPSQLiteConnection,
    fn: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    let finalized = false;
    const commit = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return connection.execute('COMMIT');
    };
    const rollback = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return connection.execute('ROLLBACK');
    };
    try {
      await connection.execute('BEGIN');
      const result = await fn({
        execute: (query, params) => connection.execute(query, params),
        executeRaw: (query, params) => connection.executeRaw(query, params),
        get: (query, params) => connection.get(query, params),
        getAll: (query, params) => connection.getAll(query, params),
        getOptional: (query, params) => connection.getOptional(query, params),
        commit,
        rollback
      });
      await commit();
      return result;
    } catch (ex) {
      try {
        await rollback();
      } catch (ex2) {
        // In rare cases, a rollback may fail.
        // Safe to ignore.
      }
      throw ex;
    }
  }

  async refreshSchema(): Promise<void> {
    await this.initialized;
    await this.writeConnection!.refreshSchema();

    if (this.readConnections) {
      for (let readConnection of this.readConnections) {
        await readConnection.connection.refreshSchema();
      }
    }
  }
}
