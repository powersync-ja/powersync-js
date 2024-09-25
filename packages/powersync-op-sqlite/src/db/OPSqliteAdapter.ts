import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  DBLockOptions,
  QueryResult,
  Transaction,
} from '@powersync/common';
import Lock from 'async-lock';
import { OPSQLiteConnection } from './OPSQLiteConnection';

/**
 * Adapter for React Native Quick SQLite
 */
export type OPSQLiteAdapterOptions = {
  writeConnection: OPSQLiteConnection;
  readConnections: OPSQLiteConnection[];
  name: string;
};

enum LockType {
  READ = 'read',
  WRITE = 'write',
}

export class OPSQLiteDBAdapter
  extends BaseObserver<DBAdapterListener>
  implements DBAdapter
{
  name: string;
  protected locks: Lock;
  constructor(protected options: OPSQLiteAdapterOptions) {
    super();
    this.name = this.options.name;
    // Changes should only occur in the write connection
    options.writeConnection.registerListener({
      tablesUpdated: (notification) =>
        this.iterateListeners((cb) => cb.tablesUpdated?.(notification)),
    });
    this.locks = new Lock();
  }

  close() {
    this.options.writeConnection.close();
    this.options.readConnections.forEach((c) => c.close());
  }

  async readLock<T>(
    fn: (tx: OPSQLiteConnection) => Promise<T>,
    options?: DBLockOptions
  ): Promise<T> {
    // TODO better
    const sortedConnections = this.options.readConnections
      .map((connection, index) => ({
        lockKey: `${LockType.READ}-${index}`,
        connection,
      }))
      .sort((a, b) => {
        const aBusy = this.locks.isBusy(a.lockKey);
        const bBusy = this.locks.isBusy(b.lockKey);
        // Sort by ones which are not busy
        return aBusy > bBusy ? 1 : 0;
      });

    return new Promise(async (resolve, reject) => {
      try {
        await this.locks.acquire(
          sortedConnections[0].lockKey,
          async () => {
            resolve(await fn(sortedConnections[0].connection));
          },
          { timeout: options?.timeoutMs }
        );
      } catch (ex) {
        reject(ex);
      }
    });
  }

  writeLock<T>(
    fn: (tx: OPSQLiteConnection) => Promise<T>,
    options?: DBLockOptions
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.locks.acquire(
          LockType.WRITE,
          async () => {
            resolve(await fn(this.options.writeConnection));
          },
          { timeout: options?.timeoutMs }
        );
      } catch (ex) {
        reject(ex);
      }
    });
  }

  readTransaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: DBLockOptions
  ): Promise<T> {
    return this.readLock((ctx) => this.internalTransaction(ctx, fn));
  }

  writeTransaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: DBLockOptions
  ): Promise<T> {
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

  async executeBatch(
    query: string,
    params: any[][] = []
  ): Promise<QueryResult> {
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
        get: (query, params) => connection.get(query, params),
        getAll: (query, params) => connection.getAll(query, params),
        getOptional: (query, params) => connection.getOptional(query, params),
        commit,
        rollback,
      });
      await commit();
      return result;
    } catch (ex) {
      await rollback();
    }

    return undefined as T;
  }
}
