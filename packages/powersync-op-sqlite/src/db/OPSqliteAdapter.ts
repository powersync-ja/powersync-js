import { getDylibPath, open, type DB } from '@op-engineering/op-sqlite';
import {
  BaseObserver,
  ConnectionPool,
  DBAdapter,
  DBAdapterDefaultMixin,
  DBAdapterListener,
  DBLockOptions,
  QueryResult,
  Transaction,
  timeoutSignal,
  Semaphore
} from '@powersync/common';
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

const READ_CONNECTIONS = 5;

class OPSQLiteConnectionPool extends BaseObserver<DBAdapterListener> implements ConnectionPool {
  name: string;

  protected initialized: Promise<void>;

  protected readConnections: Semaphore<OPSQLiteConnection> | null;
  protected writeConnection: Semaphore<OPSQLiteConnection> | null;

  private abortController: AbortController;

  constructor(protected options: OPSQLiteAdapterOptions) {
    super();
    this.name = this.options.name;

    this.readConnections = null;
    this.writeConnection = null;
    this.abortController = new AbortController();
    this.initialized = this.init();
  }

  protected async init() {
    const { lockTimeoutMs, journalMode, journalSizeLimit, synchronous, cacheSizeKb, temporaryStorage } =
      this.options.sqliteOptions!;
    const dbFilename = this.options.name;

    const underlyingWriteConnection = await this.openConnection(dbFilename);

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
          await underlyingWriteConnection.execute(statement);
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
    underlyingWriteConnection.registerListener({
      tablesUpdated: (notification) => this.iterateListeners((cb) => cb.tablesUpdated?.(notification))
    });

    const underlyingReadConnections = [];
    for (let i = 0; i < READ_CONNECTIONS; i++) {
      const conn = await this.openConnection(dbFilename);
      for (let statement of readConnectionStatements) {
        await conn.execute(statement);
      }
      underlyingReadConnections.push(conn);
    }

    this.writeConnection = new Semaphore([underlyingWriteConnection]);
    this.readConnections = new Semaphore(underlyingReadConnections);
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

    const { item: writeConnection, release: returnWrite } = await this.writeConnection!.requestOne();
    const { items: readers, release: returnReaders } = await this.readConnections!.requestAll();

    try {
      writeConnection.close();
      readers.forEach((c) => c.close());
    } finally {
      returnWrite();
      returnReaders();
    }
  }

  private generateNestedAbortSignal(options?: DBLockOptions) {
    const outerSignal = this.abortController.signal;
    let signal: AbortSignal;
    let cleanUpInnerSignal: (() => void) | undefined;

    if (options?.timeoutMs && !outerSignal.aborted) {
      // This is essentially an AbortSignal.any() polyfill.
      const innerController = new AbortController();
      cleanUpInnerSignal = () => {
        innerController.abort();
        outerSignal.removeEventListener('abort', cleanUpInnerSignal!);
        timeout.removeEventListener('abort', cleanUpInnerSignal!);
      };

      outerSignal.addEventListener('abort', cleanUpInnerSignal);
      const timeout = timeoutSignal(options.timeoutMs);
      timeout.addEventListener('abort', cleanUpInnerSignal);

      signal = innerController.signal;
    } else {
      signal = outerSignal;
    }

    return { signal, cleanUpInnerSignal };
  }

  async readLock<T>(fn: (tx: OPSQLiteConnection) => Promise<T>, options?: DBLockOptions): Promise<T> {
    await this.initialized;

    const { signal, cleanUpInnerSignal } = this.generateNestedAbortSignal(options);
    const { item, release } = await this.readConnections!.requestOne(signal);
    try {
      return await fn(item);
    } finally {
      cleanUpInnerSignal?.();
      release();
    }
  }

  async writeLock<T>(fn: (tx: OPSQLiteConnection) => Promise<T>, options?: DBLockOptions): Promise<T> {
    await this.initialized;

    const { signal, cleanUpInnerSignal } = this.generateNestedAbortSignal(options);
    const { item, release } = await this.writeConnection!.requestOne(signal);
    try {
      return await fn(item).finally(() => item.flushUpdates());
    } finally {
      cleanUpInnerSignal?.();
      release();
    }
  }

  async refreshSchema(): Promise<void> {
    await this.initialized;
    await this.writeLock((l) => l.refreshSchema());
    const { items, release } = await this.readConnections!.requestAll();
    try {
      for (let readConnection of items) {
        await readConnection.refreshSchema();
      }
    } finally {
      release();
    }
  }
}

export class OPSQLiteDBAdapter extends DBAdapterDefaultMixin(OPSQLiteConnectionPool) implements DBAdapter {
  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    return await this.writeLock(async (tx) => {
      return await (tx as OPSQLiteConnection).executeNativeBatch(query, params);
    });
  }
}
